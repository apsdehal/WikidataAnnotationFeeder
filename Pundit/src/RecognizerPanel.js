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
 * @class pundit.RecognizerPanel
 * @extends pundit.ResourcesPanel
 * @description Provides a GUI (floating Panel) for recognizing a selected text fragment
 * searching in different sources ('My Item', 'Page Items', Vocabularies) and from lookup services
 * Freebase, Dbpedia and Wordnet.
 * It extend the Resource Panel search capability with the possibity to selected
 * searched tags and use to compose a triple <br>
 * :fragment rdfs:seeAlso tag1, tag2, ...
 */
dojo.provide("pundit.RecognizerPanel");
dojo.declare("pundit.RecognizerPanel", pundit.ResourcesPanel, {
    // TODO: move this comment to some @property and some into the class declaration
    // TODO: same comment as in comment tag ??!
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
    constructor:function(options){
        var self = this;
        //Handle saving
        self.saver = new pundit.AnnotationWriter({debug: self.opts.debug});
        self.saver.onSaveItems(function(annotationID) {
            self.log('onSaveItems: Saver answered with '+ annotationID);
            self.saved = true;
                    // On close, remove the highlight, and avoid an opening highlight
            self.hide();
            tooltip_viewer.refreshAnnotations();
        });
        self.saver.onSave(function(m){
            self.log('onSave: Saver answered with '+m);
            self.saveItems(m);
        });
        //DEBUG Use callback instead of a function
        self.onItemAdded(self.addItem);
        
    },
    initHTML:function(){
        this.inherited(arguments);
        var self = this;
        var c = '<div class="pundit-rp-panel-tags-container pundit-rp-container-suggestions pundit-visible pundit-expanded pundit-floating-panel-container">';
        c += '      <div>';
        c += '          <span class="pundit-pane-title pundit-rp-title">Selected Entities:</span>';
        c += '          <div class="pundit-pane"><ul class="pundit-rp-tags pundit-items pundit-view-list showsRemoveButton pundit-stop-wheel-propagation"></ul></div>';
        c += '      </div>';
        c += '   </div>';
        c += '   <div class="pundit-rp-button-container">';
        c += '   <span class="pundit-rp-save-button pundit-gui-button pundit-button-disabled">Save</span></div>';

        dojo.query('#' + self._id + ' .pundit-rp-container-search').prepend(c);
    },
    initDnD:function(){
        this.inherited(arguments);
        var self = this;
        self.tagsDnD = new dojo.dnd.Target(dojo.query('#' + self._id + ' .pundit-rp-tags')[0],{
            copyOnly: true,
            creator: semlibItems.itemNodeCreator,
            checkAcceptance: function(source, nodes) {
                if (self.acceptSource(source)){
                    //for (var i in nodes){
                    for (var i = nodes.length; i--;){
                        if (self.uriInItems(source.getItem(nodes[i].id).data.value))
                            return false;
                        else
                            return true;
                    }
                    return true;
                }
                else{
                    return false;
                }
            }
        });
    },
    initBehaviors: function() {
        this.inherited(arguments);
        var self = this;
        
        dojo.connect(dojo.query('#' + self._id + ' .pundit-rp-save-button')[0], 'onclick', function(e){
            _PUNDIT.ga.track('gui-button', 'click', self._id+'-pundit-rp-save-button');
            if (!dojo.hasClass(dojo.query('#' + self._id + ' .pundit-rp-save-button')[0], 'pundit-button-disabled')) {
                self.saveTriples();
            } else
                console.log('Not saving.');
        });
        var beh = {};
        beh['#' + self._id + ' .pundit-rp-tags li.dojoDndItem span.pundit-item-remove-button'] = {
            'onclick':function(e){
                self.removeTag(e);
            }
        };
        beh['#'+ self._id + ' .pundit-rp-tags' + ' li.dojoDndItem'] = {
            'onmouseover':function(e){
                self.onItemMouseOver(e);
            },
            'onmouseout':function(e){
                self.onItemMouseOut(e);
            }
        };
        dojo.behavior.add(beh);
        dojo.behavior.apply();
        
        dojo.subscribe("/dnd/drop", function(source, nodes, copy, target) {
            if (target === self.tagsDnD){
                //DEBUG Simone: If called as soon as the item is dropped item 
                //has not been added yet and the update fails. Any hint?
                setTimeout(function(){self.updateSaveBtn();},100);
            }
        });
    },
    saveTriples: function(){
        var self = this;
        var annotationPageContext = _PUNDIT.tripleComposer.getSafePageContext(),
            b = new pundit.TriplesBucket();

        // Tags triples
        for (var j in self.tagsDnD.map){
            var item = self.tagsDnD.map[j];
            b.addTriple(self.target, ns.rdfs_seeAlso, item.data.value, 'uri');
        }

        if (!b.isEmpty()) {
            self.log('Saving triples json: ' + dojo.toJson(b.getTalisJson()));
            self.saver.writeAnnotationContent(b, [self.target], annotationPageContext);
        } else {
            self.log('Empty bucket in saveTriples??!');
        }
    }, // saveTriples()

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
        
        //Property Metadata
        b.addTriple(ns.rdfs_seeAlso, ns.rdf_type, ns.rdf_property, 'uri');
        b.addTriple(ns.rdfs_seeAlso, ns.rdfs_label, 'see also', 'literal');
        
        if (!b.isEmpty()) {
            self.log('Posting '+items.length+' items with '+b.bucket.length+' triples..');
            self.saver.writeAnnotationItems(annotationID, dojo.toJson(b.getTalisJson()));
        } else {
            self.log('saveItems with an empty bucket??!');
        }
        //tooltip_viewer.removeHighlightByXpointer(self.xpTarget);
        //tooltip_viewer.removeTempXpointer(self.xpTarget);

    }, // saveItems()
    //Return true if the source is one of the panel sources
    acceptSource:function(source){
        var self=this;
        for (var i in self.panels){
            if (source === self['itemsDnD' + i])
                return true;
        }
            return false;
    },
    //TODO This function is also in comment tag panel. Should we add a Helper Class
    //Check if the item is already in tag container 
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
    show:function(x,y, params){
        this.inherited(arguments);
        var self = this,
            item;
        self.tempItemAdded = false;//Track if the added temp item has to be removed
        self.saved = false;
        self.target = params.target.value;
        item = params.target; 
        self.updateSaveBtn();
        if (!semlibItems.uriInItems(self.target)) {
            semlibItems.addItem(item);
            self.tempItemAdded = true;
            previewer.buildPreviewForItem(item);
        }
                
        if (!tooltip_viewer.isTempXpointer(self.target)){
            if (self.target !== _PUNDIT.tripleComposer.getSafePageContext())
                tooltip_viewer.tempXpointers.push(self.target);
                //tooltip_viewer.refreshAnnotations();
                // DEBUG: not sure we can avoid the refreshAnnotations() process
                tooltip_viewer.consolidate();   
        }
        
        tooltip_viewer.highlightByXpointer(self.target);
    }, 
    hide:function(){
        this.inherited(arguments);
        var self = this;
        dojo.empty(dojo.query('#' + self._id + ' ul.pundit-rp-tags'));
        self.tagsDnD.selectAll();
        self.tagsDnD.deleteSelectedNodes();
        self.tagsDnD.sync();
        // on next consolidate
        tooltip_viewer.removeHighlightByXpointer(self.target);
        //Remove the xpointer from the tempXpointers
        tooltip_viewer.removeTempXpointer(self.target);

        if (!self.saved){
            semlibItems.removeItemFromUri(self.target);
            tooltip_viewer.consolidate();
            //tooltip_viewer.refreshAnnotations();
        }
    },
    //Add the item to the tag container
    addItem:function(item){
        var self = this;
        if (!self.uriInItems(item.value))
            self.tagsDnD.insertNodes(false, [item]);
        self.updateSaveBtn();
        dojo.behavior.apply();
    },
    
    removeTag:function(e){
        var self=this,
            node = dojo.query(dojo.query(e.target).parent()[0]),
            uri = self.tagsDnD.getItem(node[0].id).data.value;
        self.tagsDnD.deleteSelectedNodes();
        dojo.destroy(node);
        dojo.behavior.apply();
        self.updateSaveBtn();
    },
    onItemMouseOver:function(e){
        var self=this,
            node,
            nodeUri;

        if (e.target.nodeName === 'LI'){
            node = dojo.query(e.target);
        }else{
            node = dojo.query(dojo.query(e.target).parent()[0]);
        }
                    
        nodeUri = self.tagsDnD.getItem(node[0].id).data.value;
        //previewer.selectAndPreviewItemWithId(node[0].id, nodeUri);
        self.showPreview(nodeUri);
    },
    onItemMouseOut:function(e){
        //Override to add functionality on mouse out
    }

});
   
   

