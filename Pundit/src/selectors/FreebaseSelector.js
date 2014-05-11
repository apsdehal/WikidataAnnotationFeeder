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
  * @class pundit.selectors.FreebaseSelector
  * @extends pundit.selectors.SelectorBase
  * @description 
  * TODO TODO TODO TODO 
  */
dojo.provide("pundit.selectors.FreebaseSelector");
dojo.declare("pundit.selectors.FreebaseSelector", pundit.selectors.SelectorBase, {

    opts: {
        // Number of items to display in the suggestion list
        limit: 30,

        // Ms to wait after a keystroke before querying the service
        keyInputTimerLength: 500,
        keywordMinimumLength: 3,
        
        freebaseSearchURL: 'https://www.googleapis.com/freebase/v1/search',
        freebaseSchemaBaseURL: 'http://www.freebase.com/schema',
        freebaseImagesBaseURL: 'https://usercontent.googleapis.com/freebase/v1/image',
        freebaseTopicURL: 'https://www.googleapis.com/freebase/v1/topic',
        freebaseMQLReadURL: 'https://www.googleapis.com/freebase/v1/mqlread',
        freebaseItemsBaseURL: 'http://www.freebase.com',
        freebaseAPIKey: 'AIzaSyCJjAj7Nd2wKsZ8d7XQ9ZvUwN5SF0tZBsE',
        
        // TODO: let the user configure the freebase query somehow? 
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
        
        // TODO: cache the results? 
        self.requests[term] = {
            f: func, 
            items: [], 
            done: 0
        };
        
        // Add function for error
        if (typeof(errorFunc) !== 'undefined')
            self.requests[term].ef = errorFunc;
        
        self.requests[term].jobId = _PUNDIT.loadingBox.addJob('Freebase query: '+term);

        dojo.io.script.get({
            callbackParamName: "callback",
            url: self.opts.freebaseSearchURL,
            content: {
                key: self.opts.freebaseAPIKey,
                query: term,
                limit: self.opts.limit
            },
            load: function(r) {
                self.requests[term].len = r.result.length;
                if (r.hits === 0) {
                    _PUNDIT.loadingBox.setJobOk(self.requests[term].jobId);
                    self._itemRequestDone(term);
                } else {
                    self._getItemsFromFreebaseResults(r, term);
                }
            },
            error: function(response, ioArgs) {
                self.log(self.name+' getItemsForTerm got an error :(');
                if (typeof self.requests[term].ef !== 'undefined')
                    self.requests[term].ef();
                func([]);
                _PUNDIT.loadingBox.setJobKo(req.jobId);
            }
        });
        
    }, // getItemsForTerm()
    
    _getItemsFromFreebaseResults: function (r, term) {
        var self = this, 
            len, ar;
        
        // Request has been canceled    
        if (typeof(self.requests[term]) === 'undefined')
            return;
    
        ar = r.result;
        len = ar.length;

        self.log('Getting details for '+len+ 'items');
        
        for (var i=0; i<len; i++) {

            // The item borns as half empty, will get filled up
            // by later calls.
            var item = {
                type: ['subject'],
                label: ar[i].name,
                mid: ar[i].mid,
                freebaseId: ar[i].id,
                image: self.opts.freebaseImagesBaseURL + ar[i].mid,
                // placehold values to get filled by async calls laters
                description: -1,
                value: -1
            };

            self.requests[term].items.push(item);
            self._getItemDetails(item, term);
        };
        
    }, // _getItemsFromFreebaseResults(r, func)
    
    // Two ajax calls:
    // - MQL read to get id, types
    // - TOPIC call to get the description
    _getItemDetails: function(item, term) {
        var self = this;
        
        dojo.io.script.get({
            callbackParamName: "callback",
            url: self.opts.freebaseMQLReadURL,
            content: {
                query: dojo.toJson({
                    "id": null,
                    "mid": item.mid,
                    "type": [{}],
                }),
                limit: self.opts.limit,
                key: self.opts.freebaseAPIKey
            },
            load: function(r) {
                self.log('MQL read for '+item.mid+' done');
                
                // Put some stuff into the item
                item.value = self.opts.freebaseItemsBaseURL + r.result.mid;
                item.typeLabels = [];
                item.rdftype = [];
                
                // Take the types labels for the bucket
                for (var l=r.result.type.length; l--;) {
                    var o = r.result.type[l],
                        uri = self.opts.freebaseSchemaBaseURL + o.id;
                    item.rdftype.push(uri);
                    item.typeLabels.push({uri: uri, label: o.name });
                }

                // Description is not -1: this call is the last one, we're done
                if (item.description !== -1) {
                    self.log('MQL was last, calling itemRequestDone for item '+item.label);
                    item.rdfData = self._finalizeBucket(item);
                    self._itemRequestDone(term);
                }
            }
        }); // dojo.io.script.get()

        dojo.io.script.get({
            callbackParamName: "callback",
            url: self.opts.freebaseTopicURL + item.mid,
            content: {
                key: self.opts.freebaseAPIKey,
                filter: '/common/topic/description'
            },
            failOk: false,
            load: function(r) { 
                self.log('TOPIC description for '+item.mid+' done');

                if (typeof(r.property) !== 'undefined' && r.property['/common/topic/description'].values.length > 0)
                    item.description = r.property['/common/topic/description'].values[0].value;
                else
                    item.description = item.label;

                // Value != -1: this call is the last one, we're done
                if (item.value !== -1) {
                    self.log('TOPIC was last, calling itemRequestDone for item '+item.label);
                    item.rdfData = self._finalizeBucket(item);
                    self._itemRequestDone(term);
                }
            },
            error: function(e) {
                item.description = item.label;

                // Value != -1: this call is the last one, we're done
                if (item.value !== -1) {
                    item.rdfData = self._finalizeBucket(item);
                    self._itemRequestDone(term);
                }
                return false;
            }
        });
        
    }, // _getItemDetails()
    
    _finalizeBucket: function(item) {
        // Update the bucket to set types labels
        var b = semlibItems.createBucketForItem(item);
        for (var l=item.typeLabels.length; l--;) 
            b.updateTripleObject(item.typeLabels[l].uri, ns.items.label, item.typeLabels[l].label, 'literal');
        return b.bucket;
    },
    
    
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