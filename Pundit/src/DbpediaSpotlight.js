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
 * @class pundit.DbpediaSpotlight
 * @description Provides facilities to query the DBpedia Spotlight 
 * Annotation services and the DBpedia SPARQL endpoint. 
 */
dojo.provide("pundit.DbpediaSpotlight");
dojo.declare("pundit.DbpediaSpotlight", pundit.BaseComponent,{

    opts: {
        'confidence': 0.15,
        'support': 20
    },
    
    constructor:function(params) {
        var self = this;
        
        self.createCallback(['getTagsFromSpotlight','getInfoFromDBpedia', 'error', 'textLookup', 'lookupError']);
        
        self.log("DBPedia Spotlight up and running");
    }, // constructor()
    
    
    getEntities:function(lang, text, onSuccess, onError){
        var self = this;
        self.getTagsInfoFromDbpediaSpotlight(lang, text, onSuccess, onError);
    },
    
    getTagsInfoFromDbpediaSpotlight:function(lang, text, onSuccess, onError){
        var self = this;
            self.reqs = [];
        
        var args ={
            url: ns.annotationServerVocabProxy + '?url=' + encodeURIComponent(ns.dbpediaSpotlightAnnotate + encodeURIComponent(text) + '&confidence=' + self.opts.confidence + '&support=' + self.opts.support),
            handleAs: "json",
            headers: {"Accept":"application/json"},
            failOk: true, //required to avoid dojo to log the ajax request cancelation as an Error in console
            load: function(g) {
                self.tags = self.getTagItems(g);
                self.requests = {};
                if (self.tags.length === 0)
                    onError();
                    
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
                            }
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
        };
        return requester.xGet(args);
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
        if (typeof(tagObject.Resources) !== 'undefined'){
            for (var i = tagObject.Resources.length -1; i >= 0; i--){
                //Ensure that item has at least rdftype resource
                var rdfType = tagObject.Resources[i]['@types'].replace(/Schema:/g,'http://schema.org/').replace(/DBpedia:/g,'http://dbpedia.org/ontology/').replace(/Freebase\:/g,'http://www.freebase.com/schema').split(',');
                if (rdfType[0] === ""){
                    rdfType[0] = ns.rdfs_resource;
                }
                tagsItem.push({
                    uri: tagObject.Resources[i]['@URI'],
                    match: tagObject.Resources[i]['@surfaceForm'],
                    length: tagObject.Resources[i]['@surfaceForm'].length,
                    offset: tagObject.Resources[i]['@offset']
                });
            }
        }
        return tagsItem;
    },
    
    getInfoFromDBpedia: function(myuri, f, fErr){
        var self = this,
        query =  'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>';
        query += 'SELECT ?comment, ?depiction, ?label, ?type ';
        query += 'WHERE {<' + myuri + '> rdfs:comment ?comment. ';
        query += '<' + myuri + '> rdfs:label ?label. ';
        query += 'OPTIONAL { <' + myuri + '> rdf:type ?type. }';
        query += 'OPTIONAL { <' + myuri + '><http://dbpedia.org/ontology/thumbnail> ?depiction. }';
        query += 'FILTER ( lang(?label) = "en") ';
        query += 'FILTER ( lang(?comment) = "en")} ';

        var args ={
            url: ns.annotationServerVocabProxy + '?url=' + encodeURIComponent('http://dbpedia.org/sparql?query=' + encodeURIComponent(query) + '&output=json'),
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
    },
    
    //DEBUG Does anybody use this function???
    // Lookup from dbpedia
//    getDbpediaName: function(text) { 
//        var self = this,
//            settings = {      
//                'endpoint' : ns.dbpediaKeywordSearch
//            },
//            params = {
//                'QueryString': text 
//            };
//      
//        var args = {
//            url: ns.annotationServerVocabProxy + '?url=' + encodeURIComponent(settings.endpoint + '?QueryString=' + encodeURIComponent(text)), 
//            failOk: true,
//            load: function(data){
//                var jsResults = [],
//                    jsdom = dojox.xml.DomParser.parse(data),
//                    results = jsdom.documentElement.getElementsByTagName('Result');
//                    
//                for (var i in results){
//                    var item = {};
//                                        
//                    item.type = ['subject']
//                    item.value = results[i].childrenByName('URI')[0].childNodes[0].nodeValue;
//                    item.label = results[i].childrenByName('Label')[0].childNodes[0].nodeValue;
//                    try {
//                        item.description = results[i].childrenByName('Description')[0].childNodes[0].nodeValue;
//                    } catch(e){}
//                    
//                    var types = [],
//                        c = results[i].childrenByName('Classes')[0].childrenByName('Class');
//
//                    for (var j in c)
//                        types.push(c[j].childrenByName('URI')[0].childNodes[0].nodeValue);
//                    
//                    // Add a type for resources that have no type
//                    if (types.length === 0)
//                        types = [ns.rdfs_resource];
//                    item.rdftype = types;
//                    jsResults.push(item);
//                }
//                self.fireOnTextLookup(jsResults);
//            },
//            error: function(error){
//                if (error.dojoType==='cancel') {return}
//                console.log('Lookup Error:' + error);
//                self.fireOnLookupError(error);
//            }
//        };
//        return requester.xGet(args);
//    },
    
    getYouTubeVideoInfoById:function(videoId){
        dojo.io.script.get({
            callbackParamName: "callback",
            url: "http://gdata.youtube.com/feeds/api/videos/" + videoId + "?alt=json",
            load: function(r) {
                console.log(r);
            },
            error: function(response, ioArgs) {
                self.log("getSuggestionsForTerm got an error :(");
                self.setLoading(false);
            }
        });
    }
});

