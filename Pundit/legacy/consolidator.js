(function($) {

	// consolidator jQuery object constructor
	$.fn.consolidator = function(opts) {

		// get "real" options merging defaults and 
		// opts given by user
		var options = $.extend($.consolidator.defaults, opts);

		// Spawn a xp7Lib for every element we are calling this on
		return this.each(function(){
			new $.consolidator(this, options)
		});

	}; // $.fn.consolidator()


	$.consolidator = function (opts) {
		
		// Global options for this xp7Lib, right into the object
		this.options = $.extend({}, $.consolidator.defaults, opts);
		this.init();

	}; // $.consolidator()


	$.consolidator.defaults = {

        // Classes which contains tagged content
        contentClasses : ['THCContent', 'txt_block', 'thctag'],

		// Tag used to wrap the contents
		wrapTag : 'span',

        // TODO: merge these three into a single baseURL + /annotated_fragments & /annotations ? 
        baseURLAnnotatedFragments: "http://trieste.netseven.it:3000/swicky_notebooks/context/annotated_fragments",
		baseURLAnnotations: "http://trieste.netseven.it:3000/swicky_notebooks/context/annotations",
		baseURLPost: 'http://trieste.netseven.it:3000/admin/publish/post_annotated',

        showProgressScreen: true,
		
		debug : false

	};

	$.consolidator.prototype = {
		init : function() {
		    var self = this;

		    self.xp = new $.xp7Lib({debug: self.options.debug});

            // list of xpointers we must process
            self.xpointers = [];

            // List of html classes to apply for each xpointer. Array of arrays since on the
            // same xpointer could be hooked more than one note
            self.xpointersClasses = [];
            self.fooNum = 0;

            // Structured data: contains structures that describes all of the xpointers with
            // startxpath, startoffset, endxpath, endoffset and valid fields
            self.xpaths = [];
            
            // Structured data: for each xpath (so 2 for every xpointer) will create an
            // object with xpointer, xpath, offset and range.
            // The range object will be used to sort them
            self.sortedXpaths = [];
            
            // Will contain the classes to assign to the wrappers to highlight the portions
            // one element each of the ranges you can build from sortedXpaths. The first element
            // contains the class for the range sortedXpaths[0] > sortedXpaths[1], the second
            // for sortedXpaths[1] > sortedXpaths[2] and so on. It's an array of arrays.
            self.htmlClasses = [];
            
            // Will contain the annotations, added through addAnnotations() for every xpointer
            // loaded via json from an external entity, like an annotation server
            self.fragments = [];

            // types the script will look for when receiving a json
            self.itemTypes = ['http://talia.discovery-project.eu/wiki/TaliaInternal#Note',
                            'http://talia.discovery-project.eu/wiki/TaliaInternal#ImageZone',
                            'http://talia.discovery-project.eu/wiki/TaliaInternal#PiIllustratedMdCard',
                            'http://talia.discovery-project.eu/wiki/TaliaInternal#PiNonIllustratedMdCard',
                            'http://talia.discovery-project.eu/wiki/TaliaInternal#DictionaryItem',
                            'http://talia.discovery-project.eu/wiki/TaliaInternal#CustomBibliographyItem',
                            'http://discovery-project.eu/ontologies/philoSpace/Bookmark'
                        ];

            self.contentURIs = [];
            self.nContentURIs = 0;
            self.addedAnnotations = 0;
            self.downloadedFragments = 0;
            self.onDomAnnotatedFunctions = [];
            self.source_id = "";
            self.callback = "";

            $('body').append('<div class="consolidatedAnnotationsContainer"></div>');
            
            if (self.options.showProgressScreen === true)
                self.initProgressScreen();
            
            
        }, // init()

        initProgressScreen : function () {
            
            $('body').append('<div class="progressScreen"></div>');
            $('.progressScreen').width($(window).width()).height($(window).height());
            this.log('Initializing progress screen');
        },
        
        progress : function (s) {
            $('.progressScreen').append('<span>'+s+'</span>');
        },

        getAnnotableContentFrom : function (url, id, callback) {
            var self = this;

            if (typeof(id) !== 'undefined') self['source_id'] = id;
            if (typeof(callback) !== 'undefined') self['callback'] = callback;

            self.log("Asking for annotable content from "+url);
            $.ajax({url: url, 
                    success: function(data) { self.setAnnotableContent(data); },
                    error: function() { } // TODO: handle error
            });
        }, // getAnnotableContentFrom()
        
        setAnnotableContent : function (content) {
            var self = this, uris, baseURL;
            
            $('body').prepend(content);

            self.log("## Annotable document is "+content.length+" bytes long, injecting it.");
            self.progress('Downloaded '+content.length+' bytes of annotable content');

            self.getAnnotatedFragments();
            
        }, // setAnnotableContent()

        getAnnotatedFragments : function () {
		    var self = this,
		        baseURL = self.options.baseURLAnnotatedFragments,
		        url;

            self.contentURIs = self.xp.getContentURIs();
            self.nContentURIs = self.contentURIs.length;

            for (var i = self.nContentURIs - 1; i >= 0; i--) {
                url = baseURL + "?uri=" + escape(self.contentURIs[i]);
                co.log("Getting annotated fragments for URI " + self.contentURIs[i]);
                $.ajax({url: url, 
                        success: function(data) { self.setAnnotatedFragments(data); },
                        error: function() { } // TODO: handle error
                });

            }
            
        }, // getAnnotatedFragments()

        setAnnotatedFragments : function (data) {
            var self = this;

            try { 
                h = eval ("("+data+")"); 
            } catch (e) { h = []; }

            if (h.length === 0) {
                co.log("No fragments from URI "+url);
                return;
            }

            var h_len = h.length, url, coordinates;

            self.log("# Received "+h_len+" new fragments");

            self.addXPathsFromXPointers(h);

            for (var j=h_len-1; j>=0; j--) {
                coordinates = h[j].coordinates;
                url = self.options.baseURLAnnotations + "?force_json=y&xpointer="+ escape(coordinates);

                self.log("Asking annotations for coordinates " + coordinates);
                $.ajax({url: url, 
                        success: (function(coord) {
                                    return function(data) {
                                        self.downloadedFragments++;

                                        self.log("Downloaded fragments: "+self.downloadedFragments+"/"+h_len);
                                        self.progress("Downloaded annotation "+self.downloadedFragments+"/"+h_len);

                                        self.addAnnotation(coord, data);

                                        // We downloaded all the fragments
                                        if (self.downloadedFragments === h_len) {
                                            self.sortedXpaths = self.xp.splitAndSortXPaths(self.xpaths);
                                            self.getClassesForRanges();
                                            self.updateDOM();
                                            self.connectAnnotationsToClasses();
                                            self.onDomAnnotated();
                                            self.postAnnotatedContent();
                                        }
                                        
                                    };
                                })(coordinates),
                        error: function() { } // TODO: handle error
                });
            };

        }, // setAnnotatedFragments()

        // Will post back the annotated content to a talia server
        postAnnotatedContent : function () {
            var self = this,
                data = {};

            if (self['source_id'] === '')
                return;
                
            data['content'] = $('.THCContent').html();
            data['page'] = $('.THCContent').attr('about');
            data['annotations'] = $('.consolidatedAnnotationsContainer').html();
            data['id'] = self['source_id'];

            self.log('Posting annotated content to server with id '+data['id']+' to '+data['page']);
                
            $.ajax({type: 'POST',
                    url: self.options.baseURLPost,
                    data: data,
                    success: function(data) {
                        self.log("Posted the annotated content: "+data);
                        self.progress('The annotated content has been sent back to the server');
                        // If there's a callback.. call it and close the window
                        if (self.callback !== "") {
                            try {
                                window.opener[self.callback].apply(window.opener);
                                self.log("Called the callback "+self.callback);
                                self.progress('Called the callback. Closing the window');
                                window.close();
                            } catch(e) {
                                self.progress('Error trying to call the callback function! Try to publish again!');
                            }
                        }
                    }});
            
        }, // postAnnotatedContent()


        connectAnnotationsToClasses : function () {
            var self = this;
            
            for (var i = self.xpointers.length - 1; i >= 0; i--) {
                var xp = self.xpointers[i];
                

            } // for self.xpointers
            
        }, // connectAnnotationsToClasses()

        // Wraps all of the calculated xpaths with some htmltag and the computed
        // classes
        updateDOM : function () {
            var self = this;

            // Highlight all of the xpaths
            for (i=self.sortedXpaths.length-1; i>0; i--) {
                var start = self.sortedXpaths[i-1],
                    end = self.sortedXpaths[i];
                self.log("## Updating DOM, xpath "+i+": "+self.htmlClasses[i].join(" "));
                if (self.htmlClasses[i] != "")
                    self.xp.wrapXPaths(start, end, self.options.wrapTag, self.htmlClasses[i].join(" "));
            }
            
            self.progress('Blended annotations into content');
            
        }, // updateDOM()

        getClassesForRanges : function () {
            var self = this,
                real_xps = [];
    
            // Iterate through the sortedXpaths from 1st to Nth and accumulate
            // the active classes, looking at what xpointers are starting and
            // ending in the current xpath position
            for (var i=0; i<self.sortedXpaths.length-1; i++) {
                
                var start = self.sortedXpaths[i],
                    end = self.sortedXpaths[i+1],
                    addxps = self.getStartingXPs(start.xpath, start.offset),
                    remxps = self.getEndingXPs(start.xpath, start.offset);
                    
                    real_xps = self.xp.addToArray(real_xps, addxps);
                    real_xps = self.xp.removeFromArray(real_xps, remxps);
                    
                    var classes = [];
                    for (var j = real_xps.length - 1; j >= 0; j--) {
                        var xp = real_xps[j];
                        for (var k = self.xpointersClasses[xp].length - 1; k >= 0; k--){
                            classes.push(self.xpointersClasses[xp][k]);
                        };
                    };
                    
                    self.htmlClasses[i+1] = classes;

            } // for i
        }, // getClassesForRanges() 

        // Given an xpath/offset couple, returns all of the xpointers
        // which starts there
        getStartingXPs : function(xpath, offset) {
            var self = this,
                ret = [];
                
            for (var i = self.xpointers.length - 1; i >= 0; i--) {
                var xp = self.xpointers[i];
                if (self.xpaths[xp].startxpath == xpath && self.xpaths[xp].startoffset == offset)
                    ret.push(xp);
            }
            return ret;
        },

        // Given an xpath/offset couple, returns all of the xpointers
        // which ends there
        getEndingXPs : function(xpath, offset) {
            var self = this,
                ret = [];
                
            for (var i = self.xpointers.length - 1; i >= 0; i--) {
                var xp = self.xpointers[i];
                if (self.xpaths[xp].endxpath == xpath && self.xpaths[xp].endoffset == offset) 
                    ret.push(xp);
            }
            return ret;
        },

        // DEBUG TODO: function to craft some fixed class name until we get 
        // something better from somewhere
        fooGetNextClassName : function () {
            var self = this;
                self.fooNum++;
            return "cl" + (self.fooNum-1);
        },

        // Extracts the xpaths from the xpointers, and sets the array
        addXPathsFromXPointers : function (xpArray) {
            var self = this;

            for (var i = xpArray.length - 1; i >= 0; i--) 
                self.xpointers = self.xp.addToArray(self.xpointers, [xpArray[i].coordinates]);

            for (var i = xpArray.length - 1; i >= 0; i--) {
                var xp = xpArray[i].coordinates,
                    obj = self.xp.xPointerToXPath(xp);

                if (obj.valid) {

                    // TODO: add these classes elsewhere? Make it later?
                    
                    // Add at least one class to this xpointer xpointersClasses item
                    if (typeof(self.xpointersClasses[xp]) === 'undefined') {
                        self.xpointersClasses[xp] = [];
                        self.xpointersClasses[xp].push(self.fooGetNextClassName());
                    } else {
                        self.xpointersClasses[xp].push(self.fooGetNextClassName());
                        self.log("# addXPathsFromXPointers : xpointer "+xp+" is already defined, classes now are "+self.xpointersClasses[xp].join(" "));
                    }
                    
                    self.xpaths[xp] = obj;
                } else {
                    self.log("REMOVING "+xp+" from xpointers, it's not valid :(");
                    self.xpointers = self.xp.removeFromArray(self.xpointers, [xp]);
                }
            } // for i

            self.log("# Tried to add "+xpArray.length+" xpointers to the array. Succesful: "+self.xpointers.length);
            
        }, // addXPathsFromXPointers()


        addAnnotation : function (xpointer, annotations) {
            var self = this, type, item, id, fragment, added = false;

            self.log("Adding annotations to xpointer "+xpointer);

            fragment = eval("("+annotations+")");
            self.fragments[xpointer] = fragment;

            for (var i = self.itemTypes.length - 1; i >= 0; i--) 
                if (type = self.xp.getTypeFromURI(fragment, self.itemTypes[i])) {
                    id = type['id'];
                    self.log("Type found: "+id);
                    if (item = self.xp.getItemFromType(fragment, id)) {
                        
                        self.addAnnotationItem(xpointer, item, self.itemTypes[i], self.xp.getTriplesForId(fragment, item['id']));
                        added = true;
                    } else {
                        self.log("Found type but didnt find any item?? :(");
                    }
                } // if type = self.xp.getItemFromType()
            
            if (added === false)
                self.log("Didnt find any usable type in the json??! :(");

        }, // addAnnotation()

        addAnnotationItem : function (xp, item, type, triples) {
            var self = this, 
                ann = '';

            self.addedAnnotations++;
            self.log("Adding annotation #"+self.addedAnnotations+" with type "+type);

            // TODO: more to do here.. remove cl0 cl1 ? add classes for each type?
            self.xpointersClasses[xp].push(item['id']);

            ann += '<div class="consolidatedAnnotation" about="'+item['uri']+'">';
            if (item['id']) ann += '<span class="annotationClass">'+item['id']+'</span>';
    
    
            // TODO: more than a single triple? Never happens in FIRBs, guess
            var t = triples,
                spo = ['subject', 'predicate', 'object'],
                fields = ['name', 'label', 'content', 'short_description']; 
                // DEBUG: label and comment have the same data?

            for (i in spo) {
                o = t[spo[i]];

                ann += '<div class="'+spo[i]+'" about="'+o['uri']+'">';
                for (j in fields)
                    if (o[fields[j]]) ann += '<span class="'+fields[j]+'">'+o[fields[j]]+'</span>';
                ann += '</div>';
            } // for i in spo

            ann += '</div>';

            $('div.consolidatedAnnotationsContainer').append(ann);

            // More actions to do for this annotation type? 
            switch (type) {
                // If the item is an imagezone, check if there's <img> tag inside the
                // text fragment and augment them with the given image zone URI
                case 'http://talia.discovery-project.eu/wiki/TaliaInternal#ImageZone':
                    self.onDomAnnotated(function () { 
                        $('.'+item.id+' img').attr('about', item.uri); 
                    });
                    break;
                default:
            }


        }, // addAnnotationItem

        onDomAnnotated : function (f) {
            var self = this;
            
            if (typeof(f) === 'function') {
                self.onDomAnnotatedFunctions.push(f);
                return;
            }
            
            self.log("Executing on DOM annotated functions");
            self.progress("Adding last cosmetics here and there..");
            
            for (i in self.onDomAnnotatedFunctions) 
                self.onDomAnnotatedFunctions[i].apply(self)
            
        }, // onDomAnnotated()

	    log : function(w) {
	        if (this.options.debug == false)
                return;

            if (typeof console == "undefined") {
                if ($("#debug_foo").attr('id') == null) 
                    $("body").append("<div id='debug_foo' style=' border: 3px solid yellow; font-size: 0.9em;'></div>");
                $("#debug_foo").append("<div>"+w+"</div>");
            } else {
                console.log("#Co# "+w);
            }
	    } // log()
        
    } // prototype

})(jQuery)