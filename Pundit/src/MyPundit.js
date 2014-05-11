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
 * @class pundit.myPundit
 * @extends pundit.baseComponent
 * @description Handles the authentication workflow and stores informations
 * about the logged in user, like username, notebooks and other useful stuff.<br>
 * Checks if the user is logged in at startup, and request him to log in 
 * if needed.
 */

// TODO: move auth+user's code from authRequests.js to here .. !

dojo.provide("pundit.MyPundit");
dojo.declare("pundit.MyPundit", pundit.BaseComponent, {

    opts: {
        loginServer: ''
    },

    // TODO: move this comment to some @property and some into the class declaration
    /*
     * @constructor
     * @description Initializes the component
     * @param options {object}
     * @param options.debug {boolean} wether or not to .showFilteringOptions debug mode for this component
     */
    constructor: function(options) {
        var self = this,
            my = '<span class="pundit-gui-button" id="pundit-mypundit-login-button">Log in</span>'+
                '<span class="pundit-gui-button" id="pundit-mypundit-loggedin-button"></span>' +
                '<span class="pundit-gui-button" id="pundit-mypundit-this-page-button">Annotations<span class="pundit-icon-page"></span></span>' + 
                '<span class="pundit-gui-button" id="pundit-mypundit-myitems-button">My Items<span id="pundit-new-myitems">(+1)</span><span class="pundit-icon-favorite"></span></span>';

        dojo.query('#pundit-gui-topbar').append(my);

        // TODO: this will be replaced by new ACL system, and obsoleted
        self.store = new pundit.RemoteStorageHandler({debug: self.opts.debug});
        
        self.initBehaviors();
        self.logged = false;

        self.user = {};

        requester.checkLogin(function(data) {
            self.setLogged(data.loginStatus == 1, data);
            self.opts.loginServer = data.loginServer;
        });
        
        requester.onLogin(function(data) {
            self.setLogged(true, data);
        });
                        
        self.log("MyPundit up and running");
        
    }, // constructor()

    /**
        Gets the current annotations visibility mode in an asynchronous fashion 
        @method getAnnotationVisibility
        @param callback {function} the function to be called with the visibility mode as a parameter
    */
    // TODO: this will be replaced by new ACL system, and obsoleted
    getAnnotationVisibility: function(callback) {
        var self = this;
        if (typeof(self.annotationVisibility) === 'undefined') {
            self.store.read("mode");
            self.store.onStoreRead(function(mode){
                var mymode = mode.value;
            
                if (typeof(mymode) === 'undefined') {
                    if (_PUNDIT.config.modules['pundit.NotebookManager'].defaultFilteringOption !== 'undefined') {
                        mymode= _PUNDIT.config.modules['pundit.NotebookManager'].defaultFilteringOption;
                        self.setAnnotationVisibility(mymode);
                    }    
                }
            
                self.annotationVisibility = mymode;
                callback(self.annotationVisibility);
            
            });
        } else {
            callback(self.annotationVisibility);
        }
    },
    
    setAnnotationVisibility: function(scope) {
        var self = this;
        self.annotationVisibility = scope;
        self.store.save('mode', scope);
        tooltip_viewer.refreshAnnotations();
    },

    setLogged: function(flag, data) {
        var self = this;

        if (flag) {
            
            //TODO: as soon as the server receives a proper field...use the proper one
            var screenName = (data.fullName) ? data.fullName : "User: " + data.id;
            self.logged = true;

            dojo.query('#pundit-mypundit-loggedin-button').html(screenName + "<span class='pundit-icon-loggedin'></span>");
            dojo.query('#pundit-gui-topbar').addClass('pundit-logged-in pundit-loggedin').removeClass('pundit-logged-off');
            
            // Save user's information for future use
            self.user = {
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                id: data.id,
                uri: data.uri,
                openid: data.openid
            };

        } else {
            self.logged = false;

            self.user = {};

            //TODO Send a message?
            //mySemlibInfoContainer doesn't exist anymore'
            //if (typeof(data.msg) !== 'undefined')
            //    dojo.query('#mySemlibInfoContainer').html(data.msg);
        }
    },

    initBehaviors: function() {
        var self = this;

        dojo.connect(dojo.byId('pundit-mypundit-loggedin-button'), 'onclick', function(e) {
            var pos = dojo.position(e.target).x - 20;
            // TODO: this call to getAnnotationVisibility ensures that the 
            // self.annotationVisibility is bound when shwing the action menu. IT SUCKS but works!
            self.getAnnotationVisibility(function(mode){
                cMenu.show(pos, 20, '', 'semlibUserMenu', 'pundit-cm-bottom');    
            });
            
        });

        dojo.connect(dojo.byId('pundit-mypundit-login-button'), 'onclick', function(e){
            if (!self.logged) {
                _PUNDIT.ga.track('gui-button', 'click', '#pundit-mypundit-login-button');
                requester.showLoginForm(self.opts.loginServer);
                requester.openLoginPopUp();
            }
        });
        
        dojo.connect(dojo.byId('pundit-mypundit-this-page-button'), 'onclick', function(e){
            var pos = dojo.position(e.target).x - 20;
            cMenu.show(pos, 20, '', 'punditThisPageMenu', 'pundit-cm-bottom');
        });
        
        cMenu.addAction({
            type: ['semlibUserMenu'],
            name: 'semlibLogout',
            label: 'Sign out',
            showIf: function(xp) { 
                return true;
            },
            onclick: function(xp) {
                requester.logout(function(msg) {
                    self.setLogged(false, msg);
                });
                _PUNDIT.ga.track('cmenu', 'click', 'sign-out');
                dojo.removeClass(dojo.byId('pundit-gui-topbar'), 'pundit-loggedin');
                return true;
            }
        });

        if (_PUNDIT.config.modules['pundit.NotebookManager'].active === true) {

            self.notebookManager = new pundit.NotebookManager({
                name: "NotebookManager",
                title: "Notebook Manager",
                drag:true,
                width:500
            });

            cMenu.addAction({
                type: ['semlibUserMenu'],
                name: 'punditManageNotebooks',
                label: 'Manage Notebooks',
                showIf: function() { 
                    return true;
                },
                onclick: function() {
                    _PUNDIT.ga.track('cmenu', 'click', 'notebook-manager');
                    self.notebookManager.show(150,150,{
                        title: "Notebook Manager"
                    });
                }
            });

        }


        if (_PUNDIT.config.isModuleActive('pundit.NotebookManager') && _PUNDIT.config.modules['pundit.NotebookManager'].showFilteringOptions === true) {

            cMenu.addAction({
                type: ['semlibUserMenu'],
                name: 'punditAnnotationsVisibilityShowAll',
                label: 'View all notebooks',
                showIf: function() {
                    return myPundit.annotationVisibility != 'all';
                },
                onclick: function() {
                    _PUNDIT.ga.track('cmenu', 'click', 'view-all-notebooks');
                    semlibWindow.closeAllPanels();
                    self.setAnnotationVisibility('all');
                    return true;
                }
            });

            cMenu.addAction({
                type: ['semlibUserMenu'],
                name: 'punditAnnotationsVisibilityShowActive',
                label: 'View active notebooks only',
                showIf: function() { 
                    return self.annotationVisibility != 'active';
                },
                onclick: function() {
                    _PUNDIT.ga.track('cmenu', 'click', 'view-active-notebooks-only');
                    semlibWindow.closeAllPanels();
                    self.setAnnotationVisibility('active');
                    return true;
                }
            });
           

        }

        // TODO: move me to some other button somewhere else?
        cMenu.addAction({
            type: ['punditThisPageMenu'],
            name: 'showAllAnnotations',
            label: 'Show all annotations',
            showIf: function() {
                // Dont show the button if we are refresing annotations
                return !_PUNDIT.tooltipViewer.isRefreshingAnnotations;
            },
            onclick: function() {
                _PUNDIT.ga.track('cmenu', 'click', 'show-all-annotations');
                _PUNDIT.tooltipViewer.showAllAnnotations();
                return true;
            }
        });

        cMenu.addAction({
            type: ['punditThisPageMenu'],
            name: 'refreshAnnotationsAndMyItems',
            label: 'Refresh Annotations and My Items',
            showIf: function() {
                // Dont show the button if we are refresing annotations
                return !_PUNDIT.tooltipViewer.isRefreshingAnnotations;
            },
            onclick: function() {
                _PUNDIT.ga.track('cmenu', 'click', 'refresh-annotations-and-my-items');
                _PUNDIT.tooltipViewer.refreshAnnotations();
                semlibMyItems.loadMyItems();
                return true;
            }
        });


        // TODO: move me to some other button somewhere else?
        cMenu.addAction({
            type: ['punditThisPageMenu'],
            name: 'closeAllOpenedAnnotations',
            label: 'Close all annotations',
            showIf: function() { 
                return semlibWindow.isSomePanelOpen();
            },
            onclick: function() {
                _PUNDIT.ga.track('cmenu', 'click', 'close-all-annotations');
                semlibWindow.closeAllPanels();
                return true;
            }
        });

    } // initBehaviors();
});