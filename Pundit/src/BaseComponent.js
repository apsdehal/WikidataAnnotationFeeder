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
    Provides common facilities used by other pundit
    components, such as callback creation, initialization, logging, etc.
    
    Every component extending this class will be able to use these methods,
    and the options passed to the constructor.
    
    If the component has an .opts field, it will be used as defaults for the
    component, overwritable when calling new
    @class pundit.baseComponent
    @module pundit
    @constructor
    @example
        var x = new pundit.BaseComponent({
                debug: true,
                libName: 'myComponent'
            });
    @param options {object} See object properties
**/
dojo.provide("pundit.BaseComponent");
dojo.declare("pundit.BaseComponent", null, {

    defaultOpts: {
        /**
            Enables debug messages for the component
            @property debug
            @type Boolean
            @default false
        **/
        debug: false,

        /**
            Name of the component, shown in debug messages
            @property libName
            @type String
            @default this.declaredClass
        **/
        libName: ''
    },
    
    constructor: function(options) {
        var self = this, 
            i;

        // If the class extending us doesnt have an .opts field, create a new object
        var opts = dojo.clone(self.opts) || {};
        
        // Copy in the baseComponent defaults, if the given .opts doesnt have it
        dojo.mixin(opts, self.defaultOpts);

        // If _PUNDIT, _PUNDIT.config and _PUNDIT.config.modules.THISMODULENAME are
        // defined, get that configuration and initialize the component
        if (typeof(_PUNDIT) !== 'undefined' && typeof(_PUNDIT.config) !== 'undefined'
                && typeof(_PUNDIT.config.modules[self.declaredClass]) !== 'undefined') {

            var configOpts = _PUNDIT.config.modules[self.declaredClass];
            dojo.mixin(opts, configOpts);
        }

        // Finally overwrite any given field coming from options parameter
        dojo.mixin(opts, options);
        
        self.opts = dojo.clone(opts);

        self.log('BaseConstructor built opts for '+self.declaredClass);
    }, // constructor

    /**
    * @method createCallback
    * @description Creates one or more callbacks for the component. For each 'name' passed
    * as parameter two methods will be created:<br>
    * onName(f) (first letter is automatically capitalized): used by other components to
    * subscribe a function to be called when the event hits. Optional parameters. <br>
    * fireOnName(data) (first letter is automatically capitalized): fires the event 
    * calling all of the subscribed callbacks passing data as parameter. This 
    * function must be called by the component when needed.
    * @param names {string or array of strings} Names of the callbacks to be created.
    */
    createCallback: function(name) {
        var self = this;

        // If it's not an array already, create one
        if (typeof(name) === 'string')
            name = [name];

        for (var n = name.length; n--;) {

            var current_name = name[n].substr(0,1).toUpperCase() + name[n].substr(1),
                callbacksArrayName = 'on' + current_name + 'Callbacks',
                callbacksName = 'on' + current_name,
                callbacksFireName = 'fireOn' + current_name;

            if (typeof(self[callbacksArrayName]) === 'undefined')
                self[callbacksArrayName] = [];

            // The onNAME method adds the passed in function among
            // the callbacks for that NAME
            self[callbacksName] = (function(cb_name) {
                return function(f) {
                    if (typeof(f) === 'function')
                        self[cb_name].push(f);
                }
            })(callbacksArrayName);

            // the fireOnNAME function will take the arguments
            // passed in, and call each of the registered callbacks
            // with those same parameters
            self[callbacksFireName] = (function(cb_name) {
                return function() {
                    //for (var i in self[cb_name]) 
                    for (var i = self[cb_name].length; i--;) 
                        self[cb_name][i].apply(self, arguments);
                }
            })(callbacksArrayName);

        } // for n in name
    }, // createCallback

    /**
    * @method log
    * @description Logs a debug message in the browser console or (if not
    * present) in a debug div appended to the document.
    * @param options {string} message to be logged.
    */
    log: function(w) {
        var foo = this.opts.debug;
        
        // If there's an user supplied object and it says not to log, dont log.
        if (typeof(_PUNDIT) !== 'undefined' && typeof(_PUNDIT.config) !== 'undefined' && _PUNDIT.config.debugAllModules === true)
            foo = true;

        if (foo === false) return;
        
        var lib_name = (this.opts.libName !== "") ? this.opts.libName : this.declaredClass;
        if (typeof console === "undefined") {
            if (!dojo.query('#debug_foo'))
                $("body").append("<div id='debug_foo' style=' border: 3px solid yellow; font-size: 0.9em;'></div>");
            dojo.query("#debug_foo").append("<div>#"+lib_name+"# "+w+"</div>");
        } else {
            console.log('#'+lib_name+'# '+w);
        }
    } // log()
});