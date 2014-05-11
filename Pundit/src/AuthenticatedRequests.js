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
    Provides facilities to interact with the pundit server, through
    authenticated API Calls. The authentication is granted by an OpenID workflow,
    initialized here and carried on by the server. When logged in, this component
    notifies the user and executes any previously blocked request, which needed
    authentication to work.
    @class pundit.authenticatedRequests
    @constructor
    @extends pundit.baseComponent
    @module pundit
    @example
        var x = new pundit.AuthenticatedRequests({
                loginAutomaticHideMS: 100
            });
    @param options {object} See object properties
**/
dojo.provide("pundit.AuthenticatedRequests");
dojo.declare("pundit.AuthenticatedRequests", pundit.BaseComponent, {

    opts : {
        /**
            Timer used to poll the server to trigger the login done event
            @property loginTimerMS
            @type Integer (milliseconds)
            @default 500 
        **/
        loginTimerMS: 500,
        /**
            Hide the login window after these many milliseconds
            @property loginAutomaticHideMS
            @type Integer (milliseconds)
            @default 2000 
        **/
        loginAutomaticHideMS: 2000
    },

    blockedRequests: [],

    constructor: function(options) {
        var self = this;
        
        self.redirectURL = null;
        self.initLoginDialog();
    
        /**
            Called when the user succesfully completes the OpenID 
            authentication workflow.
            @event onLogin
            @param f(data) {function} function to be called.<br>
                data is the json object coming from the server on succesfull login. 
        */

	    /**
            Called when the user succesfully logs out.
            @event onLogout
            @param f(data) {function} function to be called.<br>
                data is the json object coming from the server on succesfull logout. 
        */
        self.createCallback(['login', 'logout']);
        
        self.log('Authenticated requests component up and running!');
    },

    initLoginDialog: function() {
        var self = this,
        h = "<div id='pundit-login-popup-content' class='off tundra'>";

        h += "<div class='off'><p>To view annotations on this page you must log in.</p></div>";
        h += "<div class='waiting'><p>Please complete the process in the login window</p></div>";
        h += "<div class='logged'><p>You are logged in as:</p> <span class='username'>XYZ</span></div>";

        h += "<div id='pundit-login-popup-buttons'>";
        h += "<span id='pundit-login-close-button'>Close</span>";
        h += "<span id='pundit-login-open-button'>Open the login window</span>";

        h += "</div>";
        h += "</div>";

        self.dialog = new dijit.Dialog({
            style: "width: 400px"
        });
        dojo.addClass(dojo.byId(self.dialog.id), 'tundra');
        // Emulating closable: false. Thanks dojo! ;)
        dojo.destroy(self.dialog.closeButtonNode);

        self.dialog.attr("content", h);
        dojo.connect(dojo.byId('pundit-login-open-button'), 'onclick', function() {
            _PUNDIT.ga.track('gui-button', 'click', '#pundit-login-open-button');
            self.openLoginPopUp();
        });
        dojo.connect(dojo.byId('pundit-login-close-button'), 'onclick', function() { 
            _PUNDIT.ga.track('gui-button', 'click', '#pundit-login-close-button');
            self.dialog.hide();
            clearTimeout(self.loginTimer);
        });
	    
    },
	
    /**
    * @method xGet
    * @description Performs an HTTP get through an authenticated Ajax call.
    * @param options {object} the same object one would pass to a 
    * normal dojo xhrGet().
    */
    xGet: function(callParams) {
        return dojo.xhrGet(this.setWrappingCallParams(callParams));	
    },
	
    /**
    * @method xPost
    * @description Performs an HTTP post through an authenticated Ajax call.
    * @param options {object} the same object one would pass to a 
    * normal dojo xhrPost().
    */
    xPost: function(callParams) {
        dojo.xhrPost(this.setWrappingCallParams(callParams));
    },
	
    /**
    * @method xPut
    * @description Performs an HTTP put through an authenticated Ajax call.
    * @param options {object} the same object one would pass to a 
    * normal dojo xhrPut().
    */
    xPut: function(callParams) {
        dojo.xhrPut(this.setWrappingCallParams(callParams));
    },
	
    /**
    * @method xDelete
    * @description Performs an HTTP delete through an authenticated Ajax call.
    * @param options {object} the same object one would pass to a 
    * normal dojo xhrDelete().
    */
    xDelete: function(callParams) {
        dojo.xhrDelete(this.setWrappingCallParams(callParams));
    },
	
    showLoginForm: function(redirectURL) {
        this.redirectURL = redirectURL;
        this.dialog.attr("title", 'You are not logged in!');
        dojo.query('#pundit-login-popup-content').removeClass('logged').removeClass('waiting');
        this.dialog.show();
    },
	
    openLoginPopUp : function() {
        var self = this;
		    
        window.open(self.redirectURL, 'loginpopup', 'left=260,top=120,width=480,height=360');

        dojo.query('#pundit-login-popup-content').removeClass('off').addClass('waiting');
        self.loginTimer = setTimeout(function() {
            self.checkLogin();
        }, self.opts.loginTimerMS);

    },

    checkLogin: function(f) {
        var self = this;
        
        var args = {
            url: ns.annotationServerUsersCurrent,
            handleAs: "json",
            headers: {
                "Accept":"application/json"
            },
            load: function(data) {
                if (typeof(data) === 'undefined' || typeof(data.loginStatus) === 'undefined') { 
                    data = {
                        loginStatus: 0
                    };
                }
                
                if (typeof(f) === 'function') {
                    f(data);
                    return;
                } else if (data.loginStatus == 0) {
                    self.log('Not logged in.. yet...');
                    self.loginTimer = setTimeout(function() {
                        self.checkLogin();
                    }, self.opts.loginTimerMS);
                    return;
                }
                self.login(data);
            },
            error: function(error) {}
        }

        self.xGet(args);
    }, // checkLogin()
    
    login: function(data) {
        var self = this;
        
        self.dialog.attr("title", 'You are now logged in!!');
        dojo.query('#pundit-login-popup-content span.username').html(data.fullName+" ("+data.email+")");
        dojo.query('#pundit-login-popup-content').removeClass('waiting').addClass('logged');
        
        //for (var i in self.blockedRequests) 
        for (var i = self.blockedRequests.length; i--;) 
            self.xGet(self.blockedRequests[i]);
      
        self.fireOnLogin(data);
        
        setTimeout(function() { 
            self.dialog.hide();
        }, self.opts.loginAutomaticHideMS);
        
    },
    
    logout: function(f) {
        var self = this;
        
        clearTimeout(self.loginTimer);
        
        var args = {
            url: ns.annotationServerUsersLogout,
            handleAs: "json",
            headers: {
                "Accept":"application/json"
            },
            load: function(data) {
                var msg;
                if (typeof(data) !== 'undefined' && typeof(data.logout) !== 'undefined') {
                    data.msg = (data.logout == 1) ? 'Logged out succesfully' : 'You werent logged in.. and you still arent.';

                    if (typeof(f) === 'function')
                        f(data);

                    self.fireOnLogout(data);
                }
            },
            error: function(error) {}
        }

        self.xGet(args);
    },
	
    setWrappingCallParams : function(originalCallParams) {
        var self = this,
            wrappedParams = {
                'withCredentials': true
            },
            key;
		    
        for (key in originalCallParams) 
            if (key !== "load") 
                wrappedParams[key] = originalCallParams[key];
            else 
                wrappedParams[key] = function(r) {
                    if (r && typeof(r.redirectTo) !== "undefined") {
                        self.blockedRequests.push(wrappedParams);
                        self.showLoginForm(r.redirectTo);
                    } else 
                        originalCallParams.load(r);
                }
				
        return wrappedParams;
    }		
});