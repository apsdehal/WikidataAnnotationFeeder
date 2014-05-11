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
*/dojo.provide("pundit.TextFragmentHandler");
dojo.declare("pundit.TextFragmentHandler", pundit.BaseComponent, {
    
    lastSelectedRange: document.createRange(),
    
    constructor: function(options) {
        var self = this;

        self.helper = new pundit.XpointersHelper();
        self.initBehaviors();

        self.log('TextFragmentHandler up and running');
    }, // constructor()

    initBehaviors: function() {
        var self = this;
        
        // Check every mouseup performed on body: if it created a valid range
        // (the user selected some text) then open the contextual menu and 
        // offer the relative functionalities
        dojo.query('body').connect('onmousedown', function(e) {
            var selectable,
                target = e.target;
                
            while (target.tagName.toLowerCase() !== 'body') {
                if (dojo.hasClass(target, 'pundit-disable-annotation')) {
                    selectable = false;
                    break;
                }
                target = dojo.query(target).parent()[0];
            }
            
            if (selectable === false)
                self.selectable = false;
            else
                self.selectable = true;
                
        });
        
        dojo.query('body').connect('onmouseup', function(e) {

            if (!self.selectable) {
                _PUNDIT.cMenu.hide(e);
                return;
            }
                
            // Don't show the contextual menu if the element has class "pundit-disable-annotation"
            // or one of its parents have it.
            var selectable = true,
                target = e.target,
                range, xp;
                
            while (target.tagName.toLowerCase() !== 'body') {
                if (dojo.hasClass(target, 'pundit-disable-annotation')) {
                    selectable = false;
                    break;
                }
                target = dojo.query(target).parent()[0];
            }
            
            if (selectable === false) {
                _PUNDIT.cMenu.hide(e);
                return false;
            }
            
            range = self.getSelectedRange();
            if (range === null) {
                self.log("ERROR: trying to create a new item from with null range?");
                _PUNDIT.cMenu.hide(e);
                return false;
            }

            self.lastSelectedRange = range;
            
            xp = self.getCleanSelectedXpointer();
            if (xp === null) {
                self.log("ERROR: trying to create a new item with null xpointer?");
                _PUNDIT.cMenu.hide(e);
                return false;
            }
            
            // Create the item
            var item = self.createItemFromRange(range);
            
            cMenu.show(e.pageX - window.pageXOffset, e.pageY - window.pageYOffset, item, 'textSelectionHelper');
            return true;
        });
        
        // Action: add to my items
        cMenu.addAction({
            type: ['textSelectionHelper'],
            name: 'AddTextFragmentToMyItems',
            label: 'Add to My Items',
            showIf: function(item) { 
                return true;
            },
            onclick: function(item) {
                tooltip_viewer.highlightByXpointer(item.value);
                
                if (!tooltip_viewer.isTempXpointer(item.value)){
                    tooltip_viewer.tempXpointers.push(item.value);
                    tooltip_viewer.consolidate();
                }

                semlibMyItems.addItem(item, true);
                previewer.buildPreviewForItem(item);
                semlibMyItems.show_pundittabfiltermyitemsfragment();
                return true;
            }
        });

        // Action: annotate text fragment
        cMenu.addAction({
            type: ['textSelectionHelper', 'annotatedtextfragment', 'bookmarkedtextfragment'],
            name: 'AnnotateWithTripleComposer',
            label: 'Annotate text fragment',
            showIf: function(item) { 
                return true;
            },
            onclick: function(item) {
                tripleComposer.addItemToSubject(item);
                previewer.buildPreviewForItem(item);

                if (!_PUNDIT.GUI.isWindowOpen())
                    _PUNDIT.GUI.toggleWindow();

                return true;
            }
        });

        
    }, // initBehaviours()

    getLastSelectedContent: function(limit) {
        var self = this,
            content = self.helper.extractContentFromRange(self.lastSelectedRange);

        if (typeof(limit) !== 'undefined')
            return content.substr(0, limit);
        return content;
    },

    createItemFromRange: function(range) {
        var self = this,
            content = self.helper.extractContentFromRange(range),
            content_short = content.length > 50 ? content.substr(0,50)+' ..' : content,
            xp = self.range2xpointer(self.dirtyRange2cleanRange(range)),
            pCont = _PUNDIT.tripleComposer.getSafePageContext(),
            item;
        
        // If window location is an xpointer of a selected fragment
        // don't consider the fragment!!
        if (pCont.indexOf('#xpointer') !== -1)
            pCont = pCont.substring(0, pCont.indexOf('#'));
        
        // Create the item along its bucket
        item = {
            type: ['subject'],
            rdftype: [ns.fragments.text],
            label: content_short,
            description: content,
            value: xp,
            isPartOf: xp.split('#')[0],
            pageContext: pCont
        }
        item.rdfData = semlibItems.createBucketForTextFragment(item).bucket;
        
        self.log('Created an item from range with label: '+content_short);
        self.log('Clean xpointer is: '+xp);
        return item;
    }, // createItemFromRange()
    
    // Computes a clean xpointer from the range selected by the user
    range2xpointer: function(range) {
        var self = this,
            cleanStartXPath = self.correctXPathFinalNumber(self.calculateCleanXPath(range.startContainer), range.cleanStartNumber),
            cleanEndXPath = self.correctXPathFinalNumber(self.calculateCleanXPath(range.endContainer), range.cleanEndNumber),
            xpointerURL = self.getContentURLFromXPath(cleanStartXPath),
            xpointer = self.getXPointerString(xpointerURL, cleanStartXPath, range.startOffset, cleanEndXPath, range.endOffset);

        this.log("range2xpointer returning an xpointer: "+xpointer);

        return xpointer;
    }, // range2xpointer

    getXPointerString: function(startUrl, startXPath, startOffset, endXPath, endOffset) {
        return startUrl + "#xpointer(start-point(string-range(" + startXPath + ",''," + startOffset + "))"
            + "/range-to(string-range(" + endXPath + ",''," + endOffset + ")))";
    },

    // Extracts the URL of the thc content node used in the xpath, or 
    // gives window location
    getContentURLFromXPath: function(xpath) {
        var self = this,
            contentUrl = _PUNDIT.tripleComposer.getSafePageContext(),
            index = xpath.indexOf('DIV[@about=\''),
            tagName = "about";

        // The given xpath points to a node outside of any 
        // @about described node, a thc content node: 
        // return window location without anchor part
        if (index === -1) 
            return (contentUrl.indexOf('#') !== -1) ? contentUrl.split('#')[0] : contentUrl;

        // It is a content tag: get the URL contained in the @about attribute
        if (index < 3) {
            var urlstart = index + 7 + tagName.length,            
                pos = xpath.indexOf('_text\']'),
                urllength = ((pos !== -1) ? xpath.indexOf('_text\']') : xpath.indexOf('\']')) - urlstart;

            return xpath.substr(urlstart, urllength);
        }
        
        self.log('ERROR: getContentURLFromXPath returning something weird? xpath = '+xpath);
        return '';
    }, // getContentURLFromXPath()

    
    // Gets a clean xpointer out of lastSelectedRange. If it is null.. it returns
    // null!
    getCleanSelectedXpointer: function() {
        var self = this;
        if (self.lastSelectedRange === null) return null;
        return self.range2xpointer(self.dirtyRange2cleanRange(self.lastSelectedRange));
    }, // getCleanSelectedXpointer()
    
    // Gets the user's selected range in the browser, checks if it's valid.
    // Will return a dirty range: a valid range in the current DOM the user
    // is viewing
    getSelectedRange: function() {
        var self = this,
            range;
        
        if (window.getSelection().rangeCount === 0) {
            self.log("getSelection().rangeCount is 0: no selected range.")
            return null;
        }

        range = window.getSelection().getRangeAt(0);

        // If the selected range is empty (this happens when the user clicks on something)...
        if  (range !== null && (range.startContainer === range.endContainer) && (range.startOffset === range.endOffset)) {
            self.log("Range is not null, but start/end containers and offsets match: no selected range.");
            return null;
        }

        self.log("GetSelectedRange is returning a range: "+
            range.startContainer.nodeName+"["+range.startOffset+"] > "+
            range.endContainer.nodeName+"["+range.endOffset+"]");

        return range;

    }, // getSelectedRange()
    
    // Will get a clean Range out of a dirty range: skipping nodes
    // added by the annotation library (ignore nodes) and recalculate
    // offsets if needed
    dirtyRange2cleanRange : function(range) {

        var self = this,
        cleanRange = {};

        self.log("dirty2cleanRange DIRTY is: "+
            range.startContainer.nodeName+"["+range.startOffset+"] > "+
            range.endContainer.nodeName+"["+range.endOffset+"]");

        // cleanRange.startContainer = range.startContainer;
        // cleanRange.endContainer = range.endContainer;

        // cleanRange.cleanStartNumber = self.calculateCleanNodeNumber(range.startContainer);
        // cleanRange.cleanEndNumber = self.calculateCleanNodeNumber(range.endContainer);

        var foos = self.calculateCleanOffset(range.startContainer, range.startOffset),
            fooe = self.calculateCleanOffset(range.endContainer, range.endOffset);

        cleanRange.startContainer = foos.cleanContainer;
        cleanRange.startOffset = foos.cleanOffset;
        
        cleanRange.endContainer = fooe.cleanContainer;
        cleanRange.endOffset = fooe.cleanOffset;

        cleanRange.cleanStartNumber = self.calculateCleanNodeNumber(cleanRange.startContainer);
        cleanRange.cleanEndNumber = self.calculateCleanNodeNumber(cleanRange.endContainer);
       
        self.log("dirty2cleanRange CLEAN (invalid?) range: "+
            cleanRange.startContainer.nodeName+"["+cleanRange.startOffset+"] > "+
            cleanRange.endContainer.nodeName+"["+cleanRange.endOffset+"]");
        
        return cleanRange;
    }, // dirtyRange2cleanRange()

    correctXPathFinalNumber: function(xpath, clean_number) {
        return xpath.replace(/\[[0-9]+\]$/, '['+clean_number+']');
    },

    calculateCleanNodeNumber: function(node) {
        var self = this,
            clean_n,
            nodeName = self.getXPathNodeName(node),
            parentNode = dojo.query(node).parent()[0],
            last_node = (self.helper.isWrapNode(parentNode)) ? parentNode : node;

        if (self.helper.isTextNode(node)) {
            // If it's a text node: skip ignore nodes, count text/element nodes
            clean_n = 1;
            while (current_node = last_node.previousSibling) { 
                if ((self.helper.isTextNode(current_node) || self.helper.isWrappedTextNode(current_node) || self.helper.isUIButton(current_node)) && 
                    ((self.helper.isElementNode(last_node) && !self.helper.isUIButton(last_node) && !self.helper.isWrappedTextNode(last_node)) || self.helper.isWrappedElementNode(last_node)))
                    clean_n++;
                last_node = current_node;
            }
        } else {
            // If it's an element node, count the siblings skipping ignore nodes
            clean_n = 1;
            while (current_node = last_node.previousSibling) {
                if (self.getXPathNodeName(current_node) === nodeName && !self.helper.isIgnoreNode(current_node))
                    clean_n++;
                last_node = current_node;
            }
        }

        return clean_n;
    },

    // TODO: tests to do:
    // - clean dom, should remain the same?
    // - consolidated dom, over an annotation:
    //       - intersection before and after
    //       - inclusion New in Old and Old in New
    //       - leaving the mouse over the yellow icon (dirty A, clean text)
    calculateCleanOffset: function(dirtyContainer, dirtyOffset) {
        var self = this,
            parentNode = dojo.query(dirtyContainer).parent()[0],
            node = dirtyContainer,
            offset = dirtyOffset;

        if (self.helper.isElementNode(dirtyContainer) && !self.helper.isIgnoreNode(dirtyContainer))
            return { cleanContainer: node, cleanOffset: offset };

        if (self.helper.isTextNode(dirtyContainer) && self.helper.isWrapNode(parentNode))
            node = parentNode;

        while (currentNode = node.previousSibling) {
            if (!self.helper.isIgnoreNode(currentNode) && self.helper.isElementNode(currentNode) && !self.helper.isWrapNode(currentNode))
                if (self.helper.isTextNode(dirtyContainer) && self.helper.isWrapNode(parentNode))
                    return { cleanContainer: dirtyContainer, cleanOffset: offset };
                else
                    return { cleanContainer: node, cleanOffset: offset };
            if (self.helper.isTextNode(currentNode))
                offset += currentNode.length;
            else if (self.helper.isWrapNode(currentNode)) 
                offset += currentNode.firstChild.length;
            node = currentNode;
        }

        if (self.helper.isTextNode(dirtyContainer) && self.helper.isWrapNode(parentNode))
            return { cleanContainer: dirtyContainer, cleanOffset: offset };
        else
            return { cleanContainer: node, cleanOffset: offset };
    },

    getXPathNodeName : function(node) {
        if (this.helper.isTextNode(node))
            return "text()";
        else
            return node.nodeName.toUpperCase();
    },
 
    calculateCleanXPath: function(node, partial_xpath) {

        // No node given? We recursed here with a null parent:
        // the xpath is ready!
        var parentNode = dojo.query(node).parent()[0];
        if (!node)
            return partial_xpath;

        var self = this,
        nodeName = self.getXPathNodeName(node);

        if (self.helper.isContentNode(node)) 
            if (typeof(partial_xpath) !== 'undefined') 
                return "//DIV[@about='" + dojo.attr(node, 'about') + "']/" + partial_xpath;
            else
                return "//DIV[@about='" + dojo.attr(node, 'about') + "']";

        if (nodeName === 'BODY' || nodeName === 'HTML')
            if (typeof(partial_xpath) !== 'undefined')
                return "//BODY/" + partial_xpath;
            else
                return "//BODY";


        // Skip wrap nodes into the final XPath!
        if (self.helper.isWrapNode(node)) 
            return self.calculateCleanXPath(node.parentNode, partial_xpath);

        var num = 1,
        current_node = node;
        if (!self.helper.isTextNode(current_node)) 
            while (sibling = current_node.previousSibling) {
                if (self.getXPathNodeName(sibling) === nodeName && !self.helper.isIgnoreNode(sibling))
                    num++;
                current_node = sibling;
            }

        if (typeof(partial_xpath) !== 'undefined')
            partial_xpath = nodeName + "[" + num + "]/" + partial_xpath;
        else
            partial_xpath = nodeName + "[" + num + "]";

        // And recurse up to the parent
        return self.calculateCleanXPath(parentNode, partial_xpath);
    },

    // Will return an object with startxpath, startoffset, endxpath, endoffset
    // splitting the given xpointer. A 'valid' field will be true if the given 
    // xpointer is valid and not empty in the current DOM
    xpointer2Xpaths: function(xpointer) {
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
        ret.startXpath = foo[0];
        ret.startOffset = foo[1];

        // .. and of the ending point of the xpointer
        foo = splittedString[1].substr(0, splittedString[1].length - 3).split(",'',");
        ret.endXpath = foo[0];
        ret.endOffset = foo[1];

        // Is the xpointer valid in the current DOM? 
        startNode = self.getNodeFromXpath(ret.startXpath);
        endNode = self.getNodeFromXpath(ret.endXpath);
        // start and end nodes must be not null
        ret.valid = !(startNode === null || endNode === null);

        // If the start and end xpaths are the same, at least their offset
        // must be different. If xpaths are different, no problem!
        if (ret.startXPath === ret.endXpath) 
            ret.valid &= (ret.startOffset < ret.endOffset);
            
        return ret;

    }, // xpointer2Xpath

    getURLFromXpointer: function(xpointer) {
        return xpointer.split("#xpointer(start-point(string-range(")[0];
    }, // getURLFromXpointer()

    // Returns the DOM Node pointed by the xpath. Quite confident we can always get the 
    // first result of this iteration, the second should give null since we dont use general
    // purpose xpaths 
    getNodeFromXpath : function (xpath) {
        var self = this,
        iterator = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return iterator.singleNodeValue;
    } // getNodeFromXpath() 
});
