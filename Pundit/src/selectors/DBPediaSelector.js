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
  * @class pundit.selectors.DBPediaSelector
  * @extends pundit.selectors.SelectorBase
  * @description 
  * TODO TODO TODO TODO 
  */
dojo.provide("pundit.selectors.DBPediaSelector");
dojo.declare("pundit.selectors.DBPediaSelector", pundit.selectors.SelectorBase, {

    opts: {
        // Number of items to display in the suggestion list
        limit: 30,

        // Ms to wait after a keystroke before querying the reconciliator service
        keyInputTimerLength: 500,
        
        keywordMinimumLength: 3,

        dbpediaKeywordSearchURL: "http://lookup.dbpedia.org/api/search.asmx/KeywordSearch",
        
        layouts: ['list', 'tile']
    },

    constructor: function(options) {
        var self = this;

        self.requests = {};
        self.log('Selector '+self.name+' up and running.');
    }, // constructor()

    // (async) Return a list of items for the given term, calling the callback func
    getItemsForTerm: function(term, func, errorFunc) {
        var self = this,
            dbPediaURL = self.opts.dbpediaKeywordSearchURL + '?QueryString=' + encodeURIComponent(term) + '&MaxHits=' + self.opts.limit,
            serviceURL = ns.annotationServerVocabProxy + '?url=' + encodeURIComponent(dbPediaURL),
            args;
            
        // TODO: cache the results? 
        self.requests[term] = {f: func, items: [], done: 0};
        
        //Add function for error
        if (typeof errorFunc !== 'undefined')
            self.requests[term].ef = errorFunc;
        
        self.requests[term].jobId = _PUNDIT.loadingBox.addJob('DBPedia Lookup query: '+term);
            
        args = {
            url: serviceURL,
            failOk: true,
            load: function(data) {
                // TODO: no result sanity check? 
                self._getItemsFromDBPediaResults(data, term);
            },
            error: function(error){
                if (error.dojoType==='cancel') {return}
                if (typeof self.requests[term].ef !== 'undefined')
                    self.requests[term].ef();
                self.log('Lookup Error: ' + error);
                _PUNDIT.loadingBox.setJobKo(self.requests[term].jobId);
                return false;
            }
        };
        
        requester.xGet(args);
    }, // getItemsForTerm()
    
    _getItemsFromDBPediaResults: function(r, term) {
        var self = this,
            jsdom = dojox.xml.DomParser.parse(r),
            results = jsdom.documentElement.getElementsByTagName('Result');
                    
        self.requests[term].len = results.length;

        // TODO : return prematurely if there's 0 results? 
        if (results.length === 0) {
            self._itemRequestDone(term);
            return;
        }
        
    
        //for (var i in results){
        for (var i = results.length; i--;){
            var item = {};
                                        
            item.type = ['subject']
            item.value = results[i].childrenByName('URI')[0].childNodes[0].nodeValue;
            item.label = results[i].childrenByName('Label')[0].childNodes[0].nodeValue;

            try {
                item.description = results[i].childrenByName('Description')[0].childNodes[0].nodeValue;
            } catch(e){}
                    
            var classes = results[i].childrenByName('Classes')[0].childrenByName('Class');
            item.rdftype = [];
            //for (var j in classes)
            for (var j = classes.length; j--;)
                item.rdftype.push(classes[j].childrenByName('URI')[0].childNodes[0].nodeValue);
                    
            // Add a type for resources that have no type
            if (item.rdftype.length === 0)
                item.rdftype = [ns.rdfs_resource];

            self.requests[term].items.push(item);
            self._getItemDescription(item, term);
        }

    }, // _getItemsFromDBPediaResults()
    
    _getItemDescription: function(item, term) {
        var self = this, 
            query,
            uri = item.value;
        
        query =  'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>';
        query += 'SELECT ?comment, ?depiction, ?label ';
        query += 'WHERE {<' + uri + '> rdfs:comment ?comment. ';
        query += '<' + uri + '> rdfs:label ?label. ';
        query += 'OPTIONAL { <' + uri + '><http://dbpedia.org/ontology/thumbnail> ?depiction. }';
        query += 'FILTER ( lang(?label) = "en") ';
        query += 'FILTER ( lang(?comment) = "en")} ';

        var args ={
            url: ns.annotationServerVocabProxy + '?url=' + encodeURIComponent('http://dbpedia.org/sparql?query=' + encodeURIComponent(query) + '&output=json'),
            handleAs: "json",
            headers: {"Accept":"application/sparql-results+json"},
            failOk: true, // required to avoid dojo to log the ajax request cancelation as an Error in console
            id: uri,
            load: function(data) {

                if (data.results.bindings.length > 0) {
                var foo = data.results.bindings[0];
                    if (typeof(foo.comment) !== 'undefined')
                        item.description = foo.comment.value;

                    if (typeof(foo.depiction) !== 'undefined')
                        item.image = foo.depiction.value;
                }                    
                item.rdfData = semlibItems.createBucketForItem(item).bucket;
                self._itemRequestDone(term);

            },
            error: function(error) {
                // Don't do nothing if the request has been cancelled'
                if (error.dojoType === 'cancel') { return; }
                console.log('GETITEMDESC request error:' + error);

            }
        };
        requester.xGet(args);
        
    }, // _getItemDescription()

    _itemRequestDone: function(term) {
        var self = this,
            req = self.requests[term];
        
        //Request has been canceled
        if (typeof req.canceled !== 'undefined')
            return
        
        req.done += 1;
        self.log('query: '+term+', done: '+req.done+'/'+req.len);
        
        if (req.done < req.len)
            return;
            
        self.log('Done loading items for term '+term+'.. calling the function.');
        req.f(req.items,term);

        _PUNDIT.loadingBox.setJobOk(req.jobId);
    },
    
    cancelRequests:function(){
        var self = this,
            reqs = self.requests;
        
        for (var i in reqs){ //ok object
            reqs[i].len = 0;
            self._itemRequestDone(i);
            reqs[i].canceled = true;
        }
    }
});