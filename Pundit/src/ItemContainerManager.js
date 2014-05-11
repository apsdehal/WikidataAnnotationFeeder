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
 * @class pundit.ItemContainerManager
 * @extends pundit.baseComponent
 * @description Is responsible of the instantiation of different item containers
 * (PageItems, MyItems) and provide facilities for their management. In particular 
 * it allows to execute operation on all the item containers (ex. item refresh, search, ...)
 */
dojo.provide("pundit.ItemContainerManager");
dojo.declare("pundit.ItemContainerManager", pundit.BaseComponent, {

    opts: {
        // Number of types shown in the DND items
        itemTypesNumber: 3
    },

    
    // TODO: move this comment to some @property and some into the class declaration
    /*
    * @constructor
    * @description Initializes the component
    * @param options {object}
    * @param options.debug {boolean} wether or not to activate debug mode for this component
    */
    constructor: function(options) {
        var self = this;
        self.itemContainers = {};
    
        self.initItemContainers();
        self.log('Items Manager up and running');
    }, // constructor()
    
    initItemContainers:function(){
        var self = this;
        //Do we need a function to create instances with also the callbacks?
        dojo.require("pundit.MyItems");
        // TODO -> myItems
        semlibMyItems = new pundit.MyItems();
        _PUNDIT.myItems = semlibMyItems;
        
        self.itemContainers['MyItems'] = semlibMyItems;
        self.itemContainers['MyItems'].onItemAdded(function(){
            self.refreshAll();
        });
        self.itemContainers['MyItems'].onItemRemoved(function(){
            self.refreshAll();
        });

        dojo.require("pundit.PageItems");
        // TODO -> pageItems
        semlibItems = new pundit.PageItems();
        _PUNDIT.pageItems = semlibItems;
        
        self.itemContainers['PageItems'] = semlibItems;
        self.itemContainers['PageItems'].onItemAdded(function(){
            self.refreshAll();
        });
        self.itemContainers['PageItems'].onItemRemoved(function(){
            self.refreshAll();
        });
    },
    
    /**
    * @method refreshAll
    * @description Refresh the items in all the items containers
    */
    refreshAll: function(){
        var self = this;
        for (var i in self.itemContainers){
            self.itemContainers[i].refreshItems();
        }
    },
    
    /**
    * @method refreshAll
    * @description Refresh the number of items in all the items containers
    */
    refreshItemsNumber: function(){
        var self = this;
        for (var i in self.itemContainers){
            self.itemContainers[i].refreshItemsNumber();
        }
    }, 
    
    /**
    * @method getItemByUri
    * @description Return an item contained in the items container given its uri
    * @param uri {string}
    * @return {object - Item} The item identified by that uri. 
    * If multiple items have the same uri, the first items founded looping in the conteiner is returned.
    */
    // TODO: why this is called BY uri and the other FROM uri ???!
    getItemByUri: function(uri){ 
        var self = this;
        for (var i in self.itemContainers) {
            var item = self.itemContainers[i].getItemFromUri(uri);
            if (typeof item !== 'undefined')
                return item
        }
        return undefined;
    },
    
    /**
    * @method getItemsFromParentItem
    * @description Return an item contained in the items container given the uri of its parent item (isPartOf relation)
    * @param parentUri {string}
    * @return {object - Item} The item. 
    */
    getItemsFromParentItem: function(parentUri) {
        var self = this, ret = [];
        for (var i in self.itemContainers) {
            var p = self.itemContainers[i].getItemsFromParentItem(parentUri)
            ret = ret.concat(p);
        }
        return ret;
    },
    
    /**
    * @method getItemsByType
    * @description Return an array of items contained in the items container that have such type
    * @param type {string}
    * @return {array of Item object} The item identified by that uri. 
    * Item are not duplicated.
    */
    getItemsByType:function(type){
        var self = this,
            items = [],
            item;
        for (var i in self.itemContainers){
            for (var id in self.itemContainers[i].itemsDnD.map){
                if (dojo.indexOf(self.itemContainers[i].itemsDnD.map[id].data.rdftype, type) !== -1){
                    item = self.itemContainers[i].itemsDnD.map[id].data;
                    if (!dojo.indexOf(items, item))
                        items.push(item);
                }
            }
        }
        return items
    }, 
    
    /**
    * @method hideAllItems
    * @description Hide all the items in every items container
    */
    hideAllItems:function(){
        var self = this;
        for (var i in self.itemContainers){
            self.itemContainers[i].hideAllItems();
        }
    }, 
    
    /**
    * @method showAllItems
    * @description Show all the items in every items container. Pay attention you also need to select a filter tab (ex. fragment)
    that you want to show ohterwise nothing is visualized...
    */
    showAllItems:function(){
        var self = this;
        for (var i in self.itemContainers){
            self.itemContainers[i].showAllItems();
        }
    },
    
    
    getItemsWhereFieldTest: function() {
         var self = this,
             ret = [];
         for (var i in self.itemContainers) 
             ret = ret.concat(self.itemContainers[i].getItemsWhereFieldTest.apply(self.itemContainers[i], arguments));
         return ret;
    },    
    
    //Return true if the item is a
    isTerm:function(item){
        if (dojo.indexOf(item.rdftype, ns.fragments.text) !== -1 || dojo.indexOf(item.rdftype, ns.fragments.image) !== -1 || dojo.indexOf(item.rdftype, ns.image) !== -1)
            return false;
        else 
            return true;
    }
    
});