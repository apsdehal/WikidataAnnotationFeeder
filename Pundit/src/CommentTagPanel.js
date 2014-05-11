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
*//**
    Provides a GUI (floating Panel) for adding textual comment and tags.
    Tags can be searched in different lookup services like Freebase, Dbpedia and Wordnet.
    They can also be automatically extacted from added text using DBpedia Spotlight service
    Created comments and tags are then saved to pundit annotation server.
    Comment Tag Panel extend Recognizer Panel to reuse its capability to search for tags
    @class pundit.CommentTagPanel
    @extends pundit.RecognizerPanel
    @constructor
    @module pundit
    @param options {object} See object properties
 */
dojo.provide("pundit.CommentTagPanel");
dojo.declare("pundit.CommentTagPanel", pundit.RecognizerPanel, {

    // TODO: move this comment to some @property and some into the class declaration
    /*
    * @constructor
    * @description Initializes the component
    * @param options {object}
    *   @param options.name {string} the name of the panel used to create a unique id
    *   @param options.title {string} the title of the panel 
    *   @param options.drag {boolean} if set to true it enable the panel to be dragged
    *   @param options.preview {boolean} if set to true enable the preview visualization (
    *       otherwise the normal preview (in Pundit Window) is used
    *       assigned explicitly dojo's 'declaredClass' field will be used.
    *   @param options.keyInputTimerLength {number} The number of milliseconds to
    *       to wait after a keystroke before querying the service. Default:500
    *   @param options.maxShownItems {number} Max number of items shown in each source container.
    *       Default = 4
    *   @param options.suggestionPanels {object} .
    * <br/>
    * An object representing the source used for the recognition.
    * Example:<br/>
    * <code>{<br/>
    *   myitems: {<br/>
    *       label:'My Items'<br/>
    *       }, <br/>
    *   pageitems: {<br/>
    *       label: 'Page Items'<br/>
    *       }, <br/>
    *   properties: {<br/>
    *       label: 'Properties',<br/>
    *       expanded: true<br/>
    *       }<br/>
    * }<code/><br/>
    * Where label represent the shown label. Containers are collapsed by defualt unless
    * expanded is set to true.
    *   @param options.namedEntitiesSources {object} An object representing the source 
    * used for the lookup. Default is {} meaning that there is no lookup.<br>
    * To enable lookup from Freebase and Dbpedia:<br>
    * {<br/>
    *   freebase:{label: 'Freebase'},<br>
    *   dbpedia:{label:'DBpedia'},<br>
    *   wordnet:{label:'Wordnet'}<br>
    * }<br>
    *   @param options.searchType {string} The type of search that is performed. Two
    * kind of searches are supported.<br> 
    * Default is 'filter' which filters the items according to input string 
    * restricting the shown items<br>
    * 'search' search in all the items source
    */
    
    opts: {
        enableEntitiesExtraction: true,
        // possible values "dbpedia-spotlight" | "data-txt" | "civet"
        entityExtractor: "data-txt", 
    },
    
    constructor:function(options) {
        var self = this;

        self.saveComment = true;

        self.tagItems = [];
        self.lastTagInfoRequests = [];
        self.lastSearchedComment = '';
        self.tagListItemSelected = false;
        
        //TODO: remove this and refactor
        // This is temporally set to false when the panel is used as an Entity Extraction tool :)
        self.enableSemanticExpansion;
        
        if (self.opts.enableEntitiesExtraction) {
            if (self.opts.entityExtractor === "dbpedia-spotlight") {
                // TODO -> DbpediaSpotlight
                self.entityExtractor = new pundit.DbpediaSpotlight();	
            } else if (self.opts.entityExtractor === "data-txt") {
                self.entityExtractor = new pundit.DataTxt();	
            } else if (self.opts.entityExtractor === "civet") {
                self.entityExtractor = new pundit.Civet();	
            }
        }
        
    },
    initHTML: function(){
        this.inherited(arguments);

        // Add the comment part
        var self= this,
            c = '<div class="pundit-rp-comment-container">';
        c += '      <div class="pundit-container-header">';
        c += '          <span id="pundit-ctp-textarea-title" class="pundit-pane-title" >Comment:</span>';
        
        if (self.opts.enableEntitiesExtraction)
            c += '          <span class="pundit-gui-button" id="pundit-ctp-extract-tags" disabled="true" style="float:right;margin-right:5px;">Extract Tags</span>';
        
        c += '          <span style="float:right;margin-right:5px;">Language: ';
        c += '          <select dojotype="dijit.form.ComboBox" id="pundit-ctp-language"></span>';
        c += '              <option selected>en</option>';
        c += '              <option>it</option>';
        c += '          </select>';
        c += '      </div>';
        c += '      <div class="pundit-ctp-comment-input">';
        c += '          <section contenteditable="true" id="pundit-ctp-comment-input" class="pundit-stop-wheel-propagation"></section>';
        c += '      </div>';
        c += '   </div>';
        dojo.query('#' + self._id + ' .pundit-rp-search-panel').prepend(c);
        dojo.query('#' + self._id + ' .pundit-rp-title')[0].innerHTML = "Tags";
    },
    initContextMenu:function(){
        this.inherited(arguments);
        var self = this;

        // Freshly selected portion of text: add comments/tags action
        cMenu.addAction({
            type: ['textSelectionHelper', 'annotatedtextfragment', 'bookmarkedtextfragment'],
            name: 'NewAddCommentTagToText',
            label: 'Add Comment or Tags',
            showIf: function(item) { 
                return true;
            },
            onclick: function(item) {
                _PUNDIT.ga.track('cmenu', 'click', 'add-comment-or-tags');
                self.initPanel(item, "Comment and tags");
                //TODO: remove this and refactor
                // This is temporally set to false when the panel is used as an Entity Extraction tool :)
                self.saveComment = true;
                return true;
            }
        });

        if (self.opts.enableEntitiesExtraction) {

            cMenu.addAction({
                type: ['textSelectionHelper'],
                name: 'extractEntities',
                label: 'Extract entities',
                showIf: function(item) {
                    return true;
                },
                onclick: function(item) {
                    _PUNDIT.ga.track('cmenu', 'click', 'extract-entities');

                    self.initPanel(item, "Extract entitites");
                    dojo.byId('pundit-ctp-textarea-title').innerHTML = "Selected text:"
                    dojo.html.set('pundit-ctp-comment-input', item.description);
                    
                    //TODO: remove this and refactor
                    // This is temporally set to false when the panel is used as an Entity Extraction tool :)
                    self.saveComment = false;
                    self.extractTags(dojo.byId('pundit-ctp-language').value);
                    return true;
                } // onclick
            });

        }

        
    },
    initBehaviors: function() {
        this.inherited(arguments);
        var self = this;
        dojo.connect(dojo.byId("pundit-ctp-comment-input"),'onclick', function(){
            var comment = dojo.byId('pundit-ctp-comment-input').innerHTML.replace(/<(?:.|\n)*?>/gm, '');
            self.cancelPendingSpotlightRequests();
            dojo.query('#' + self._id + ' .pundit-pane').removeClass('pundit-panel-loading');
            self.updateSaveBtn();
        });

        dojo.connect(dojo.byId("pundit-ctp-comment-input"), 'onkeyup', function(){
            self.updateSaveBtn();
        });

        if (self.opts.enableEntitiesExtraction)
            dojo.connect(dojo.byId('pundit-ctp-extract-tags'), 'onclick', function (evt) {
                if (!dojo.hasClass(dojo.byId('pundit-ctp-extract-tags'), 'pundit-button-disabled')) 
                    self.extractTags(dojo.byId('pundit-ctp-language').value);
            });

        dojo.behavior.add({
            '#pundit-ctp-comment-input a':{
                'onmouseover':function(e){
                    var uri = dojo.attr(e.target, 'about');
                        
                    self.showPreview(uri);
                    for (var i in self.tagsDnD.map){
                        if (self.tagsDnD.map[i].data.value === uri){
                            dojo.addClass(i,'pundit-item-selected');
                        }
                    }
                }
            }
        });
    },
	
    /**
	* @method extractTags
    * @description Extract tags from input,  them to the tag container and
    * markup the text in the input corresponding to each tag.
    * @param text {string} 
    * @return {void}
	*/
    //TODO Language is not used!
	extractTags: function(language) {
		var self = this,
            tags = [];
        //Remove spotlight tags if any
        var comment = unescape(dojo.byId('pundit-ctp-comment-input').innerHTML.replace(/<(?:.|\n)*?>/gm, '').replace(/&nbsp;/g, ' '));
        if (comment !== "") {
                
            self.cancelPendingSpotlightRequests();
                
            self.tagsDnD.selectNone();
            dojo.query('#' + self._id + ' .pundit-rp-tags li.dojoDndItem').forEach(function(tag){
                if (typeof(self.tagsDnD.map[tag.id].data.suggested) !== 'undefined'){
                        self.tagsDnD.selection[tag.id] = 1;
                        self.removeItemFromUri(self.tagsDnD.map[tag.id].data.value);
                }
            });
            self.tagsDnD.deleteSelectedNodes();
                
            //Remove tags
            if (self.tagListItemSelected) {
                self.tagListItemSelected = false;
            }
                
            dojo.query('#' + self._id + ' .pundit-pane').addClass('pundit-panel-loading');
            self.enableSemanticExpansion = self.entityExtractor.getEntities(
				language,
                comment, 
                function(tags){
                    //for (var i in tags){
                    for (var i = tags.length; i--;){
                        self.tagItems.push(tags[i]);
                        tags[i]['pundit-items'][0].suggested = true;
                        tags[i]['pundit-items'][0].rdfData = semlibItems.createBucketForVocabItem(tags[i]['pundit-items'][0]).bucket;
                        if (!self.uriInItems(tags[i]['pundit-items'][0].value)){
                            self.tagsDnD.insertNodes(false, [tags[i]['pundit-items'][0]]);
                            previewer.buildPreviewForItem(tags[i]['pundit-items'][0]);        
                        } 
                    }
                    self.markupText(tags);
                    dojo.query('#' + self._id + ' .pundit-pane').removeClass('pundit-panel-loading');
                    dojo.behavior.apply();
                }, 
                function(){
                    dojo.query('#' + self._id + ' .pundit-pane').removeClass('pundit-panel-loading');
                }
            );
            self.lastSearchedComment = comment;
            if (self.opts.enableEntitiesExtraction)
                dojo.query('#pundit-ctp-extract-tags').attr('disabled', true);
            self.tagItems = [];
            self.updateSaveBtn();
        }	
	},
	
    //Save user created triples
    saveTriples: function(){
        var self = this,
            annotationPageContext = _PUNDIT.tripleComposer.getSafePageContext(),
            comment = self.parseInputText(dojo.byId('pundit-ctp-comment-input')),
            b = new pundit.TriplesBucket();

        // Tags triples
        if (self.saveComment && comment !== '')
                b.addTriple(self.target, ns.pundit_hasComment, comment, 'literal');
        
        for (var j in self.tagsDnD.map){
            var item = self.tagsDnD.map[j];
            b.addTriple(self.target, ns.pundit_hasTag, item.data.value, 'uri');
        }
        
        if (!b.isEmpty()) {
	        self.log('Saving triples json: ' + dojo.toJson(b.getTalisJson()));
            
            var targets = [self.target];
            
            //TODO: hack to support Image Fragment annotation. If is a a n image fragment we also add the parent image as target
            var targetItem = _PUNDIT.items.getItemByUri(self.target);
            if (targetItem.rdftype.indexOf(ns.fragments.image) !== -1) {
                var parentImageXpointer = semlibImageFragmentHandler.getParentImageXpointer(targetItem.value);
                targets.push(parentImageXpointer);
            }
            
            self.saver.writeAnnotationContent(b, targets, annotationPageContext);
		} else {
		    self.log('Empty bucket in saveTriples??!');
		}
    },// saveTriples()
    /* Saves to the pundit server the current composed triples.
     * @method saveTriples
     */
     saveItems: function(annotationID) {
        var self = this,
            b = new pundit.TriplesBucket(),
            items = [],
            item = _PUNDIT.items.getItemByUri(self.target);
        
        items.push(item.rdfData);
        
        self.tagsDnD.forInItems(function(item) {items.push(item.data.rdfData);});
        
        //for (var i in items){
        for (var i = items.length; i--;){
            b.concatBucket(items[i]);
        }
        
        if (!b.isEmpty()) {
            self.log('Posting '+items.length+' items with '+b.bucket.length+' triples..');
            self.saver.writeAnnotationItems(annotationID, dojo.toJson(b.getTalisJson()));
        } else {
            self.log('saveItems with an empty bucket??!');
        }
    }, // saveItems()
    
    updateSaveBtn: function(){
        var self = this,
            comment = dojo.byId('pundit-ctp-comment-input').innerHTML.replace(/<(?:.|\n)*?>/gm, ''),
            sbtn = dojo.query("#" + self._id + ' .pundit-rp-save-button')[0],
            ebtn = dojo.byId('pundit-ctp-extract-tags');
            
        if (comment === '' && (self.tagsDnD.getAllNodes().length === 0)) {
            dojo.addClass(sbtn, 'pundit-button-disabled');
            if (self.opts.enableEntitiesExtraction)
                dojo.addClass(ebtn, 'pundit-button-disabled');
        } else {
            dojo.removeClass(sbtn, 'pundit-button-disabled');
            if (self.opts.enableEntitiesExtraction)
                dojo.removeClass(ebtn, 'pundit-button-disabled');
        }
    },
    
    /**
	* @method parseInputText
    * @description Parses the input types by user and performs text transformations, e.g. to escape unpermitted tags.
    * @param text {string} 
    * @return {string}
	*/
	parseInputText: function(text) {
		return unescape(text.innerHTML.replace(/&nbsp;/g,' '));
	},
    
    /*@method markupText
    * @description Add markup to the text given an array containing tags info objects
    * @param tags {array} 
    * @return {void}
	*/
    markupText:function(tags){
        var self = this,
            a,
            tag,
            offset,
			lastOffset,
            text = unescape(dojo.byId('pundit-ctp-comment-input').innerHTML.replace(/<(?:.|\n)*?>/gm, '').replace(/&nbsp;/g, ' ')),
            sortedTags = self.getTagsSortedByOffset(tags);
        //for (var i in sortedTags){
        for (var i = 0; i < sortedTags.length; i++){
            offset = parseInt(sortedTags[i][0]);
			if (typeof(lastOffset) !== 'undefined' && ((offset === lastOffset) || (offset + tag.length >= lastOffset))) {
				continue;
			}
            tag = sortedTags[i][1];
            a = '<a about="' + tag.uri + '" href="' + tag.uri + '" target="_blank">' + tag.match + '</a>';
            text = text.substring(0, offset) + a + text.substring(offset + parseInt(tag.length), text.length);
			lastOffset = offset;
        }
        dojo.html.set('pundit-ctp-comment-input', text);
    },
    
    cancelPendingSpotlightRequests: function(){
        var self = this;
        if (typeof(self.enableSemanticExpansion) !== "undefined") 
            self.enableSemanticExpansion.cancel();
    },

    /**
    * @method itemIndex
    * @description Return the index of the Tag item in the tagItem array container
    * given its uri or -1 if no tag item has such index.
    * @param uri {string} 
    * @return {integer}
    * 
    */
    itemIndex: function(uri){
        var self = this;
        for (var i= self.tagItems.length -1; i>=0; i--){
            if (self.tagItems[i].uri === uri)
                return i;
        }
        return -1;
    },
    uriInItems:function(uri){
        var self = this,
            inItems = false;
        
        self.tagsDnD.forInItems(function(item){
            if (item.data.value === uri){
                inItems = true;
                return;
            }   
        });
        return inItems;
    },
    hide:function(){
        this.inherited(arguments);
        var self = this;
        //Need to empty also the comment tag panel
        self.cancelPendingRequests();
        self.lastSearchedComment = '';
        dojo.empty(dojo.byId('pundit-ctp-comment-input'));
    },
    show:function(){
        this.inherited(arguments);
        dojo.query('#pundit-ctp-extract-tags').attr('disabled', true);
    },
    removeTag:function(e){
        //Need to remove the markup from the input
        var self = this,
            node = dojo.query(dojo.query(e.target).parent()[0]),
            uri = self.tagsDnD.getItem(node[0].id).data.value;
        self.tagsDnD.deleteSelectedNodes();
        dojo.behavior.apply();
        self.removeItemFromUri(uri);
        self.updateMarkup();
        self.updateSaveBtn();
        return true;
    },
    /**
    * @method removeItemFromUri
    * @description Remove a tag item from the tagItems array and from the tag 
    * container given its uri
    * @param uri {string} 
    * @return {void}
    */
    removeItemFromUri:function(uri){
        var self = this,
        index = this.itemIndex(uri);
        
        for (var i = self.tagItems.length-1; i>= 0; i--){
            if (self.tagItems[i].uri === uri)
                self.tagItems.splice(i,1);
        }
        dojo.destroy(dojo.query('#pundit-ctp-tag-list li[about=' + uri + ']')[0]);
    },
    updateMarkup:function(){
        var self = this;
        self.markupText(self.tagItems);
    },
    cancelPendingRequests: function(){
        var self = this;
        
        self.cancelPendingSpotlightRequests();

        if (typeof(self.lastTagRequest) !== 'undefined')
                self.lastTagRequest.cancel();
    },
    onItemMouseOver:function(e){
        var self = this,
            node,
            nodeUri;
        if (e.target.nodeName === 'LI'){
            node = dojo.query(e.target);
        }else{
            node = dojo.query(dojo.query(e.target).parent()[0]);
        }
        nodeUri = self.tagsDnD.getItem(node[0].id).data.value;
        dojo.query('#pundit-ctp-comment-input a[about="' + nodeUri + '"]').forEach(function(node,i){
            dojo.addClass(node, 'pundit-selected');
        });
        self.showPreview(nodeUri);
    },
    onItemMouseOut:function(e){
        //Override to add functionality on mouse out
        var self = this,
            node,
            nodeUri; 
        
        if (e.target.nodeName === 'LI'){
            node = dojo.query(e.target);
        }else{
            node = dojo.query(dojo.query(e.target).parent()[0]);
        }
        nodeUri= self.tagsDnD.getItem(node[0].id).data.value;
        
        dojo.query('#pundit-ctp-comment-input a[about="' + nodeUri + '"]').forEach(function(node,i){
            dojo.removeClass(node, 'pundit-selected');
        });
    },
    initPanel:function(item, title){
        var self = this,
        itemsObject = {},
        myitems = semlibMyItems.getItemsFromTerm('', [], [ns.fragments.text, ns.image]),
        pageitems = semlibItems.getItemsFromTerm('', [], [ns.fragments.text, ns.image]);
        
        itemsObject = {
            myitems : {
                label: 'My Items',
                items: myitems
            },
            pageitems : {
                label: 'Page Items',
                items: pageitems
            }
        }
            
        for (var v in _PUNDIT['vocab'].vocabs){
            var vItems = _PUNDIT['vocab'].getItemsForTermInVocab('', v);
            itemsObject[v] = {
                label : v,
                items : vItems
            }
        }

        self.load(itemsObject, '');
                
        self.show(200, 100, {
            title: title,
            target: item //DEBUG Pass it in another way?
        });
		
		dojo.byId('pundit-ctp-comment-input').focus();
        return true;
    },
    /**
    * @method getTagsSortedByOffset
    * @description Order tags extracted from text according to their offset 
    * (decreasing order). It creates an array of arrays [offset, tagObject]
    * ordered according to the offset (so it is possible to iterate on it.
    * @param tags {array} 
    * @return {array}
    */
    getTagsSortedByOffset:function(tags){
        var self = this,
            sortedTags = [];
        
        //for (var i = tags.length; i--;){
        for (var i = 0; i < tags.length; i++){
            sortedTags.push([parseInt(tags[i].offset), tags[i]]);
        }
        sortedTags.sort((function(a, b) {return b[0] - a[0]}));
        return sortedTags;
    }
});
