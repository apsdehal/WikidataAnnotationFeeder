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
 * @class pundit.ContactHelper
 * @extends pundit.baseComponent
 * @description TODO
 */
dojo.provide("pundit.ContactHelper");
dojo.declare("pundit.ContactHelper", pundit.BaseComponent, {

    opts: {
        postAutomaticHideMS: 2000
    },

    constructor: function() {
        var self = this;

        self._dialogs = {};
        self._instances = {};

        for (var i in self.opts.instances) {
            var id = 'form_'+i;
            
            // TODO: check for instance syntax/grammar ?
            // TODO: default values ? 
            self._instances[id] = self.opts.instances[i];
            self.log('Initializing contact form with title '+ self._instances[id].title);
            self._initContactForm(id);
        }

    },
    
    _initContactForm: function(id) {
        var self = this,
            instance = self._instances[id],
            content = '';

        // Add the contextual menu item to show the introduction again
        _PUNDIT.cMenu.addAction({
            type: ['helpMenu'],
            name: 'showContactForm_'+id,
            label: instance.title,
            showIf: function() { return true; },
            onclick: function() {
                _PUNDIT.ga.track('cmenu', 'click', 'show-contact-form');
                self._showForm(id);
                return true;
            }
        });
        
        self._dialogs[id] = new dijit.Dialog({ style: "width: 500px" });
        dojo.addClass(dojo.byId(self._dialogs[id].id), 'tundra pundit-disable-annotation');
        
        self._instances[id].contentNode = dojo.query('#'+self._dialogs[id].id+' .dijitDialogPaneContent')[0];
        
        content += '<div class="pundit-dialog-top pundit-contact-form">';
        content += '  <div class="pundit-dialog-errors"></div>';
        content += '  <div class="pundit-dialog-content">';
        content += '  <p>'+instance.comment+'</p>';
        content += '    <form id="pundit-contact-'+id+'">';
        content += '      <label>Subject *</label><input type="text" name="subject" class="pundit-contact-subject" /><br />';
        content += '      <label>From</label> <input type="text" name="name" class="pundit-contact-from" /><br />';
        content += '      <label>Email</label> <input type="email" name="email" class="pundit-contact-email" /><br />';
        content += '      <label>Message *</label> <textarea name="text" class="pundit-contact-text"></textarea><br />';
        content += '      <input type="hidden" name="identifier" value="'+instance.list+'" />';
        content += '    <form>';
        content += '</div></div>';
        content += '<div class="pundit-dialog-bottom">';
        content += '  <span id="pundit-contact-close-button-'+id+'" class="pundit-gui-button">Cancel</span>';
        content += '  <span id="pundit-contact-submit-button-'+id+'" class="pundit-gui-button">Submit</span>';
        content += '</div>';

        self._dialogs[id].attr("content", content);
        self._dialogs[id].attr("title", instance.title);
        
        self._initFormBehaviors(id);

    }, // _initContactForm()
    
    _initFormBehaviors: function(id) {
        var self = this;
        
        // Form close button: doesnt work while loading
        dojo.connect(dojo.byId('pundit-contact-close-button-'+id), 'onclick', function(e) {
            
            // if (dojo.hasClass(dojo.byId(self._dialogs[id].id), 'pundit-panel-loading')) {
            if (dojo.hasClass(self._instances[id].contentNode, 'pundit-panel-loading')) {
                self.log('Contact window is still loading, cancel canceled');
                return;
            } 
            self._dialogs[id].hide();
            self._clearForm(id);
        });
        
        // Form submit button: doesnt work while loading
        dojo.connect(dojo.byId('pundit-contact-submit-button-'+id), 'onclick', function(e) {
            if (dojo.hasClass(self._instances[id].contentNode, 'pundit-panel-loading')) {
                self.log('Contact window is still loading, post canceled');
                return;
            }
            
            self.log('Submitting contact form '+id);
            // TODO: form check
            // from, name: optional
            // subject, text: mandatory
            self._post(id);
        });
        
        
    }, // _initFormBehaviors()
    
    _post: function(id) {
        var self = this;
        
        self._instances[id].jobId = _PUNDIT.loadingBox.addJob('Sending form '+ self._instances[id].title);
        dojo.addClass(self._instances[id].contentNode, 'pundit-panel-loading');
        
        var post = {
            url: ns.annotationServerContact,
            form: dojo.byId('pundit-contact-'+id),
            load: function(data) {
                self.log('Correctly sent contact form '+id);
                dojo.removeClass(self._instances[id].contentNode, 'pundit-panel-loading');
                dojo.addClass(self._instances[id].contentNode, 'pundit-panel-done');
                
                setTimeout(function() {
                    self._hideForm(id);
                }, self.opts.postAutomaticHideMS);
                
                _PUNDIT.loadingBox.setJobOk(self._instances[id].jobId);
            },
            error: function(error) {
                self.log('Error sending form '+id);
                dojo.removeClass(self._instances[id].contentNode, 'pundit-panel-loading');
                _PUNDIT.loadingBox.setJobKo(self._instances[id].jobId);
            }
        };
        
        // Call the asynchronous xhrPost
        _PUNDIT.requester.xPost(post);
        
    }, // _post()
    
    _showForm: function(id) {
        var self = this;

        if (self._dialogs[id].open) {
            self.log('Form '+id+' is already open.');
            return;
        }
        
        self.log('Showing form '+id);
        dojo.removeClass(self._instances[id].contentNode, 'pundit-panel-done');
        dojo.removeClass(self._instances[id].contentNode, 'pundit-panel-loading');
        self._clearForm(id);
        self._dialogs[id].show();
    },
    
    _hideForm: function(id) {
        var self = this;
        self._dialogs[id].hide();
    },
    
    _clearForm: function(id) {
        var self = this,
            htmlID = self._dialogs[id].id;
        
        dojo.query('#'+htmlID+' input:not([type=hidden]), #'+htmlID+' textarea').val('');
    }

});