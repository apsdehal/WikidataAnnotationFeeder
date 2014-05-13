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
  * @class pundit.selectors.WikidataSelector
  * @extends pundit.selectors.SelectorBase
  * @description 
  * TODO TODO TODO TODO 
  */
dojo.provide("pundit.selectors.WikidataSelector");
dojo.declare("pundit.selectors.WikidataSelector", pundit.selectors.SelectorBase, {

    opts: {
        // Number of items to display in the suggestion list
        limit: 30,

        // Ms to wait after a keystroke before querying the service
        keyInputTimerLength: 500,
        keywordMinimumLength: 3,

        url: 'https://www.wikidata.org/w/api.php',
        lang: 'en',
        
        // TODO: let the user configure the Wikidata query somehow? 
        layouts: ['list', 'tile']
    },

    constructor: function(options) {
        var self = this;
        self.requests = {};
        self.log('Selector '+self.name+' up and running.');
    }, // constructor()
    
    // (async) Return a list of items for the given term, calling the callback func
    getItemsForTerm: function(term, func, errorFunc) {
        var self = this;
        self.requests[term] = {
            f: func,
            items: [],
            done: 0
        };

        if (typeof errofunc != 'undefined'){
            self.requests[term].ef = errorFunc;
        }

        self.requests[term].jobId = _PUNDIT.loadingBox.addJob('Wikidata Lookup query: ' + term);
        
        var params = {
            action: 'wbsearchentities',
            type:'item',
            format: 'json',
            language: this.opts.lang,
            search: term,
        };

        dojo.io.script.get({
            url: self.opts.url,
            handleAs: 'json',
            content: params,
            callbackParamName: 'callback',
            load: function( response ) {
                if ( response.success == 1 ) {
                    console.log(response);
                    self.requests[term].len = response.length;
                    self.log('Loaded search term '+term+': '+self.requests[term].len+' items');
                    if (self.requests[term].len == 0) {
                        _PUNDIT.loadingBox.setJobOk(self.requests[term].jobId);
                        self._itemRequestDone(term);
                    } else {
                        self._getItemsFromWikidataResults(response.search, term);
                    }
                }
            },
            error: function( response, ioArgs ) {
               self.log(self.name + ' getItemsForTerm got an error');
               _PUNDIT.loadingBox.setJobKo(self.requests[term].jobId);
               self.setLoading(false);
               func([]); 
            }
        });
        
    }, // getItemsForTerm()
    
    _getItemsFromWikidataResults: function (response, term) {
        var self = this,
            len = response.length;
            result = [];

        for (var i = 0; i<len; i++){
            var current = response[i], 
                item;

            item = {
                type: ['subject'],
                label: current.label,
                value: current.url,
                id: current.id,
                description: current.description
            };

            self.requests[term].items.push(item);

            self._itemRequestDone(term);
            result.push(item);    
        }        
          
        
    }, // _getItemsFromWikidataResults(r, func)
    
    // Two ajax calls:
    // - MQL read to get id, types
    // - TOPIC call to get the description
    _getItemDetails: function(item, term) {
        var self = this;
    }, // _getItemDetails()
        
    
    _itemRequestDone: function(term) {
        var self = this,
            req = self.requests[term];
        
        // Request has been canceled
        if (typeof(req.canceled) !== 'undefined') {
            self.log('Request was canceled, returning');
            return;
        }

        req.done += 1;
        self.log('Query: '+term+', done: '+req.done+'/'+req.len);

        if (req.done < req.len)
            return;

        self.log('Done loading items for term '+term+'.. calling the function.');
        req.f(req.items, term);

        _PUNDIT.loadingBox.setJobOk(req.jobId);

    },


    /**
     * Basic setup function for taking up various type of actions for AJAX requests
     *
     * @param params object Parameters to be passed to AJAX call
     * @param cb function Callback function to be called on the result of the query that happened.
     */

    basicCall: function( params , cb, ecb ){
        var handle = this

        dojo.io.script.get({
            url: handle.opts.url,
            handleAs: 'json',
            content: params,
            callbackParamName: 'callback',
            load: function( response ) {
                    if( response.success == 1 )
                        cb( response );
            },
        });
    },

    /**
     * Function to get a specific type of entity from wikiapi
     *
     * @param type string Defines what to search among Item and Properties
     * @param search string Basic parameter to be searched
     * @param cb function Callback to be applied on the result.
     */

    searchEntities: function( type, search, cb ){
        var params = {
            action: 'wbsearchentities',
            type:type,
            format: 'json',
            language: this.opts.lang,
            search: search,
        };
        this.basicCall( params, cb );
    },

    /**
     * Function to get an arsenal of items from wikiapi
     *
     * @param search string Basic parameter to be searched
     * @param cb function Callback to be applied on the result.
     */

    searchItems: function( search, cb ){
        this.searchEntities('item', search, cb);
    },


    /**
     * Function to get an arsenal of properties from wikiapi
     *
     * @param search string Basic parameter to be searched
     * @param cb function Callback to be applied on the result.
     */

    searchProperties: function( search, cb ){
        this.searchEntities('property', search, cb);
    },

    /**
     * Function to get an arsenal of value items from wikiapi
     *
     * @param search string Basic parameter to be searched
     * @param cb function Callback to be applied on the result.
     */

    searchValues: function( search, cb ){
        this.searchEntities('item', search, cb);
    },

    getEntities: function( id, cb ){
        var params = {
            action: 'wbgetentities',
            ids:id,
            format: 'json',
        };
        this.basicCall(params, cb);
    },
    
    cancelRequests: function(){
        var self = this,
            reqs = self.requests;
        
        for (var i in reqs) {
            reqs[i].len = 0;
            self._itemRequestDone(i);
            reqs[i].canceled = true;
        }
    }

});