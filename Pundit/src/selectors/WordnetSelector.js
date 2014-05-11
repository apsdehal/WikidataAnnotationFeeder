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
  * @class pundit.selectors.WordnetSelector
  * @extends pundit.selectors.SelectorBase
  * @description 
  * TODO TODO TODO TODO 
  */
dojo.provide("pundit.selectors.WordnetSelector");
dojo.declare("pundit.selectors.WordnetSelector", pundit.selectors.SelectorBase, {

    opts: {
        // Number of items to display in the suggestion list
        limit: 30,

        // Ms to wait after a keystroke before querying the reconciliator service
        keyInputTimerLength: 500,
        keywordMinimumLength: 3,

        layouts: ['list', 'tile']
    },

    constructor: function(options) {
        var self = this;

        self.requests = {};
        self.log('Selector '+self.name+' up and running.');
    }, // constructor()

    getItemsForTerm:function(term, func, errorFunc, maxRes){
        var self = this;
        if (typeof(self.limit) === 'undefined'){
            maxRes = 10;
        }else{
            maxRes = self.limit;
        }
        // TODO: cache the results? 
        self.requests[term] = {f: func, items: [], done: 0};
        
        //Add function for error
        if (typeof errorFunc !== 'undefined')
            self.requests[term].ef = errorFunc;
        
        self.requests[term].jobId = _PUNDIT.loadingBox.addJob('Wordnet query: '+term);
        
        var query =  'PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ';
        query += 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ';
        query += 'PREFIX owl:  <http://www.w3.org/2002/07/owl#> ';
        query += 'PREFIX wordnet: <http://www.w3.org/2006/03/wn/wn20/schema/> ';
        query += 'SELECT ?uri ?s, ?label, ?description ';
        query += 'WHERE { ';
        query += '?s rdfs:label ?label ';
        query += 'filter regex(?label, "^' + term +'"). ';
        query += '?s rdf:type wordnet:NounSynset. ';
        query += '?s owl:sameAs ?uri. ';
        query += '?s wordnet:gloss ?description} LIMIT ' + maxRes;
        var args ={
            url: ns.annotationServerVocabProxy + '?url=' + encodeURIComponent('http://wordnet.rkbexplorer.com/sparql/?format=json&query=' + encodeURIComponent(query)),
            handleAs: "json",
            headers: {
                "Accept":"application/sparql-results+json"
            },
            load: function(r) {
                r = r.results.bindings;
                self.requests[term].len = r.length;
                if (r.length === 0) {
                    self._itemRequestDone(term);
                    return;
                }
                
                //for (var i in r){
                for (var i = r.length;i--;){
                    var item = {};
                                        
                    item.type = ['subject']
                    item.value = r[i].uri.value;
                    item.label = r[i].label.value;
                    
                    try {
                        item.description = r[i].description.value;
                    } catch(e){}
                    
                    item.rdftype = [ns.rdfs_resource];
                    item.rdfData = semlibItems.createBucketForItem(item).bucket;
                    self.requests[term].items.push(item);
                    //self._getItemDescription(item, word);
                }
                
                self._itemRequestDone(term);
                
            },
            error: function(error) {
                self.log(error);
                func([]);
                _PUNDIT.loadingBox.setJobKo(self.requests[term].jobId);
                if (typeof self.requests[term].ef !== 'undefined')
                    self.requests[term].ef();
            }
        };
        var deferred = requester.xGet(args);
    },
    
    _itemRequestDone: function(term) {
        var self = this,
            req = self.requests[term];
            
        //Request has been canceled
        if (typeof req.canceled !== 'undefined')
            return    
            
        self.log('Done loading items for term '+term+'.. calling the function.');
        req.f(req.items, term);

        _PUNDIT.loadingBox.setJobOk(req.jobId);

    },
    
    cancelRequests:function(){
        var self = this,
            reqs = self.requests;
        
        for (var i in reqs){
            reqs[i].len = 0;
            self._itemRequestDone(i);
            reqs[i].canceled = true;
        }
    }
});


