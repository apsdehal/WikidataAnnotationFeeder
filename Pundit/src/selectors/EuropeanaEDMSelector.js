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
  * @class pundit.selectors.EuropeanaEDMSelector
  * @extends pundit.selectors.SelectorBase
  * @description 
  * TODO TODO TODO TODO 
  */
dojo.provide("pundit.selectors.EuropeanaEDMSelector");
dojo.declare("pundit.selectors.EuropeanaEDMSelector", pundit.selectors.SelectorBase, {

    opts: {

        // Ms to wait after a keystroke before querying the service
        keyInputTimerLength: 500,
        keywordMinimumLength: 3,

        europeanaKey: 'RjMQqtwpP',
        // europeanaSearchURL: "http://preview.europeana.eu/api/v2/search.json?",
        europeanaSearchURL: "http://www.europeana.eu/api/v2/search.json?",
        europeanaPortalURL: "http://europeana.eu/portal/record/",
        europeanaPortalFileExt: ".html",
        europeanaSchemaBaseURL: 'http://thepund.it/fake-namespace/europeana/',
        
        // Number of results to retrieve
        limit: 35,

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
        self.requests[term] = {f: func, items: [], done: 0};
        
        //Add function for error
        if (typeof errorFunc !== 'undefined')
            self.requests[term].ef = errorFunc;
        
        self.requests[term].jobId = _PUNDIT.loadingBox.addJob('Europeana EDM query: '+term);

        dojo.io.script.get({
            callbackParamName: "callback",
            url: self.opts.europeanaSearchURL,
            content: {
                'query': term,
                'wskey': self.opts.europeanaKey,
                'start': 1,
                'rows': self.opts.limit
            },
            load: function(r) {
                self.requests[term].len = r['itemsCount'];
                if (self.requests[term].len === 0) {
                    _PUNDIT.loadingBox.setJobOk(self.requests[term].jobId);
                    self._itemRequestDone(term);
                } else {
                    self._getItemsFromEuropeanaResults(r, term);
                }
            },
            error: function(response, ioArgs) {
                self.log(self.name+' getItemsForTerm got an error :(');
                // TODO: what to do with passed function??
                if (typeof self.requests[term].ef !== 'undefined')
                    self.requests[term].ef();
                func([]);
                _PUNDIT.loadingBox.setJobKo(req.jobId);
            }
        });
        
    }, // getItemsForTerm()
    
    _getItemsFromEuropeanaResults: function (r, term) {
        var self = this, 
            len = r.items.length;

        for (var i=0; i<len; i++) {

            var rdf_types = [], 
                item;

            item = {
                type: ['subject'],
                rdftype: [],
                label: '', 
                value: '',
                description: '',
                altLabel: '',
                image: ''
            };

            self.requests[term].items.push(item);
            self._getItemDescription(item, term, r.items[i].link);
        };
        
    }, // _getItemsFromEuropeanaResults()
    
    _getItemDescription: function(item, term, URL) {
        var self = this;
        
        dojo.io.script.get({
            callbackParamName: "callback",
            url: URL,
            content: {},
            load: function(r) {

                item.value = self.opts.europeanaPortalURL + r.object.about + self.opts.europeanaPortalFileExt;

                // TODO: dc:title or dcterms:alternative
                item.label = r.object.title[0] || "Untitled item";
                
                // Description: can either be a single desc or a list of descriptions
                // TODO: are we sure it's a description ???!!
                if (typeof(r.object.proxies) !== 'undefined' && r.object.proxies.length > 0) 
                    for (var p=0; p < r.object.proxies.length; p++) 
                        if (typeof(r.object.proxies[p].dcDescription) !== 'undefined') {
                            item.description = r.object.proxies[p].dcDescription[0];

                        } else if (typeof(r.object.proxies[p].dcSubject) !== 'undefined' && typeof(r.object.proxies[p].dcSubject.def) !== 'undefined') {
                            item.description = [];
                            for (var s=0; s < r.object.proxies[p].dcSubject.def.length; s++) 
                                item.description.push(r.object.proxies[p].dcSubject.def[s]);
                        }
                
                // Descriptions: merge if it's an array
                if (typeof(item.description) === 'object')
                    item.description = item.description.join('<br/>');

                self.log('Extracted desc');

                if (typeof(r.object.aggregations) !== 'undefined' && r.object.aggregations.length > 0) 
                    for (var ag=0; ag < r.object.aggregations.length; ag++) 
                        if (typeof(r.object.aggregations[ag].edmObject) !== 'undefined') 
                            item.image = r.object.aggregations[ag].edmObject;

                self.log('Extracted image');


                // TODO: deal with the fake types .. what are the real URIs?!
                item.rdftype = [];
                var typeLabels = [],
                    typeURI;
                
                // TODO: we force dc:type to rdf type, but might not be the best idea in the world
                if (typeof(r.object.proxies) !== 'undefined' && r.object.proxies.length > 0) {
                    
                    // TODO: there's usaully 2 or more elements inside the .proxies array, we just
                    // take the types from the first.
                    var pr = 0;
                    if (r.object.proxies[pr].dcType && r.object.proxies[pr].dcType.def.length > 0) {
                        for (ind = 0; ind < r.object.proxies[pr].dcType.def.length; ind++) {
                            var dcType = r.object.proxies[pr].dcType.def[ind];
        
                            // DEBUG: dcType URI ??!
                            if (dcType.match(/^http:*/)) {
                                self.log('Found an URI inside dcType: '+ dcType);
                            }
                            
                            typeURI = self.opts.europeanaSchemaBaseURL + encodeURI(dcType);
                            item.rdftype.push(typeURI);
                            typeLabels.push({uri: typeURI, label: dcType});
                        }
                    }
                }
                
                
                // DEBUG: certain items dont have a .proxies field ... so no type, no metadata, nothing!
                if (item.rdftype.length === 0) {
                    self.log('Ops, '+item.label+' does not have any RDF type. Trying to fix at least one.')
                    typeURI = self.opts.europeanaSchemaBaseURL + encodeURI(r.object.type);
                    item.rdftype.push(typeURI);
                    typeLabels.push(r.object.type);
                }
                
                self.log('extracted types');
                
                // Update the bucket to set types labels
                var bucket = semlibItems.createBucketForItem(item);
                for (var l=typeLabels.length; l--;) {
                    bucket.updateTripleObject(typeLabels[l].uri, ns.items.label, typeLabels[l].label, 'literal');
                }
                item.rdfData = bucket.bucket;

                self.log('Done with this item');

                // Job is done: call the function
                self._itemRequestDone(term);
            },
            error: function() {
                self.log('JSONP And error functions dont get along that well...', arguments);
            }
        }); // dojo.io.script.get()
        
    }, // _getItemDescription()
    
    _itemRequestDone: function(term) {
        var self = this,
            req = self.requests[term];
        
        req.done += 1;
        self.log('query: '+term+', done: '+req.done+'/'+req.len);

        if (req.done < req.len)
            return;

        self.log('Done loading items for term '+term+'.. calling the function.');
        req.f(req.items, term);

        _PUNDIT.loadingBox.setJobOk(req.jobId);
    }

});