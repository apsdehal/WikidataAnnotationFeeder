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
*/dojo.provide("pundit.Items");
dojo.declare("pundit.Items", pundit.BaseComponent, {

    constructor: function(options) {},
    
    init: function(name) {
        var self = this;
        self.crypto = new pundit.Crypto();        
        this.name = name;
        var si = '<div id="pundit-' + this.name + '-container" class="pundit-tab pundit-selected">';

        si += '<div class="pundit-tab-header"><ul id="pundit-' + this.name + '-filter-list" class="pundit-item-filter-list">';
        si += '<li id="pundit-tab-filter-' + this.name + '-fragment" class="pundit-selected">Text-fragment</li>';
        si += '<li id="pundit-tab-filter-' + this.name + '-images">Images</li>';
        si += '<li id="pundit-tab-filter-' + this.name + '-images-fragment">Image Fragments</li>';
        si += '<li id="pundit-tab-filter-' + this.name + '-entities">Terms</li>';
        si += '<li id="pundit-tab-filter-' + this.name + '-pages">Pages</li>';
        si += '<li id="pundit-tab-filter-' + this.name + '-named">Named Content</li>';

        // DEBUG Do we still need Suggestions here?
        si += '<li id="pundit-tab-filter-' + this.name + '-suggestions" class="pundit-hidden"><span class="suggestionNumber"></span> Suggestions</li>';
        si += '</ul></span><span class="pundit-sort-items pundit-view-tile "></span><span class="pundit-sort-items pundit-view-list pundit-selected"></div>';
        si += '<div id="pundit-tab-content' + this.name + '" class="pundit-tab-content pundit-stop-wheel-propagation"><ul id="pundit-'+this.name +'" class="pundit-items pundit-view-list"></ul></div>';
        si += '</div>';
        dojo.query('#pundit-gui-center').append(si);

        self.initDnD();
        self.initBehaviors();
        
        // Register callback used currently by literal selector
        self.createCallback(['itemAdded', 'itemRemoved', 'allItemsRemoved']);
        
        self.log("Pundit" + self.name + "Container up and running..");
        
        _PUNDIT.init.onInitDone(function(){
            setTimeout(function(){
                self.showOnlyItems(self.getNodesWhereTypeIs(ns.fragments.text));
                // TODO REMOVE THIS SHIT!
                // This should be configuable or in any case not fired twice as now
                dojo.query('#pundit-tab-filter-'+ self.name +'-fragment').addClass('pundit-selected');
            }, 1000);
        });
        
    }, // constructor()

    initDnD: function() {
        var self = this;

        // punditItems source does not accept any item; 
        // dnd drag actions copy items from it
        self.itemsDnD = new dojo.dnd.Source("pundit-"+ self.name, {
            copyOnly: true, 
            creator: self.itemNodeCreator,
            checkAcceptance: function() {return false;}
        });
    },

    initBehaviors: function() {
        var self = this;

        var tabs = {},
            beh = {};
        tabs['#pundit-tab-filter-' + this.name + '-entities'] = function() {return self.getNodesEntities()};
        tabs['#pundit-tab-filter-' + this.name + '-fragment'] = function() {return self.getNodesWhereTypeIs(ns.fragments.text)};
        tabs['#pundit-tab-filter-' + this.name + '-images'] = function() {return self.getNodesWhereTypeIs(ns.image)};
        tabs['#pundit-tab-filter-' + this.name + '-images-fragment'] = function() {return self.getNodesWhereTypeIs(ns.fragments.image)};
        tabs['#pundit-tab-filter-' + this.name + '-pages'] = function() {return self.getNodesWhereTypeIs(ns.page)};
        tabs['#pundit-tab-filter-' + this.name + '-named'] = function() {return self.getNodesWhereTypeIs(ns.fragments.named)};
        
            
        // DEBUG: provide a way for other components to add filters
        
        for (var t in tabs) {
            var f = (function(id, provider) {
                return function() {
                    self.showOnlyItems(provider());
                    self.hideSuggestionsTab();
                    dojo.query('#pundit-' + self.name + '-container .pundit-item-filter-list li').removeClass('pundit-selected');
                    dojo.query(id).addClass('pundit-selected');
                }
            })(t, tabs[t]);
            self['show_'+t.substr(1).replace(/-/g, '')] = f;
            dojo.connect(dojo.query(t)[0], 'onclick', f);
        }
        
        //DEBUG Use low level behavior 
        beh['#pundit-' + self.name + ' li.dojoDndItem span.pundit-icon-context-button'] = {
            'onclick': function (e) {
                    var id = dojo.query(e.target).parent()[0].id;
                    var item = self.itemsDnD.getItem(id);
                    if (item.data.rdftype.length === 0){
                        cMenu.show(e.pageX - window.pageXOffset, e.pageY - window.pageYOffset, item.data, 'semlibLiteral'+self.name);
                    } else {
                        cMenu.show(e.pageX - window.pageXOffset, e.pageY - window.pageYOffset, item.data, 'pundit-'+self.name);
                    }
                }
        };
    
        beh['#pundit-'+self.name+' li.dojoDndItem'] = {
            'onmouseover':function (e) {
                    var id = (dojo.hasClass(e.target, 'pundit-icon-context-button')||dojo.hasClass(e.target, 'pundit-trim')) ? dojo.query(e.target).parent()[0].id : e.target.id;
                    var item = self.itemsDnD.getItem(id);
                    
                    previewer.show(item.data.value);
                                                                
                    if (tooltip_viewer.isAnnXpointer(item.data.value) || tooltip_viewer.isTempXpointer(item.data.value))
                        tooltip_viewer.highlightByXpointer(item.data.value);
                },
            'onmouseout':function (e) {
                var id = (dojo.hasClass(e.target, 'pundit-icon-context-button')||dojo.hasClass(e.target, 'pundit-trim')) ? dojo.query(e.target).parent()[0].id : e.target.id;
                var item = self.itemsDnD.getItem(id);
                if (tooltip_viewer.isAnnXpointer(item.data.value) || tooltip_viewer.isTempXpointer(item.data.value))
                    tooltip_viewer.removeHighlightByXpointer(item.data.value);                
                },
            'onclick': function (e) {
                    var target = e.target;
                    while (!dojo.hasClass(dojo.query(target)[0], 'dojoDndItem'))
                        target = dojo.query(target).parent()[0];
                    var id = target.id;
                    self.itemsDnD.selectNone();
                    self.itemsDnD.selection[id] = 1;
                }
        };
            
        // TODO: Layout should be an option, and read from there. Not fixed like this!
        // Items layout
        beh['#pundit-' +self.name +'-container .pundit-sort-items.pundit-view-list']= {
            'onclick': function(e) {
                self.setItemsLayout('pundit-view-list');
            }
        };
        beh['#pundit-' +self.name +'-container .pundit-sort-items.pundit-view-tile']= {
            'onclick': function(e) {
                self.setItemsLayout('pundit-view-tile');
            }
        };
        
        dojo.behavior.add(beh);
                
    }, // initBehaviors()
    
   
    
    initContextualMenu: function() {
        var self = this;
        //TODO Do we need to init any men
    },
    
    // create the DOM representation for the given item
    // item is a an object formatted for itemDnD
    itemNodeCreator: function (item, hint) {
        var self = this,
            rdftype = "",
            label = item.label,
            i,
            node;
        
        // Tree item
        if (typeof(item.type) === 'undefined') {
            item = {};
            var i = _PUNDIT.vocab.draggedItem;
            item.value = i.value;
            item.type= i.type;
            item.rdfData= i.rdfData;
            item.rdftype = i.rdftype;
            item.label = i.label;
            if (typeof(i.image) !== 'undefined')
                item.image = i.image;
        }

        var b = new pundit.TriplesBucket({bucket: item.rdfData}),
            typesLabels = [];
            
        for (var j=Math.min(item.rdftype.length, _PUNDIT.items.opts.itemTypesNumber); j--;) {
            if (b.getObject(item.rdftype[j], ns.rdfs_label).length > 0) 
                typesLabels.push(b.getObject(item.rdftype[j], ns.rdfs_label)[0]);
            else 
                typesLabels.push(item.rdftype[j]);
            
            // TODO: this should be configurable
            // Show just 3 types
            //if (j == item.rdftype.length - 3)
            //    break;
        }
        
        rdftype = typesLabels.join(', ');
        
        // TODO: this check is wrong, what if an item comes with no rdftype but
        // it's a proper item? It gets shown as literal ...
        if (item.rdftype.length === 0)
            rdftype = 'Literal';
        else {
            if (item.rdftype[0] === ns.fragments.text)
                label = item.label;
            
            if (item.rdftype.length > _PUNDIT.items.opts.itemTypesNumber)
                rdftype += ', ...';
        }        
        
        if (hint !== "avatar") {
            node = document.createElement('li');
            dojo.addClass(node, 'pundit-' + item.type);
            dojo.addClass(node, 'pundit-shown');
            node.innerHTML = '<span class="pundit-icon-context-button"></span><span class="pundit-trim pundit-item-label">' +label + '</span><span class="pundit-item-add-button"></span><span class="pundit-item-remove-button"></span><span class="pundit-trim pundit-item-rdftype" >&nbsp;(' + rdftype + ')</span>';
        } else {
            node = document.createElement('div');
            node.innerHTML = item.label;
        }
        
        return {
            node: node, 
            data: item, 
            type: item.type
        };

    }, // itemNodeCreator()
    
    
    /*
    // DEBUG: NOT USED !!!!
    addItemsFromSelector: function(items) {
        var self = this;
        self.log("Received items from a selector.");
        //for (var i in items)
        for (var i = items.length; i--;)
            if (!self.uriInItems(i)) {
                self.addItem({
                    type: ['subject','object'],
                    rdftype: items[i].type,
                    value: i,
                    label: items[i].label,
                    comment: items[i].comment,
                    depiction: items[i].depiction
                });
            }
            
    }, // addItemsFromSelector()
    */
    
    /**
    * @method uriInItems
    * @description Check if an item is present in the itemsDnD container
    * @param uri {string} The Uri of the item to be searched
    * @return {boolean} True if exists, false otherwise
    */
    uriInItems: function(uri) {
        var self = this,
            ret = false;
        
        self.itemsDnD.forInItems(function(item){
            if (item.data.value == uri)
                ret = true;
        });
        return ret;
    },

    setItemsLayout: function(name) {
        var self = this,
            layouts = ['pundit-view-list', 'pundit-view-tile'];

        dojo.query('#pundit-'+self.name+'-container .pundit-sort-items').removeClass('pundit-selected');
        dojo.query('#pundit-'+self.name+'-container .pundit-sort-items.'+name).addClass('pundit-selected');

        for (var i = layouts.length; i--;) 
            dojo.query('#pundit-'+self.name).removeClass(layouts[i]);
        dojo.query('#pundit-'+self.name).addClass(name);
    },

    getSelectedTab: function() {
        var self = this;
        return dojo.attr(dojo.query('#pundit-'+self.name+'-filter-list li.pundit-selected')[0], 'id');
    },
    
    hideSuggestionsTab: function() {
        dojo.query('#pundit-tab-filter'+self.name+'Suggestions').addClass('pundit-hidden');
    },

    showOnlyItems: function(nodes) {
        var self=this;
        // Reset highlight on pundit containers and semlib filters items
        dojo.query('.pundit-tc-dnd-container ul').removeClass('dnd_selected');
        dojo.query('#pundit-'+self.name+'-container .pundit-item-filter-list li').removeClass('pundit-selected');
        this.hideAllItems();

        if (nodes.length === 0) 
            return;
        
        var self = this,
            all = self.getItemsIds(dojo.query('#pundit-'+self.name+' li')),
            nodes_ids = self.getItemsIds(nodes);
        
        for (var id in all) //ok all is an object
            if (typeof(nodes_ids[id]) !== 'undefined') {
                dojo.query('#'+id).removeClass('pundit-hidden');
                setTimeout((function(i) {
                    return function() {
                        dojo.query('#'+i).addClass('pundit-shown');
                    }
                })(id), 10);
            }
        
    }, // showOnlyItems()
    
    showAllItems: function() {
        var self = this;
        // Reset highlight on pundit containers
        dojo.query('.pundit-tc-dnd-container ul').removeClass('dnd_selected');
        dojo.query('#pundit-'+self.name+'-container .pundit-item-filter-list li').removeClass('pundit-selected');
        dojo.query('#pundit-tab-filter'+self.name+'All').addClass('pundit-selected');

        dojo.query('#pundit-'+self.name+' li').removeClass('pundit-hidden');
        setTimeout(function() {
            //TODO WHY this is not parametric? 
            dojo.query('#semlibItems li').addClass('pundit-shown');
        }, 10);
    },

    hideAllItems: function() {
        var self= this;
        dojo.query('#pundit-'+self.name+' li').removeClass('pundit-shown');
        dojo.query('#pundit-'+self.name+' li').addClass('pundit-hidden');
    },
    
    refreshItemsNumber: function() {
        var self=this,
            ret = 0;
        this.itemsDnD.forInItems(function(item){
            if (item.data.type[0] !== 'predicate')
                ret++;
        });
        dojo.query('#pundit-'+self.name+'-number').html(ret);
    },
    
    // Returns an array of nodes
    getNodesEntities: function() {
        var self = this,
            foo = [];
        for (var id in self.itemsDnD.map) {
            if (dojo.indexOf(self.itemsDnD.map[id].data.rdftype, ns.fragments.text) === -1 
                && dojo.indexOf(self.itemsDnD.map[id].data.rdftype, ns.image) === -1 
                && dojo.indexOf(self.itemsDnD.map[id].data.rdftype, ns.fragments.image) === -1
                && dojo.indexOf(self.itemsDnD.map[id].data.rdftype, ns.rdf_property) === -1
                && dojo.indexOf(self.itemsDnD.map[id].data.rdftype, ns.page) === -1)
                    foo.push(dojo.query('#'+id)[0]);
        }
        return foo;
    },

    getItemsWhereFieldTest: function(field, testFunction) {
        var self = this,
            value,
            foo = [];
        for (var id in self.itemsDnD.map) {
            value = self.itemsDnD.map[id].data[field];
            if (testFunction(value) === true)
                foo.push(self.itemsDnD.map[id].data);
            else self.log("Item " + self.itemsDnD.map[id].data.value + " discarded, missing field " + field);    
        }
        return foo;
    },
    
    getNodesWhereField: function(field, value) {
        var self = this,
            foo = [];
        for (var id in self.itemsDnD.map) 
            if (self.itemsDnD.map[id].data[field] === value)
                foo.push(dojo.query('#'+id)[0]);
        return foo;
    },
    
    getNodesWhereTypeIs: function(type) {
        var self = this,
            foo = [];
        for (var id in self.itemsDnD.map) 
            if (dojo.indexOf(self.itemsDnD.map[id].data.rdftype, type) !== -1)
                foo.push(dojo.query('#'+id)[0]);
        return foo;
    },
    
    getLiterals: function(){
        var self = this,
            foo = [];
        for (var id in self.itemsDnD.map){
            var item = self.itemsDnD.map[id];
            if (item.data.type.length === 1 && item.data.rdftype.length === 0)
                if (dojo.indexOf(item.data.type, 'object') !== -1)
                    foo.push(dojo.query('#'+id)[0]);
        }
        return foo;   
    },
    
    getItemsIds: function(nodes) {
        var ids = {};
        nodes.forEach(function(pi){
            ids[dojo.attr(pi, 'id')] = true;
        });
        return ids;
    },
    
    getItemFromUri: function(uri) {
        var self = this,
            ret;
            
        self.itemsDnD.forInItems(function(item){
            if (item.data.value === uri)
                ret = item.data;
        });
        return ret;
    },
    
    getItemsFromParentItem: function(parentUri) {
        var self = this,
            ret = [];
            
        self.itemsDnD.forInItems(function(item){
            if (item.data.isPartOf === parentUri)
                ret.push(item.data);
        });
        return ret;
    },

    getItemIdFromUri: function(uri) {
        var self = this;
        
        for (var id in self.itemsDnD.map) {
            if (self.itemsDnD.map[id].data.value === uri)
                return id;
        }
        self.log('ERROR: getItemIdFromUri with wrong uri? '+uri);
        return null;
    },
    
    getItemsFromTerm: function(term, rdftypes, rejectedTypes){
        var self = this,
            items = self.getItemsWhereFieldTest('description', function(c) {    
                // No content? no match
                if (typeof(c) === 'undefined') return false;

                //Should i consider also range and domain parameters to reuse 
                //this also inside pundit when suggesting items? Or this has 
                //to be performed on a later step?

                // For each word selected, if it's not present in item
                // content, its not ok: return false
                for (var i = term.length; i--;) 
                    if (c.indexOf(term[i]) === -1) return false;

                return true;
            });
            
        if (((typeof(rdftypes) === 'undefined') && (typeof(rejectedTypes) === 'undefined')))
            return items

        return self.filterItemsByRdftype(items, rdftypes, rejectedTypes);
        
    },
    
    // TODO Should we move this to an helper and not to semlibItems
    // Filter items array according to an array of rdftypes
    filterItemsByRdftype: function(items, rdftypes, rejectedTypes){
        var filteredItems = [];

        if (typeof(rdftypes) === 'undefined') rdftypes = [];
        if (typeof(rejectedTypes) === 'undefined') rejectedTypes = [];

        for (var i = items.length; i--;) {
            var accept = true;

            for (var j = items[i].rdftype.length; j--;) {
                for (var k = rdftypes.length; k--;) {
                    if (items[i].rdftype[j] === rdftypes[k]){
                        accept = true;
                        break;
                    } else {
                        accept = false;
                    }
                }

                for (var k = rejectedTypes.length; k--;){
                    if (items[i].rdftype[j] === rejectedTypes[k]){
                        accept = false;
                        break;
                    } else {
                        accept = true;
                    }
                }
                if (accept === true)
                    break;
            }
            if (accept === true)
                filteredItems.push(items[i]);
        }
        return filteredItems;
    },
    
    // return array or property items filtered by ranges and domain
    getProperties: function(ranges, domains){
        var props = [];
        // Get all properties
        this.itemsDnD.forInItems(function(item){
            var t = item.data.rdftype;
            //for (var i in t){
            for (var i = t.length; i--;){
                if (t[i] === ns.rdf_property){
                    props.push(item.data);
                    break;
                }
            }
        });
        if ((typeof(ranges) === 'undefined') || (typeof(domains) === 'undefined'))
            return props;
        else {
            //Filter props
            var filteredProps = [];

            for (var i = props.length; i--;){
                var domainsIntersection = tripleComposer._intersection([props[i].domain, domains]);
                var rangesIntersection = tripleComposer._intersection([props[i].range, ranges]);
                if ((typeof domains === 'undefined') || props[i].domain.length === 0 || domains.length === 0 || domainsIntersection.length > 0){
                    if ((typeof ranges === 'undefined')|| props[i].range.length === 0 || ranges.length === 0 || rangesIntersection.length > 0){
                        filteredProps.push(props[i]);
                    }
                }
            }
            return filteredProps;
        }
    },

    setItemFieldFromUri: function(uri, field, value) {
        var self = this,
            id = self.getItemIdFromUri(uri),
            item = self.itemsDnD.map[id];

        // Set the field and overwrite the item in the container
        item.data[field] = value;
        self.itemsDnD.setItem(id, item);
        self.itemsDnD.sync();

        return true;
    },
    
    /**
    * @method addItem
    * @description Add an item to the itemsDnD if it's not already in it.
    * @param item {object} A json object containing the item information.
    */
    addItem: function(item) {
        var self = this;

        if (self.uriInItems(item.value)) {
            self.log("Not adding again "+item.value.substr(0,30)+'..')
            return;
        }

        self.itemsDnD.insertNodes(false, [item]);
        dojo.behavior.apply();
        self.refreshItemsNumber();

        self.fireOnItemAdded(item);
        
        self.log("Added to pundit items: " + item.value);
    }, // addItem()
    
    /**
    * @method removeItemFromUri
    * @description Remove an item from the itemsDnD if it's in it given its Uri.
    * @param uri {string} The Uri of the item to be removed
    */
    removeItemFromUri: function(uri) {
        var self = this;
        if (!self.uriInItems(uri))
            return;
            
        var itemId = self.getItemIdFromUri(uri),
            item = self.getItemFromUri(uri);
        
        self.itemsDnD.delItem(itemId);
        dojo.destroy(itemId);
        self.itemsDnD.sync();
        self.refreshItemsNumber();
        
        self.fireOnItemRemoved(item);
        self.log("Removed item from pundit items: " + uri);
        
        return false;
    },
 
    /**
    * @method removeAllItems
    * @description Removes all items from the itemsDnD.
    */   
    removeAllItems: function() {
        var self = this,
            toRemove = [];
            
        self.itemsDnD.forInItems(function(item) {
            var itemId = self.getItemIdFromUri(item.data.value);
            toRemove.push(itemId);
        });

        for (var itemToRemove = toRemove.length; itemToRemove--;) {
            self.itemsDnD.delItem(toRemove[itemToRemove]);
            dojo.destroy(toRemove[itemToRemove]);	
            self.itemsDnD.sync();	
        }

        self.refreshItemsNumber();
        self.fireOnAllItemsRemoved();
        self.log("Removed all item from pundit items");
    },

    // BUCKET CREATION
    // TODO: move this into its own package.. or find a smarter/faster way
    // to add predicates. Make it configurable or something ..
    createBucketForPredicate: function(d) {
        var self = this,
            b = new pundit.TriplesBucket();
            
        b.addTriple(d.value, ns.items.label, d.label, 'literal');
        b.addTriple(d.value, ns.items.altLabel, d.label, 'literal');
        b.addTriple(d.value, ns.items.description, d.description, 'literal');
        
        b.addTriple(d.value, ns.items.type, ns.rdf_property, 'uri');
        b.addTriple(ns.rdf_property, ns.items.label, 'RDF Property', 'literal');

        return b;
    },
    
    createBucketForVocabItem: function(d) {
        var self = this,
            b = new pundit.TriplesBucket();
            
        b.addTriple(d.value, ns.items.label, d.label, 'literal');
        b.addTriple(d.value, ns.items.altLabel, d.label, 'literal');
        b.addTriple(d.value, ns.items.description, d.description, 'literal');
        b.addTriple(d.value, ns.items.image, d.image, 'literal');

        // DEBUG: no rdftype? Raise some kind of error/warning/log?
        // TODO: add sanity checks on other similar .rdftype uses?
        if (typeof(d.rdftype) !== "undefined")
            for (var i = d.rdftype.length; i--;) {
                b.addTriple(d.value, ns.items.type, d.rdftype[i], 'uri');
                b.addTriple(d.rdftype[i], ns.items.label, ns.getLabelFromUri(d.rdftype[i]), 'literal');
            }
        return b;
    },
    
    createBucketForNamedContent: function(d) {
        var self = this,
        b = new pundit.TriplesBucket();
            
        b.addTriple(d.value, ns.items.label, d.label, 'literal');
        b.addTriple(d.value, ns.items.altLabel, d.label, 'literal');
        b.addTriple(d.value, ns.items.description, d.description, 'literal');
        b.addTriple(d.value, ns.items.image, d.image, 'uri');

        b.addTriple(d.value, ns.items.pageContext, d.pageContext, 'uri');
        b.addTriple(d.value, ns.items.isPartOf, d.isPartOf, 'uri');
        
        if (typeof(d.rdftype) !== "undefined")
            for (var i = d.rdftype.length; i--;) {
                b.addTriple(d.value, ns.items.type, d.rdftype[i], 'uri');
                b.addTriple(d.rdftype[i], ns.items.label, ns.getLabelFromUri(d.rdftype[i]), 'literal');
            }

        b.addTriple(ns.fragments.text, ns.items.label, 'Text Fragment', 'literal');
        b.addTriple(ns.fragments.named, ns.items.label, 'Named Content', 'literal');

        return b;
    },

    createBucketForTextFragment: function(d) {
        var self = this,
        b = new pundit.TriplesBucket();
            
        b.addTriple(d.value, ns.items.label, d.label, 'literal');
        b.addTriple(d.value, ns.items.altLabel, d.label, 'literal');
        b.addTriple(d.value, ns.items.description, d.description, 'literal');
        b.addTriple(d.value, ns.items.image, d.image, 'uri');

        b.addTriple(d.value, ns.items.pageContext, d.pageContext, 'uri');
        b.addTriple(d.value, ns.items.isPartOf, d.isPartOf, 'uri');
        
        b.addTriple(d.value, ns.items.type, ns.fragments.text, 'uri');
        b.addTriple(ns.fragments.text, ns.items.label, 'Text Fragment', 'literal');

        return b;
    },
    
    createBucketForImageFragment: function(d) {
        var self = this,
            b = new pundit.TriplesBucket();
            
        b.addTriple(d.value, ns.items.label, d.label, 'literal');
        b.addTriple(d.value, ns.items.altLabel, d.label, 'literal');
        b.addTriple(d.value, ns.items.description, d.description, 'literal');
        b.addTriple(d.value, ns.items.image, d.image, 'uri');

        b.addTriple(d.value, ns.items.pageContext, d.pageContext, 'uri');
        b.addTriple(d.value, ns.items.isPartOf, d.isPartOf, 'uri');
        
        b.addTriple(d.value, ns.items.type, ns.image, 'uri');
        b.addTriple(ns.image, ns.items.label, 'Image', 'literal');

        return b;
    },
    
    createBucketForImageRegionFragment: function(d) {
        var self = this,
            b = new pundit.TriplesBucket();
            
        b.addTriple(d.value, ns.items.label, d.label, 'literal');
        b.addTriple(d.value, ns.items.altLabel, d.label, 'literal');
        b.addTriple(d.value, ns.items.description, d.description, 'literal');
        b.addTriple(d.value, ns.items.image, d.image, 'uri');
        b.addTriple(d.value, ns.items.parentItemXP, d.parentItemXP, 'uri');

        b.addTriple(d.value, ns.items.pageContext, d.pageContext, 'uri');
        b.addTriple(d.value, ns.items.isPartOf, d.isPartOf, 'uri');
        
        b.addTriple(d.value, ns.items.type, ns.fragments.image, 'uri');
        b.addTriple(ns.fragments.image, ns.items.label, 'Image Fragment', 'literal');
        
        b.addTriple(d.value, ns.items.selector, d.selector, 'uri');
        
        for (var i = d.selectors.length; i--;){    
            var selectorUri = ns.selectorBaseUri + d.selectors[i].type + '/' + self.crypto.hex_md5(d.image + dojo.toJson(d.selectors[i]));
            
            b.addTriple(d.value, ns.items.selector, selectorUri, 'uri');
            b.addTriple(selectorUri, ns.items.type, ns.selectors[d.selectors[i].type].value, 'uri');
            b.addTriple(ns.selectors[d.selectors[i].type].value, ns.items.label, ns.selectors[d.selectors[i].type].label, 'literal');
            b.addTriple(ns.selectors[d.selectors[i].type].value, ns.items.description, ns.selectors[d.selectors[i].type].description, 'literal');
            
            b.addTriple(selectorUri, ns.rdf_value, dojo.toJson(d.selectors[i]), 'literal');
        }
        
        return b;
    },

    createBucketForItem: function(d) {
        var self = this,
            b = new pundit.TriplesBucket();
            
        b.addTriple(d.value, ns.items.label, d.label, 'literal');
        b.addTriple(d.value, ns.items.altLabel, d.altLabel, 'literal');
        b.addTriple(d.value, ns.items.description, d.description, 'literal');
        b.addTriple(d.value, ns.items.image, d.image, 'literal');

        for (var i = d.rdftype.length; i--;) {
            b.addTriple(d.value, ns.items.type, d.rdftype[i], 'uri');
            b.addTriple(d.rdftype[i], ns.items.label, ns.getLabelFromUri(d.rdftype[i]), 'literal');
        }

        b.addTriple(d.value, ns.items.prefLabel, d.label, 'literal');

        return b;
    },
    
    createBucketForPage: function(d) {
        var self = this,
            b = new pundit.TriplesBucket();
            
        b.addTriple(d.value, ns.items.label, d.label, 'literal');
        b.addTriple(d.value, ns.items.altLabel, d.altLabel, 'literal');
        b.addTriple(d.value, ns.items.description, d.description, 'literal');

        for (var i = d.rdftype.length; i--;) {
            b.addTriple(d.value, ns.items.type, d.rdftype[i], 'uri');
            b.addTriple(d.rdftype[i], ns.items.label, ns.getLabelFromUri(d.rdftype[i]), 'literal');
        }

        b.addTriple(d.value, ns.items.prefLabel, d.label, 'literal');
        return b;
    },
    
    refreshItems: function(){
        var self = this,
            t = self.getSelectedTab();
        self['show_'+t.replace(/-/g, '')]();
    }

});