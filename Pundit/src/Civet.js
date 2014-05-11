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
 * @class pundit.DataTxt
 * @description Provides facilities to query the DataTxt service 
 * Annotation services and the DBpedia SPARQL endpoint. 
 */
dojo.provide("pundit.Civet");
dojo.declare("pundit.Civet", pundit.BaseComponent, {


    constructor:function(params) {
        var self = this;
        
		self.apiRoot = "http://civet.knowledgehives.com/synonimy/searchKeywords";
		self.callback = "jsonp";
        self.lang = "en";
		
        self.createCallback(['getInfoFromDBpedia', 'error', 'textLookup', 'lookupError']);
        
        self.log("DataTXT up and running");
    }, // constructor()

    getEntities:function(language, text, onSuccess, onError){
        var self = this;
        self.getEntitiesFromCivet(language, text, onSuccess, onError);
    },

    getEntitiesFromCivet:function(language, text, onSuccess, onError){
        var self = this;
            self.reqs = [];

        if (typeof(language) === "undefined" || language === "") {
            language = self.lang;
        }
        
        
        var deferred = dojo.xhrPost({
            url: self.apiRoot,
            postData: "url=&text=" + encodeURI(text) + "&override=true&url=&title=",
            handleAs: "json",
            load: function(g) {

                self.tags = self.getTagItems(g);

                // No matches...
                if (self.tags.length === 0) {
                    onSuccess(self.tags);
                }

                self.requests = {};
                //for (var i in self.tags){
                for (var i = self.tags.length; i--;){
                    if (typeof self.requests[self.tags[i].uri] === 'undefined'){

                        self.requests[self.tags[i].uri] = 'pending',
                        self.reqs.push(self.getInfoFromDBpedia(
                            self.tags[i].uri,
                            self.tags[i].match, 
                            function(uri, item){
                                self.requests[uri] = 'completed';
                                //for (var j in self.tags){
                                for (var j = self.tags.length; j--;){
                                    if (self.tags[j].uri === uri){
                                        self.tags[j]['pundit-items'] = [item];
                                    }
                                }
                                if (self.requestsCompleted()){
                                    onSuccess(self.tags);
                                }
                            },
                            function(uri){
                                self.requests[uri] = 'error';
                                for (var j = self.tags.length -1; j>=0; j--){
                                    if (self.tags[j].uri === uri){
                                        self.tags.splice(j,1);
                                    }
                                }
                                if (self.requestsCompleted()){
                                    onSuccess(self.tags);
                                }
                            },
                            language
                        ));
                    }
                    
                }    
                
                //self.fireOnGetTagsFromSpotlight(self.tags);
            },
            error: function(error) {
                //Don't do nothing if the request has been cancelled'
                if (error.dojoType==='cancel') {
                    //for (var i in self.reqs){
                    for (var i = self.reqs.length; i--;){
                        self.reqs[i].cancel();
                    }
                    return;}
                //self.fireOnError(error);
                self.log(error);
                onError();
            }
        });
    },
    
    requestsCompleted:function(){
        var self = this;
        for (var i in self.requests){
            if (self.requests[i] === 'pending')
                return false;
        }
        return true;
    },
    
    getTagItems:function(tagObject){
        var self = this;
        var tagsItem = [];
        if (typeof(tagObject.keyphrases) !== 'undefined'){
            for (var i = tagObject.keyphrases.length -1; i >= 0; i--){
                var offs = self.getOffsets(tagObject.keyphrases[i]);
                var url = self.getBestRatedMeaningURL(tagObject.keyphrases[i]);
                var match = tagObject.keyphrases[i].label;
                for (var k = 0; k<offs.length; k++) {
                    tagsItem.push({
                        uri: url,
                        match: match,
                        length: offs[k].end - offs[k].start,
                        offset: offs[k].start
                    });
                }
                
            }
        }
        if (typeof(tagObject.keywords) !== 'undefined'){
            for (var i = tagObject.keywords.length -1; i >= 0; i--){
                var offs = self.getOffsets(tagObject.keywords[i]);
                var url = self.getBestRatedMeaningURL(tagObject.keywords[i]);
                var match = tagObject.keywords[i].label;
                for (var k = 0; k<offs.length; k++) {
                    tagsItem.push({
                        uri: url,
                        match: match,
                        length: offs[k].end - offs[k].start,
                        offset: offs[k].start
                    });
                }
                
            }
        }
        return tagsItem;
		
    },
    
    getBestRatedMeaningURL: function(keyphrase) {
        var bestRate;
        var bestRatedUrl;
        for (var i = 0; i<keyphrase.meanings.length; i++) {
            if (typeof(bestRate) === 'undefined' || keyphrase.meanings[i].weight > bestRate) {
                bestRate = keyphrase.meanings[i].weight;
                bestRatedUrl = keyphrase.meanings[i].uri;
            }
        }
        return bestRatedUrl;
    },
    
    getOffsets: function(keyphrase) {
        var offs = keyphrase.offsets.split(" ");
        var results = [];
        for (var i=0; i<offs.length; i = i + 2) {
            var res = {};
            res['start']  = offs[i];
            res['end']  = offs[i+1];
            results.push(res)
        }
        return results;
    },
    
    getInfoFromDBpedia: function(myuri, mylabel, f, fErr, language){
        var self = this;
		
        var query =  "";
		var endpoint = "";

		if (language === 'en') {
			query += 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>';
	        query += 'SELECT ?comment, ?depiction, ?label, ?type ';
	        query += 'WHERE {<' + myuri + '> rdfs:comment ?comment. ';
	        query += '<' + myuri + '> rdfs:label ?label. ';
	        query += 'OPTIONAL { <' + myuri + '> rdf:type ?type. }';
	        query += 'OPTIONAL { <' + myuri + '><http://dbpedia.org/ontology/thumbnail> ?depiction. }';
	        query += 'FILTER ( lang(?label) = "en") ';
	        query += 'FILTER ( lang(?comment) = "en")} ';			
			endpoint = "http://dbpedia.org/sparql";
		} else if (language === 'it') {
			query += 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>';
	        query += 'SELECT ?comment, ?depiction, ?label, ?type ';
	        query += 'WHERE {<' + myuri + '> rdfs:comment ?comment. ';
	        query += '<' + myuri + '> rdfs:label ?label. ';
	        query += 'OPTIONAL { <' + myuri + '> rdf:type ?type. }';
	        query += 'OPTIONAL { <' + myuri + '><http://dbpedia.org/ontology/thumbnail> ?depiction. }';
	        query += 'FILTER ( lang(?label) = "it") ';
	        query += 'FILTER ( lang(?comment) = "it")} ';
			endpoint = "http://it.dbpedia.org/sparql";
		}
		


        var args ={
            url: ns.annotationServerVocabProxy + '?url=' + encodeURIComponent( endpoint + '?query=' + encodeURIComponent(query) + '&output=json'),
            handleAs: "json",
            headers: {
                "Accept":"application/sparql-results+json"
            },
            failOk: true, //required to avoid dojo to log the ajax request cancelation as an Error in console
            id: myuri,
            load: function(r) {
                var item = {},
                    rdfTypes = [],
                    bindings = r.results.bindings,
                    i = bindings[0];
                if (typeof i !== 'undefined'){
                    item.description = i.comment.value;
                    item.label = i.label.value;
                    if (typeof(i.depiction) !== 'undefined')
                        item.image = i.depiction.value;
                    //for (var j in bindings){
                    for (var j = bindings.length; j--;){
                        if (typeof bindings[j].type !== 'undefined')
                            rdfTypes.push(bindings[j].type.value);
                    }
                    //Some dbpedia resource has no type!
                    if (rdfTypes.length === 0){
                        rdfTypes = [ns.rdfs_resource];
                    }
                    item.rdftype = rdfTypes;
                    item.value = myuri;
                    item.type = ['subject'];
                    f(myuri, item);
                } else {
                    // composing an item best effort...
                    var item = {},
                        rdfTypes = [];
                    item.description = mylabel;
                    item.label = mylabel;
                    item.rdftype = [ns.rdfs_resource];
                    item.value = myuri;
                    item.type = ['subject'];
                    f(myuri, item);
                }
            },
            error: function(error) {
                //Don't do nothing if the request has been cancelled'
                if (error.dojoType==='cancel') {
                    return;
                }
                console.log('Civet request error:' + error);
                //self.fireOnError(error);
                self.log(error);
                fErr(myuri);
            }
        };
        return requester.xGet(args);
    }
    

});

