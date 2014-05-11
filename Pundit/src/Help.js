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
    Provides facilities and functions to support inline and offline
    help for users, as long with introduction pages and contact forms.
    
    @class pundit.Help
    @module pundit
**/
dojo.provide("pundit.Help");
dojo.declare("pundit.Help", pundit.BaseComponent, {
    
    opts: {
        introductionFile: undefined,
        showIntroductionAtLogin: false,
        introductionWindowTitle: 'Welcome :)'
    },
    
    constructor: function() {
        var self = this;
        
        self._initHTML();
        self._initBehaviors();

        // If there's an introduction file, setup the introduction
        if (typeof(self.opts.introductionFile) !== 'undefined')
            self._initIntroduction();
        
    },

    _initHTML: function() {
        var self = this
            help = '';
        
        help += '<span class="pundit-gui-button" id="pundit-help-button"><span class="pundit-bicon pundit-lifebuoy-icon"></span> Help</span>';
        dojo.query('#pundit-gui-topbar').append(help);
        
    },

    _initIntroduction: function() {
        var self = this,
            content = '';

        self.introductionDialog = new dijit.Dialog({ style: "width: 600px" });
        dojo.addClass(dojo.byId(self.introductionDialog.id), 'tundra pundit-disable-annotation');
        
        content += '<div class="pundit-dialog-top">';
        content += '<iframe class="pundit-dialog-content" src="'+self.opts.introductionFile+'"></iframe>';
        content += '</div>';
        content += '<div class="pundit-dialog-bottom">';
        content += '<span id="pundit-intro-close-button" class="pundit-gui-button">Close</span>';
        content += '<input type="checkbox" id="pundit-intro-dont-open-again" />';
        content += '<span class="pundit-intro-dont-open-label">Don\'t show me this introduction next time.</span>';
        content += '</div>';

        self.introductionDialog.attr("content", content);
        self.introductionDialog.attr("title", self.opts.introductionWindowTitle);

        // Check if we are alredy logged in, to set the checkbox
        _PUNDIT.requester.checkLogin(function(data) {
            if (data.loginStatus !== 1)
                return;
                
            _PUNDIT.remoteStore.get(
                'show-introduction', 
                function(v) {
                    self.log('Initializing dont-open-again checkbox to '+!v.value);
                    dojo.byId('pundit-intro-dont-open-again').checked = !v.value;
                }
            );
        });
        
        self._initIntroductionBehaviors();
        
    }, // _initIntroduction()

    _initIntroductionBehaviors: function() {
        var self = this;
        
        dojo.connect(dojo.byId('pundit-intro-close-button'), 'onclick', function(e) {
            self.introductionDialog.hide();
        });

        dojo.connect(dojo.byId('pundit-intro-dont-open-again'), 'onchange', function(e) {
            if (!_PUNDIT.myPundit.logged) {
                self.log('Trying to modify users preferences while user is not logged in, ignoring.');
                return false;
            }
            _PUNDIT.ga.track('gui-button', 'click', 'pundit-intro-dont-open-again');
            self.log('Setting remote show-introduction to '+!this.checked);
            _PUNDIT.remoteStore.set('show-introduction', !this.checked);
        });

        // Add the contextual menu item to show the introduction again
        _PUNDIT.cMenu.addAction({
            type: ['helpMenu'],
            name: 'showIntroduction',
            label: 'Show introduction',
            showIf: function() { return true; },
            onclick: function() {
                _PUNDIT.ga.track('cmenu', 'click', 'show-introduction');
                self.showIntroduction();
                return true;
            }
        });
        
        // When login happens, read show-introduction remote variable 
        // and show the introduction accordingly. Show it just if the
        // component is configured to do so
        if (self.opts.showIntroductionAtLogin)
            _PUNDIT.requester.onLogin(function() {
                _PUNDIT.remoteStore.get('show-introduction', function(res) {

                    // First time we read that variable: initialize it
                    if (res.length === 0) {
                        self.log('Perfectly virgin show-introduction: initializing');
                        _PUNDIT.remoteStore.set('show-introduction', true);
                        res = {value: true};
                    }
                
                    if (res.value) {
                        self.log('Remote show-introduction is true, showing introduction.');
                        self.showIntroduction();
                    }
                    
                    // Set the checkbox value accordingly
                    self.log('After login initializing dont-open-again checkbox to '+!res.value);
                    dojo.byId('pundit-intro-dont-open-again').checked = !res.value;
                
                }, function() {
                    self.log('ERROR: reading remote show-introduction??');
                });
            });
        
    }, // _initIntroductionBehaviors()

    _initBehaviors: function() {
        var self = this;
        
        dojo.connect(dojo.byId('pundit-help-button'), 'onclick', function(e) {
            var x = dojo.position(dojo.byId('pundit-help-button')).x - 50;
            _PUNDIT.cMenu.show(x, 21, undefined, 'helpMenu', 'pundit-cm-bottom');
        });

    }, // _initBehaviors()

    showIntroduction: function() {
        var self = this;
        self.log('Opening introduction dialog.');
        
        self.introductionDialog.show();
    }

});