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
*/
/**
 * @class pundit.ng.ImageAnnotatorHelper
 * @extends pundit.baseComponent
 * @description TODO
 */
dojo.provide("pundit.ng.ImageAnnotatorHelper");
dojo.declare("pundit.ng.ImageAnnotatorHelper", pundit.BaseComponent, {

    opts: {
        debug: true
    },

    constructor: function(options) {
        var self = this;
        
        self.currentImage = null;
        
        self.initIA();
        self.initMenus();
        self.log('Angular image annotator helper up and running');
    },
    
    createItemFromPolygon: function(poly){

        var self = this,
            helper = new pundit.XpointersHelper(),
            parentImageXpointer = helper.getXpFromNode(self.currentNode),
            description = 'This fragment represents a part of the image ' +
                self.currentImage.substring(self.currentImage.lastIndexOf('/') + 1, self.currentImage.length),
            uri,
            selectors = [{
                points: poly.points,
                type: "polygon"
            }],
            crypto = new pundit.Crypto();

        uri = ns.fragmentBaseUri + 'image/' + crypto.hex_md5(self.currentImage + new Date().getTime() + dojo.toJson(selectors));

        item = {
            type: ['subject'],
            rdftype: [ns.fragments.image],
            label: poly.name,
            description: description,

            // Make Item unique even if has the same selector of other
            value: uri,
            image: self.currentImage,
            parentItemXP: parentImageXpointer,

            // Add a pundit-image-content for the images (so that you can handle different image resolution)
            // In this case use this as isPartOf (otherwise use the uri of the image)
            isPartOf: self.currentImage,
            pageContext: _PUNDIT.tripleComposer.getSafePageContext(),
            selectors: selectors
        };

        item.rdfData = semlibItems.createBucketForImageRegionFragment(item).bucket;

        return item;
    },
    
    
    initMenus: function() {
        var self = this;
        
        _PUNDIT.cMenu.addAction({
            type: ['imageSelectionHelper'],
            name: 'NGAnnotateImage',
            label: 'Annotate a part of this image (NEW)',
            showIf: function() {
                return true;
            },
            onclick: function(item){
                _PUNDIT.ga.track('cmenu', 'click', 'annotate-a-part-of-this-image-NEW');

                self.log('Annotating a part of image '+item.image);

                if (self.currentImage !== item.image) {
                    self.currentImage = item.image;
                    self.currentNode = item._originalNode;
                    IA.callSetImg(item.image);
                }
                
                IA.callOpen();

                return true;
            }
        });
        
    },
    
    initIA: function() {
        var self = this;
        
        window['PunditIAConf'] = {
            useOnlyCallbacks: true,
            img: "http://upload.wikimedia.org/wikipedia/commons/a/a4/Dante-alighieri.jpg",
            onLoad: function() {
                self.log('IA is fully loaded');
            },
            actions: [
                {
                    label: 'Annotate this fragment',
                    action: function(poly){
                        
                        self.log('Using a polygon as subject ');
                        var item = self.createItemFromPolygon(poly);
                        
                        tripleComposer.addItemToSubject(item);
                        previewer.buildPreviewForItem(item);

                        if (!_PUNDIT.GUI.isWindowOpen())
                            _PUNDIT.GUI.toggleWindow();

                        IA.callClose();

                        _PUNDIT.ga.track('cmenu', 'click', 'ng-IA-annotate-this-fragment');
                    },
                    showIf: function(poly){
                        return poly.closed;
                    }
                }
                /*
                {
                    label: 'Add a comment to this fragment',
                    action: function(poly){
                        console.log('Add a comment to this fragment', poly);
                    },
                    showIf: function(poly){
                        return poly.closed;
                    }
                }
                */
            ]
        };
        
        dojo.place('<div ng-app="ImageAnnotator"><image-annotator conf-name="PunditIAConf"></image-annotator></div>', dojo.query('body')[0], 'first');

        // TODO: why do i need to bootstrap manually?!!
        if (typeof(IA) === 'undefined')
            angular.bootstrap(document, ['ImageAnnotator']);
        
    }
});
