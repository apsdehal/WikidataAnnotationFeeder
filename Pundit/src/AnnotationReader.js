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
*/dojo.provide("pundit.AnnotationReader");
dojo.declare("pundit.AnnotationReader", pundit.BaseComponent, {

    constructor: function(options) {
        this.createCallback([
            'notebookAnn',
            'error',
            'annotationMetadata',
            'annotationContent',
            'annotationItems',
            'storageGet',
            'storageError',
            'jsonpVocabLoaded',
            'notebookChecked'
        ]);
    },
    
    getCurrentNotebookId: function(cb) {
        var self = this;

        var args = {
            url: ns.annotationServerApiCurrentNotebook,
            handleAs: "json",
            headers : {"Accept": "application/json"},
            load: function(r) {
                if (typeof(cb) === 'function')
                    cb(r.NotebookID);
            },
            error: function(error) {
                self.log("ERROR: while getting current notebook ID");
                self.fireOnError("DOH");
            }
        },
        deferred = requester.xGet(args);
        _PUNDIT.ga.track('api', 'get', 'annotationServerApiCurrentNotebook');
        
    },
    
    getOwnedNotebooks:function(cb){
        var self = this;
        var args = {
            url: ns.annotationServerApiOwnedNotebooks,
            handleAs: "json",
            headers : {"Accept": "application/json"},
            load: function(r) {
                if (typeof(cb) === 'function')
                    cb(r.NotebookIDs);
            },
            error: function(error) {
                self.log("ERROR: while getting current notebook ID");
                self.fireOnError("DOH");
            }
        },
        deferred = requester.xGet(args);
        _PUNDIT.ga.track('api', 'get', 'annotationServerApiOwnedNotebooks');
        
    },
    
    getActiveNotebooks:function(cb){
        var self = this;
        var args = {
            url: ns.annotationServerNotebooksActive,
            handleAs: "json",
            headers : {"Accept": "application/json"},
            load: function(r) {
                if (typeof(cb) === 'function')
                    cb(r.NotebookIDs);
            },
            error: function(error) {
                self.log("ERROR: while getting current notebook ID");
                self.fireOnError("DOH");
            }
        },
        deferred = requester.xGet(args);
        _PUNDIT.ga.track('api', 'get', 'annotationServerNotebooksActive');
        
    },
    
    getNotebookMetadata:function(notebookId, cb){
        var self = this;
        var args = {
            url: ns.annotationServerApiNotebooks + notebookId + "/metadata",
            handleAs: "json",
            headers : {"Accept": "application/json"},
            load: function(r) {
                if (typeof(cb) === 'function')
                    cb(notebookId,r);
            },
            error: function(error) {
                self.log("ERROR: while getting current notebook ID");
                self.fireOnError("DOH");
            }
        },
        deferred = requester.xGet(args);
        _PUNDIT.ga.track('api', 'get', 'annotationServerApiNotebooks/$ID/metadata');
        
    },
    
    getUserMetadata:function(id, cb){
        var self = this;
        var args = {
            url: ns.annotationServerApiUsers + id,
            handleAs: "json",
            headers : {"Accept": "application/json"},
            load: function(r) {
                if (typeof(cb) === 'function')
                    cb(id,r);
            },
            error: function(error) {
                self.log("ERROR: while getting users data");
                self.fireOnError("DOH");
            }
        },
        deferred = requester.xGet(args);
        _PUNDIT.ga.track('api', 'get', 'annotationServerApiUsers/$ID');
        
    },

    getNotebookGraph: function(notebookId) {
        var self = this,
        args = {
            url: ns.annotationServerApiNotebooks + notebookId + "/graph",
            headers : {"Accept": "application/json"},
            handleAs: "json",
            load: function(r) {
                self.fireOnNotebookAnn(r);
            },
            error: function(error) {
                self.fireOnError("DOH");
            }
        },
        deferred = requester.xGet(args);
        _PUNDIT.ga.track('api', 'get', 'annotationServerApiNotebooks/$ID/graph');
        
    },
    
    getCurrentNotebookGraph: function() {
        this.getCurrentNotebookId(this.getNotebookGraph);
    },
    
    getAnnotationMetadataFromUri: function(uris) {
        var self = this,
            resourcesObj = {},
            jobId = _PUNDIT.loadingBox.addJob('Reading annotation metadata');
        
        if (typeof(uris) !== 'object')
            uris = [uris];
        resourcesObj.resources = uris;
        
        myPundit.getAnnotationVisibility(function(mode) {
            var args = {
                url: ns.annotationServerMetadataSearch + "?scope=" + mode + "&query=" + encodeURIComponent(dojo.toJson(resourcesObj)),
                handleAs: "json",
                failOk: true,
                headers: {"Accept":"application/json"},
                load: function(g) {
                    self.fireOnAnnotationMetadata(g);
                    _PUNDIT.loadingBox.setJobOk(jobId);
                },
                error: function(error) {
                    self.log('ERROR! getAnnotationMetadataFromUri FAILED');
                    self.fireOnError(error);
                    _PUNDIT.loadingBox.setJobKo(jobId);
                    return false;
                }
            },
            deferred = requester.xGet(args);
            _PUNDIT.ga.track('api', 'get', 'annotationServerMetadataSearch?scope='+mode+'&query=');
        });
    },

    getAnnotationContentFromId: function(id){
        var self = this,
            args = {
                url: ns.annotationServerApiAnnotations + id + "/graph",
                failOk: true,
                handleAs: "json",
                headers: {"Accept":"application/json"},
                load: function(g) {
                    self.log('getAnnotationContentFromId loaded content for annotation '+id);
                    self.fireOnAnnotationContent(g, id);
                },
                error: function(error) {
                    self.log('ERROR! getAnnotationContentFromId FAILED');
                    self.fireOnError(error);
                    return false;
                }
            },
            deferred = requester.xGet(args);
            _PUNDIT.ga.track('api', 'get', 'annotationServerApiAnnotations/$ID/graph');
            
    },
    getAnnotationItemsFromId: function(id, xp){
        var self = this,
            args = {
                url: ns.annotationServerApiAnnotations + id + "/items",
                handleAs: "json",
                failOk: true,
                headers: {
                    "Accept":"application/json"
                },
                load: function(g) {
                    self.log('getAnnotationItemsFromId loaded items for annotation '+id);
                    self.fireOnAnnotationItems(g, id, xp);
                },
                error: function(error) {
                    self.log('ERROR! getAnnotationItemsFromId FAILED');
                    self.fireOnError(error);
                    return false;
                }
            },
            deferred = requester.xGet(args);
            _PUNDIT.ga.track('api', 'get', 'annotationServerApiAnnotations/$ID/items');
    },

    getVocabularyFromJsonp: function(vocabUri, f) {
        var self = this,
            jobId = _PUNDIT.loadingBox.addJob('Reading remote vocabulary '+vocabUri.substr(vocabUri.lastIndexOf('/')+1, vocabUri.length));

        dojo.io.script.get({
            url: vocabUri,
            load: function(r) {
                self.log("Loaded a vocabulary from "+vocabUri);
                _PUNDIT.loadingBox.setJobOk(jobId);
                self.fireOnJsonpVocabLoaded(vocabUri);
            },
            error: function(response, ioArgs) {
                self.log("getVocabularyFromJsonp had an error. "+jobId);
                _PUNDIT.loadingBox.setJobKo(jobId);
                //TODO I consider the vocab loaded
                self.fireOnJsonpVocabLoaded(vocabUri); 
            }
        });
        _PUNDIT.ga.track('api', 'get', 'getVocabularyFromJsonp');
        
    }, // getVocabularyFromJsonp

    // TODO: this will be replaced by new ACL system, and obsoleted
    // see RemoteStorageHandler.js
    getDataFromStorage: function(key) {
        var self = this,
            args = {
                url: ns.annotationServerStorage + key,
                headers : {"Accept": "application/json"},
                failOk: true,
                handleAs: "json",
                load: function(r) {
                    if (r) {
                        self.fireOnStorageGet(r);
                    } else {
                        self.fireOnStorageGet([]);
                        self.log("Empty response for getDataFromStorage for key "+key);
                    }
                },
                error: function(error, req) {
                    if (req.xhr.status === 204) {
                        self.log('204 Empty store from remote, firing ok anyway');
                        self.fireOnStorageGet([]);
                        return false;
                    }
                    self.log("Error getting response for getDataFromStorage for key "+key);
                    self.fireOnStorageError(error);
                }
            };
        var deferred = requester.xGet(args);
        _PUNDIT.ga.track('api', 'get', 'annotationServerStorage/$KEY');
        
    },

    checkNotebook: function(id, cb) {
        var self = this,
        args = {
            url: ns.annotationServerNotebooksActive + "/" + id,
            handleAs: "json",
            failOk: true,
            headers: {
                "Accept":"application/json"
            },
            load: function(g) {
                self.log('Notebook ' + id + " checked for active state");
                self.fireOnNotebookChecked(id, g.NotebookActive);
                if (typeof(cb) === 'function')
                    cb(id, g.NotebookActive);
            },
            error: function(error) {
                self.log('ERROR! checkNotebook FAILED');
                self.fireOnError(error);
                return false;
            }
        },
        deferred = requester.xGet(args);
        _PUNDIT.ga.track('api', 'get', 'annotationServerNotebooksActive/$ID');
    }
});