/* 
    Pundit: a novel semantic web annotation tool
    Copyright (c) 2013 Net7 SRL, <http://www.netseven.it/>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

    See LICENSE.TXT or visit http://thepund.it for the full text of the license.
*/dojo.provide("pundit.ImageFragmentHandler");
dojo.declare("pundit.ImageFragmentHandler", pundit.BaseComponent, {
    
    constructor: function(options) {
        var self = this;
        self.baloonEnabled = true;
        self.contextualMenuVisible = false;
        self.inBaloon = false;
        self.inImage = false;
        
        self.isOutTimer = null;
        
        self.helper = new pundit.XpointersHelper();
        
        self.initImageSelectionHelper();
        self.initBehaviours();
        
        _PUNDIT.init.onInitDone(function() {
            //When contextual menu get closed close also the baloon if out of the image
            cMenu.onTypeHide_imageSelectionHelper(function(uri,e){
                self.contextualMenuVisible = false;
                self.isOut();
            });
            semlibWindow.onWindowAnnotationResize(function(){
                self.baloonEnabled = false;
                if ((self.imgAnn !== null) || (typeof(self.imgAnn) !== 'undefined')){
                    self.destroyBaloon();
                }
            });
            semlibWindow.onWindowClose(function(){
                self.baloonEnabled = false;
                if ((self.imgAnn !== null) || (typeof(self.imgAnn) !== 'undefined')){
                    self.destroyBaloon();
                }
            });
            semlibWindow.onResizeEnd(function(){
                self.baloonEnabled = true;
                self.isOut();
            })
        });
        
        self.log('Image FragmentHandler up and running');
    }, // constructor()
    
    initImageSelectionHelper: function(){
        var self = this;
        cMenu.addAction({
            type: ['imageSelectionHelper'],
            name: 'AddImageToMyItems',
            label: 'Add this image to My Items',
            showIf: function(item) {
                if (typeof semlibMyItems.getItemFromUri(item.value) !== 'undefined')
                    return false;
                else
                    return true;
            },
            onclick: function(item) {
                if (!semlibMyItems.uriInItems(item.value)) {
                    // Create the needed bucket and init the preview for this item
                    item.rdfData = semlibItems.createBucketForImageFragment(item).bucket;
                    previewer.buildPreviewForItem(item);
                        
                    semlibMyItems.addItem(item, true);
                    //semlibWindow.show_pundittabmyitems();
                    semlibMyItems.show_pundittabfiltermyitemsimages();
                }

                if (!semlibItems.uriInItems(item.value))
                    semlibItems.addItem(item);

                if (!tooltip_viewer.isTempXpointer(item.value)){
                    tooltip_viewer.tempXpointers.push(item.value);
                    // TODO: no need to refresh annotations, just consolidate .. 
                    tooltip_viewer.consolidate();
                    //Not sure if we can remove it
                    //tooltip_viewer.refreshAnnotations();
                }
                tooltip_viewer.highlightByXpointer(item.value);
                _PUNDIT.ga.track('cmenu', 'click', 'add-image-to-my-items');
                return true;
            }
        });
        
        cMenu.addAction({
            type: ['imageSelectionHelper'],
            name: 'removeImageFromMyItems',
            label: 'Remove from My Items',
            showIf: function(item){
                if (typeof semlibMyItems.getItemFromUri(item.value) !== 'undefined')
                    return true;
                else
                    return false;
            },
            onclick: function(item) {
                //DEBUG Remove item from my items and from page items
                semlibMyItems.removeItemFromUri(item.value);
                tooltip_viewer.removeTempXpointer(item.value);
                
                //tooltip_viewer.refreshAnnotations();
                // DEBUG: not sure we can avoid the refreshAnnotations() process
                tooltip_viewer.consolidate();
                _PUNDIT.ga.track('cmenu', 'click', 'remove-image-from-myitems');
                return true;
            }
        });

        // Action: annotate text fragment
        cMenu.addAction({
            type: ['imageSelectionHelper'],
            name: 'AnnotateImageWithTripleComposer',
            label: 'Annotate this image',
            showIf: function(item) { 
                return true;
            },
            onclick: function(item) {
                tripleComposer.addItemToSubject(item);
                previewer.buildPreviewForItem(item);

                if (!_PUNDIT.GUI.isWindowOpen())
                    _PUNDIT.GUI.toggleWindow();

                _PUNDIT.ga.track('cmenu', 'click', 'annotate-this-image');
                return true;
            }
        });
            
        cMenu.addAction({
            type: ['imageSelectionHelper'],
            name: 'AddCommentToImage',
            label: 'Comment or tag this image',
            showIf: function(item) { 
                return true;
            },
            onclick: function(item) {
                _PUNDIT['commentTag'].initPanel(item, "Comment and tags");
				//TODO: remove this and refactor
				// This is temporally set to false when the panel is used as an Entity Extraction tool :)
				_PUNDIT['commentTag'].saveComment = true;
                _PUNDIT.ga.track('cmenu', 'click', 'comment-or-tag-this-image');
            }
        });
    },
    
    initBehaviours: function(){
        var self = this;
        
        // DEBUG: is this safe??! Arent we going to have problems in 
        // special/strange/whatever pages ??
        dojo.query('img').connect('onmouseenter', function(e){
            var annotable = true,
                target = e.target;
            while (target.tagName.toLowerCase() !== 'body') {
                if (dojo.hasClass(target, 'pundit-disable-annotation')) {
                    annotable = false;
                    break;
                }
                target = dojo.query(target).parent()[0];
            }
            if (!annotable)
                return;
                
            self.inImage = true;
            if (e.target !== self.thisIm){
                self.destroyBaloon();
            }
            self.thisIm = e.target;
            if (!self.baloonEnabled){
                return;
            }else{
                self.showBaloon();
            }
        });
        
        dojo.query('img').connect('onmouseleave', function(e){
            self.inImage = false;
            var pos = dojo.position(e.target, true);
            if (self.isOut(pos, e.pageX, e.pageY)){
                self.destroyBaloon();
            }
        });
    },
    
    hideImg: function(pos, x, y){
        var self = this;
        if (self.isOut(pos, x, y)) {
            self.destroyBaloon();
        }
    },
    
    isOut: function(pos, x, y){
        var self = this;
        clearTimeout(self.isOutTimer);
        self.isOutTimer = setTimeout(function(){
            if ((!self.inBaloon) && (!self.inImage)){
                self.onIsOut();
            }
            else{
                self.onIsIn();
            }    
        },100);
    },
    onIsOut:function(){
        var self = this;
        if ((self.imgAnn !== null) && (typeof(self.imgAnn) !== 'undefined')) {
            if (!self.contextualMenuVisible)
                self.destroyBaloon();
        }
    },
    
    onIsIn:function(){
        var self = this;
        self.showBaloon();
    },
    
    createItemFromImage:function(image){
        var self = this,
            xp = self.helper.getXpFromNode(image),
            content = self.helper.extractContentFromNode(image),
            src = image.src,
            pCont = _PUNDIT.tripleComposer.getSafePageContext();
        
        if (pCont.indexOf('#xpointer')!== -1)
            pCont = pCont.substring(0, pCont.indexOf('#'));
        
        
        var item = {
            type: ['subject'],
            rdftype: [ns.image],
            label: content,
            description: content,
            value: xp,
            image: src,
            isPartOf: xp.split('#')[0],
            pageContext: pCont
        };
        
        item.rdfData = semlibItems.createBucketForImageFragment(item).bucket;
        return item;
    },
    destroyBaloon:function(){
        var self = this;
        dojo.destroy(self.imgAnn);
        self.imgAnn = null;
    },
    showBaloon:function(){
        var self = this;
        if ((self.imgAnn === null) || (typeof(self.imgAnn) === 'undefined')) {

                self.imgAnn = dojo.create('span');
                self.pos = dojo.position(self.thisIm, true);
                var x = self.pos.x - 10,
                    y = self.pos.y - 10;
                    
                dojo.style(self.imgAnn, {
                    position: 'absolute',
                    top: y + 'px',
                    left: x + 'px'
                });
                dojo.addClass(self.imgAnn, 'pundit-ifh-annotate-image');

                //This is required for missing events...
                //Remove baloon going out from the image
                dojo.connect(self.imgAnn, 'onmouseleave', function(e) {
                    self.inBaloon = false;
                    self.isOut();
                });
                
                dojo.connect(self.imgAnn, 'onmouseenter', function(e) {
                    self.inBaloon = true;
                });
                
                dojo.connect(self.imgAnn, 'onclick', function(e){
                    // Create the item an pass it to the menu
                    var item = self.createItemFromImage(self.thisIm);
                    item._originalNode = self.thisIm;

                    cMenu.show(e.pageX - window.pageXOffset, e.pageY - window.pageYOffset, item, 'imageSelectionHelper');
                    self.contextualMenuVisible = true;
                });
                dojo.query('body').append(self.imgAnn);
            } // if imgAnn === null || typeof imgAnn === 'undefined'
    },
    
    getParentImageXpointer: function(fragmentUri) {
        //TODO: remove this. It is a trick to visualiza image fragments annotations 
        //by setting the xpointer of the complete image as target of the annotation
        var subjectItem = _PUNDIT.items.getItemByUri(fragmentUri);
        if (typeof(subjectItem) !== 'undefined' && typeof(subjectItem.rdftype) !== 'undefined') {
            for (var si=0; si < subjectItem.rdftype.length; si++) {
                if (subjectItem.rdftype[si] === ns.fragments.image) {
                    var imgUrl = subjectItem.isPartOf;
                    var imgs = dojo.query('img');
                    for (var ii= 0; ii < imgs.length; ii++) {
                        if (imgs[ii].src === imgUrl) {
                            var helper = new pundit.XpointersHelper();
                            var parentImageXpointer = helper.getXpFromNode(imgs[ii]);
                            return parentImageXpointer;
                        }
                    }
                }
            }
        }
    }
    
});