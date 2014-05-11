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
 * @class pundit.ng.EntityEditorhelper
 * @extends pundit.baseComponent
 * @description TODO
 */
dojo.provide("pundit.ng.EntityEditorHelper");
dojo.declare("pundit.ng.EntityEditorHelper", pundit.BaseComponent, {

    opts: {
        debug: true,
        
        // Korbo2 API endpoint
        endpoint: "http://demo-cloud.api.korbo.org/v1",
        basketID: 1,

        // Name of the global object which will be created
        globalObjectName: 'EE',

        // List of activated providers for the search function
        providers: {
            korbo: true,
            freebase: false,
            dbpedia: false
        },
        
        useAutocompleteWithSearch: false,
        useTafonyCompatibility: false,
        copyToKorboBeforeUse: false,
        
        types: [
            {
                label: 'Schema.org place',
                state: false,
                URI:'http://schema.org/Place'
            },
            {
                label: 'FOAF person',
                state: false,
                URI:'http://xmlns.com/foaf/0.1/Person'
            },
            {
                label: 'W3 Spatial thing',
                state: false,
                URI:'http://www.w3.org/2003/01/geo/wgs84_pos#SpatialThing'
            }
        ]
        
        
    },

    constructor: function(options) {
        var self = this;
        
        self.initEE();
        self.log('Angular entity editor helper up and running');
    },
    
    initEE: function() {
        var self = this;
        
        window['PunditEEConf'] = {
            endpoint: self.opts.endpoint,
            basketID: self.opts.basketID,
            globalObjectName : self.opts.globalObjectName,
            useOnlyCallback: true,
            useAutocompleteWithSearch: self.opts.useAutocompleteWithSearch,
            useTafonyCompatibility: self.opts.useTafonyCompatibility,
            copyToKorboBeforeUse: self.opts.copyToKorboBeforeUse,
            onLoad: function(){
                self.log("Entity Editor fully loaded");
                self.registerCallbacks();
            },
            providers: self.opts.providers,
            type: self.opts.types
        };
        
        dojo.place('<div ng-app="KorboEE"><korbo-entity-editor conf-name="PunditEEConf"></korbo-entity-editor></div>', dojo.query('body')[0], 'first');

        // TODO: why do i need to bootstrap manually?!!
        if (typeof(window[self.opts.globalObjectName]) === 'undefined') {
            angular.bootstrap(document, ['KorboEE']);
            self.log('Bootstrapping the korbo EE app');
        } else {
            self.log('Korbo EE ng app is already bootstrapped');
        }
        
    },
    
    openEE: function(keyword, field){
        var self = this,
            ee = window[self.opts.globalObjectName];
            
        self.log('Opening entity editor search window, keyword='+keyword+', field='+field);
        
        self._lastField = field;
        
        if (_PUNDIT.GUI.isWindowOpen())
            _PUNDIT.GUI.toggleWindow();

        if (_PUNDIT.GUI.isAnnotationWindowOpen())
            _PUNDIT.GUI.toggleAnnotationWindow();
        
        ee.callClearForm();
        ee.callOpenSearch(keyword);
    },
    
    registerCallbacks: function() {
        var self = this,
            ee = window[self.opts.globalObjectName];
        
        ee.onSave(function(korboItem) {

            self.log('Saving '+ korboItem.label);

            var item = {
                type: ['subject'],
                label: korboItem.label, 
                value: korboItem.value,
                image: korboItem.image || null,
                description: korboItem.description,
                rdftype: []
            };
            
            for (var t in korboItem.type) {
                item.rdftype.push(korboItem.type[t])
            }
            
            item.rdfData = semlibItems.createBucketForItem(item).bucket;
            
            previewer.buildPreviewForItem(item);
            
            if (self._lastField === "subject") {
                tripleComposer.addItemToSubject(item);
            } else if (self._lastField === 'object') {
                tripleComposer.addItemToObject(item);
            }
            
            if (!_PUNDIT.GUI.isWindowOpen())
                _PUNDIT.GUI.toggleWindow();
            
        });

        ee.onCancel(function() {
            self.log('Window closed by cancel.');
        });

        self.log('Callbacks registered');
        
    } // registerCallbacks()
    
});
