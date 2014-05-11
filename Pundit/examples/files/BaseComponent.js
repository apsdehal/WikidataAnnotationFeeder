/**
 * @class semlib.baseComponent
 * @description Provides common facilities used by other semlib
 * components, such as callback creation, initialization, logging, etc.
 * Every component extending this class will be able to use these methods,
 * and the options passed to the constructor.
 */
dojo.provide("semlib.BaseComponent");
dojo.declare("semlib.BaseComponent", null, {

    opts: {
        debug: false,
        libName: ''
    },
    
    /**
    * @constructor
    * @description Initializes the component
    * @param options {object}
    * @param options.debug {boolean} wether or not to activate debug mode for the component
    * @param options.libName {string} component name visualized in debug messages. If not 
    * assigned explicitly dojo's 'declaredClass' field will be used.
    */
    constructor: function(options) {
        //DEBUG MARCO: if i don't set this opts.debug result undefined while libName is ""
        //this.opts.debug = true;
        if (typeof(options) === 'undefined')
            return;

        // Overwrite any give field in the created instance .opts field
        for (i in options) 
            this.opts[i] = options[i]
    },

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
        var self = this,
            current_name = null;

        // If it's not an array already, create one
        if (typeof(name) === 'string')
            name = [name];

        for (n in name) {

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
                    for (i in self[cb_name])
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
        if (!this.opts.debug) return;
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