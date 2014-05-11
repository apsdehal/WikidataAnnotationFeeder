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
  * @class pundit.selectors.EuropeanaSelector
  * @extends pundit.selectors.SelectorBase
  * @description 
  * TODO TODO TODO TODO 
  */
dojo.provide("pundit.selectors.EuropeanaSelector");
dojo.declare("pundit.selectors.EuropeanaSelector", pundit.selectors.SelectorBase, {

    opts: {

        // Ms to wait after a keystroke before querying the service
        keyInputTimerLength: 500,
        keywordMinimumLength: 3,

        europeanaKey: 'DGEQTCYXDE',
        europeanaSearchURL: "http://api.europeana.eu/api/opensearch.json",

        europeanaSchemaBaseURL: 'http://thepund.it/fake-namespace/europeana/',
        // Each page contains 12 results
        europeanaPagesToQuery: 8,
        
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
        
        self.requests[term].jobId = _PUNDIT.loadingBox.addJob('Europeana query: '+term);

        // DEBUG: Europeana does not have an "itemsPerPage" parameter availabe, but only
        // a "startPage", with 12 items per page. To circumvent this limit, shoot out
        // N requests, each with 12 results
        for (var j=0; j < self.opts.europeanaPagesToQuery; j++)
            dojo.io.script.get({
                callbackParamName: "callback",
                url: self.opts.europeanaSearchURL,
                content: {
                    'searchTerms': term,
                    'wskey': self.opts.europeanaKey,
                    'startPage': j
                },
                load: function(r) {
                    self.requests[term].len = r['items'].length;
                    if (r['items'].length === 0) {
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

        console.log('r 1: ', r, r.items);

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

                item.value = r['europeana:uri'];

                /*
                if (r['dc:subject'])
                    if (typeof(r['dc:subject']) === 'string')
                        item.rdftype.push(self.opts.europeanaSchemaBaseURL + encodeURI(r['dc:subject']));
                    else
                        //for (var s in r['dc:subject']) 
                        for (var s = r['dc:subject'].length; s--;) 
                            item.rdftype.push(self.opts.europeanaSchemaBaseURL + encodeURI(r['dc:subject'][s]));
                */
                
                // TODO: dc:title or dcterms:alternative
                item.label = r['dc:title'] || r['dcterms:alternative'];
                
                // Descriptions: merge if it's an array
                if (typeof(r['dc:description']) === 'string')
                    item.description = r['dc:description'];
                else if (typeof(r['dc:description']) === 'object')
                    item.description = r['dc:description'].join('<br/>');
                else
                    item.description = "No desc :(";

                // TODO: move this to somewhere else?
                item.altLabel = 'From: '+ r['europeana:dataProvider'];
                
                if (r['europeana:object'])
                    item.image = r['europeana:object'];
                else if (r['europeana:isShownAt'])
                    item.image = r['europeana:isShownAt'];


                // TODO: deal with the fake types .. what are the real URIs?!
                item.rdftype = [];
                var typeLabels = [],
                    typeURI;
                    
                if (typeof(r['dc:type']) === 'string') {
                    typeURI = self.opts.europeanaSchemaBaseURL + encodeURI(r['dc:type']);
                    item.rdftype.push(typeURI);
                    typeLabels.push({uri: typeURI, label: r['dc:type']});
                    
                } else if (typeof(r['dc:type'].length) !== 'undefined' && r['dc:type'].length > 0) {
                    for (var t=r['dc:type'].length; t--;) {
                        typeURI = self.opts.europeanaSchemaBaseURL + encodeURI(r['dc:type'][t]);
                        item.rdftype.push(typeURI);
                        typeLabels.push({uri: typeURI, label: r['dc:type'][t]});
                    }
                }

                // Update the bucket to set types labels
                var bucket = semlibItems.createBucketForItem(item);
                for (var l=typeLabels.length; l--;) {
                    bucket.updateTripleObject(typeLabels[l].uri, ns.items.label, typeLabels[l].label, 'literal');
                }
                item.rdfData = bucket.bucket;

                // Job is done: call the function
                self._itemRequestDone(term);
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