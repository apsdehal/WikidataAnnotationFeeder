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
 * @class pundit.XpointersHelper
 * @extends pundit.baseComponent
 * @description Provides a set of utilities to work with xpointers
 * and xpaths. Massively used to consolidate and extract content
 * from the DOM.
 */
dojo.provide("pundit.XpointersHelper");
dojo.declare("pundit.XpointersHelper", pundit.BaseComponent, {

    opts: {

        // Node name and class used to wrap our annotated content
        wrapNodeName: 'span',
        wrapNodeClass: 'cons',

        /**
         * Class used on a container to indicate it's a named content: xpointers
         * will start from that node
         * @property contentClasses
         * @type array of strings
         * @default ['pundit-content']
         */
        contentClasses: ['pundit-content'],

        // Nodes with these classes will be ignored when building xpointers
        // and consolidating annotations
        ignoreClasses: ['cons', 'pundit-icon-annotation']

    },

    constructor: function(options) {
        var self = this;
        self.log('xpointersHelper up and running');
    }, // constructor()

    getContentURIs : function() {
        var self = this,
            contentUris = [];

        // Add current page url in the content URIs
        contentUris.push(document.location.href);

        // Foreach content class, look for those items and extract the about field
        for (var i = self.opts.contentClasses.length - 1; i >= 0; i--)
            dojo.query('.' + self.opts.contentClasses[i]).forEach(function(node){
                contentUris.push(dojo.attr(node, "about"));
            });
        self.log("# getContentURIs: "+contentUris.length+" new uris found");

        return contentUris;

    }, // getContentURIs()

    // Wraps all of the calculated xpaths with some htmltag and the computed
    // classes
    updateDOM : function (sortedXpaths, htmlClasses) {
        var self = this;

        // Highlight all of the xpaths
        for (i=sortedXpaths.length-1; i>0; i--) {
            var start = sortedXpaths[i-1],
                end = sortedXpaths[i];
                
            if (htmlClasses[i].length) {
                self.log("## Updating DOM, xpath "+i+": "+htmlClasses[i].join(" "));
                self.wrapXPaths(start, end, self.opts.wrapNodeName, htmlClasses[i].join(" ")+" "+self.opts.wrapNodeClass);
            }
        }
        self.log("Dom succesfully updated!")
    }, // updateDOM()

    // Wrap the range from startXp to endXp (two xpaths custom objects) with
    // the given tag _tag and html class _class. Will build a range for those
    // 2 xpaths, and starting from the range's commonAncestorContainer, will
    // wrap all of the contained elements
    wrapXPaths : function(startXp, endXp, _tag, _class) {
        var self = this,
            htmlTag = _tag || "span",
            htmlClass = _class || "highlight",
            range = document.createRange(),
            startNode = self.getNodeFromXpath(startXp.xpath),
            endNode = self.getNodeFromXpath(endXp.xpath);

        // If start and end xpaths dont have a node number [N], we
        // are wrapping the Mth=offset child of the given node
        if (!startXp.xpath.match(/\[[0-9]+\]$/) && !endXp.xpath.match(/\[[0-9]+\]$/)) {
            range.selectNode(startNode.childNodes[startXp.offset]);
        } else {

            // TODO: not sure... do we need to select a different node
            // if the xpath is missing a [N]??
            // if (!startXp.xpath.match(/\[[0-9]+\]$/))
            //	range.setStart();

            // If it's not a textnode, set the start (or end) before (or after) it
            if (!self.isElementNode(startNode))
                range.setStart(startNode, startXp.offset);
            else
                range.setStart(startNode, startXp.offset);

            if (!self.isElementNode(endNode))
                range.setEnd(endNode, endXp.offset);
            else
                range.setEndAfter(endNode);
        }

        // Wrap the nearest element which contains the entire range
        self.wrapElement(range.commonAncestorContainer, range, htmlTag, htmlClass);

    }, // wrapXPath
    
    // Wraps childNodes of element, only those which stay inside
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
        // MORE Else: it's an image node.. wrap it up
        else if (self.isImageNodeInsideRange(element, range)) 
            self.wrapNode(element, range, htmlTag, htmlClass);
        
    }, // wrapElement()

    // Triple node check: will pass if it's a text node, if it's not
    // empty and if it is inside the given range
    isTextNodeInsideRange : function(node, range) {
        var self = this,
            content;

        // Check: it must be a text node
        if (node.nodeType !== Node.TEXT_NODE) 
            return false;

        // Check: the content must not be empty
        content = node.textContent.replace(/ /g, "").replace(/\n/, "");
        if (!node.data || content === "" || content === " ") 
            return false;

        // Finally check if it's in the range
        return self.isNodeInsideRange(node, range)
    },

    isImageNodeInsideRange : function (node, range) {
        var self = this;

        // Check: it must be an element node
        if (node.nodeType !== Node.ELEMENT_NODE) 
            return false;
            
	    // Check: it must be an img
        if (node.tagName.toLowerCase() !== 'img')
            return false;
        
        return self.isNodeInsideRange(node, range)
    },

    // Will check if the given node interesecates the given range somehow
    isNodeInsideRange: function(node, range) {
        var nodeRange = document.createRange();
        try {nodeRange.selectNode(node);} 
        catch (e) {nodeRange.selectNodeContents(node);}
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
        // the end offset to element length. If it's endContainer set the start offset to 0
        // and the endOffset from the range. 
        if (element === range.startContainer || element === range.endContainer) {
            r2.setStart(element, (element === range.startContainer) ? range.startOffset : 0);
            r2.setEnd(element, (element === range.endContainer) ? range.endOffset : element.length);

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
        dojo.query(element).addClass(htmlClass);
        return element;
    },

    getClassesForNewXpointers : function (xpointers, sortedXpaths, xpaths, xpointersClasses) {
        var self = this,
            real_xps = [],
            htmlClasses = [];

        // Iterate through the sortedXpaths from 1st to Nth and accumulate
        // the active classes, looking at what xpointers are starting and
        // ending in the current xpath position
        for (var i=0; i<sortedXpaths.length-1; i++) {
            
            var start = sortedXpaths[i],
                end = sortedXpaths[i+1],
                addxps = self.getStartingXPs(xpointers, xpaths, start.xpath, start.offset),
                remxps = self.getEndingXPs(xpointers, xpaths, start.xpath, start.offset);
                
            real_xps = self.addToArray(real_xps, addxps);
            real_xps = self.removeFromArray(real_xps, remxps);

            var classes = [];
            for (var j = real_xps.length - 1; j >= 0; j--) {
                var xp = real_xps[j];
                for (var k = xpointersClasses[xp].length - 1; k >= 0; k--){
                    classes.push(xpointersClasses[xp][k]);
                };
            };
            
            htmlClasses[i+1] = classes;

        } // for i
        self.log("Got classes for new xpointers");

        return htmlClasses;
    }, // getClassesForNewXpointers()

    // Given an xpath/offset couple, returns all of the xpointers
    // which starts there
    getStartingXPs : function(xpointers, xpaths, xpath, offset) {
        var self = this,
            ret = [];
            
        for (var i = xpointers.length - 1; i >= 0; i--) {
            var xp = xpointers[i];
            if (xpaths[xp].startxpath === xpath && xpaths[xp].startoffset === offset)
                ret.push(xp);
        }
        return ret;
    },

    // Given an xpath/offset couple, returns all of the xpointers
    // which ends there
    getEndingXPs : function(xpointers, xpaths, xpath, offset) {
        var self = this,
            ret = [];
            
        for (var i = xpointers.length - 1; i >= 0; i--) {
            var xp = xpointers[i];
            if (xpaths[xp].endxpath === xpath && xpaths[xp].endoffset === offset) 
                ret.push(xp);
        }
        return ret;
    },

    // Will return an array of sorted xpaths, using a custom structure
    //xpaths object
    splitAndSortXPaths : function (xpaths) {
        var self = this,
            x = [],
            // We just need a starting point to sort the xpaths, taking the first node and use
            // an end_by_end comparison will do the job
            startNode = self.getNodeFromXpath('//body');


        // For every xpointer we create 2 entries in the array: one for starting xpath
        // and one for the ending one
        for (var xpointer in xpaths) {

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
        
        return x;
        
    }, // splitAndSortXPaths()

    // Extracts the xpaths from the xpointers, and sets the array
    getXPathsFromXPointers: function (xpArray) {
        var self = this,
            invalidXpointers = [],
            xpointers = [],
            xpaths = {};

        for (var i = xpArray.length - 1; i >= 0; i--) 
            xpointers = self.addToArray(xpointers, [xpArray[i]]);

        for (var i = xpArray.length - 1; i >= 0; i--) {
            var xp = xpArray[i],
                obj = self.xPointerToXPath(xp);

            if (obj.valid) {
                xpaths[xp] = obj;
            } else {
                self.log("REMOVING "+xp+" from xpointers, it's not valid :(");
                xpointers = self.removeFromArray(xpointers, [xp]);
                invalidXpointers.push(xp);
            }
        } // for i

        self.log("# Consolidating "+xpointers.length+" valid xpointers out of "+xpArray.length+" passed in.");

        return {
            invalidXpointers: invalidXpointers,
            xpaths: xpaths, 
            xpointers: xpointers
        };
    }, // getXPathsFromXPointers()

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
        ret.valid = self.isValidRange(startNode, ret.startoffset, endNode, ret.endoffset)

        return ret;
    }, // xPointerToXPath
    
    isValidRange: function(startNode, startOffset, endNode, endOffset) {
        try {
            var r = document.createRange();
            r.setStart(startNode, startOffset);
            r.setEnd(endNode, endOffset);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    isValidXPointer: function(xp) {
        var self = this,
            splittedString,
            ret = {},
            foo,
            startNode, endNode;

        // Split the xpointer two times, to extract a string 
        // like //xpath1[n1],'',o1,//xpath2[n2],'',o2
        // where o1 and o2 are the offsets
        splittedString = xp.split("#xpointer(start-point(string-range(")[1].split("))/range-to(string-range(");
        
        // Then extract xpath and offset of the starting point
        foo = splittedString[0].split(",'',");
        ret.startxpath = foo[0];
        ret.startoffset = foo[1];

        // .. and of the ending point of the xpointer
        foo = splittedString[1].substr(0, splittedString[1].length - 3).split(",'',");
        ret.endxpath = foo[0];
        ret.endoffset = foo[1];
            
        console.log('Start: ', ret.startxpath);
        startNode = self.getNodeFromXpath(ret.startxpath);
        console.log('Start: ', startNode, ret.startoffset);
        
        console.log('End: ', ret.endxpath);
        endNode = self.getNodeFromXpath(ret.endxpath);
        console.log('End: ', endNode, ret.endoffset);
        
        console.log('Valid start end', startNode, endNode);
        console.log('Valid: ', self.isValidRange(startNode, ret.startoffset, endNode, ret.endoffset));
        
    },

    // Returns the DOM Node pointed by the xpath. Quite confident we can always get the 
    // first result of this iteration, the second should give null since we dont use general
    // purpose xpaths 
    getNodeFromXpath : function (xpath) {
        var self = this,
            iterator;
        iterator = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);

        return iterator.singleNodeValue;
    },

    // Concatenates two given arrays
    addToArray : function (arr, add) {
        return arr.concat(add);
    },

    // Removes the rem[] elements from arr[]
    removeFromArray : function (arr, rem) {
        var ret = [];
        for (var i = arr.length - 1; i >= 0; i--) 
            if (rem.indexOf(arr[i]) === -1)
                ret.push(arr[i]);
        return ret;
    },

    // Gets a sorted xpath objects array and returns another array where the elements 
    // are unique: just iterates through the original array and skip the element if it's
    // equal to the last newArr element.
    unique : function (arr) {
        var newArr = [],
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

    // Takes a range and extracts a readable description of its content. 
    // Text is preserved, while imgs are replaced by an "Image" string
    // TODO: there is a bug here! try with small range...
    extractContentFromRange: function (range) {

        if (range === null) return "";

        var self = this,
            content = '',
            clone = range.cloneContents(),
            children = clone.childNodes,
            len = children.length;

        for (var i=0; i<len; i++) 
            content += self.extractContentFromNode(children[i]);
                
        return content;
    }, // extractContentFromRange()

    extractContentFromNode: function (node) {
        var self = this,
            content = '',
            type = node.nodeType;

        if (self.isElementNode(node)) {
            if (node.nodeName.toUpperCase() === "IMG") {
                var src;
                if (src = dojo.attr(node, 'src')) {
                    var idx = src.lastIndexOf("/");
                    if (idx !== -1) 
                        src = src.substr(idx + 1, src.length - idx);
                } else 
                    src = "unknown location";

                content += "[img: " + src + "]";

            } else {
                var children = node.childNodes,
                    len = children.length;
                for (var i=0; i<len; i++) 
                content += self.extractContentFromNode(children[i]);

            }

        } else if (!self.isCommentNode(node)) 
            if (typeof(node.textContent) !== 'undefined')
                content += node.textContent;

        return content;
	}, // extractContentFromNode()


    // DEBUG: what's this :D
    extractContentFromXpointer: function (xp) {
        var self = this;
        
        
        
    }, // extractContentFromXpointer()

    isUIButton: function(node) {
        var self = this;

        if (!self.isElementNode(node))
            return false;

        if (node.nodeName.toUpperCase() !== 'A')
            return false;

        if (dojo.hasClass(node, 'pundit-icon-annotation'))
            return true;

        return false;
    },

    // Returns true if the given node is a tag which should be ignored, like
    // a THCtag (span? something)
    isIgnoreNode: function(node) {
        var self = this;
        
        if (!self.isElementNode(node)) 
            return false;

        var i, c = self.opts.ignoreClasses;
        for (i = c.length; i--;)
            if (dojo.hasClass(node, c[i])) 
                return true;

        return false;
    }, // isIgnoreNode()
    isTextNode:    function(node) {return node.nodeType === Node.TEXT_NODE;},
    isElementNode: function(node) {return node.nodeType === Node.ELEMENT_NODE;},
    isCommentNode: function(node) {return node.nodeType === Node.COMMENT_NODE;},
    isWrapNode: function(node) {
        var self = this;

        // Not an element node.. return false
        if (!self.isElementNode(node))
            return false;

        // If the node name is wrong.. return false
        if (node.nodeName.toUpperCase() !== self.opts.wrapNodeName.toUpperCase())
            return false;

        // It is an element, with the right name, if it has
        // the wrap class, it is a wrap node!
        if (dojo.hasClass(node, self.opts.wrapNodeClass))
            return true;

        return false;
    }, // isWrapNode()
    isWrappedElementNode: function(node) {
        var self = this;

        if (!self.isWrapNode(node))
            return false;

        if (!self.isElementNode(node.firstChild))
            return false;

        return true;
    },
    isWrappedTextNode: function(node) {
        var self = this;

        if (!self.isWrapNode(node))
            return false;

        if (!self.isTextNode(node.firstChild))
            return false;

        return true;
    },
    isContentNode: function (node) {
        var self = this;
        
        if (!self.isElementNode(node)) 
            return false;

        var i, c = self.opts.contentClasses;

        for (i = c.length; i--;)
            if (dojo.hasClass(node, c[i])) 
                return true;

        return false;
    }, // isContentNode

    // Will merge all the text nodes under the given node, going down the DOM 
    // recursively
    mergeTextNodes: function(node) {
        var self = this;

        if (!node) return;

        if ((typeof(node.childNodes) !== "undefined") && (node.childNodes.length > 0)) {
            var i= node.childNodes.length-1;
                        
            // TODO Fix this bug. Used try catch.
            try {
                var child, sibling;
                while (child = node.childNodes[i--]) {
                    if (self.isTextNode(child) && (sibling = node.childNodes[i]) && self.isTextNode(sibling)) {
                        sibling.nodeValue = sibling.nodeValue + child.nodeValue;
                        node.removeChild(child);
                    } else if (self.isElementNode(child))
                        self.mergeTextNodes(child);
                }
            } catch(err){
                console.log('ERROR while merging text nodes!');
            }
        }
        
    },
    
    getXpFromNode: function(node) {
        var range = document.createRange();
        range.selectNode(node);
        return fragmentHandler.range2xpointer(fragmentHandler.dirtyRange2cleanRange(range)); 
    },
    
    getXpFromChildNodes: function(node) {
        var self = this,
            range = self.getRangeFromChildNodes(node);
        return fragmentHandler.range2xpointer(fragmentHandler.dirtyRange2cleanRange(range));
    },
    
    getRangeFromChildNodes: function(node) {
        var range = document.createRange();
        range.setStart(node.firstChild, 0);
        range.setEnd(node.lastChild,0);
        return range;
    },
    
    

});