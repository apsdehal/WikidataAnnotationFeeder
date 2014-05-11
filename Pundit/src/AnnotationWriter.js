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
*/dojo.provide("pundit.AnnotationWriter");
dojo.declare("pundit.AnnotationWriter", pundit.BaseComponent, {

    constructor: function(options) {
        this.createCallback(['save', 'saveItems', 'error', 'saveStorage', 'storageError', 'setNotebookActive']);
    },

    writeAnnotationContent: function(bucket, targets, pageContext) {
        var self = this,
            reader = new pundit.AnnotationReader({debug: self.opts.debug}),
            jobId = _PUNDIT.loadingBox.addJob('Creating a new annotation'),
            context = encodeURIComponent(dojo.toJson({
                targets: targets,
                pageContext: pageContext
            })),
            jsonData = dojo.toJson(bucket.getTalisJson());

            reader.getCurrentNotebookId(function(notebookId) {
                var post = {
                    url: ns.annotationServerApiNotebooksGraph + notebookId + "?context=" + context,
                    postData: jsonData,
                    headers: {"Content-Type":"application/json;charset=UTF-8;"},
                    handleAs: "json",
                    load: function(data) {
                        self.log('Saved content to notebook '+notebookId+', annotation id '+data.AnnotationID);
                        _PUNDIT.loadingBox.setJobOk(jobId);
                        self.fireOnSave(data.AnnotationID);
                    },
                    error: function(error) {
                        alert("Error saving content to notebook");
                        _PUNDIT.loadingBox.setJobKo(jobId);
                        self.fireOnError("DOH");
                    }
                };
                // Call the asynchronous xhrPost
                requester.xPost(post);
                _PUNDIT.ga.track('api', 'post', 'annotationServerApiNotebooksGraph/$ID/?context');
            });
        
    }, // writeAnnotationContent

    /*
    // TODO change the way target is passed to the server
    postJson: function(jsonData, tar, pag) {

        var self = this,
            context = encodeURIComponent(dojo.toJson({
                targets: tar,
                pageContext: pag
            })),
            reader = new pundit.AnnotationReader({debug: self.opts.debug});
        
        reader.getCurrentNotebookId(function(notebookId) {
            var post = {
                url: ns.annotationServerApiNotebooks + notebookId + "?context=" + context,
                postData: jsonData,
                headers: {"Content-Type":"application/json;charset=UTF-8;"},
                handleAs: "json",
                load: function(data) {
                    self.log('Saved content to notebook '+notebookId+', annotation id '+data.AnnotationID);
                    //_PUNDIT.loadingBox.doneWait();
                    //_PUNDIT.loadingBox.addOk('Annotations saved into the "'+notebookId+'" notebook');
                    self.fireOnSave(data.AnnotationID);
                },
                error: function(error) {
                    alert("Error saving content to notebook");
                    //_PUNDIT.loadingBox.doneWait();
                    //_PUNDIT.loadingBox.addKo('Error saving annotations to the server');
                    // self.fireOnError("DOH");
                }
            };
            // Call the asynchronous xhrPost
            requester.xPost(post);
        });
        
    }, // postJson
	*/
    
    deleteAnnotation: function(id, cb) {
        var self = this,
            args = {
                url: ns.annotationServerApiAnnotations + id,
                handleAs: "json",
                headers : {
                    "Accept": "application/json"
                },
                load: function(data) {
                    if (typeof(cb) === 'function')
                        cb(data);
                },
                error: function(error) {
                    self.fireOnError("DOH");
                }
            };

        requester.xDelete(args);
        _PUNDIT.ga.track('api', 'delete', 'annotationServerApiAnnotations/$ID');

    }, // deleteAnnotation()
    
    writeAnnotationItems: function(annotationID, jsonData){
        var self = this,
            jobId = _PUNDIT.loadingBox.addJob('Saving annotation '+annotationID),
            args = {
                url: ns.annotationServerApiAnnotations + annotationID + "/items",
                postData: jsonData,
                headers: {"Content-Type":"application/json;charset=UTF-8;"},
                handleAs: "json",
                load: function(data) {
                    _PUNDIT.loadingBox.setJobOk(jobId);
                    self.log('writeAnnotationItems completed for '+annotationID);
                    self.fireOnSaveItems(annotationID);
                },
                error: function(error) {
                    _PUNDIT.loadingBox.setJobKo(jobId);
                    self.log('writeAnnotationItems got an error for '+annotationID);
                    console.log('TODO: writeAnnotationItems ERROR');
                    self.fireOnError("DOH");
                }
            };
        requester.xPost(args);
        _PUNDIT.ga.track('api', 'post', 'annotationServerApiAnnotations/$ID/items');
    }, // writeAnnotationItems()
    
    // TODO: this will be replaced by new ACL system, and obsoleted,
    // see RemoteStorageHandler.js
    postRemoteStorage: function(key, payload){
        var args = {
            url: ns.annotationServerStorage + key,
            postData: payload,
            headers: {"Content-Type":"application/json;charset=UTF-8;"},
            handleAs: "text",
            load: function(data) {
                // TODO x Marco: nothing to do here?!
            },
            error: function(error) {
                console.log('TODO: ERROR saving remote storage');
                // alert("Error saving Remote Storage");
                self.fireOnStorageError("DOH");
            }
        };
        requester.xPost(args);
        _PUNDIT.ga.track('api', 'post', 'annotationServerStorage/$KEY');
    },

	setNotebookActive: function(notebook_id,flag,cb) {
		var self = this;
		var args = {
            url: ns.annotationServerNotebooksActive + "/" + notebook_id,
            handleAs: "text",
            load: function(data) {
                self.log('Notebook set active state completed for ' + notebook_id);
                self.fireOnSetNotebookActive(notebook_id, flag);
                if (typeof(cb) === 'function')
                    cb(notebook_id, flag);
            },
            error: function(error) {
				if (flag == 1) {
					console.log('TODO: ERROR activating notebook ' + notebook_id);
				} else if (flag == 0) {
					console.log('TODO: ERROR deactivating notebook ' + notebook_id);	
				}
                self.fireOnError("DOH");
            }
        };
		if (flag == 1) {
			requester.xPut(args);
            _PUNDIT.ga.track('api', 'put', 'annotationServerNotebooksActive/$ID');
		} else if (flag == 0) {
            _PUNDIT.ga.track('api', 'delete', 'annotationServerNotebooksActive/$ID');
			requester.xDelete(args);
		}
	},
    setNotebookCurrent: function(notebookId, cb){
        var self = this;
		var args = {
            url: ns.annotationServerApiNotebooks + "current/" + notebookId,
            handleAs: "text",
            load: function(data) {
                self.log('Notebook set current: ' + notebookId);
                if (typeof(cb) === 'function')
                    cb(notebookId);
            },
            error: function(error) {
				console.log('TODO: ERROR setting notebook current: ' + notebookId);
				self.fireOnError("DOH");
            }
        };
		requester.xPut(args);
        _PUNDIT.ga.track('api', 'put', 'annotationServerApiNotebooks/current/$ID');
    },
    //State can be public or private
    setNotebookVisibility: function(notebookId,state,cb){
        var self = this;
		var args = {
            url: ns.annotationServerApiNotebooks + state + "/" + notebookId,
            handleAs: "text",
            load: function(data) {
                self.log('Notebook set current: ' + notebookId);
                if (typeof(cb) === 'function')
                    cb(notebookId, state);
            },
            error: function(error) {
				console.log('TODO: ERROR setting notebook current: ' + notebookId);
				self.fireOnError("DOH");
            }
        };
		requester.xPut(args);
        _PUNDIT.ga.track('api', 'put', 'annotationServerApiNotebooks/state/$ID');
    },
    createNotebook:function(notebookName,cb){
        var self = this;
        var args = {
            url: ns.annotationServerApiNotebooks,
            postData: dojo.toJson({NotebookName :notebookName}),
            headers: {"Content-Type":"application/json;charset=UTF-8;"},
            handleAs: "json",
            load: function(data) {
                self.log('Notebook created: ' + data.NotebookID);
                if (typeof(cb) === 'function')
                    cb(data.NotebookID);
            },
            error: function(error) {
				console.log('TODO: ERROR creating notebook: ' + notebookName);
				self.fireOnError("DOH");
            }
        };
		requester.xPost(args);
        _PUNDIT.ga.track('api', 'post', 'annotationServerApiNotebooks');
    },
    
    uploadImage:function(form, cb){
        var self = this;
        var args = {
            url: 'http://192.168.65.101:8080/annotationserver/api/services/upload/image',
            //form: formId,
//            content: {
//                file: form
//            },
            
            form : form,
            //headers: {"Content-Type":"multipart/form-data;charset=UTF-8;"},
            handleAs: "json",
            load: function(data) {
                self.log('Notebook created: ' + data.NotebookID);
                if (typeof(cb) === 'function')
                    cb(data.NotebookID);
            },
            error: function(error) {
				console.log('TODO: ERROR creating uploading image: ');
				self.fireOnError("DOH");
            }
        }
        dojo.io.iframe.send(args);
        
    }
});