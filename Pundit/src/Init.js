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
    The Pundit system!
    Aims at providing all of the needed components to create stand-off markup
    on any web page.
    @module pundit
    @main pundit
*/
 
dojo.require("dojo.io.iframe");
// BaseComponent, DummySelector
dojo.require("pundit.BaseComponent");

dojo.require("pundit.Crypto");

dojo.require("pundit.BasePanel");

// NamespaceHelper
dojo.require("pundit.NamespaceHelper");

// ReconSelector
dojo.require('dojo.io.script');
dojo.require("dijit.Dialog");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("dojo.behavior");
dojo.require("dojo.NodeList-traverse");

// TripleComposer
dojo.require("dojo.dnd.Source");
dojo.require("dojox.fx");
dojo.require("pundit.TripleComposer");

// AnnotationReader and Writer
dojo.require('dojo.io.script');
dojo.require("pundit.AnnotationReader");
dojo.require("pundit.AnnotationWriter");

// TextFragmentHandler
dojo.require("dojo.NodeList-manipulate");
dojo.require("pundit.TextFragmentHandler");

// TooltipAnnotationViewer
dojo.require("dojo.behavior");
dojo.require("dojox.layout.DragPane");
dojo.require("dojox.fx.scroll");
dojo.require("pundit.TooltipAnnotationViewer");

// TriplesBucket
dojo.require("pundit.TriplesBucket");

// VocabSelector
dojo.require("dojo.io.script");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("dojo.behavior");
dojo.require("dojo.NodeList-traverse");
dojo.require("dojo.data.ItemFileReadStore");
dojo.require("dojo.store.Memory");
dojo.require("dojo.data.ObjectStore");
dojo.require("dijit.tree.TreeStoreModel");
dojo.require("dijit.tree.dndSource"); //required for drag and drop
dojo.require("dijit.Tree");
dojo.require("dojox.layout.FloatingPane");

// XpointersHelper
dojo.require("pundit.XpointersHelper");

// Storage
dojo.require("pundit.RemoteStorageHandler");
dojo.require("pundit.LocalStorageHandler");
dojo.require("pundit.CookiesStorageHandler");

// GUI
dojo.require("pundit.GUI");

// ItemContainerManger
dojo.require("pundit.Items");
dojo.require("pundit.ItemContainerManager");

// Literals
dojo.require("pundit.Literals");

// DbpediaSpotlight, dataTXT and Civet
dojo.require("pundit.DbpediaSpotlight");
dojo.require("pundit.DataTxt");
dojo.require("pundit.Civet");

// ResourcesPanel
dojo.require("pundit.ResourcesPanel");
dojo.require("pundit.RecognizerPanel");
dojo.require("dojox.xml.DomParser");
dojo.require("pundit.CommentTagPanel");

// AuthenticatedRequests
dojo.require("pundit.AuthenticatedRequests");

// MyPundit
dojo.require("dijit.form.DropDownButton");
dojo.require("dijit.Menu");
dojo.require("dijit.MenuItem");
dojo.require("pundit.MyPundit");


// ContextualMenu
dojo.require("pundit.ContextualMenu");

// Previewer
dojo.require("pundit.Previewer");

// LoadingBox
dojo.require("pundit.LoadingBox");

// Configuration
dojo.require("pundit.Configuration");

// Annotators
dojo.require("pundit.annotators.AnnotatorsConductor");
dojo.require("pundit.annotators.AnnotatorsBase");

/**
 * @class pundit.Init
 * @extends pundit.baseComponent
 * @description Init class: initializes all of the pundit components. The init object
 * is saved in the global pundit live namespace under the name of 'init', for future
 * use. Since the global live namespace name defaults to "punditLive", the init
 * object is accessible by default with punditLive.init
 */
dojo.provide("pundit.Init");
dojo.declare("pundit.Init", pundit.BaseComponent, {

    opts: {
        liveNamespace: 'punditLive'
    },

    // TODO: move this comment to some @property and some into the class declaration
    /*
     * @constructor
     * @description Initializes pundit!
     * @param options {object} 
     * @param options.debug {boolean} wether or not to activate debug of all components
     * @param options.liveNamespace {string} name for the pundit global live namespace 
     * object. This name is also stored in the PunditLiveNamespaceName variable, globally
     * accessible. <br>
     * Moreover, the same object is accessible using the '_PUNDIT' name.
     */
	constructor: function(options) {
        var self = this, p;

        self.log('Initializing Pundit...');
        
        self.addScoreFunction();
        
        // Register pundit global live namespace under window object and 
        // keep track of its name for other components to use. Register the
        // _PUNDIT object as well.
        if (typeof(window[self.opts.liveNamespace]) === 'undefined')
            window[self.opts.liveNamespace] = {};

        p = window[self.opts.liveNamespace];
        window['_PUNDIT'] = window[self.opts.liveNamespace];
        window['PunditLiveNamespaceName'] = self.opts.liveNamespace;

        self.log("Registered '"+self.opts.liveNamespace +"' variable: pundit global namespace object. Also known as '_PUNDIT'.");

        p['init'] = self;
        p['configuration'] = new pundit.Configuration();


        /**
         * @event onInitDone
         * @param f() {function} function to be called, no parameters.
         * @description Called when all of the needed modules has been 
         * correctly initialized. Should be used to initialize cross-component
         * behaviors, like subscribing to each other's callbacks.
         */
        self.createCallback(['initDone']);
        
        self.loadJobs = [];
        
        // TODO: sanitize use of this global var, and remove it
        ns = new pundit.NamespaceHelper();
        p['ns'] = ns;

        if (p.config.isModuleActive('pundit.AnalyticsHelper')) {
            dojo.require("pundit.AnalyticsHelper");
            p['ga'] = new pundit.AnalyticsHelper();
        }

        // TODO: sanitize use of this global var, and remove it
        previewer = new pundit.Previewer();
        p['previewer'] = previewer;
        
        // TODO: sanitize use of this global var, and remove it
        cMenu = new pundit.ContextualMenu();
        p['cMenu'] = cMenu;
        
        // TODO: sanitize use of this global var, and remove it
        requester = new pundit.AuthenticatedRequests();
        p['requester'] = requester;
        
        // TODO: sanitize use of this global var, and remove it
        // and rename it to GUI!!!
        semlibWindow = new pundit.GUI();
        p['GUI'] = semlibWindow;
        
        
        p['loadingBox'] = new pundit.LoadingBox();

        p['items'] = new pundit.ItemContainerManager();
        
        // TODO: sanitize use of this global var, and remove it
        fragmentHandler = new pundit.TextFragmentHandler();
        p['fragmentHandler'] = fragmentHandler;

        if (p.config.isModuleActive("pundit.fasttexthandler")) {
            dojo.require("pundit.FastTextHandler");
            p['fasttexthandler'] = new pundit.FastTextHandler({
                name: "fast-text-handler",
                title: "Connect text",
                drag: true
            });
        }
        
        if (p.config.isModuleActive("pundit.PageHandler")) {
            dojo.require("pundit.PageHandler");
            p['pageHandler'] = new pundit.PageHandler({debug:false});
        }

        // Bookmarklet: dojo's build system greps dojo.require to grasp the files
        // to include into it. We cannot require dinamicly for a bookmarklet, so just
        // put a dojo.require as workaround
        if (false) {
            dojo.require('pundit.annotators.TextFragmentAnnotator');
        }
        
        var _foorequire = dojo.require;
        p['conductor'] = new pundit.annotators.AnnotatorsConductor();
        for (var an in p.config.modules.annotators) {
            
            var conf = p.config.modules.annotators[an];
            if (conf.active === true) {
                self.log('Loading annotator ' + an);
                _foorequire('pundit.annotators.' + an);
                p.conductor.registerAnnotator(new pundit.annotators[an](conf));
            }
        }


        // Always load the base selector class and the special vocab selector
        dojo.require("pundit.selectors.SelectorBase");
        dojo.require("pundit.selectors.VocabSelector");
        p['vocab'] = new pundit.selectors.VocabSelector();

        // bookmarklet workaround: same as above
        if (false) {
            dojo.require("pundit.selectors.DBPediaSelector");
            dojo.require("pundit.selectors.FreebaseSelector");
            dojo.require("pundit.selectors.KorboBasketSelector");
            dojo.require("pundit.selectors.MurucaSelector");
            dojo.require("pundit.selectors.WordnetSelector");
            dojo.require("pundit.selectors.EuropeanaSelector");
            dojo.require("pundit.selectors.EuropeanaEDMSelector");
            dojo.require("pundit.selectors.BibServerSelector");
            dojo.require("pundit.selectors.DandelionGeoSelector");
            dojo.require("pundit.selectors.DandelionPOISelector");
        }

        // Used for other components initialization
        p.config.activeSelectorsName = [];
        for (var se in p.config.modules.selectors) {
            var conf = p.config.modules.selectors[se];

            _foorequire('pundit.selectors.' + se + 'Selector');

            if (p.configuration._isArray(conf)) {

                // Require the file just once, spawn N instances
                self.log('Loading multiple instances of selector ' + se);

                for (var l = conf.length; l-->0;) {
                    var subConf = conf[l];
                    if (subConf.active === true) {
                        p[subConf.name + 'Selector'] = new pundit.selectors[se + 'Selector'](subConf);
                        p.config.activeSelectorsName.push({selector: se, name: subConf.name, label: subConf.label});
                    }
                }
                
            } else {
                if (conf.active === true) {
                    self.log('Loading selector ' + se);
                    p[conf.name + 'Selector'] = new pundit.selectors[se + 'Selector'](conf);
                    p.config.activeSelectorsName.push({selector: se, name: conf.name, label: conf.label});
                }
            }

        }
        
        // TODO -> imageFragmentHandler
        if (p.config.isModuleActive("pundit.ImageFragmentHandler")) {
            dojo.require("pundit.ImageFragmentHandler");
            semlibImageFragmentHandler = new pundit.ImageFragmentHandler();
        }

        if (p.config.isModuleActive('pundit.NotebookManager')) {
            dojo.require("pundit.NotebookManager");
        }

        // TODO: sanitize use of this global var, and remove it
        // rename to literals creator? handler? whatever
        semlibLiterals = new pundit.Literals();
        p['literals'] = semlibLiterals;

        // Used by recognizers all around to know which selectors to
        // extract entities from
        p.config.activeEntitySources = {};
        for (var k = p.config.activeSelectorsName.length; k--;) {
            var ob = p.config.activeSelectorsName[k],
                se = ob.selector,
                name = ob.name,
                label = ob.label;
            p.config.activeEntitySources[name + "Selector"] = {label: label};
        }
        
        // Recognizer
        if (p.config.isModuleActive('pundit.Recognizer')) {
            dojo.require("pundit.Recognizer");
            p['recognizer'] = new pundit.Recognizer();
        }

        p['commentTag'] = new pundit.CommentTagPanel({
            name: 'commentTag',
            preview: true,
            drag: true,
            searchType: 'search',
            namedEntitiesSources: p.config.activeEntitySources
        });

        // TODO: remove this and use annotators instead
        // TODO: move 600,400 to component defaults, ready to be overridden
        if (p.config.isModuleActive('pundit.ImageAnnotationPanel')) {
            dojo.require("pundit.ImageAnnotationPanel");
            p['imageAnnotationPanel'] = new pundit.ImageAnnotationPanel({
                name: 'imageAnnotationPanel',
                title: 'Image Annotation Panel',
                width: 600,
                height: 400,
                drag: true
            });
        }

        // TODO: sanitize use of this global var, and remove it
        tripleComposer = new pundit.TripleComposer();
        p['tripleComposer'] = tripleComposer;
        
        // TODO: sanitize use of this global var, and remove it
        // dont use _ !
        tooltip_viewer = new pundit.TooltipAnnotationViewer();
        p['tooltipViewer'] = tooltip_viewer;
        
            
        // TODO: sanitize use of this global var, and remove it
        myPundit = new pundit.MyPundit();
        p['myPundit'] = myPundit;

        // Remote Storage Handler
        // TODO: use a single one with get() and set(), remove all the rest (save, read)
        p['remoteStore'] = new pundit.RemoteStorageHandler();
        
        // Help system
        if (p.config.isModuleActive('pundit.Help')) {
            dojo.require("pundit.Help");
            p['help'] = new pundit.Help();
        }

        if (p.config.isModuleActive('pundit.NamedContentHandler')) {
            dojo.require("pundit.NamedContentHandler");
            p['namedContentHandler'] = new pundit.NamedContentHandler();
        }

        if (p.config.isModuleActive('pundit.ContactHelper')) {
            dojo.require("pundit.ContactHelper");
            p['contact'] = new pundit.ContactHelper();
        }

        // Angular helpers
        if (p.config.isModuleActive('pundit.ng.ImageAnnotatorHelper')) {
            dojo.require("pundit.ng.ImageAnnotatorHelper");
            p['ngIA'] = new pundit.ng.ImageAnnotatorHelper();
        }

        if (p.config.isModuleActive('pundit.ng.EntityEditorHelper')) {
            dojo.require("pundit.ng.EntityEditorHelper");
            p['ngEE'] = new pundit.ng.EntityEditorHelper();
        }
        
        // TODO: x Marco do we have to do this here? Is it related to annotation view? Consolidation?
        // Something else? NOT HERE.
        // Fix problem in case of html and body position set to relative
        dojo.style(dojo.query('html')[0], 'position', 'static');
        dojo.style(dojo.query('body')[0], 'position', 'static');
        dojo.addClass(dojo.query('body')[0], 'tundra');
        
        self.checkBeforeInit();
        self.log('Pundit suite components initialization completed!');

    }, // constructor()
    
    waitBeforeInit: function() {
        var self = this,
            jobId = 'job' + (0|Math.random()*999999);

        self.loadJobs.push(jobId);
        // TODO: Add a timeout? A timer? Something?
        
        self.log("A component is asking to wait for him. Job "+jobId);
        return jobId;
    },
    
    doneBeforeInit: function(jobId) {
        var self = this;
        
        if (self.loadJobs.indexOf(jobId) !== -1) {
            self.log('Job '+jobId+' is done. (' + self.loadJobs.indexOf(jobId)+')');
            self.loadJobs.splice(self.loadJobs.indexOf(jobId), 1);
        } else {
            self.log('Non-existent job '+jobId+' is done. Cool.');
        }
            
        self.checkBeforeInit();
    },
     
    checkBeforeInit: function() {
        var self = this;
        
        if (self.loadJobs.length === 0) {
            self.log("No Load Jobs to wait for: Asynchronous component initialization is done!");
            self.fireOnInitDone();
        } else {
            self.log("Still "+self.loadJobs.length+" jobs to wait for ...");
        }
    },
    
    //DEBUG Add it somewhere else?
    addScoreFunction: function(){
        
        String.prototype.score = function(abbreviation, fuzziness) {
            // If the string is equal to the abbreviation, perfect match.
            if (this === abbreviation) return 1;
            //if it's not a perfect match and is empty return 0
            if (abbreviation === "") return 0;
            
            var total_character_score = 0,
            abbreviation_length = abbreviation.length,
            string = this,
            string_length = string.length,
            start_of_string_bonus,
            abbreviation_score,
            fuzzies=1,
            final_score;
            
            // Walk through abbreviation and add up scores.
            for (var i = 0, character_score, index_in_string, c, index_c_lowercase, index_c_uppercase, min_index;
                i < abbreviation_length;
                ++i) {
                
                // Find the first case-insensitive match of a character.
                c = abbreviation.charAt(i);
                
                index_c_lowercase = string.indexOf(c.toLowerCase());
                index_c_uppercase = string.indexOf(c.toUpperCase());
                min_index = Math.min(index_c_lowercase, index_c_uppercase);
                index_in_string = (min_index > -1) ? min_index : Math.max(index_c_lowercase, index_c_uppercase);
                
                if (index_in_string === -1) { 
                    if (fuzziness) {
                        fuzzies += 1-fuzziness;
                        continue;
                    } else {
                        return 0;
                    }
                } else {
                    character_score = 0.1;
                }
                
                // Set base score for matching 'c'.
                
                // Same case bonus.
                if (string[index_in_string] === c) { 
                    character_score += 0.1; 
                }
                
                // Consecutive letter & start-of-string Bonus
                if (index_in_string === 0) {
                    // Increase the score when matching first character of the remainder of the string
                    character_score += 0.6;
                    if (i === 0) {
                        // If match is the first character of the string
                        // & the first character of abbreviation, add a
                        // start-of-string match bonus.
                        start_of_string_bonus = 1; //true;
                    }
                } else {
                    // Acronym Bonus
                    // Weighing Logic: Typing the first character of an acronym is as if you
                    // preceded it with two perfect character matches.
                    if (string.charAt(index_in_string - 1) === ' ') {
                        character_score += 0.8; // * Math.min(index_in_string, 5); // Cap bonus at 0.4 * 5
                    }
                }
                
                // Left trim the already matched part of the string
                // (forces sequential matching).
                string = string.substring(index_in_string + 1, string_length);
                
                total_character_score += character_score;
            } // end of for loop
            
            // Uncomment to weigh smaller words higher.
            // return total_character_score / string_length;
            
            abbreviation_score = total_character_score / abbreviation_length;
            //percentage_of_matched_string = abbreviation_length / string_length;
            //word_score = abbreviation_score * percentage_of_matched_string;
            
            // Reduce penalty for longer strings.
            //final_score = (word_score + abbreviation_score) / 2;
            final_score = ((abbreviation_score * (abbreviation_length / string_length)) + abbreviation_score) / 2;
            
            final_score = final_score / fuzzies;
            
            if (start_of_string_bonus && (final_score + 0.15 < 1)) {
                final_score += 0.15;
            }
            
            return final_score;
        };   
        
    }
    
});

dojo.ready(function(){
	var init = new pundit.Init();
});