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
  * @class pundit.KorboBasketSelector
  * @extends pundit.Selector
  * @description Selects items from a Korbo basket
  */
dojo.provide("pundit.selectors.KorboBasketSelector");
dojo.declare("pundit.selectors.KorboBasketSelector", pundit.selectors.SelectorBase, {

    opts: {
        // Number of items to display in the suggestion list
        limit: 30,

        // Ms to wait after a keystroke before querying the service
        keyInputTimerLength: 500,

        // Minimum number of characters to trigger a query to the server 
        keywordMinimumLength: 3,

        korboBasketReconURL: 'http://manager.korbo.org/api.php/basket/reconcile/',
        korboBasketMetadataURL: 'http://manager.korbo.org/',
        korboItemsBaseURL: 'http://purl.org/net7/korbo',
        korboSchemaBaseURL: 'http://purl.org/net7/korbo/type/',
        
        baskets: [16],
        
        layouts: ['pundit-view-list', 'pundit-view-tile']
    },

    constructor: function(options) {
        var self = this;
        self.requests = {};
        self.log('Selector '+self.name+' up and running.');
    }, // constructor()
    
    // (async) Return a list of items for the given term, calling the callback func
    getItemsForTerm: function(term, func) {
        var self = this;
        
        // TODO: cache the results? 
        self.requests[term] = {f: func, items: [], done: 0};
        self.requests[term].jobId = _PUNDIT.loadingBox.addJob('Korbo query: '+term);

        dojo.io.script.get({
            callbackParamName: "jsonp",
            url: self.opts.korboBasketReconURL + self.opts.baskets[0],
            content: {
                query: dojo.toJson({query: term})
            },
            load: function(r) {

                self.requests[term].len = r.result.length;
                self.log('Loaded search term '+term+': '+self.requests[term].len+' items');
                if (self.requests[term].len === 0) {
                    _PUNDIT.loadingBox.setJobOk(self.requests[term].jobId);
                    self._itemRequestDone(term);
                } else {
                    self._getItemsFromKorboResults(r.result, term);
                }

            },
            error: function(response, ioArgs) {
                self.log(self.name+' getItemsForTerm got an error :(');
                console.log('ACF korbo ERRORz', response, ioArgs);
                // TODO: what to do with passed function??
                _PUNDIT.loadingBox.setJobKo(req.jobId);
                self.setLoading(false);
                func([]);
            }
        });
        
    }, // getItemsForTerm()
    
    _getItemsFromKorboResults: function(r, term) {
        var self = this,
            len = r.length,
            result = [];
        
        for (var i=0; i<len; i++) {
            var current = r[i],
                item;

            item = {
                type: ['subject'],
                label: current.name, 
                value: current.resource_url
            };

            self._getItemMetadata(item, term);
            self.requests[term].items.push(item);
            
            result.push(item);
                
        } // for i
            
    }, // _getItemsFromKorboResults()
    
    _getItemMetadata: function(item, term) {
        var self = this;
        
        dojo.io.script.get({
            callbackParamName: "jsonp",
            url: self.opts.korboBasketMetadataURL + self.opts.baskets[0],
            content: {
                url: item.value
            },
            load: function(r) {
                var o = r.result,
                    rdf_types = [];

                self.log('Loading metadata for item '+ item.value);
                
                if ('image' in o) 
                    item.image = o.image;

                if ('description' in o) 
                    item.description = o.description;
                    
                if (('rdftype' in o) && ('length' in o.rdftype))
                    for (var j = o.rdftype.length; j--;)
                        if (typeof(o.rdftype[j]) === 'string')
                            rdf_types.push(o.rdftype[j]);
                        else
                            self.log('ERROR: Weird type is weird? '+typeof(o.rdftype[j])+': '+o.rdftype[j]);

                item.rdftype = rdf_types;
                
                item.rdfData = semlibItems.createBucketForItem(item).bucket;
                self._itemRequestDone(term);
            }
        }); // dojo.io.script.get()
        
    }, // _getItemMetadata()
    
    _itemRequestDone: function(term) {
        var self = this,
            req = self.requests[term];
        
        // Request has been canceled
        if (typeof(req.canceled) !== 'undefined')
            return;

        req.done += 1;
        self.log('Query: '+term+', done: '+req.done+'/'+req.len);

        if (req.done < req.len)
            return;

        self.log('Done loading items for term '+term+'.. calling the function.');
        req.f(req.items, term);

        _PUNDIT.loadingBox.setJobOk(req.jobId);

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