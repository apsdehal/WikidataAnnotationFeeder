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
 * @class pundit.contextualMenu
 * @extends pundit.baseComponent
 * @description Provides methods and callbacks to open a contextual
 * menu with customizable options and actions. <br>
 * The actions are organized by "types", various components can activate
 * the contextual menu for a certain type, and all of the actions
 * subscribed with that type will be shown.<br>
 * Each action can have its own function which decides wether to show it
 * or not, and its own onClick callback to be executed.<br>
 * When the contextual menu is shown, an unique identifier or a complex
 * data structure must be passed in, allowing each action to run their 
 * showIf() function, and eventually the onclick().
 */
dojo.provide("pundit.ContextualMenu");
dojo.declare("pundit.ContextualMenu", pundit.BaseComponent, {

    opts: {},

    /*
     * @constructor
     * @description Initializes the contextual menu
     * @param options {object}
     * @param options.debug {boolean} wether or not to activate debug of the component
     */
    constructor: function(options) {
        var self = this;
        
        self.initHTML();
        self.initBehaviors();

        self.currentURL = '';
        self.currentType = '';

        self.actions = {};
        self.hideTimer = null;
        
        self.customclass = '';
        self.log("Contextual menu up and running!");
    },

    initHTML: function() {
        var c;
        
        c = '<div id="pundit-cm" class="pundit-base pundit-hidden">';
        // TODO: add a title?
        // c += '<span class="pundit-cm-header">Un titolo ad effetto</span>';
        c += '</div>';

        dojo.query('body').append(c);

    },

    initBehaviors: function() {
        var self = this;
        
        // Cancel any scroll event when hovering the contextual menu
        dojo.connect(dojo.byId('pundit-cm'), (!dojo.isMozilla ? "onmousewheel" : "DOMMouseScroll"), function(e){
            dojo.stopEvent(e);
        });

        // Hide contextual menu if the page.. or everything scrolls
        dojo.connect(dojo.query('body')[0], (!dojo.isMozilla ? "onmousewheel" : "DOMMouseScroll"), function(e){
            self.hide(e);
        });

    }, // initBehaviors()
    
    /**
     * Adds an action for the given types.<br>
     * Example of the action object: <br>
     * <pre>{
     * ....type: ['myUniqueType'],
     * ....name: 'removeMyItem',
     * ....label: 'Remove this DOM item',
     * ....showIf: function(id) { 
     * ........return dojo.query('#'+id).length !== 0;
     * ....},
     * .....onclick: function(id) {
     * ........dojo.destroy(id);
     * ....}
     * }</pre>
     * This action will destroy a DOM node with the given id. The menu option
     * will be shown if an element with the given id exists.
     * @method addAction
     * @param action {object}
     * @param action.type {array of strings}: List of types to subscribe this action to. <br>
     * The special type "__all" means that this action must be shown disregarding the
     * type passed to the show() function.
     * @param action.name (string): Unique name of this action, used for HTML classes, so no
     * spaces or strange characters are allowed. To be safe just use camelcase
     * letters.<br>
     * @param action.label {string}: Label to be displayed for this menu action.
     * @param action.showIf(data) {function}: function which decides wether or not show this
     * action in the menu. The data parameter passed in is the same parameter
     * passed when showing the menu. Usually an URI or an identifier useful
     * to the subscribing component to make its job.
     * @param action.onclick(data) {function}: Function to be called when the users clicks
     * on this action. The data parameter passed to the callback is an unique
     * identifier of the item we are showing the menu for, or an equivalent
     * complex structure. Usually just an identifier or an URI. <br>
     * If the onclick() function returns true, the contextual menu will be hidden.
     */
    addAction: function(action) {
        var self = this,
            ob = {},
            selector = '#pundit-cm span.pundit-cm-button.'+action.name;

        for (var i = action.type.length; i--;) {
            var t = action.type[i];

            // Create the callbacks if needed
            self.addTypeCallbacks(t);

            // Create the new action type if needed
            if (typeof(self.actions[t]) === 'undefined')
                self.actions[t] = {};
        
            self.actions[t][action.name] = action;
            
            if (dojo.query('#pundit-cm span.pundit-cm-button.'+action.name).length === 0)
                dojo.query('#pundit-cm').append('<span class="pundit-cm-button pundit-gui-button '+action.name+'">'+action.label+'</span>');
        
            self.log('Added the action '+action.name+' for type '+t);
        }

        // Add a behavior for this button
        ob[selector] = {'onclick': function(e) { self.menuItemMouseClickHandler(e, action.name); }};
        dojo.behavior.add(ob);
        dojo.behavior.apply();
        
    }, // addAction()
    
    /**
     * Shows the contextual menu for the given type and identifier, at
     * the given x,y coordinates. <br>
     * Each component can open a contextual menu for a given type, passing
     * in an identifier which will be used by showIf() and onclick() functions
     * to do their job.
     * @method show
     * @param x {number} x coordinate where to show the contextual menu
     * @param y {number} y coordinate where to show the contextual menu
     * @param url {string} unique identifier to identify the clicked resource
     * @param type {string} type of actions to show
     */
    show: function(x, y, url, type, position) {
        var self = this,
            actions = self.actions[type] || {};
        
        for (var i in self.actions['__all']) //ok object
            actions[i] = self.actions['__all'][i];
        
        self.currentURL = url;
        self.currentType = type;

        if (typeof self['fireOnTypeShow_'+type] !== 'undefined'){
            // Call the onTypeShow callbacks for this type
            self['fireOnTypeShow_'+type].call(self, url);
        }else{
            console.log('No action defined for menu' + type);
            return;
        }

        // TODO: add a generator for the title of this thing..
        // dojo.query('#pundit-cm .pundit-cm-header').html(openAnnNum+' of '+annNum + ' annotations shown.');

        dojo.query('#pundit-cm .pundit-cm-button').forEach(function(i){
            dojo.addClass(i, 'pundit-hidden');
        });

        // Hide the menu item if there's a showIf function and it return false
        for (var ac in actions) {
            dojo.query('#pundit-cm .pundit-cm-button.'+ac).removeClass('pundit-hidden')
            if (typeof(actions[ac].showIf) === 'function' && !actions[ac].showIf(url))
                dojo.query('#pundit-cm .pundit-cm-button.'+ac).addClass('pundit-hidden')
        }
        
        // TODO: if there's nothing to show.. just return ?
        if (dojo.query('#pundit-cm .pundit-cm-button:not(.pundit-hidden)').length === 0) {
            self.log('ERROR: tried to open a contextual menu with no buttons? type: '+type+', url: '+url);
            return;
        }


        // Position the menu: defaults to the right
        var corrX, corrY,
            position = position || 'pundit-cm-right';
        if (position === 'pundit-cm-bottom') {
            corrX = 0;
            corrY = 15;
        } else {
            corrX = 25;
            corrY = -15;
        }

        dojo.style('pundit-cm', 'top', y+corrY + 'px');
        dojo.style('pundit-cm', 'left', x+corrX + 'px');
        dojo.removeClass('pundit-cm', 'pundit-hidden pundit-cm-bottom pundit-cm-right');
        dojo.addClass('pundit-cm', position);

        self.log('Opened contextual menu for type '+type+': '+url);
        
    }, // show()

    /*
     * Adds the onTypeShow_* and onTypeHide_* callbacks, where * is a type. 
     * All of the types passed to addAction will generate automatically their
     * two callbacks.
     * @method addTypeCallbacks
     * @param type {string} name of the contextual menu type we want to generate 
     * the callbacks for
     */
    addTypeCallbacks: function(type) {
        var self = this,
            show = "TypeShow_"+type,
            hide = "TypeHide_"+type;

        if (typeof(self['on'+show]) !== 'function')
            self.createCallback([show, hide]);

    }, // addTypeCallbacks()
    
    /*
     * Hides the contextual menu.
     * @method hide
     */
    hide: function (e) {
        var self = this;
        
        // If it is shown, hide it
        if (!dojo.hasClass('pundit-cm', 'pundit-hidden')) {
            dojo.addClass('pundit-cm', 'pundit-hidden');

            // Call the onTypeHide callbacks for this type
            self['fireOnTypeHide_'+self.currentType].call(self, self.currentURL, e);
        }
    },
    
    menuItemMouseClickHandler: function(e, action) {
        var self = this,
            actions = self.actions[self.currentType] || {};
            
        for (var i in self.actions['__all'])
            actions[i] = self.actions['__all'][i];

        // DEBUG: do we need this check? If we have an action.. it 
        // has been added and its safe? OR NOT?!
        if (typeof(actions[action]) !== 'undefined') {
            self.log('Clicked on item '+action+' for type '+self.currentType);
            if (actions[action].onclick(self.currentURL, e))
                self.hide(e);
        }

    } // menuItemMouseClickHandler()

});