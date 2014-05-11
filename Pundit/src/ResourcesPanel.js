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
 * @class pundit.ResourcesPanel
 * @extends pundit.BasePanel
 * @description Provides a GUI (floating Panel) for showing items grouped according 
 * from their provenance ('My Item', 'Page Items', Vocabularies)
 */
dojo.provide("pundit.ResourcesPanel");
dojo.declare("pundit.ResourcesPanel", pundit.BasePanel, {

    // TODO: move this comment to some @property and some into the class declaration
    // TODO: WTF same comment recognizer AND comment panel ??!
    /*
    * @constructor
    * @description Initializes the component
    * @param options {object}
    * @param options.name {string} the name of the panel used to create a unique id
    * @param options.title {string} the title of the panel 
    * @param options.drag {boolean} if set to true it enable the panel to be dragged
    * @param options.preview {boolean} if set to true enable the preview visualization (
    * otherwise the normal preview (in Pundit Window) is used
    * assigned explicitly dojo's 'declaredClass' field will be used.
    * @param options.keyInputTimerLength {number} The number of milliseconds to
    * to wait after a keystroke before querying the service. Default:500
    * @param options.maxShownItems {number} Max number of items shown in each source container.
    * Default = 4
    * @param options.suggestionPanels {object} .
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
    * @param options.namedEntitiesSources {object} An object representing the source 
    * used for the lookup. Default is {} meaning that there is no lookup.<br>
    * To enable lookup from Freebase and Dbpedia:<br>
    * {<br/>
    *   freebase:{label: 'Freebase'},<br>
    *   dbpedia:{label:'DBpedia'},<br>
    *   wordnet:{label:'Wordnet'}<br>
    * }<br>
    * @param options.searchType {string} The type of search that is performed. Two
    * kind of searches are supported.<br> 
    * Default is 'filter' which filters the items according to input string 
    * restricting the shown items<br>
    * 'search' search in all the items source
    */
   
    //TODO use opts for parameters as in selector.js
   
    //TODO Use parameter to create the different container
    constructor: function(options) {
        var self = this;
        self._lastKeyword = "";
        self.previewTimer = null;
        
        self.keywordMinimumLength = 3;
        // Ms to wait after a keystroke before querying the service
        self.keyInputTimerLength = 500;
        
        self.maxShownItems = options.maxShownItems || 4;
        
        self.suggestionPanels = options.suggestionPanels || {
                myitems: {
                    label:'My Items',
                    expanded: true
                }, 
                pageitems: {
                    label: 'Page Items'
                }, 
                properties: {
                    label: 'Properties',
                    expanded: true
                }
            };
            
        /*
        self.namedEntitiesSources = options.namedEntitiesSources || {
//            Freebase:{label: 'Freebase'},
//            DBPedia:{label:'DBpedia'},
//            Wordnet:{label:'Wordnet'}
        };
        */
        
        //DEBUG Find a better way to do this...
        //Do I need an object or is enought an array????
        self.panels = {};
        for (var attrname in self.suggestionPanels) { self.panels[attrname] = self.suggestionPanels[attrname]; }
        for (var attrname in self.namedEntitiesSources) { self.panels[attrname] = self.namedEntitiesSources[attrname]; }

        //TODO Pass directly the function to be used in the search?
        self.searchType = options.searchType || 'filter';
        
        //What if no vocabs have to been loaded???
        if (_PUNDIT.config.vocabularies.length !== 0){
            _PUNDIT['vocab'].onVocabsLoaded(function(){
                //TODO These should be options
                //Add vocabs to suggestion panels
                self.log('Vocab loaded. Init HTML Resource panel')
                for (var i in _PUNDIT.vocab.vocabs){
                    self.suggestionPanels[i] = {label: _PUNDIT.vocab.vocabs[i].label};
                    self.panels[i] = i;
                }

                self.initHTML();
                self.initDnD();
                self.initContextMenu();
                self.initBehaviors(); 
            });
        }else{
            self.initHTML();
            self.initDnD();
            self.initContextMenu();
            self.initBehaviors();
        }
        
        
        self.createCallback('itemAdded');
        
        self.log("Resource Panel up and running");
        dojo.behavior.apply();              
    }, // constructor
    
    //Add the HTML to the basePanel content
    initHTML: function(){
        var self= this;
        self.log('Init HTML Resource Panel');
        //Add content to the base container
        self.log('Resource Panel Contructor');
        self.expandedClass;
        var  c = '              <div class="pundit-rp-literal-panel pundit-hidden">';
            c += '                  <div class="pundit-rp-container-literal">';
            c += '                      <span class="class="pundit-pane-title" pundit-rp-subtitle">Insert text:</span>';
            c += '                      <section contenteditable="true" class="pundit-rp-literal-text pundit-stop-wheel-propagation" ></section>';
            c += '                      <div class="pundit-rp-literal-panel-buttons">';
            c += '                          <button class="pundit-rp-panel-close" value="Close">Close</button><button class="pundit-rp-literal-panel-done" disabled="true">Done</button>';
            c += '                      </div>';
            c += '                  </div>';
            c += '              </div>';
            
            c += '              <div class="pundit-rp-date-panel pundit-hidden">';
            c += '                  <div class="puntid-rp-container-date">';
            c += '                      <span class="class="pundit-pane-title" pundit-rp-subtitle">Date in "YYYY-MM-DD" format: </span><br/>';
            c += '                      <input type="text" class="pundit-rp-date-input" required pattern="[0-9]{4}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|2[0-9])|(?:(?!02)(?:0[1-9]|1[0-2])-(?:30))|(?:(?:0[13578]|1[02])-31))"/>';
            c += '                      <div class="pundit-rp-date-validation"></div>';
            c += '                      <div class="pundit-rp-panel-buttons">';
            c += '                          <button class="pundit-rp-panel-close" value="Close">Close</button><button class="pundit-rp-date-panel-done" disabled="true">Done</button>';
            c += '                      </div>';
            c += '                  </div>';
            c += '              </div>';
            
            c += '              <div class="pundit-rp-search-panel">';
            c += '                  <div class="pundit-rp-container-search">';
            c += '                      <span class="pundit-pane-title pundit-rp-subtitle">Search:</span>';
            c += '                      <div>';
            c += '                          <input class="pundit-rp-search-input pundit-dialog-input" row="1" placeholder="...type here" value="" type="text"/>';
            c += '                          &nbsp; <button class="pundit-rp-add-literal" >Literal</button>';
            c += '                          <button class="pundit-rp-add-date">Date</button>';

            // Add the Korbo Entity Editor button to the suggestions panel, only
            // if configured and if it is not a predicate suggestion panel
            if (_PUNDIT.config.isModuleActive('pundit.ng.EntityEditorHelper') && self.opts.field !== "predicate") {
                c += '                          <button class="pundit-rp-korbo">Korbo</button>';
            }
                
            c += '                      </div>';
            c += '                      <div class="pundit-rp-suggestions"></div>';
            c += '                  </div>';
            c += '              </div>';
        self.addHTMLContent(c);
            
        //Add panels for showing suggestions from different sources
        for (var i in self.suggestionPanels){
            self.expandedClass = '';
            if (self.suggestionPanels[i].expanded)
                self.expandedClass = 'pundit-expanded';
            c =  '          <div id="'+ self._id + '-container-suggestions-' + i + '" class="pundit-rp-container-suggestions pundit-suggestions fillheight ' + self.expandedClass +'">';
            c += '              <div><span class="pundit-icon-collapse pundit-fp-collapsed"></span><span class="pundit-fp-source-name">' + self.suggestionPanels[i].label + '</span><span class="pundit-items-number">(0)</span></div>';
            c += '              <ul id="'+ self._id + '-suggestions-list-' + i + '" class="pundit-rp-suggestions-list pundit-view-list pundit-items list pundit-item-add-button pundit-stop-wheel-propagation"></ul>';
            c += '          </div>';
            dojo.query('#' + self._id + ' .pundit-rp-suggestions').append(c);
        }
        for (var i in self.namedEntitiesSources){
            self.expandedClass = '';
            if (self.namedEntitiesSources[i].expanded)
                self.expandedClass = 'pundit-expanded';
            c =  '          <div id="'+ self._id + '-container-suggestions-' + i + '" class="pundit-rp-container-suggestions pundit-items-container pundit-lookup pundit-visible fillheight  ' + self.expandedClass +'">';
            c += '              <div><span class="pundit-icon-collapse pundit-fp-collapsed"></span><span class="pundit-fp-source-name">' + self.namedEntitiesSources[i].label + '</span><span class="pundit-items-number">(0)</span></div>';
            c += '              <ul id="'+ self._id + '-suggestions-list-' + i + '" class="pundit-rp-suggestions-list pundit-view-list pundit-items list pundit-item-add-button pundit-stop-wheel-propagation"></ul>';
            c += '              <span class="pundit-error-message">' + self.namedEntitiesSources[i].label +' is not responding</span>';
            c += '          </div>';
            dojo.query('#' + self._id + ' .pundit-rp-suggestions').append(c);
        }    
    },
    
    //init the itemsDnD for the various container
    initDnD: function() {
        var self = this;
        
        for (var i in self.suggestionPanels){
            self['itemsDnD' + i] = new dojo.dnd.Source(self._id + "-suggestions-list-"  + i, {
                copyOnly: true, 
                creator: semlibItems.itemNodeCreator,
                checkAcceptance: function() {return false;}
            });
        }
        for (var i in self.namedEntitiesSources){
            self['itemsDnD' + i] = new dojo.dnd.Source(self._id + "-suggestions-list-"  + i, {
                copyOnly: true, 
                creator: semlibItems.itemNodeCreator,
                checkAcceptance: function() {return false;}
            });
        }
    }, // initDnD
    
	
    performSearch: function(keyword) {
        var self = this;
        // TODO Consider to include minimum length for the word?
        _PUNDIT.ga.track('search', 'resources-panel-search', 'term='+keyword);

        if (keyword !== self._lastKeyword){
            // TODO should I pass the search function as parameter?
            self._lastKeyword = keyword;
            if (self.searchType === 'filter'){
                self.filterItemsByTerm(keyword);
            // Always search in freebase and dbpedia?
            } else if (self.searchType === 'search'){
                self.searchItemsByTerm(keyword);
                // Always search in freebase and dbpedia
            }

            self.searchNamedEntities(keyword);

        }
    },

    // Init the behaviors of the component
    initBehaviors: function() {
        var self = this;
        
        // Add the Korbo Entity Editor button to the suggestions panel, if needed
        if (_PUNDIT.config.isModuleActive('pundit.ng.EntityEditorHelper') && self.opts.field !== "predicate") {
            dojo.connect(dojo.query('#' + self._id + ' .pundit-rp-korbo')[0], 'onclick', function(e) {
                var keyword = dojo.query('#' + self._id + ' .pundit-rp-search-input')[0].value;
                _PUNDIT.ngEE.openEE(keyword, self.opts.field);
            });
        }
        
        
        //TODO Do I need a callback to better handle this?
        dojo.connect(dojo.query('body')[0], (!dojo.isMozilla ? "onmousewheel" : "DOMMouseScroll"), function(e) {
            if (e.target.id === 'pundit-tc-triples-container' && self.inShowing) {
                self.hide();
                dojo.stopEvent(e);
            }            
        });
        
        dojo.connect(dojo.query('#' + self._id + ' .pundit-rp-search-input')[0], 'onkeyup', function(e) {
            //self.setLoading(false);
            clearTimeout(self.keyInputTimer);
            var keyword = dojo.query('#' + self._id + ' .pundit-rp-search-input')[0].value;
            self.keyInputTimer = setTimeout(function(){
                self.performSearch(keyword)
            }, self.keyInputTimerLength);
        });
        
        dojo.connect(dojo.query('#' + self._id + ' .pundit-rp-add-literal')[0], 'onclick', function(e) {
            _PUNDIT.ga.track('gui-button', 'click', 'resources-panel-add-literal');
            self.showLiteralPanel(true, false);
        });

        dojo.connect(dojo.query('#' + self._id + ' .pundit-rp-add-date')[0], 'onclick', function(e) {
            _PUNDIT.ga.track('gui-button', 'click', 'resources-panel-add-date');
            self.showDatePanel(true, false);
        });

        dojo.connect(dojo.query('#' +self._id+' .pundit-rp-date-input')[0], 'onkeyup', function(e){
            self.checkDate(e);
        });

        
        dojo.connect(dojo.query('#' +self._id+' .pundit-rp-literal-text')[0], 'onkeyup', function(e){
            if (dojo.query(e.target)[0].innerHTML.replace(/<(?:.|\n)*?>/gm, '') !== '')
                dojo.attr(dojo.query('#' + self._id + ' .pundit-rp-literal-panel-done')[0], 'disabled', false);
            else
                dojo.attr(dojo.query('#' + self._id + ' .pundit-rp-literal-panel-done')[0], 'disabled', true);
        });
        
        dojo.connect(dojo.query('#' + self._id + ' .pundit-rp-panel-close')[0], 'onclick', function() {
            _PUNDIT.ga.track('gui-button', 'click', 'resources-panel-close-literal-panel');
            self.showLiteralPanel(false, false);
        });
        // TODO: [0] [1] ?? connect better .. ? behavior ? on() ? 
        dojo.connect(dojo.query('#' + self._id + ' .pundit-rp-panel-close')[1], 'onclick', function() {
            _PUNDIT.ga.track('gui-button', 'click', 'resources-panel-close-literal-panel');
            self.showLiteralPanel(false, false);
        });
        
        dojo.connect(dojo.query('#' + self._id + ' .pundit-rp-literal-panel-done')[0], 'onclick', function() {
            _PUNDIT.ga.track('gui-button', 'click', 'resources-panel-done-literal-panel');
            self.createLiteralItem();
        });
        
        dojo.connect(dojo.query('#' + self._id + ' .pundit-rp-date-panel-done')[0], 'onclick', function() {
            _PUNDIT.ga.track('gui-button', 'click', 'resources-panel-done-literal-panel');
            self.createDateItem();
        });
        
        
        //Make parametrics this behaviors
        var beh = {};
        
        
        for (var i in self.panels){
            (function(_sp){
                beh['#'+ self._id + ' span.pundit-icon-collapse'] = {
                    'onclick': function(e){
                        var parent = dojo.query(e.target).parent().parent()[0];
                        if (dojo.hasClass(parent,'pundit-expanded')){
                            dojo.removeClass(parent,'pundit-expanded');
                            dojo.style(dojo.query(parent).children('ul')[0], 'height' , '0px');
                            self.adjustPreviewHeight();
                        }else{
                           dojo.addClass(parent,'pundit-expanded');
                           self.adjustPanelsHeight();
                        }
                    }
                };    
                beh['#'+ self._id + '-suggestions-list-' + _sp + ' li.dojoDndItem'] = {
                    'onmouseover':function(e){
                        var img ='',
                        node,
                        nodeUri;

                        if (e.target.nodeName === 'LI'){
                            node = dojo.query(e.target);
                        }else{
                            node = dojo.query(dojo.query(e.target).parent()[0]);
                            }
                    
                        nodeUri = self['itemsDnD' + _sp].getItem(node[0].id).data.value;
                        //previewer.selectAndPreviewItemWithId(node[0].id, nodeUri);
                        self.showPreview(nodeUri);
                    },
                    //MULTIPLOP Force the selection of the clicked node to avoid multiple drag
                    'onclick':function(e) {
                        var target = e.target;
                        while (!dojo.hasClass(dojo.query(target)[0], 'dojoDndItem'))
                            target = dojo.query(target).parent()[0];
                        var id = target.id;
                        self['itemsDnD' + _sp].selectNone();
                        self['itemsDnD' + _sp].selection[id] = 1;
                    }
                };
                beh['#'+ self._id + '-suggestions-list-' + _sp + ' li.dojoDndItem span.pundit-item-label'] = {
                    'onclick': function(e) {
                        _PUNDIT.ga.track('items', 'add', 'resources-panel-add-from-label');
                        var item, node;
                        
                        if (e.target.nodeName === 'LI'){
                            node = dojo.query(e.target);
                        }else{
                            node = dojo.query(dojo.query(e.target).parent()[0]);
                        }

                        item = self['itemsDnD' + _sp].getItem(node[0].id);  
                        
                        self.fireOnItemAdded(item.data);
                    }          
                };
				//TODO: merge this code with the previous one...
                beh['#'+ self._id + '-suggestions-list-' + _sp + ' li.dojoDndItem span.pundit-item-add-button'] = {
                    'onclick': function(e) {
                        _PUNDIT.ga.track('items', 'add', 'resources-panel-add-from-button');
                        var item, node;
                        
                        if (e.target.nodeName === 'LI'){
                            node = dojo.query(e.target);
                        }else{
                            node = dojo.query(dojo.query(e.target).parent()[0]);
                        }

                        item = self['itemsDnD' + _sp].getItem(node[0].id);  
                        
                        self.fireOnItemAdded(item.data);
                    }          
                };
                beh['#'+ self._id + '-suggestions-list-' + _sp + ' li.dojoDndItem span.pundit-icon-context-button'] = {
                    'onclick':function(e) {
                        var node = dojo.query(dojo.query(e.target).parent()[0]), 
                        uri = self['itemsDnD' + _sp].getItem(node[0].id).data.value;
                    
                        cMenu.show(e.pageX - window.pageXOffset, e.pageY - window.pageYOffset, uri, 'resourceItem');
                    }
                };
            
            })(i);
            }
        dojo.behavior.add(beh);   
        dojo.behavior.apply();  
    }, // initBehaviors
    
	
	searchNamedEntities: function(keyword) {
		var self = this;
        //Lookup check
        
        if (typeof keyword !== 'undefined'){
            if(keyword !== ''){
                dojo.query('#' + self._id + ' .pundit-rp-search-input')[0].value = keyword;
                self.namedEntitiesLookup(keyword);
            }
        }
        self.adjustPanelsHeight();
	},
	
    initContextMenu:function(){
        var self = this;
        
        cMenu.addAction({
            type: ['resourceItem'],
            name: 'openResourceItemWebPage',
            label: 'Open Web page',
            showIf: function(uri) {
                var item = _PUNDIT.items.getItemByUri(uri);
                if (typeof item !== 'undefined'){
                    //Add check to vocabs???
                    if (_PUNDIT.items.isTerm(item))
                        return true;
                    else
                        return false;                    
                }else{
                    item = _PUNDIT.vocab.getItemsForTerm(uri);
                    if (typeof item !== 'undefined')
                        return true;
                    else
                        return false;    
                }

            },
            onclick: function(uri) {
                _PUNDIT.ga.track('cmenu', 'click', 'resources-panel-open-web-page');
                window.open(uri, 'SemLibOpenedWebPage');
                return true;
            }
        });
        
        cMenu.addAction({
            type: ['resourceItem'],
            name: 'openSemlibResourceWebPage',
            label: 'Show in origin page',
            showIf: function(xp) {
                
                var item = _PUNDIT.items.getItemByUri(xp);

                if ((typeof item !== 'undefined') 
                    && (typeof tooltip_viewer.xpointersAnnotationsId[xp] === 'undefined')
                    && ((dojo.indexOf(item.rdftype, ns.fragments.text) !== -1) || (dojo.indexOf(item.rdftype, ns.image) !== -1))){
                        return !tooltip_viewer.xpointersClasses[xp];
                    }
                return false;
            },
            onclick: function(xp) {
                _PUNDIT.ga.track('cmenu', 'click', 'resources-panel-show-in-origin-page');
                var item = _PUNDIT.items.getItemByUri(xp),
                    fragment = xp.split('#')[1],
                    uri = item.pageContext + '#' + fragment;
                window.open(uri, 'SemLibOpenedWebPage');
                self.log('Opened a new window to URL '+uri);
                return true;
            }
        });
    }, // initContextMenu
    

    clearPanel: function() {
        var self = this;
        
        //Stop loading
        self.lastSearchedTerm = '';
        for (var i in self.namedEntitiesSources){
            _PUNDIT[i].cancelRequests();
            self.setLoading(self._id + '-container-suggestions-' + i, false);
        }
        
        dojo.query('#' + self._id + ' div.pundit-rp-container-suggestions.pundit-suggestions').forEach(function(item){
            dojo.removeClass(item, 'pundit-visible');
        });
        
        if (typeof dojo.query('#' + self._id + ' input.pundit-rp-search-input')[0] !== 'undefined'){
            dojo.query('#' + self._id + ' input.pundit-rp-search-input')[0].value = "";
        }
            
        for (var i in self.suggestionPanels){
            dojo.empty(dojo.byId(self._id + '-suggestions-list-' + i));
            self['itemsDnD' + i].clearItems();
        }
        
    }, // clearDnD
    
    /**
    * @method load
    * @description Load the items to be displayed in the panel
    * @param itemsObject {object} 
    * (An object representing the items to show gruoped by type. An example object:
    *       {
    *            myitems: {
    *                label:'My Items',
    *                items: [Array of items object]
    *            }, 
    *            pageitems: {
    *                label: 'Page Items',
    *                items: [Array of items object]
    *            }, 
    *            vacab1: {
    *                label: 'Vocab 1',
    *                items: [Array of items object]
    *            }
    *        })
    * @param term {string} the searched term to be shown in the search input
    */
    //TODO Move also position in the params object?
    load: function(itemsObject){
        var self = this;
        self.clearPanel(); //This should hide all the containers
        
        for (var i in itemsObject){
            if (itemsObject[i].items.length >0){
                dojo.addClass(dojo.byId(self._id + '-container-suggestions-' + i), 'pundit-visible');
                for (var j = itemsObject[i].items.length; j--;){
                    self['itemsDnD' + i].insertNodes(false, [itemsObject[i].items[j]]);
                }
                dojo.query('#' + self._id + '-container-suggestions-' + i + ' span.pundit-items-number')[0].innerHTML = '(' + self['itemsDnD' + i].getAllNodes().length + ')';
            }
        }
               
    },
    
    /**
    * @method show
    * @description Show the panel.
    * @param x {integer} (optionThe x coordinate of the panel
    * @param y {integer} The x coordinate of the panel
    * @param params {object}
    * @param params.title {string} The title of the panel  
    * @param params.arrow {string} Allow to display an arrow on top of the panel. 
    * Three position are possible: "left", "right" and "center"
    * @param params.literalMode {string} Activate the visualization of the literal panel. 
    * Two value are possible: "literalEnabled" enable the literal panel showing 
    * the "Literal" button to pass from item visualization to the literal panel;
    * "literalOnly" show only the literal panel.
    */
    //TODO Move also x,y in the params object?
    show: function(x, y, params){
        this.inherited(arguments);
        var self = this;
        self._lastKeyword = "";
        dojo.style(self._id, 'top', y+15 + 'px');
        dojo.style(self._id, 'left', x + 'px');

        dijit.focus(dojo.query('#' + self._id + ' .pundit-rp-search-input')[0]); 
        
        if (typeof params !== 'undefined'){
            // Handle Literals
            if (typeof params.literalMode !== 'undefined'){
                if (params.literalMode === 'literalEnabled'){
                    self.enableLiteralButton(true);
                } else if (params.literalMode === 'literalOnly'){
                    self.showLiteralPanel(true, true);
                } else if (params.literalMode === 'dateOnly'){
                    self.showDatePanel(true, true);
                } 
            } else {
                self.enableLiteralButton(false);
                self.showLiteralPanel(false,false);
            }
            // Set Title different from default
            if (typeof params.title !== 'undefined'){
                dojo.query('#' + self._id + ' .pundit-fp-title')[0].innerHTML = params.title;
            }
            
            if (typeof params.arrow !== 'undefined'){
                if (params.arrow === 'left'){
                    dojo.removeClass(dojo.query('#' +self._id + '.pundit-fp')[0], ['pundit-arrow-right', 'pundit-arrow-center']);
                    dojo.addClass(dojo.query('#' +self._id + '.pundit-fp')[0], 'pundit-arrow-left'); 
                }else if (params.arrow === 'right'){
                    dojo.removeClass(dojo.query('#' +self._id + '.pundit-fp')[0], ['pundit-arrow-left', 'pundit-arrow-center']);
                    dojo.addClass(dojo.query('#' +self._id + '.pundit-fp')[0], 'pundit-arrow-right');  
                }else if (params.arrow === 'center'){
                    dojo.removeClass(dojo.query('#' +self._id + '.pundit-fp')[0], ['pundit-arrow-left', 'pundit-arrow-right']);
                    dojo.addClass(dojo.query('#' +self._id + '.pundit-fp')[0], 'pundit-arrow-center');  
                }
            }
        }       
        dojo.behavior.apply();
		self.adjustPanelsHeight();
    },
    
    /**
    * @method hide
    * @description Hide the panel (empting the literal panel)
    */
    //TODO Move this in a specific component 
    hide: function() {
        this.inherited(arguments);
        var self = this;
        
        if (self.inShowing) {
            self.inShowing = false;
            self.showLiteralPanel(false, false);
            dojo.empty(dojo.query('#' +self._id+' .pundit-rp-literal-text')[0]);
            self._lastKeyword = "";
        }
        
        // Stop loading
        self.lastSearchedTerm = '';
        for (var i in self.namedEntitiesSources){
            _PUNDIT[i].cancelRequests();
            self.setLoading(self._id + '-container-suggestions-' + i, false);
        }    
    }, // hide
    
    reset: function() {
        var self = this;
        dojo.addClass(dojo.query('#' + self._id + ' .pundit-rp-literal-panel')[0], 'pundit-hidden');
        dojo.addClass(dojo.query('#' + self._id + ' .pundit-rp-date-panel')[0], 'pundit-hidden');
        dojo.removeClass(dojo.query('#' + self._id + ' .pundit-rp-search-panel')[0], 'pundit-hidden');
        dojo.empty(dojo.query('#' +self._id+' .pundit-rp-literal-text')[0]);
        dojo.query('#' +self._id+' .pundit-rp-date-input')[0].value = '';
        
        dojo.empty(dojo.query('#' +self._id+' .pundit-rp-literal-text')[0]);
        self._lastKeyword = "";
    },
    
    
    /**
    * @method filterItems
    * @description Filter between the loaded items according to the word
    * @param startingWord {string} The word used to filter the items
    */
    //TODO Improve the search
    filterItemsByTerm: function(startingWord) {
        var self = this;
        
        //DEBUG Do I need this???
        //previewer.deselectCurrentSelectedItem();
        
        if (startingWord === '') {
            for (var i in self.suggestionPanels){
                var nodes = dojo.query('#'+ self._id + '-suggestions-list-' + i + ' li');
                nodes.forEach(function(node) {
                    dojo.removeClass(node, 'pundit-hidden');
                });
            }  
        } else {
            for (var i in self.suggestionPanels){
                self.rankItems(self['itemsDnD' + i], startingWord);
//                for (var itemId in self['itemsDnD' + i].map) {
//                    var items =self['itemsDnD' + i].getItem(itemId);
//                    if (items.data.label.toLowerCase().indexOf(startingWord.toLowerCase()) === -1) {
//                        dojo.style(dojo.query('#'+ self._id + '-suggestions-list-' + i + ' li#' + itemId)[0], 'display', 'none');
//                    } else {
//                        dojo.style(dojo.query('#'+ self._id + '-suggestions-list-' + i + ' li#' + itemId)[0], 'display', 'block');
//                    }
//                }
            }

        }
        //Update Items Number
        for (var i in self.suggestionPanels){
            dojo.query('#' + self._id + '-container-suggestions-' + i + ' span.pundit-items-number')[0].innerHTML = '(' + self.getShownItemsNumber(self['itemsDnD' + i]) + ')';
        }
		self.adjustPanelsHeight();
    }, // filterItems
    
    searchItemsByTerm: function(term){
        var self = this,
            itemsObject = self.createItemsObject(term);
        self.clearPanel();
        self.load(itemsObject, term);
    },
    
    //TODO Move on a separate search component?
    createItemsObject: function(term) {
        var termAr = term.split(' '),
            itemsObject = {},
            myitems = semlibMyItems.getItemsFromTerm(termAr, [], [ns.fragments.text, ns.image]),
            pageitems = semlibItems.getItemsFromTerm(termAr, [], [ns.fragments.text, ns.image]);
        
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
            var vItems = _PUNDIT['vocab'].getItemsForTermInVocab(term, v);
            itemsObject[v] = {
                label : v,
                items : vItems
            }
        }
        return itemsObject;        
    },
    
    getShownItemsNumber:function(itemsDnd){
        var n = 0;
        itemsDnd.getAllNodes().forEach(function(item){
            if (dojo.style(item,'display') !== 'none')
                n++;
        });
        return n;
    },
    
    // Enable the literal buttons
    enableLiteralButton: function(enabled) {        
        var self = this;
        // TODO Optimize this!
        // Add the class to entire literal container to handle this togheter
        if (enabled) {
            dojo.addClass(dojo.query('#' + self._id + ' .pundit-rp-add-date')[0], 'pundit-literal-enabled');
            dojo.addClass(dojo.query('#' + self._id + ' .pundit-rp-add-literal')[0], 'pundit-literal-enabled');
        } else {
            dojo.removeClass(dojo.query('#' + self._id + ' .pundit-rp-add-date')[0], 'pundit-literal-enabled');
            dojo.removeClass(dojo.query('#' + self._id + ' .pundit-rp-add-literal')[0], 'pundit-literal-enabled');
        }
        dojo.addClass(dojo.query('#' + self.Id + ' .'))
    }, // enableLiteralButton
    
    // Show the literal panel
    // if showLiteralPanelOnly === true only the literal panel is shown
    showLiteralPanel: function(literalPanelEnabled, showLiteralPanelOnly) {
        var self = this;
        if (literalPanelEnabled) {
            dojo.addClass(dojo.query('#' + self._id + ' .pundit-rp-search-panel')[0], 'pundit-hidden');
            dojo.addClass(dojo.query('#' + self._id + ' .pundit-rp-date-panel')[0], 'pundit-hidden');
            dojo.removeClass(dojo.query('#' + self._id + ' .pundit-rp-literal-panel')[0], 'pundit-hidden');
            dijit.focus(dojo.query('#'+self._id+ ' .pundit-rp-literal-text')[0]);
        } else {
            dojo.addClass(dojo.query('#' + self._id + ' .pundit-rp-literal-panel')[0], 'pundit-hidden');
            dojo.addClass(dojo.query('#' + self._id + ' .pundit-rp-date-panel')[0], 'pundit-hidden');
            dojo.removeClass(dojo.query('#' + self._id + ' .pundit-rp-search-panel')[0], 'pundit-hidden');
        }
        if (showLiteralPanelOnly) {
            dojo.addClass(dojo.query('#' + self._id + ' .pundit-rp-panel-close')[0], 'pundit-hidden');
        } else {
            dojo.removeClass(dojo.query('#' + self._id + ' .pundit-rp-panel-close')[0], 'pundit-hidden');
        }
    }, // showLiteralPanel
    
    checkDate: function(e) {
        var self = this;
        
        if (dojo.query('#' + self._id + ' .pundit-rp-date-input')[0].checkValidity()) {
            dojo.attr(dojo.query('#' + self._id + ' .pundit-rp-date-panel-done')[0], 'disabled', false);
        } else {
            dojo.attr(dojo.query('#' + self._id + ' .pundit-rp-date-panel-done')[0], 'disabled', true);
        }
        
    },
    
    showDatePanel: function(panelEnabled, showPanelOnly) {
        var self = this;
        
        if (panelEnabled) {
            dojo.addClass(dojo.query('#' + self._id + ' .pundit-rp-search-panel')[0], 'pundit-hidden');
            dojo.addClass(dojo.query('#' + self._id + ' .pundit-rp-literal-panel')[0], 'pundit-hidden');

            dojo.removeClass(dojo.query('#' + self._id + ' .pundit-rp-date-panel')[0], 'pundit-hidden');
            dijit.focus(dojo.query('#'+self._id+ ' .pundit-rp-date-input')[0]);
        }
        
    },
    
    createDateItem: function() {
        var self = this,
            literalContent = dojo.query('#' + self._id + ' .pundit-rp-date-input')[0].value,
            literalItem = semlibLiterals.createLiteralItem(literalContent);

        self.fireOnItemAdded(literalItem);
        self.hide();
    },

    //TODO This should be on an extended version of the component
    createLiteralItem: function() {        
        var self = this,
            literalContent = dojo.query('#' + self._id + ' .pundit-rp-literal-text')[0].innerHTML,
            literalItem = semlibLiterals.createLiteralItem(literalContent);

        self.fireOnItemAdded(literalItem);
        self.hide();
    }, // createLiteralItem
    
    adjustPanelsHeight:function(){
        var self = this,
            panel,
            itemNumber = 0;
        //TODO Create a common function
        for (var i in self.suggestionPanels){
            panel = dojo.query('#' + self._id + '-container-suggestions-' + i)[0];
            if (dojo.hasClass(panel,'pundit-expanded')){
                itemNumber = self.getShownItemsNumber(self['itemsDnD' + i]);
                if (itemNumber < self.maxShownItems){
                    dojo.style(dojo.query(panel).children('ul')[0], 'height', itemNumber * 27 + 1 + 'px');
                }else{
                    dojo.style(dojo.query(panel).children('ul')[0], 'height', self.maxShownItems * 27 + 1 + 'px');
                }
            }
        }
        for (var i in self.namedEntitiesSources){
            panel = dojo.query('#' + self._id + '-container-suggestions-' + i)[0];
            if (dojo.hasClass(panel, 'pundit-expanded')){
                itemNumber = self.getShownItemsNumber(self['itemsDnD' + i]);
                if (itemNumber < self.maxShownItems){
                    dojo.style(dojo.query(panel).children('ul')[0], 'height', itemNumber * 27 + 1 + 'px');
                }else{
                    dojo.style(dojo.query(panel).children('ul')[0], 'height', self.maxShownItems * 27 + 1 + 'px');
                }
            }
        }
        self.adjustPreviewHeight();
    },
    
    namedEntitiesLookup:function(term){
        var self = this;
        self.lastSearchedTerm = term;
        for (var i in self.namedEntitiesSources){
            self.setLoading(self._id + '-container-suggestions-' + i, true);
            _PUNDIT[i].getItemsForTerm(term,
            (function(_i){
                return function(items,term){
                    if (self.lastSearchedTerm === term){
                        dojo.removeClass(self._id + '-container-suggestions-' + _i, 'pundit-lookup-error');
                        //for (var j in items){
                        for (var j = items.length; j--;){
                            previewer.buildPreviewForItem(items[j]);
                        }
                        dojo.empty(dojo.query('#' + self._id + '-container-suggestions-' + _i + ' ul'));
                        self['itemsDnD' + _i].selectAll();
                        self['itemsDnD' + _i].deleteSelectedNodes();
                        self['itemsDnD' + _i].sync()
                        //dojo.empty(dojo.query('#' + self._id + '-container-suggestions-' + _i + ' ul')[0]);

                        if (items.length === 0) {
                            //TODO This happen only if the function is called
                            //Make invisible 
                            //dojo.removeClass(self._id + '-container-suggestions-' + i, 'pundit-visible');
                            self.setLoading(self._id + '-container-suggestions-' + _i, false);
                            dojo.query('#' + self._id + '-container-suggestions-' + _i + ' span.pundit-items-number').html('(' + self.getShownItemsNumber(self['itemsDnD' + _i]) + ')');
                        
                        } else {
                            //TODO This happen only if the function is called
                            //Make visible
                            //dojo.addClass(self._id + '-container-suggestions-' + i, 'pundit-visible');
                            self['itemsDnD' + _i].sync();
                            self['itemsDnD' + _i].insertNodes(false, items);
                            dojo.query('#' + self._id + '-container-suggestions-' + _i + ' span.pundit-items-number').html('(' + self.getShownItemsNumber(self['itemsDnD' + _i]) + ')');
                            self.setLoading(self._id + '-container-suggestions-' + _i, false);
                            dojo.behavior.apply();
                        }
                        self.adjustPanelsHeight();

                    }
                }
            })(i),
            (function(_i){
                return function(){
                    self.setLoading(self._id + '-container-suggestions-' + _i, false);
                    dojo.query('#' + self._id + '-container-suggestions-' + _i + ' span.pundit-items-number').html('(' + 0 + ')');
                    dojo.addClass(self._id + '-container-suggestions-' + _i, 'pundit-lookup-error');
                }
            })(i));
        }
    },
    setLoading: function(panelId, v) {
        var self = this,
            r = dojo.query('#' + panelId),
            c = 'pundit-panel-loading';
        return (v) ? r.addClass(c) : r.removeClass(c);
    },
    rankItems:function(container, word){
        var rankedItems = [];
        for (var i in container.map){
            rankedItems.push([i, container.map[i].data.label.score(word)]);
        }
        rankedItems.sort((function(a, b) {return b[1] - a[1]}));
        //Don't revert this loop!
        //for (var i in rankedItems){
        for (var i = 0; i < rankedItems.length; i++){
            var node = dojo.byId(rankedItems[i][0]);
            dojo.destroy(rankedItems[i][0]);
            dojo.query('#' + container.node.id).append(node);
            if (rankedItems[i][1] === 0){
                dojo.addClass(rankedItems[i][0], 'pundit-hidden');
            }else{
                dojo.removeClass(rankedItems[i][0], 'pundit-hidden');
            }
        }
    },
    adjustPreviewHeight:function(){
        var self = this;
        clearTimeout(self.previewTimer);
        self.previewTimer = setTimeout(function(){
            var h = dojo.position(dojo.query('#' + self._id+ ' .pundit-fp-content-list')[0]).h - 10;
            dojo.style(dojo.query('#' + self._id+ ' .pundit-fp-preview')[0], 'height',  h +'px');
        },1200);
    }
});