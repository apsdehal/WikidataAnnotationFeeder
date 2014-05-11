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
*/dojo.provide("pundit.MyItems");
dojo.declare("pundit.MyItems", pundit.Items, {

    constructor: function() {
        var self = this;

        self.name = 'my-items';

        self.init(self.name);
        self.initContextualMenu();
        
        self.newAddedItems = [];
        self.createCallback(['myItemAdded']);
        
        // Id of the init job
        self.loadJobId = _PUNDIT.init.waitBeforeInit();
        
        // Id of the loading box jobs for read and write
        self.readJobId = null;
        self.writeJobId = null;
        
        
        // TODO: this will be replaced when my items will be just another
        // korbo vocabulary, after korbo ACL + auth + sso
        self.store = new pundit.RemoteStorageHandler({debug: self.opts.debug});
        self.store.onStoreRead(function(favoriteItems){

            if (favoriteItems.length === 0) {
                self.log('Perfectly virgin favorites: initializing');
                self.resetFavoriteItems();
                favoriteItems = {value: []};
            }
            
            tooltip_viewer.tempXpointers = [];

            for (var i = favoriteItems.value.length; i--;) {
                var item = favoriteItems.value[i];
                
                // Check if item is a fragment that can be resolved in the current page
                // TODO DEBUG: x marco type ns.image???!!
                if (!tooltip_viewer.isTempXpointer(item.value) &&
                    (item.rdftype.indexOf(ns.fragments.text) !== -1 || item.rdftype[0] === ns.image) &&
                    (tooltip_viewer.contentURIs.indexOf(item.isPartOf) !== -1))
                        tooltip_viewer.tempXpointers.push(item.value);
                      
                // Add the item
                if (!self.uriInItems(item.value)){
                   previewer.buildPreviewForItem(item);
                   item.favorite = true;
                   self.addItem(item);
                } 

            } // for i in favoriteItems.value

            dojo.behavior.apply();

            // First time we execute this: call the doneBeforeInit command
            if (self.loadJobId) {
                _PUNDIT.init.doneBeforeInit(self.loadJobId);
                self.loadJobId = null;
            }
            _PUNDIT.loadingBox.setJobOk(self.readJobId);
            
        }) ;
        
        // Start loading favorite items straight away
        self.loadMyItems();
        
        self.store.onStoreError(function(){
            console.log('TODO: store is not available');
            if (self.loadJobId) {
                _PUNDIT.init.doneBeforeInit(self.loadJobId);
                self.loadJobId = null;
            }
        });
        
        // DEBUG TODO: marco wtf is this?!!
        _PUNDIT.init.onInitDone(function(){
            tooltip_viewer.onConsolidate(function(){
                //Remove this timeout using an on consolidation complete event
                setTimeout(function(){
                    self.zoomURLXPointer();
                },500);
                
            });
            
            // On pundit item remove, save the favorite items: a fav item
            // could have been removed.
            self.onItemRemoved(function() {
                self.saveFavoriteItems();
            });
            self.onAllItemsRemoved(function() {
                self.resetFavoriteItems();
            });
            self.onItemAdded(function() {
                self.saveFavoriteItems();
            });
        });
        
    },
    
    addItem: function(item, userAdded){
        this.inherited(arguments);
        if (userAdded && !this.isMyItemTabVisible()) {
            var self = this;
            self.newAddedItems.push(item.value);
            self.fireOnMyItemAdded(self.newAddedItems);
        }
    },
    
    isFavoriteFromUri: function(uri) {
        var self = this,
            ret = false;
        
        self.itemsDnD.forInItems(function(item){
            if (item.data.value === uri && item.data.favorite === true) 
                ret = true;
        });
        return ret;
    },
    
    // TODO: this will be replaced when my items will be just another
    // korbo vocabulary, after korbo ACL + auth + sso
    resetFavoriteItems: function() {
        var self = this;
        self.store.save('favorites', []);
    },

    // TODO: this will be replaced when my items will be just another
    // korbo vocabulary, after korbo ACL + auth + sso
    saveFavoriteItems: function(){
        var self = this,
            favoriteItems = [];
        
        self.itemsDnD.forInItems(function(item) {
            favoriteItems.push(item.data);
        });
        
        self.store.save('favorites', favoriteItems);
    },

    // TODO: this will be replaced when my items will be just another
    // korbo vocabulary, after korbo ACL + auth + sso
    loadMyItems: function() {
        var self = this;
        
        self.readJobId = _PUNDIT.loadingBox.addJob('Reading your items');
        self.store.read('favorites');
    },
   
    initContextualMenu:function(){
        var self = this;
        this.inherited(arguments);
        
        cMenu.addAction({
            type: ['pundit-' + self.name],
            name: 'removeSemlib'+ self.name +'Item',
            label: 'Remove this item',
            showIf: function(item) { 
                return true;
            },
            onclick: function(item) {
                self.removeItemFromUri(item.value);
                tooltip_viewer.removeTempXpointer(item.value);
                tooltip_viewer.consolidate();
                _PUNDIT.ga.track('cmenu', 'click', 'myitems-remove-from-myitems');
                return true;
            }
        });
        
        cMenu.addAction({
            type: ['pundit-' + self.name],
            name: 'openSemlib'+ self.name +'WebPage',
            label: 'Show in origin page',
            showIf: function(item) {
                
                var pCont = _PUNDIT.tripleComposer.getSafePageContext();
                if (pCont.indexOf('#xpointer') !== -1)
                    pCont = pCont.substring(0, pCont.indexOf('#'));
                    
                if ((typeof item !== 'undefined') 
                    && (typeof tooltip_viewer.xpointersAnnotationsId[item.value] === 'undefined')
                    && ((dojo.indexOf(item.rdftype, ns.fragments.text) !== -1) || (dojo.indexOf(item.rdftype, ns.image) !== -1))){
                        return !tooltip_viewer.xpointersClasses[item.value];
                    }
                return false;
            },
            onclick: function(item) {
                var fragment = item.value.split('#')[1],
                    uri = item.pageContext + '#' + fragment;
                window.open(uri, 'SemLibOpenedWebPage');
                self.log('Opened a new window to URL '+uri);
                _PUNDIT.ga.track('cmenu', 'click', 'myitems-show-in-origin-page');
                return true;
            }
        });
        
        cMenu.addAction({
            type: ['pundit-' + self.name],
            name: 'open'+ self.name +'ResourceItemWebPage',
            label: 'Open Web page',
            showIf: function(item) {
                if (_PUNDIT.items.isTerm(item))
                    return true;
                else
                    return false;
            },
            onclick: function(item) {
                window.open(item.value, 'SemLibOpenedWebPage');
                _PUNDIT.ga.track('cmenu', 'click', 'myitems-open-web-page');
                return true;
            }
        });
        cMenu.addAction({
            type: ['pundit-' + self.name],
            name: 'removeSemlibAllItems',
            label: 'Empty MyItems',
            showIf: function(item) { 
                return true;
            },
            onclick: function(item) {
                self.removeAllItems();
                tooltip_viewer.resetTempXpointers();
                tooltip_viewer.refreshAnnotations();
                _PUNDIT.ga.track('cmenu', 'click', 'myitems-empty-myitems');
                return true;
            }
        });
    },
    
    zoomURLXPointer: function(){
        // If it's already loaded, dont do anything
        var self = this;        

        if (self.loaded){
            return;
        }

        // If the whole URL in the browser's location input does not
        // contain a #, dont do anything
        var pageLocation = decodeURIComponent(_PUNDIT.tripleComposer.getSafePageContext());
        if (pageLocation.indexOf('#') === -1)
            return;
            
        // If the URL part after the # contains an @about, it is an xpointer which
        // points to a thc content
        var fragment = pageLocation.split('#')[1];
        if (fragment.indexOf("@about=") === -1)
            return;

        var thcUri;
                
        semlibMyItems.itemsDnD.forInItems(function(item) {
            if (item.data.value.indexOf('#') !== -1 && item.data.value.split('#')[1] === fragment)
                thcUri = item.data.value;
        });
                
        if (typeof(thcUri) !== 'undefined') {
            semlibItems.itemsDnD.forInItems(function(item) {
                if (item.data.value.indexOf('#') !== -1 && item.data.value.split('#')[1] === fragment)
                    thcUri = item.data.value;
            });
        }
                    
        // If exist zoom it
        if (typeof(thcUri) !== 'undefined') {
            tooltip_viewer.zoomOnXpointer(thcUri);
            self.loaded = true;
        } else {
            var path = new RegExp("@about='.+?'");
            //Otherwise create the fragment and zoom it
            if (path.test(fragment)){
                tooltip_viewer.zoomOnXpointer(thcUri);
            }
            self.loaded = true;
        }
    },
    
    isMyItemTabVisible:function(){
        return (dojo.hasClass('pundit-gui','pundit-shown') && dojo.hasClass('pundit-tab-my-items', 'pundit-selected'));   
    },
    
    emptyNewMyItems:function(){
        var self = this;
        self.newAddedItems =[];
    }
    
});