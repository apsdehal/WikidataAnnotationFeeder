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
    Provides an authenticated remote storage facility based on the
    annotation server.
    
    The stored and retrieved objects can be any javascript type (object, 
    array, string, ..): it will be json-encoded and stored.
    
    Each object is stored with a timestamp.
    
    The retrieved objects are always in the format:
    {
        created: <number>,
        value: <object>
    }
    and is up to the user to extract and use the value field.
    
    @class pundit.RemoteStorageHandler
    @module pundit
    @example
        var x = new pundit.RemoteStorageHandler();
        x.get('key', 
            function(resp) {
                console.log('Success: ', resp)
            }, 
            function(error, request){
                console.log('Error: ', error, request);
            }
        );
**/
dojo.provide("pundit.RemoteStorageHandler");
dojo.declare("pundit.RemoteStorageHandler", pundit.BaseComponent, {
    
    constructor: function() {
        var self = this;

        self.createCallback(['storeRead', 'storeSave', 'storeError']);
        self.reader = new pundit.AnnotationReader({debug: self.opts.debug});
        self.reader.onStorageGet(function(data){
            self.log('Storage read from server');
            if (data) {
                self.log('Firing onStoreRead');
                self.fireOnStoreRead(data);
            }
        });
        self.reader.onStorageError(function(error){
            self.fireOnStoreError();
        });
        self.writer = new pundit.AnnotationWriter();
        self.writer.onStorageError(function(error){
            self.fireOnStoreError();
        });
    },
    
    exists: function(key){
        //Currently is not useful
    },
    
    save: function(key, val){
        var currentTime = new Date(),
            payload = dojo.toJson({value: val, created: currentTime.getTime()});
        this.writer.postRemoteStorage(key, payload);
    },
    
    read: function(key) {
        this.reader.getDataFromStorage(key);
    },
    
    clearStore:function(){
        //API has not been implemented yet
    },
    
    clearKey:function(key){
        //API has not been implemented yet
    },
    
    /*
        Retrieves the stored object for the given key.
        onSuccess parameter is mandatory, onError is not.
        @method get
        @param key {string} key to ask to the remote server
        @param onSuccess {function} callback fired on success, called passing
            the complete retrieved object
        @param onError {function} callback fired on error, called passing
            the XHR error and the request object itself
    */
    get: function(key, onSuccess, onError) {
        var self = this,
            args;
        
        // No callback, no fun
        if (typeof(onSuccess) !== 'function') {
            self.log('ERROR: get() with no success callback.')
            return;
        }
        
        // Invalid key or zero-length key wont start any request
        if (typeof(key) !== 'string' || key.length === 0) {
            self.log('ERROR: get() with invalid key: '+ key);
            return;
        }
        
        args = {
            url: ns.annotationServerStorage + key,
            headers : {"Accept": "application/json"},
            failOk: true,
            handleAs: "json",
            load: function(r) {
                if (r) {
                    self.log("Success get() response for key "+ key);
                    onSuccess.call(self, r);
                } else {
                    self.log("Empty get() response for key "+ key);
                    onSuccess.call(self, []);
                }
                return false;
            },
            error: function(error, req) {
                if (req.xhr.status === 204) {
                    self.log('204 Empty store from remote for key '+ key +', firing ok anyway');
                    onSuccess.call(self, []);
                    return false;
                }
                    
                self.log("ERROR: get() for key "+ key);
                if (typeof(onError) === 'function')
                    onError.call(self, error, req);
            }
        };

        requester.xGet(args);
    }, // get()

    /*
        Stores the given stuff for the given key.
        onSuccess and onError parameters are not mandatory.
        @method get
        @param key {string} key to ask to the remote server
        @param key {any} stuff to be saved for key, can be of any type (object, string, array, ..)
        @param onSuccess {function} callback fired on success, called passing
            the complete retrieved object
        @param onError {function} callback fired on error, called passing
            the XHR error and the request object itself
    */
    set: function(key, value, onSuccess, onError) {
        
        // Invalid key or zero-length key wont start any request
        if (typeof(key) !== 'string' || key.length === 0) {
            self.log('ERROR: set() with invalid key: '+ key);
            return;
        }
        
        var self = this,
            content = dojo.toJson({value: value, created: (new Date()).getTime()}),
            args = {
                url: ns.annotationServerStorage + key,
                postData: content,
                headers: {"Content-Type":"application/json;charset=UTF-8;"},
                handleAs: "text",
                load: function(data) {
                    self.log("Success set() for key "+ key);
                    if (typeof(onSuccess) === 'function')
                        onSuccess.call(self, data);
                },
                error: function(error) {
                    self.log("ERROR: set() for key "+ key);
                    if (typeof(onError) === 'function')
                        onError.call(self, data);
                }
            };
        requester.xPost(args);
        
    } // set()
    
});