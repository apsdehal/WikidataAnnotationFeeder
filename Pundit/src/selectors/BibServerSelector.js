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
 * @class pundit.selectors.BibServerSelector
 * @extends pundit.selectors.SelectorBase
 * @description 
 * TODO TODO TODO TODO 
 */
dojo.provide("pundit.selectors.BibServerSelector");
dojo.declare("pundit.selectors.BibServerSelector", pundit.selectors.SelectorBase, {

    opts: {
        // Number of items to display in the suggestion list
        limit: 30,

        // Ms to wait after a keystroke before querying the service
        keyInputTimerLength: 500,
        
        keywordMinimumLength: 3,

        bibServerSearchURL: "http://big.bibsoup.net/search/?",
        bibServerSchemaBaseURL: "http://thepund.it/fake-namespace/bibserver/",
        bibServerItemRDFType: "http://thepund.it/fake-namespace/bibserver/item",
                
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
        
        // Add function for error
        if (typeof errorFunc !== 'undefined')
            self.requests[term].ef = errorFunc;
        
        self.requests[term].jobId = _PUNDIT.loadingBox.addJob('BibServer query: '+term);

        dojo.io.script.get({
            callbackParamName: "callback",
            url: self.opts.bibServerSearchURL,
            timeout: 10000,
            content: {
                'q': term,
                'format': 'json'
            },
            load: function(r) {
                self.requests[term].len = r.length;
                if (r.length === 0) {
                    _PUNDIT.loadingBox.setJobOk(self.requests[term].jobId);
                    self._itemRequestDone(term);
                } else 
                    self._getItemsFromBibServerResults(r, term);
                
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
    
    _getItemsFromBibServerResults: function (r, term) {
        var self = this, 
            len = r.length,
            value;

        for (var i=0; i<len; i++) {

            var rdf_types = [], 
                item, desc;
                
            desc = "Authors: ";
            for (var a in r[i]['author']) 
                desc += r[i]['author'][a].name;
            
            desc += "<br/><br />";
            
            if (r[i]['journal']) {
                desc += "Journal: "+ r[i]['journal'].name +', vol. '+ r[i]['journal'].volume + '<br />';
            }

            value = self.opts.bibServerSchemaBaseURL 
                + encodeURI(r[i]['identifier'][0]['type']) + '/' 
                + encodeURI(r[i]['identifier'][0]['id']);
            
            item = {
                type: ['subject'],
                rdftype: [self.opts.bibServerItemRDFType],
                label: r[i]['title'],
                value: value,
                description: desc,
                altLabel: '',
                image: ''
            };

            self.requests[term].items.push(item);

            // Job is done: call the function
            item.rdfData = semlibItems.createBucketForItem(item).bucket;
            self._itemRequestDone(term);
        };
        
    }, // _getItemsFromBibServerResults
        
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