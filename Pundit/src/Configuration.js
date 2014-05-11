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
 * @class pundit.Configuration
 * @extends pundit.baseComponent
 * @description This component deals with the various layers of Pundit 
 * configuration.<br>
 * These layers are: <br>
 * 1. component defaults <br>
 * 2. global Configuration defaults <br>
 * 3. user supplied configuration file <br>
 * 4. parameters passed to the component constructor <br>
 * When initialized, the Configuration module will merge the levels 2 and 
 * 3, creating the .config field in the global pundit live object (_PUNDIT).<br>
 * When a component is initialized its final .opts field will be a merge
 * of all of those levels: 4 being the higher priority.<br>
 */
dojo.provide("pundit.Configuration");
dojo.declare("pundit.Configuration", pundit.BaseComponent, {

    defaults: {

        /**
         * @property punditConfig.annotationServerBaseURL
         * @type string
         * @description Absolute base URL of the Pundit server side APIs, ending
         * with /
         * @default http://demo.as.thepund.it:8088/annotationserver/
         */
        annotationServerBaseURL: 'http://demo.as.thepund.it:8080/annotationserver/',

        /**
         * @property punditConfig.debugAllModules
         * @type boolean
         * @description Activates/deactivates debug mode for every component
         * @default false
         */
        debugAllModules: false,
        
        /**
         * @property punditConfig.enableSemanticExpansion
         * @type boolean
         * @description Enables/disables the link to LodLive for exploring Linked Data around items
         * @default false
         */
        enableSemanticExpansion: false,

        /**
         * @property punditConfig.enableEntitiesExtraction
         * @type boolean
         * @description Enables/disables the automatic entitities extraction from text in the page
         * @default false
         */
        enableEntitiesExtraction: true,
        entityExtractor: "data-txt", // possible values "dbpedia-spotlight" | "data-txt" | "civet"

        /**
         * @property punditConfig.vocabularies
         * @type array or URLs
         * @description Specifies vocaularies that will be available to Pundit users. 
         * Vocabularies have a unique name and a description. They can be of different
         * types: taxonomy (defines a hierarchy of terms), relations (defines a list 
         * of relations with domain and ranges). Each vocabulary definition is a JSONP
         * file available on the Web and is loaded by resolving an absolute URL.
         */
        
        /**
         * @property punditConfig.enableEntitiesExtraction
         * @type boolean
         * @description Enables/disables the automatic entitities extraction from text in the page
         * @default false
         */
        enableEntitiesExtraction: true,
        entityExtractor: "data-txt", // possible values "dbpedia-spotlight" | "data-txt" | "civet"
        
        
        vocabularies: [],

        /**
         * @property punditConfig.useBasicRelations
         * @type boolean
         * @description Loads Pundit's basic relations
         * @default true
         */
        useBasicRelations: true,

        basicRelations: {
            "name": "basic_relations",
            "description": "A selection of RDF properties defined in the CiTO ontology.",
            "type": "relations",

            "label": "label",
            "identifier": "value",
            "items": [
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "has comment (free text)",
                    "description": "Any comment related to the selected fragment of text or image",
                    "domain": ["http://purl.org/pundit/ont/ao#fragment-image", "http://purl.org/pundit/ont/ao#fragment-text", "http://xmlns.com/foaf/0.1/Image"],
                    "range": ["http://www.w3.org/2000/01/rdf-schema#Literal"],
                    "value": "http://schema.org/comment"
                },
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "depicts",
                    "description": "An image or part of an image depicts something",
                    "domain": ["http://xmlns.com/foaf/0.1/Image", "http://purl.org/pundit/ont/ao#fragment-image"],
                    "range": [],
                    "value": "http://xmlns.com/foaf/0.1/depicts"
                },
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "is similar to",
                    "description": "The selected fragment (text or image fragment) is similar to another fragment (of the same or of different types)",
                    "domain": ["http://purl.org/pundit/ont/ao#fragment-text", "http://purl.org/pundit/ont/ao#fragment-image", "http://xmlns.com/foaf/0.1/Image"],
                    "range": ["http://purl.org/pundit/ont/ao#fragment-text", "http://purl.org/pundit/ont/ao#fragment-image", "http://xmlns.com/foaf/0.1/Image"],
                    "value": "http://purl.org/pundit/vocab#similarTo"
                },
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "has creator",
                    "description": "The selected text fragment has been created by a specific Person",
                    "domain": ["http://purl.org/pundit/ont/ao#fragment-text", "http://purl.org/pundit/ont/ao#fragment-image", "http://xmlns.com/foaf/0.1/Image"],
                    "range": ["http://www.freebase.com/schema/people/person", "http://xmlns.com/foaf/0.1/Person", "http://dbpedia.org/ontology/Person"],
                    "value": "http://purl.org/dc/terms/creator"
                },
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "cites",
                    "description": "The selected text fragment cites another text fragment, or a Work or a Person",
                    "domain": ["http://purl.org/pundit/ont/ao#fragment-text"],
                    "range": [
                        "http://purl.org/pundit/ont/ao#fragment-text",
                        "http://www.freebase.com/schema/people/person", 
                        "http://xmlns.com/foaf/0.1/Person",
                        "http://dbpedia.org/ontology/Person",
                        "http://www.freebase.com/schema/book/written_work",
                        "http://www.freebase.com/schema/book/book"
                    ],
                    "value": "http://purl.org/spar/cito/cites"
                },
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "quotes",
                    "description": "The selected text fragment is a sentence from a Person or a Work, usually enclosed by quotations (eg: '')",
                    "domain": ["http://purl.org/pundit/ont/ao#fragment-text"],
                    "range": [
                        "http://www.freebase.com/schema/people/person", 
                        "http://xmlns.com/foaf/0.1/Person",
                        "http://dbpedia.org/ontology/Person",
                        "http://www.freebase.com/schema/book/written_work",
                        "http://www.freebase.com/schema/book/book"
                    ],
                    "value": "http://purl.org/spar/cito/includesQuotationFrom"
                },
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "talks about",
                    "description": "The selected text fragment talks about some other text, Entity, Person or any other kind of concept",
                    "domain": ["http://purl.org/pundit/ont/ao#fragment-text"],
                    "range": [],
                    "value": "http://purl.org/pundit/ont/oa#talksAbout"
                },
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "is related to",
                    "description": "The selected text fragment is someway related to another text, Entity, Person or any other kind of concept",
                    "domain": ["http://purl.org/pundit/ont/ao#fragment-text"],
                    "range": [],
                    "value": "http://purl.org/pundit/ont/oa#isRelatedTo"
                },
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "identifies",
                    "description": "The selected text fragment is a Person, a Work, a Place or a well defined Entity",
                    "domain": ["http://purl.org/pundit/ont/ao#fragment-text"],
                    "range": [
                        "http://www.freebase.com/schema/location/location", 
                        "http://dbpedia.org/ontology/Place", 
                        "http://schema.org/Place", 
                        "http://www.w3.org/2003/01/geo/wgs84_pos#SpatialThing",
                        "http://www.freebase.com/schema/people/person", 
                        "http://dbpedia.org/ontology/Person",
                        "http://xmlns.com/foaf/0.1/Person",
                        "http://www.freebase.com/schema/book/written_work",
                        "http://www.freebase.com/schema/book/book"
                    ],
                    "value": "http://purl.org/pundit/ont/oa#identifies"
                },
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "is date",
                    "description": "The selected text fragment corresponds to the specified Date",
                    "domain": ["http://purl.org/pundit/ont/ao#fragment-text"],
                    "range": ["http://www.w3.org/2000/01/rdf-schema#Literal"],
                    "value": "http://purl.org/pundit/ont/oa#isDate"
                },
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "period of dates starts at",
                    "description": "The selected text fragment corresponds to the specified date period which starts at the specified Date",
                    "domain": ["http://purl.org/pundit/ont/ao#fragment-text"],
                    "range": ["http://www.w3.org/2000/01/rdf-schema#Literal"],
                    "value": "http://purl.org/pundit/ont/oa#periodStartDate"
                },
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "period of dates ends at",
                    "description": "The selected text fragment corresponds to the specified date period which ends at the specified Date",
                    "domain": ["http://purl.org/pundit/ont/ao#fragment-text"],
                    "range": ["http://www.w3.org/2000/01/rdf-schema#Literal"],
                    "value": "http://purl.org/pundit/ont/oa#periodEndDate"
                },
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "translates to",
                    "description": "The selected text fragment translation is given as free text",
                    "domain": ["http://purl.org/pundit/ont/ao#fragment-text"],
                    "range": ["http://www.w3.org/2000/01/rdf-schema#Literal"],
                    "value": "http://purl.org/pundit/ont/oa#translatesTo"
                },
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "is translation of",
                    "description": "The selected text fragment is the translation of another text fragment",
                    "domain": ["http://purl.org/pundit/ont/ao#fragment-text"],
                    "range": ["http://purl.org/pundit/ont/ao#fragment-text"],
                    "value": "http://purl.org/pundit/ont/oa#isTranslationOf"
                },
                {
                    "type": ["predicate"],
                    "rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],
                    "label": "is written in",
                    "description": "The selected text fragment is written in the specified language (french, german, english etc)",
                    "domain": ["http://purl.org/pundit/ont/ao#fragment-text"],
                    "range": ["http://www.freebase.com/schema/language/human_language"],
                    "value": "http://purl.org/pundit/ont/oa#isWrittenIn"
                }
            ]
        },


        /**
         * @property punditConfig.modules
         * @type object
         * @description Configuration for various Pundit optional modules
         */
        modules: {


            /**
             * TODO
             */
            'pundit.ng.ImageAnnotatorHelper': {
                active: false
            },

            /**
             * @property punditConfig.modules.annotators
             * @type object
             * @description Configuration for Pundit annotators: components who
             * deal (read, write, visualize etc) with various type of items used
             * into annotations, for example text fragments, image fragments etc.
             */
            'annotators': {
                'TextFragmentAnnotator': {
                    active: true,
                    debug: false
                }
            },
            
            /**
             * @property punditConfig.modules.selectors
             * @type object
             * @description Configuration for Pundit selectors: components who
             * retrieve items from remote sources like Freebase, Wordnet, Europeana
             * etc. Each children should be named after a Selector found in src/selectors
             * omitting the ending part "Selector". Each object must contain the
             * properties name (string), label (string) and active (boolean). Moreover
             * it can contain selector-specific configuration options, like europeanaKey
             * or limit or keyInputTimerLength. See each selector docs for more info.
             */
            'selectors': {
                'Freebase': {
                    name: 'freebase', label: 'Freebase', active: true
                },
                'DBPedia': {
                    name: 'dbpedia', label: 'DBPedia', active: true
                },
                'KorboBasket': {
                    name: 'korbo', label: 'Korbo', active: false
                },
                'Wordnet': {
                    name: 'wordnet', label: 'Word Net', active: true
                },
                'Europeana': {
                    name: 'europeana', label: 'Europeana', active: false
                },
                'EuropeanaEDM': {
                    name: 'europeanaedm', label: 'Europeana EDM', active: true
                },
                // DEBUG: not ready for prime time, keep it active = false !
                'BibServer': {
                    name: 'bibserver', label: 'BibServer', active: false
                }
                
            },

            /* Active modules by default: */
            /* TODO: comments about it? */
            
            'pundit.Help': {
                introductionFile: undefined,
                introductionWindowTitle: '',
                showIntroductionAtLogin: false,
                active: true
            },
            
            'pundit.ContactHelper': {
                active: true
            },
            
            'pundit.fasttexthandler': {
                active: true
            },

            'pundit.PageHandler': {
                active: true
            },

            'pundit.ImageFragmentHandler': {
                active: true
            },
            
            'pundit.ImageAnnotationPanel': {
                active: true
            },

            'pundit.NamedContentHandler': {
                active: true
            },
            
            'pundit.AnalyticsHelper': {
                active: true
            },
            
            // Used :-)
            // WORNING: cannot deactivate at the moment!
            'pundit.Recognizer': {
                active: true,
                debug: false,
                showAction: false
            },

            // Used :-)
            'pundit.NotebookManager': {
                active: true,
                notebookSharing: true,
                notebookActivation: true,
                showFilteringOptions: false,
                defaultFilteringOption: 'all', // valid options: 'all' | 'active'
                activateFromAnnotations: false,
                askBaseURL: 'http://demo.ask.thepund.it/#/myNotebooks/',
                debug: false
            },

            'pundit.XpointersHelper': {
                // Node name and class used to wrap our annotated content
                wrapNodeName: 'span',
                wrapNodeClass: 'cons',

                // Class used on a container to indicate it's a named content: xpointers
                // will start from that node
                contentClasses: ['pundit-content'],

                // Nodes with these classes will be ignored when building xpointers
                // and consolidating annotations
                ignoreClasses: ['cons', 'pundit-icon-annotation']
            }

        }
        
    },
	
    constructor: function(options) {
        var self = this;
        
        _PUNDIT.defaults = self.defaults;
        _PUNDIT.config = {};
        self.extend(_PUNDIT.config, _PUNDIT.defaults, self.configMethods);

        if (typeof(punditConfig) !== 'undefined') {
            self.log('Reading user supplied configuration file');
            self.extend(_PUNDIT.config, punditConfig, self.configMethods);
        }
        
        // TODO: user configuration? from the server? .. after login?
        // TODO: callbacks?
        
        self.log('Configuration up and running!');
    },
    
    configMethods: {
        /**
         * @method isModuleActive
         * @description Returns true if the given module name is active
         * @param name {string} a module name
         * @return {boolean}
         */
        isModuleActive: function(name) {
            return typeof(this.modules[name]) !== 'undefined' && this.modules[name].active === true;
        }
    },

    /*
        Functions adapted from : 
        Underscore.js 1.4.2 - http://underscorejs.org
        (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
    */
    _isArray: function(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    },
    _isObject: function(obj) {
        return Object.prototype.toString.call(obj) === '[object Object]';
    },
    _reject: function(obj, iterator, context) {
        var results = [];
        if (obj === null) return results;
        dojo.forEach(obj, function(value, index, list) {
            if (!iterator.call(context, value, index, list)) 
                results[results.length] = value;
        });
        return results;
    },
    
    // Extends an object (first parameter) with all of the supplied
    // objects (2nd, 3rd parameters and so on), going deeply into them.
    extend: function(obj) {
        var self = this,
            parentRE = /#{\s*?_\s*?}/,
            slice = Array.prototype.slice,
            hasOwnProperty = Object.prototype.hasOwnProperty;

        dojo.forEach(slice.call(arguments, 1), function(source) {
            for (var prop in source) {
                if (hasOwnProperty.call(source, prop)) {

                    // prop undefined: just add it
                    if (typeof(obj[prop]) === 'undefined') {
                        obj[prop] = source[prop];

                    // prop is an array: merge them
                    } else if (self._isArray(obj[prop]) || self._isArray(source[prop])) {
                        if (!self._isArray(obj[prop]) || !self._isArray(source[prop]))
                            self.log('CONF ERROR: array or not? ' + prop);
                        else 
                            obj[prop] = self._reject(self.extend(obj[prop], source[prop]), function (item) { return item === null;});

                    // prop is an object: recurse and extend it 
                    } else if (self._isObject(obj[prop]) || self._isObject(source[prop])) {
                        if (!self._isObject(obj[prop]) || ! self._isObject(source[prop]))
                            self.log('CONF ERROR: object or not? ' + prop);
                        else 
                            obj[prop] = self.extend(obj[prop], source[prop]);

                    // else just overwrite
                    } else {
                        obj[prop] = source[prop];
                    }
        
                } // if hasOwnProperty.call()
            } // for
        }); // dojo.forEach
        return obj;
    }

});