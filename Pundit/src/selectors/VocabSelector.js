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
 * @class pundit.selectors.VocabSelector
 * @extends pundit.baseComponent
 * @description Is responsible for the loading and managing of vocabularies that 
 * are used in the annotations. Vocabularies are special JSON files loaded at run time 
 * using JSONP to avoid same origin policy. Togheter with the vocabularies 
 * also related relation are loaded. Vocabularies are configurable in 
 * NamespaceHelper file setting the vocabs object.
 */
dojo.provide("pundit.selectors.VocabSelector");
dojo.declare("pundit.selectors.VocabSelector", pundit.BaseComponent, {

    opts : {
        sortVocabolaries: true
    },    
    
    constructor: function(options) {
        var self = this;
        self.vocabs = {};
        
        var vs  = '<div id="pundit-vocabs-container" class="pundit-tab">';
        vs += '<div id="pundit-vocabs-header" class="pundit-tab-header">';
        vs += '<ul class="pundit-item-filter-list"></ul></div>'
        vs += '<div id="vocabSelectorContent" class="pundit-tab-content pundit-stop-wheel-propagation"></div>';
        vs += '</div>';

        dojo.query('#pundit-gui-center').append(vs);
        self.draggedItem = {};

        self.createCallback(['Ok', 'vocabsLoaded']);
        self.vocabState = {};
        self.reader = new pundit.AnnotationReader({debug: self.opts.debug});
        self.reader.onJsonpVocabLoaded(function(vocabUri){
            self.vocabState[vocabUri] = true;
            for (var i in self.vocabState){
                if (self.vocabState[i] === false)
                    return false;
            }
            self.fireOnVocabsLoaded();
        }) 
        self.initContextualMenu();
        self.initVocabs();
        self.initBehaviors();
        
        _PUNDIT.init.onInitDone(function() {
            self.selectFirstTab();
        });
        
        self.log("VocabSelector up and running");
    }, // constructor()
    
    initJsonpVocab: function(v) {
        var self = this, 
            len = 0;
        
        // Handle both old dojo-style LEGACY format
        if ('items' in v && 'type' in v && 'identifier' in v && 'label' in v)
            return self._initLegacyJsonpVocab(v);

        if (typeof(v.result) === 'undefined' || typeof(v.error_code) === 'undefined' ||
            typeof(v.result) === 'undefined' || typeof(v.result.vocab_type) === 'undefined') {
            self.log('ERROR: malformed vocabulary in korbo format?');
            return;
        }

        if (parseInt(v.error_code, 10) !== 200) {
            self.log('ERROR: Vocab provider error. Code '+v.error_code+': '+v.error_message);
            return;
        }

        // TODO: sanity checks on vocab
        // TODO: i18n: vocab_label, vocab_description 

        v.result = self._prepareTreeJsonp(v.result);

        if (v.result.vocab_type === "subjects") {
            self.initInMemoryTree(v.result);
            self.log("Initialized "+v.result.tab_name+" taxonomy from json: "+v.result.items.length+" items.");
        } else if (v.result.vocab_type === "predicates") {
            self.processRelations(v.result);
            self.log("Initialized "+v.result.tab_name+" relations from json: "+v.result.items.length+" items.");
        } else {
            self.log('ERROR: vocab_type wrong? ' + v.result.vocab_type);
            return;
        }

        if (v.result.vocab_type !== "predicates") {
            self.initBehaviorsForVocab(v.result.name);
            dojo.behavior.apply();
            if (self.opts.sortVocabolaries) {
                self.sortVocabTree(v.result.name);
            }
        }
        
        self.log("Init Vocab from jsonp done.");
        
    }, // initJsonpVocab()
    
    
    // TODO: more sanity checks on vocabs? Check if all _children are correct?
    _prepareTreeJsonp: function(tree) {
        var self = this,
            isPredicates = tree.vocab_type === "predicates";

        // Add some fields for the dojo tree component
        if (!isPredicates) {
            tree.label = "label";
            tree.identifier = "value";
            tree.name = tree.vocab_id;
            tree.tab_name = tree.vocab_label;
        }
        
        // DEBUG: by visiting the tree we could determine which node is a root
        //        and set the property accordingly
        // If there's no explicit root node, treath every category node as a root node
        tree.query_for_root = {
            "nodetype": ns.pundit_VocabCategory
        }

        if (self.opts.sortVocabolaries)
            tree.items = tree.items.sort(function(a, b){
                var v1 = a.label, v2 = b.label;
                if (v1 == v2) return 0;
                if (v1 > v2) return 1;
                if (v1 < v2) return -1;            
            });

        for (var i=tree.items.length; i--;) {

            if (typeof(tree.items[i]['is_root_node']) !== 'undefined' && tree.items[i]['is_root_node']) {
                self.log('Found a root node for '+tree.vocab_id+': '+tree.items[i]['label']);
                tree.query_for_root = {
                        'is_root_node': true
                }
            }

            if (isPredicates) {
                
                tree.items[i]['type'] = ['predicate'];
                
                // Must have domain, range and the proper rdftype
                if (typeof(tree.items[i]['domain']) === 'undefined') {
                    self.log('WARNING: Predicate with no domain?' + tree.items[i]['label']);
                    tree.items[i]['domain'] = [];
                }
                 
                if (typeof(tree.items[i]['range']) === 'undefined') {
                    self.log('WARNING: Predicate with no range?' + tree.items[i]['label']);
                    tree.items[i]['range'] = [];
                }
                
                if (typeof(tree.items[i]['rdftype']) === 'undefined') {
                    self.log('WARNING: Importing predicate with no RDF type: '+ tree.items[i]['label']);
                    tree.items[i]['rdftype'] = [_PUNDIT.ns.rdf_type];
                }
                
                // If container node, ignore the node
                if (tree.items[i]['nodetype'] === "container") {
                    self.log('WARNING: skipping container node inside predicates: '+ tree.items[i]['label']);
                    tree.items[i]['rdftype'] = [];
                    tree.items[i]['type'] = [];
                }
                
            } else {

                tree.items[i]['type'] = ['subject'];

                // DEBUG: no rdftype field?? Some sort of bug?
                if (typeof(tree.items[i]['rdftype']) === 'undefined') {
                    self.log('WARNING: Importing item with no RDF type: '+ tree.items[i]['label']);
                    tree.items[i]['rdftype'] = [];
                }

                // If .children is empty, delete it: this way the [+] icon will not appear at all
                if (typeof(tree.items[i]['children']) === 'object' && tree.items[i]['children'].length === 0) 
                    delete tree.items[i]['children'];

                // Container nodes are not draggable: no dnd type
                if (tree.items[i]['nodetype'] === "container") {
                    // TODO: create a conf param and use it here and where tree is initialized
                    tree.items[i]['nodetype'] = ns.pundit_VocabCategory;
                    delete tree.items[i]['rdftype'];
                    delete tree.items[i]['type'];
                }
            
            } // is isPredicate

        } // for tree.items
        
        return tree;
    }, // _prepareTreeJsonp()
    
    _initLegacyJsonpVocab: function(v) {
        var self = this;
        
        if (typeof(v.items) !== 'undefined')
            len = v.items.length;
        else {
            self.log("ERROR: 0-length vocabulary received?");
            return;
        }
        
        if (typeof(v.type) === 'undefined') {
            self.log("ERROR: Vocabulary with no type received.");
            return;
        }

        // TODO: code to erase a previous instance of the same vocab, in order
        // to be able to call multiple times initJsonpVocab if needed

        if (v.type === "taxonomy") {
            self.initInMemoryTree(v);
            self.log("LEGACY VOCAB Initialized "+v.name+" taxonomy from jsonp loaded file with "+len+" items.");
        } else if (v.type === "relations") {
            self.processRelations(v);
            self.log("LEGACY VOCAB Initialized "+v.name+" relations from jsonp loaded file with "+len+" items.");
        }

        self.initBehaviorsForVocab(v.name);
        dojo.behavior.apply();
        
    },
    
    initVocabs: function(){
        var self = this,
            vocabs = _PUNDIT.config.vocabularies;
        
        // TODO: code to destroy everything, so we can call initVocabs
        // again when the user wants it
        
        //TODO fire an event when all vocabs have been initialized
        //If no vocabs are loaded fire the event directly now

        for (var i = vocabs.length; i--;) {
            self.vocabState[vocabs[i]] = false;
            self.reader.getVocabularyFromJsonp(vocabs[i]);
            self.log('Initializing vocab '+vocabs[i]);
        }
        
        if (_PUNDIT.config.useBasicRelations) {
            self.log('Loading basic vocabolary');
            self.initJsonpVocab(_PUNDIT.config.basicRelations);
        }
            
    }, // initVocabs()

    initContextualMenu: function(target) {
        var self = this;

        cMenu.addAction({
            type: ['vocabItem'],
            name: 'addVocabToMyItems',
            label: 'Add to My Items',
            showIf: function(item) {
                return !semlibMyItems.uriInItems(item.value);;
            },
            onclick: function(item) {
                if (!semlibItems.uriInItems(item.value))
                    semlibItems.addItem(item);
                semlibMyItems.addItem(item, true);
                return true;
            }
        });
    
        // A favorite item can be de-favorited
        cMenu.addAction({
            //type: ['__all'],
            type: ['vocabItem'],
            name: 'removeVocabFromMyItems',
            label: 'Remove from My Items',
            showIf: function(item) { 
                return semlibMyItems.uriInItems(item.value);
            },
            onclick: function(item) {
                //DEBUG Remove item from my items and from page items
                semlibMyItems.removeItemFromUri(item.value);
                return true;
            }
        });
    
        cMenu.addAction({
            type: ['vocabItem'],
            name: 'openVocabWebPage',
            label: 'Open Web Page',
            showIf: function(xp) { 
                return true;
            },
            onclick: function(item) {
                window.open(item.value, 'SemLibOpenedWebPage');
                return true;
            }
        });
        
        dojo.behavior.apply();
    }, // initContextualMenu()
    
    initInMemoryTree: function(voc) {
        var self = this;
            self.vocabs[voc.name] = {};

        self.vocabs[voc.name].label = voc.tab_name;
        // Add tab
        dojo.query('#pundit-vocabs-container ul.pundit-item-filter-list').append('<li id="'+voc.name+'VocabFilter">'+voc.tab_name+'</li>');
        dojo.connect(dojo.byId(voc.name+'VocabFilter'),'onclick',function(){
            self.showVocabByName(voc.name);
        });
        
        dojo.query('#pundit-vocabs-container div.pundit-tab-content').append("<div id='"+voc.name+"VocabPanel' class='semlib-panel semlib-vocab'><div id='"+voc.name+"VocabTreePanel'></div><div>");

        // Instantiate the store associated to each vocabulary tree
        self.vocabs[voc.name].store = new dojo.data.ItemFileReadStore({
            data: voc
        });
        
        // Define the tree model as required to implement a tree widget
        self.vocabs[voc.name].treeModel = new dijit.tree.ForestStoreModel({
            store: self.vocabs[voc.name].store,
            query: voc.query_for_root,
            rootId: "root",
            rootLabel: "Things",
            pasteItem: function(){},
            childrenAttrs: ["children"]
        });
        
        

        // Define the tree
        self.vocabs[voc.name].tree = dijit.Tree({
            // Add the clicked entity to the item list
            onClick: function(x,y){
            },
            // Call the store to retrieve asynchronously the item, the
            // onComplete callback will display the tooltip
            onMouseOver: function(e) {
                var cItem;
                if (dojo.hasClass(e.target,"dijitTreeLabel")){
                    //DEBUG ALTERNATIVE
                    //TODO get item from store._arrayofallitems
                    //self.draggedItem = self.getItemFromLabel(self[voc.name + 'Store'], dojo.query(e.target).html());
                    //Same result of this but without callback
                    //self.getItemFromStore(self[voc.name + 'Store'], dojo.query(e.target).html());
                    self.getItemFromStore(self.vocabs[voc.name].store, dojo.query(e.target).html());
                    //cItem = self.getItemFromLabel(self[voc.name + 'Store'],dojo.query(e.target).html());
                    cItem = self.getItemFromLabel(self.vocabs[voc.name].store, dojo.query(e.target).html());
                    if (typeof(cItem) !== 'undefined')
                        previewer.show(cItem.value[0]);
                    return;
                }
            },
            ////MULTIPLOP Force the tree to select and drag just one single node
            onMouseDown: function(e) {
                var cItem,
                    label,
                    target = e.target;
                // DEBUG One for all code. Optimize search?
                while (!dojo.hasClass(dojo.query(target)[0], 'dijitTreeRow')){
                    target = dojo.query(target).parent()[0];
                }
                var label = dojo.query(target).children('span').children('span').html();
                if (typeof label !== 'undefined'){
                    cItem = self.getItemFromLabel(self.vocabs[voc.name].store, label);
                    self.vocabs[voc.name].dndTree.selectNone();
                    if (typeof(cItem) !== 'undefined')
                        self.selectTreeNodeById(self.vocabs[voc.name].tree, cItem.value[0]);
                }
            },
            //model: self.treeModel,
            model: self.vocabs[voc.name].treeModel,
            getIconClass: function(/*dojo.data.Item*/ item, /*Boolean*/ opened){
                return (!item || typeof(item.type) === 'undefined') ? (opened ? "dijitFolderOpened" : "dijitFolderClosed") : "pundit-vocabs-icon"
                //return (!item || this.model.mayHaveChildren(item)) ? "pundit-vocabs-icon" : "pundit-vocabs-icon"
            }
        }, voc.name+'VocabTreePanel');
        
        // Make the tree draggable
        self.vocabs[voc.name].dndTree = new dijit.tree.dndSource(/* dijit.Tree */ self.vocabs[voc.name].tree, /* dijit.tree.__SourceArgs */ {
            copyOnly: true,
            dragThreshold: 10,
            semlibTree: true //Use to check if the source is a semlib tree when dropping
        });
        
        //Prevent the tree from accepting dragged items
        self.vocabs[voc.name].dndTree.checkAcceptance = function(){
            return false;
        };
        dojo.behavior.apply();
        
        self.initTreeItemsPreview(self.vocabs[voc.name].store);
    },
    
    sortVocabTree: function(name) {
        var self = this,
            queue = [self.vocabs[name].treeModel.root],
            node;
        
        while (node = queue.pop()) {
            var len = (typeof(node.children) !== 'undefined') ? node.children.length : 0;
            if (len > 0) {
                for (var l=len; l--;)
                    queue.push(node.children[l]);
                node.children.sort(function(a, b){
                    var v1 = a.label[0], v2 = b.label[0];
                    if (v1 == v2) return 0;
                    if (v1 > v2) return 1;
                    if (v1 < v2) return -1;            
                });
            }
        }
        
        // reset the itemNodes Map
        self.vocabs[name].tree._itemNodesMap = {};

        // remove the rootNode
        if (self.vocabs[name].tree.rootNode) {
            self.vocabs[name].tree.rootNode.destroyRecursive();
        }

        // Nullify the tree.model's root-children
        self.vocabs[name].tree.model.root.children = null;

        // reset the state of the rootNode
        // self.vocabs[name].tree.rootNode.state = "UNCHECKED";

        // reload the tree
        self.vocabs[name].tree._load();
        
    },
    
    initTreeItemsPreview:function(store){
        var self = this,
            items = store._arrayOfAllItems,
            item ={};
        //for (var i in items){
        for (var i = items.length;i--;){
            //DEBUG possible refactor
           if ((typeof(items[i].type) !== 'undefined') && (typeof(items[i].rdftype) !== 'undefined')){
               item = {
                   description: items[i].description[0],
                   label: items[i].label[0],
                   rdftype: items[i].rdftype,
                   type: items[i].type,
                   value: items[i].value[0]
               }
                if (typeof(items[i].image) !== 'undefined'){
                    item.image = items[i].image[0];
                }
                item.rdfData = semlibItems.createBucketForVocabItem(item).bucket;
                previewer.buildPreviewForItem(item);
            }
//            else if ((typeof(items[i].type) !== 'undefined') && typeof(items[i].rdftype) === 'undefined'){
//                item = {
//                    //Tree item folder need type field 
//                    //DEBUG should rename the field to avoid confusion
//                    //type: items[i].type, 
//                    rdftype: items[i].type,
//                    label: items[i].label[0],
//                    description: items[i].description[0],
//                    value: items[i].value[0]
//                };
//                if (typeof(items[i].image) !== 'undefined'){
//                    item.image = items[i].image[0];
//                }
//                item.rdfData = semlibItems.createBucketForVocabItem(item).bucket;
//                previewer.buildPreviewForItem(item);
//            }
        }
    },
    
    //DEBUG: Is this function used somewhere?
    displayMoreInfoForItem: function(item) {
        var self = this,
            comment = item.description[0],
            aToggle = null,            
            tip = "<h3>"+item.name+" :</h3>";
        
        if (typeof(item.image) !== "undefined")
            tip += "<img " + "src='" + item.image + "'/></br>";
        
        //show only 250 caratteri
        if (comment.length > 250){
            var i= 250;
            while (comment[i] != ' '){
                i = i - 1;
            }
            comment = comment.substring(0,i) + '...';
            aToggle = dojo.create("a");
            dojo.addClass(aToggle, 'collapsed');
            dojo.html.set(aToggle, '[More Info...]');
            dojo.attr(aToggle, 'href', 'javascript:void(0)');
            dojo.connect(aToggle, 'onclick', function(evt){
                self.toggleComment(evt.target, item.description[0], comment);
            });
            
            tip += "<span id='commentSpan'>"+comment+"</span></br></br>";
        } else{
            tip += "<span id='commentSpan'>"+comment+"</span></br></br>";
        }
        tip += "<span>Type: </span><span id='akaInfo'>" + item.type + "</span></br></br>";
        
        //DEBUG: MARCO change the destination of info
        if ('comment' in item) dojo.query('#vocabMoreInfo').html(tip);
        
        if ((typeof(aToggle) !== 'undefined') && (aToggle !== null)) {
            dojo.place(aToggle, dojo.byId('commentSpan'),'after');
        }
        
    }, // displayMoreInfoForItem
    //DEBUG: used in an unused function?
    toggleComment:function(sender, text, comment){
        if (dojo.hasClass(sender, 'collapsed')){
            dojo.html.set(sender, '[Collapse]');
            dojo.html.set(dojo.byId(commentSpan), text);
            dojo.removeClass(sender, 'collapsed');
            dojo.addClass(sender, 'expanded');
        } else{
            dojo.html.set(sender, '[More Info...]');
            dojo.html.set(dojo.byId(commentSpan), comment);
            dojo.removeClass(sender, 'expanded');
            dojo.addClass(sender, 'collapsed');
        }
    },

    initBehaviorsForVocab: function(name) {
        var self = this;
        
        // TODO: how to remove the behavior when removing the vocab?
        
        dojo.behavior._behaviors['#' + name + 'VocabPanel img.pundit-vocabs-icon'] = [{
            'onclick': [(function (_name) {
                return function(e){
                    var label = dojo.query(e.target).parent().children('span').html(),
                        treeItem = self.getItemFromLabel(self.vocabs[name].store, label),
                        item = self.createItemFromVocabItem(treeItem);
//                    var itemNode = dojo.query(e.target).parent().parent().parent(),
//                        id = itemNode[0].id,
//                        treeItem = self.vocabs[_name].dndTree.getItem(id);
                    //Convert tree item into item format
//                    var item = {
//                        description: treeItem.data.item.description[0],
//                        label: treeItem.data.item.label[0],
//                        image: treeItem.data.item.image[0],
//                        rdftype: treeItem.data.item.rdftype,
//                        type: treeItem.data.item.type,
//                        value: treeItem.data.item.value[0]
//                    }
//                    item.rdfData = semlibItems.createBucketForVocabItem(item).bucket;
                    cMenu.show(e.pageX - window.pageXOffset, e.pageY - window.pageYOffset, item, 'vocabItem');
                    
                }
            })(name)]
        
        }];
        
        
    }, // initBehaviorsForVocab()

    initBehaviors: function() {
        var self = this;
        
        dojo.subscribe("/dnd/start", function(source, nodes, copy, target) {
            var isVocabTreeSource = false,
                store;
                
            //if (dojo.query('table .dojoDndAvatar'))
            
            for (var i in self.vocabs) 
                if (source === self.vocabs[i].dndTree){
                    isVocabTreeSource = true;
                    store = self.vocabs[i].store;
                    break;
                }
            
            if (isVocabTreeSource){
                var n = dojo.query('#' + nodes[0].id + ' div span img')[0];
                
                //Update Avatar in case of dragging an item conteining subitems (this make the avatar display only the main node and not also the subnode
                dojo.forEach(dojo.query('table.dojoDndAvatar .dijitTreeContainer'), function(item){dojo.destroy(item)});
                if (dojo.hasClass(n, 'dijitFolderOpened') || dojo.hasClass(n, 'dijitFolderClosed')){
                    setTimeout(function(){
                        dojo.publish("/dnd/cancel");
                        dojo.dnd._manager.stopDrag();
                    }, 0);
                    return;
                }
                
                for (var i = nodes.length - 1; i >= 0; i--){
                    self.getItemFromStore(store, source.getItem(nodes[i].id).data.label);
                }
            }
        });
        
    }, // initBehaviors()

    getItemFromStore: function(store, s) {
        var self = this;

        // Fetch the data.
        store.fetch({
            query: {
                label: s
            },
            onComplete: function(i) { 
                // DEBUG: we look for an item with this name.. just get the
                // first item with this name in the store .. hoping that there's
                // no items with the same name ..... better ideas? :|
                if (i.length > 0) {
                    //Tree item are slightly different from pundit items
                    var item = self.createItemFromVocabItem(i[0]);
                    self.draggedItem = item;
                }
            },
            onError: function() { 
            // DEBUG: onError? Just dont display anything?
            }
        });
    }, // getItemFromStore()
    
    getItemFromLabel:function(store,label){
        var self = this,
            items = store._arrayOfAllItems,
            item = {};
        //for (var i in items){
        for (var i = items.length;i--;){
            if (items[i].label[0] === label){
                return items[i];    
            }
        }
    },
    
    processRelations: function(g) {
        var self = this,
            items = g.items;
        
        self.log('Imported relations: '+g.name+': '+g.description);
        
        //for (var i in items){
        for (var i = items.length;i--;){
            items[i].rdfData = semlibItems.createBucketForPredicate(items[i]).bucket;
            previewer.buildPreviewForItem(items[i]);
            if (!semlibItems.uriInItems(items[i].value))
                semlibItems.addItem(items[i]);
        }
    },
    
    selectFirstTab: function() {
        if (dojo.query('#pundit-vocabs-container div.pundit-tab-content div.semlib-panel.semlib-selected').length === 0) {
            dojo.query('#pundit-vocabs-container div.pundit-tab-content div.semlib-panel:first-child').addClass('semlib-selected')
            dojo.query('#pundit-vocabs-header li:first-child').addClass('pundit-selected')
        }
    },
    
    showVocabByName: function(name) {
        var self = this;
        dojo.query('#pundit-vocabs-container div.pundit-tab-content div.semlib-panel').forEach(function(item){
            dojo.removeClass(item, 'semlib-selected');
        });
        dojo.addClass(name+'VocabPanel', 'semlib-selected');
        dojo.query('#pundit-vocabs-header li').forEach(function(item){dojo.removeClass(item,'pundit-selected')});
        dojo.addClass(name+'VocabFilter', 'pundit-selected');
    },
    
    getItemsForTerm:function(term, rdftypes){
        var self = this,
            items = [],
            _items = [];
        for (var i in self.vocabs){
            _items = self.getItemsForTermInVocab(term, i, rdftypes);
            //for (var j in _items){
            for (var j = _items.length; j--;){
                if (!self.isItemInArrayByUri(items, _items[j]))
                    items.push(_items[j])
            }
        }
        return items;
    },
    
    getItemsForTermInVocab: function(term, vocabName,rdftypes){
        var self = this,
            items = [],
            vItems = self.vocabs[vocabName].store._arrayOfAllItems;
        
        for (var i = vItems.length -1; i >= 0; i--){
            if (typeof vItems[i].type === 'undefined')
                continue;
            if (vItems[i].label[0].toLowerCase().indexOf(term.toLowerCase()) !== -1){
                if (!self.isItemInArrayByUri(items, vItems[i].value[0]))
                    items.push(self.createItemFromVocabItem(vItems[i]));
            }
        }
        if ((typeof rdftypes === 'undefined') || (rdftypes.length === 0))
            return items
        else {
            //TODO Should we move this to an helper and not to semlibItems
            return semlibItems.filterItemsByRdftype(items, rdftypes);
        }
    },
    
    createItemFromVocabItem:function(i){
        var item = {
            description: i.description[0],
            label: i.label[0], 
            type: i.type,
            rdftype: i.rdftype,
            value: i.value[0]
        }
        if (typeof(i.image) !== 'undefined')
            item.image = i.image[0];
        item.rdfData = semlibItems.createBucketForVocabItem(item).bucket;
        return item;
    },
    
    //TODO SIMONE: Move on an helper?
    isItemInArrayByUri:function(array, uri){
        for (var i = array.length -1; i>= 0; i--){
            if (array[i].value === uri)
                return true;
        }
        return false;
    },
    
    mergeItemsByUri:function(a1, a2){
        var self = this;
        for (var i = a2.length -1; i>=0; i--){
            if (!self.isItemInArrayByUri(a1, a2[i].value))
                a1.push(a2[i]);
        }
        return a1;
    },
    //Recursive function to construct the path of an item inside a tree
    recursiveHunt:function(lookfor, model, buildme, item){
        var self = this;
        //console.log(">> recursiveHunt, item ", item, " looking for ", lookfor);
        var id = model.getIdentity(item);
        buildme.push(id);
        if(id == lookfor){
            // Return the buildme array, indicating a match was found
            //console.log("++ FOUND item ", item, " buildme now = ", buildme);
            return buildme;
        }
        
        //DEBUG Added. Return undefined if item has no childern
        
        if (typeof item.children === 'undefined')
            return undefined;
        
        //for(var idx in item.children){
        for(var idx = item.children.length; idx--;){
            // start a new branch of buildme, starting with what we have so far
            var buildmebranch = buildme.slice(0);
            //console.log("Branching into ", model.store.getValue(item.children[idx], 'name'), ", buildmebranch=", buildmebranch);
            var r = self.recursiveHunt(lookfor, model, buildmebranch, item.children[idx]);
            // If a match was found in that recurse, return it.
            //  This unwinds the recursion on completion.
            if(r){return r;}
        }
        // Return undefined, indicating no match was found
        return undefined;
    },
    //Select a node of the tree given the tree and the identifier of the vocab 
    //item to select (in our case the property value)
    selectTreeNodeById:function(tree, lookfor){
        var self = this;
        //console.log("See model root=", tree.model.root);
        var buildme = [];
        var result = self.recursiveHunt(lookfor, tree.model, buildme, tree.model.root);
        //console.log("*** FINISHED: result ", result, " buildme ", buildme);
        //console.dir(result);
        if(result && result.length > 0){
            tree.set('path', result);
        }
    }
});
