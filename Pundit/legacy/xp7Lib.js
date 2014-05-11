(function($) {

	// xp7Lib jQuery object constructor
	$.fn.xp7Lib = function(opts) {

		// get "real" options merging defaults and 
		// opts given by user
		var options = $.extend($.xp7Lib.defaults, opts);

		// Spawn a xp7Lib for every element we are calling this on
		return this.each(function(){
			new $.xp7Lib(this, options)
		});

	}; // $.fn.xp7Lib()


 	// xp7Lib constructor
	$.xp7Lib = function (opts) {
		
		// Global options for this xp7Lib, right into the object
		this.options = $.extend({}, $.xp7Lib.defaults, opts);
		this.init();

	}; // $.xp7Lib()


	$.xp7Lib.defaults = {

        // Classes which contains tagged content
        contentClasses : ['THCContent', 'txt_block', 'thctag'],
		
		// Tag used to wrap the contents
		wrapTag : 'span',
		
		debug : false

	};

	$.xp7Lib.prototype = {
		init : function() {
            
            // TODO: any initialization needed?
            
        },

        // Wrap the range from startXp to endXp (two xpaths custom objects) with
        // the given tag _tag and html class _class. Will build a range for those
        // 2 xpaths, and starting from the range's commonAncestorContainer, will
        // wrap all of the contained elements
        wrapXPaths : function(startXp, endXp, _tag, _class) {
            var self = this,
                htmlTag = _tag || "span",
                htmlClass = _class || "highlight",
                range,
                startNode = self.getNodeFromXpath(startXp.xpath),
                endNode = self.getNodeFromXpath(endXp.xpath);

            // If it's not a textnode, set the start (or end) before (or after) it
            range = document.createRange();
            if (startNode.nodeType != Node.ELEMENT_NODE)
                range.setStart(self.getNodeFromXpath(startXp.xpath), startXp.offset);
            else
                range.setStartBefore(startNode);
            
            if (endNode.nodeType != Node.ELEMENT_NODE)
                range.setEnd(self.getNodeFromXpath(endXp.xpath), endXp.offset);
            else
                range.setEndAfter(endNode);

            // Wrap the nearest element which contains the entire range
            self.wrapElement(range.commonAncestorContainer, range, htmlTag, htmlClass);

        }, // wrapXPath
        
        // Wraps all of the childNodes of element, but only those which stays inside
        // the given range
        wrapElement : function (element, range, htmlTag, htmlClass) {
            var self = this;

            // If there's childNodes, wrap them all
            if (element.childNodes && element.childNodes.length > 0) 
              for (var i=(element.childNodes.length-1); i>=0 && element.childNodes[i]; i--) 
                self.wrapElement(element.childNodes[i], range, htmlTag, htmlClass);

            // Else it's a leaf: if it's a valid text node, wrap it!
            else if (self.isTextNodeInsideRange(element, range)) 
        		self.wrapNode(element, range, htmlTag, htmlClass);	
        	
        	// Else again, if it's an image node, wrap it!
        	else if (self.isImageNodeInsideRange(element, range)) 
    		    self.wrapNode(element, range, htmlTag, htmlClass);
        	
            
        }, // wrapElement()

        // Triple node check: will pass if it's a text node, if it's not
        // empty and if it is inside the given range
        isTextNodeInsideRange : function(node, range) {
            var self = this,
                content;

            // Check: it must be a text node
            if (node.nodeType != Node.TEXT_NODE) 
                return false;

            // Check: the content must not be empty
            content = node.textContent.replace(/ /g, "").replace(/\n/, "");
            if (!node.data || content == "" || content == " ") 
                return false;

            // Finally check if it's in the range
            return self.isNodeInsideRange(node, range)
        },

        isImageNodeInsideRange : function (node, range) {
            var self = this;

            // Check: it must be a text node
            if (node.nodeType != Node.ELEMENT_NODE) 
                return false;
                
            if (node.tagName != 'img' && node.tagName != "IMG")
                return false
            
            return self.isNodeInsideRange(node, range)
        },

        // Will check if the given node interesecates the given range somehow
        isNodeInsideRange: function(node, range) {
            var nodeRange = document.createRange();
            try { nodeRange.selectNode(node); } 
            catch (e) { nodeRange.selectNodeContents(node); }
            if (range.compareBoundaryPoints(Range.END_TO_START || 3, nodeRange) != -1 || range.compareBoundaryPoints(Range.START_TO_END || 1, nodeRange) != 1)
                return false;
            return true
        },
        
        // Will wrap a node (or part of it) with the given htmlTag. Just part of it when it's
        // on the edge of the given range and the range starts (or ends) somewhere inside it
        wrapNode : function (element, range, htmlTag, htmlClass) {
            var self = this,
                r2 = document.createRange();

            // Select correct sub-range: if the element is the start or end container of the range
            // set the boundaries accordingly: if it's startContainer use it's start offset and set
            // the end offset to element lenght. If it's endContainer set the start offset to 0
            // and the endOffset from the range. 
            if (element == range.startContainer || element == range.endContainer) {
                r2.setStart(element, (element == range.startContainer) ? range.startOffset : 0);
                r2.setEnd(element, (element == range.endContainer) ? range.endOffset : element.length);

            // Otherwise just select the entire node, and wrap it up
            } else 
                r2.selectNode(element);

            // Finally surround the range contents with an ad-hoc crafted html element
        	r2.surroundContents(self.createWrapNode(htmlTag, htmlClass));	
            
        }, // wrapNode()
        
        // Creates an HTML element to be used to wrap (usually a span?) adding the given
        // classes to it
        createWrapNode : function(htmlTag, htmlClass) {
            var element = document.createElement(htmlTag);
            $(element).addClass(htmlClass);
            return element;
        },

        // Gets a sorted xpath objects array and returns another array where the elements 
        // are unique just iterate through the original array and skip the element if it's
        // equal to the last newArr element.
        unique : function (arr) {
            var self = this,
                newArr = [],
                len = arr.length;
            
            newArr[0] = arr[0];
            for (var i=1, j=0; i<len; i++) 
                if (arr[i].xpath != newArr[j].xpath || arr[i].offset != newArr[j].offset) 
                    newArr[++j] = arr[i];
            
            return newArr;
        },

        // Will be used as sort function for array's sort. Compares the end
        // points of the ranges in the passed object
        _sortFunction : function (a, b) {
            return a.range.compareBoundaryPoints(Range.END_TO_END, b.range);
        },

        // Concatenates two given arrays
        addToArray : function (arr, add) {
            return arr.concat(add);
        },

        // Removes the rem[] elements from arr[]
        removeFromArray : function (arr, rem) {
            var ret = [];
            for (var i = arr.length - 1; i >= 0; i--) 
                if (rem.indexOf(arr[i]) == -1)
                    ret.push(arr[i]);
            return ret;
        },

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
                self.xpointers = self.addToArray(self.xpointers, [xpArray[i].coordinates]);

            for (var i = xpArray.length - 1; i >= 0; i--) {
                var xp = xpArray[i].coordinates,
                    obj = self.xPointerToXPath(xp);

                if (obj.valid) {

                    // Add at least one class to this xpointer xpointersClasses item
                    if (typeof(self.xpointersClasses[xp]) == 'undefined') {
                        self.xpointersClasses[xp] = [];
                        self.xpointersClasses[xp].push(self.fooGetNextClassName());
                    } else {
                        self.xpointersClasses[xp].push(self.fooGetNextClassName());
                        self.log("# addXPathsFromXPointers : xpointer "+xp+" is already defined, classes now are "+self.xpointersClasses[xp].join(" "));
                    }
                    self.xpaths[xp] = obj;
                } else {
                    self.log("REMOVING "+xp+" from xpointers, it's not valid :(");
                    self.xpointers = self.removeFromArray(self.xpointers, [xp]);
                }
            } // for i

            self.log("# Tried to add "+xpArray.length+" xpointers to the array. Succesful: "+self.xpointers.length);
            
        }, // addXPathsFromXPointers()
        
        // Will return an object with startxpath, startoffset, endxpath, endoffset
        // splitting the given xpointer
        xPointerToXPath: function(xpointer) {
            var self = this,
                splittedString,
                ret = {},
                foo,
                startNode, endNode;
    
            // Split the xpointer two times, to extract a string 
            // like //xpath1[n1],'',o1,//xpath2[n2],'',o2
            // where o1 and o2 are the offsets
            splittedString = xpointer.split("#xpointer(start-point(string-range(")[1].split("))/range-to(string-range(");
            
            // Then extract xpath and offset of the starting point
            foo = splittedString[0].split(",'',");
            ret.startxpath = foo[0];
            ret.startoffset = foo[1];

            // .. and of the ending point of the xpointer
            foo = splittedString[1].substr(0, splittedString[1].length - 3).split(",'',");
            ret.endxpath = foo[0];
            ret.endoffset = foo[1];

            // Is the xpointer valid in this DOM? 
            startNode = self.getNodeFromXpath(ret.startxpath);
            endNode = self.getNodeFromXpath(ret.endxpath);
            ret.valid = !(startNode == null || endNode == null);

            return ret;
        }, // xPointerToXPath

        // Will fill the sortedXpaths array with the custom structure
        splitAndSortXPaths : function (xpaths) {
            var self = this,
                x = [],
                // We just need a starting point to sort the xpaths, taking the first node and use
                // an end_by_end comparison will do the job
                startNode = self.getNodeFromXpath('//body');


            // For every xpointer we create 2 entries in the array: one for starting xpath
            // and one for the ending one
            for (xpointer in xpaths) {

                self.log("## Splitting and sorting "+ xpointer);

                // Push an element for the starting xpath+offset
                var range = document.createRange(),
                    node = self.getNodeFromXpath(xpaths[xpointer].startxpath);
                range.setStart(startNode, 0);
                range.setEnd(node, xpaths[xpointer].startoffset);

                x.push({
                    xpointer: xpointer,
                    xpath: xpaths[xpointer].startxpath,
                    offset: xpaths[xpointer].startoffset,
                    range: range
                });

                // Another time for the ending xpath+offset
                range = document.createRange();
                node = self.getNodeFromXpath(xpaths[xpointer].endxpath);
                range.setStart(startNode, 0);
                range.setEnd(node, xpaths[xpointer].endoffset);

                x.push({
                    xpointer: xpointer,
                    xpath: xpaths[xpointer].endxpath,
                    offset: xpaths[xpointer].endoffset,
                    range: range
                });

            } // for xpointer in self.xpaths

            // Sort this array, using a custom function which compares the
            // range fields
            x.sort(self._sortFunction);

            // Erase doubled entries
            x = self.unique(x);
            
            // self.sortedXpaths = x;
            return x;
            
        }, // splitAndSortXPaths()

        // Returns the DOM Node pointed by the xpath. Quite confident we can always get the 
        // first result of this iteration, the second should give null since we dont use general
        // purpose xpaths 
        getNodeFromXpath : function (xpath) {
            var self = this,
                iterator = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                
            return iterator.singleNodeValue;
        },

        getContentURIs : function() {
        	var self = this,
        	    contentUris = [];

            // Foreach content class, look for those items and extract the about field
        	for (var i = self.options.contentClasses.length - 1; i >= 0; i--)
        	    $('.' + self.options.contentClasses[i]).each(function(j, el) {
        	        contentUris.push($(el).attr('about'))
        	    });

            self.log("# getContentURIs: "+contentUris.length+" new uris found");
        	
        	return contentUris;

        }, // getContentURIs()

        // TODO: move all of these into a proper lib somewhere?
/*
        getLabelFromXI : function (x, i) { return this.getFieldFromId(x, i, 'label'); },
        getUriFromXI : function (x, i) { return this.getFieldFromId(x, i, 'uri'); },

        getHashFromXpointer : function (xpointer) {
            var self = this,    
                fragment = self.fragments[xpointer];
            
            if (typeof fragment == "undefined") {
                self.log("ERROR: getHashFromXpointer with wrong xpointer: "+xpointer);
                return "ERROR: no such xpointer: "+xpointer;
            }
                
            return fragment['hash'];
            
        }, // getHashFromXpointer

        // Will cycle over every fragment to look for the item with the given URI
        // and returns the xpointer
        getXpointerFromURI : function (uri) {
            var self = this;

            for (var xpointer in self.fragments) {
                var fragment = self.fragments[xpointer];
                if (typeof fragment.items != "undefined")
                    for (var i = framgent.items.length - 1; i >= 0; i--)
                        if (fragment.items[i].uri == uri) 
                            return xpointer;
            } // for index
            return "ERROR: No xpointer for uri "+uri;
        },
        
        getXpointerFromHash : function (hash) {
            var self = this;

            
            for (i in self.fragments) 
                if (self.fragments[i]['hash'] == hash) {
                    self.log("## Asked for xpointer from hash: "+hash+", returning "+ i);
                    return i;
                }

            self.log("ERROR getXpointerFromHash with wrong hash: "+hash+", returning "+ i);
            return "ERROR: NO SUCH HASH "+hash;
                
        },

        // Returns the content of the given field of an item object
        getFieldFromXIF : function (xpointer, id, field) {
            var self = this, 
                item;
            if (item = self.getItemFromXI(xpointer, id))
                return item[field];
            return false;
        },

        // Will cycle over every fragment to look for the item with the given URI
        getItemFromURI : function (uri) {
            var self = this;

            for (var xpointer in self.fragments) {
                var fragment = self.fragments[xpointer];
                if (typeof fragment.items != "undefined")
                    for (var i = fragment.items.length - 1; i >= 0; i--)
                        if (fragment.items[i].uri == uri) 
                            return fragment.items[i];

            } // for xpointer
            return false;
        },
*/
    

        getTypeFromURI : function (fragment, uri) {

            if (typeof fragment.types !== "undefined")
                for (name in fragment.types)
                    if (fragment.types[name].uri === uri) 
                        return fragment.types[name];

            return false;
        },

        getItemFromURI : function (fragment, uri) {

            if (typeof fragment.items !== "undefined")
                for (var i = fragment.items.length - 1; i >= 0; i--)
                    if (fragment.items[i].uri === uri) 
                        return fragment.items[i];

            return false;
        },

        getItemFromType : function (fragment, type) {
            var self = this;
            
            if (typeof fragment.items !== "undefined")
                for (var i = fragment.items.length - 1; i >= 0; i--) {
                    if (self.isItemOfType(fragment.items[i], type)) 
                        return fragment.items[i];
                }

            return false;
        },

        getIdFromURI : function (fragment, uri) {
            var lookIn = ['items', 'properties', 'types'], 
                j, i, foo;

            // DEBUG: json wonders, items is an array, the others are objects...
            for (j in lookIn)
                if (typeof fragment[lookIn[j]] !== "undefined") {
                    foo = fragment[lookIn[j]];
                    for (i in foo)
                        if (foo[i].uri === uri)
                            return foo[i].id;
                }
                
            return false;
        },

        getItemFromId : function (fragment, id) {
            
            if (typeof fragment.items !== "undefined")
                for (var i = fragment.items.length - 1; i >= 0; i--)
                    if (fragment.items[i].id === id) 
                        return fragment.items[i];

            return false;
        },
        
        getTriplesForId : function (fragment, id) {
            var self = this, 
                foo,
                // Will get the id the stupid json use as indexes in the items. The items we
                // look for have three fields subject/predicate/object which represent our
                // entire annotation
                sub = self.getIdFromURI(fragment, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#subject'),
                pre = self.getIdFromURI(fragment, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate'),
                obj = self.getIdFromURI(fragment, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object');
        
            if (typeof fragment.items !== "undefined")
                for (var i = fragment.items.length - 1; i >= 0; i--)
                    if (fragment.items[i].object === id || fragment.items[i].subject === id) 
                        return {
                            subject: self.getItemFromId(fragment, fragment.items[i][sub]),
                            predicate: self.getItemFromId(fragment, fragment.items[i][pre]),
                            object: self.getItemFromId(fragment, fragment.items[i][obj])
                        }
            return {};
            
        },

/*

        // Returns an item (object with items, properties, etc) from an
        // xpointer and item id. Returns false if it doesnt exist
        getItemFromXI : function (xpointer, id) {
            var self = this, 
                fragment = self.fragments[xpointer];

            if (typeof fragment == "undefined") {
                self.log("### GetItemFromXI ERROR: didnt find note with id "+id+" and xpointer "+xpointer);
                return false;
            }

            for (var i=fragment.items.length-1; i >= 0; i--)
                if (fragment.items[i].id == id) 
                    return fragment.items[i];

            return false;
        },
*/
        isItemOfType : function (item, type) {
            
            // No item or no type, return false
            if (typeof item === 'undefined') return false;
            if (typeof item['type'] === 'undefined') return false;
            
            for (var i=item['type'].length-1; i >= 0; i--)
                if (item['type'][i] == type) 
                    return true;
            return false;
        },
        

	    log : function(w) {
	        if (this.options.debug == false)
                return;

            if (typeof console == "undefined") {
                if ($("#debug_foo").attr('id') == null) 
                    $("body").append("<div id='debug_foo' style=' border: 3px solid yellow; font-size: 0.9em;'></div>");
                $("#debug_foo").append("<div>"+w+"</div>");
            } else {
                console.log("#xpLib# "+w);
            }
	    } // log()
        
    } // prototype

})(jQuery)