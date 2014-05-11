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
dojo.provide("pundit.DataTxt");
dojo.declare("pundit.DataTxt", pundit.BaseComponent, {


    constructor:function(params) {
        var self = this;
        
		self.apiRoot = "http://spaziodati.eu/datatxt/v3/";
		self.appId =  "75293d0d";
		self.appKey = "1866e488198ecbb656e7df03d56aba7f";
		self.rho = 0.2;
		self.dbpedia = true;
		self.lang = "en";
		self.callback = "jsonp";
		
        self.createCallback(['getTagsFromSpotlight','getInfoFromDBpedia', 'error', 'textLookup', 'lookupError']);
        
        self.log("DataTXT up and running");
    }, // constructor()

    getEntities:function(language, text, onSuccess, onError){
        var self = this;
        self.getEntitiesFromDataTxt(language, text, onSuccess, onError);
    },

    getEntitiesFromDataTxt:function(language, text, onSuccess, onError){
        var self = this;
            self.reqs = [];

        if (typeof(language) === "undefined" || language === "") {
            language = self.lang;
        }

        dojo.io.script.get({
            url: self.apiRoot + '?app_id=' + self.appId + '&app_key=' + self.appKey + '&rho=' + self.rho + '&dbpedia=' + self.dbpedia + '&lang=' + language + '&text=' + text,
            callbackParamName: "_callback",
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

        var tagsItem = [];
        if (typeof(tagObject.annotations) !== 'undefined'){
            for (var i = tagObject.annotations.length -1; i >= 0; i--){
                tagsItem.push({
                    uri: tagObject.annotations[i].ref[1].dbpedia,
                    match: tagObject.annotations[i].spot,
                    length: tagObject.annotations[i].end - tagObject.annotations[i].start,
                    offset: tagObject.annotations[i].start
                });
            }
        }
        return tagsItem;
		
    },
    
    getInfoFromDBpedia: function(myuri, f, fErr, language){
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
                }else{
                    fErr(myuri);
                }
            },
            error: function(error) {
                //Don't do nothing if the request has been cancelled'
                if (error.dojoType==='cancel') {
                    return;
                }
                console.log('Dbpediaspotlight request error:' + error);
                //self.fireOnError(error);
                self.log(error);
                fErr(myuri);
            }
        };
        return requester.xGet(args);
    }
    

});

