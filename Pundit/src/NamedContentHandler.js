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
 * @class pundit.NamedContentHandler
 * @extends pundit.baseComponent
 * @description TODO
 */
dojo.provide("pundit.NamedContentHandler");
dojo.declare("pundit.NamedContentHandler", pundit.BaseComponent, {

    opts: {
        moreInfoTag: 'span',
        moreInfoAttribute: 'rel',
        moreInfoURL: 'http://purl.org/pundit/ont/json-metadata',
        consolidateNamedContents: true
    },

    constructor: function(options) {
        var self = this;

        self._checkedIdentifiers = [];
        self.xphelper = new pundit.XpointersHelper();

        _PUNDIT.init.onInitDone(function(){
            setTimeout(function() {
                // self.checkForNamedContent();
                
            }, 1000);
            tooltip_viewer.onConsolidate(function(){
                // TODO: needed?
                // self.checkForNamedContent();
            });
        });
        
        // Id of the init job
        self.loadJobId = _PUNDIT.init.waitBeforeInit();
        
        (function() {   
            var h = document.getElementsByTagName('head')[0],
            d = document.createElement('script');
            d.type = 'text/javascript';
            d.src = 'https://raw.github.com/digitalbazaar/jsonld.js/master/js/jsonld.js';
            h.appendChild(d);
            d.onload = function() {
                self.log('Loaded JSONLD library: checking for named content');
                _PUNDIT.init.doneBeforeInit(self.loadJobId);
                self.checkForNamedContent();
            }
        })();
        
    },
    
    checkForNamedContent: function() {
        var self = this,
            uris = {}, 
            num = 0, 
            toConsolidate = false;
        
        // Foreach content class, look for those items and extract everything we can
        for (var i = self.xphelper.opts.contentClasses.length - 1; i >= 0; i--)
            dojo.query('.' + self.xphelper.opts.contentClasses[i]).forEach(function(node) {
                var u = dojo.attr(node, "about"),
                    item = self.createItemForNode(node);

                // Skip named contents with no metadata     
                var metadatas = node.getElementsByTagName('SPAN');
                if (typeof(metadatas) !== "undefined" && metadatas.length > 0) {
                    var metadata = metadatas[0];
                }
                if (typeof(metadata) === "undefined" || typeof(metadata.getAttribute('rel')) === "undefined" || metadata.getAttribute('rel') !== 'http://purl.org/pundit/ont/json-metadata') {
                    self.log('Skipping named content. No JSON metadata for'+ item.value);
                    return;
                }

                // Avoid checking the same identifiers twice
                if (dojo.indexOf(self._checkedIdentifiers, u) !== -1) {
                    self.log('Skipping '+item.value);
                    return;
                }  

                self._checkedIdentifiers.push(u);
                num++;
                uris[u] = {
                    node: node,
                    item: item
                };
                self.log("checkForNamedContent adding: " + u);
            });
            
        self.log("checkForNamedContent: "+num+" new named contents found");

        for (var k in uris) {
            var _ptv = _PUNDIT.tooltipViewer,
                moreinfo = dojo.query(self.opts.moreInfoTag+'[rel="http://purl.org/pundit/ont/json-metadata"]', uris[k].node);

            if (moreinfo.length > 0) {
                var res = dojo.attr(moreinfo[0], 'resource');
                self.log('Getting more info from '+ res);

                dojo.io.script.get({
                    callbackParamName: "jsonp",
                    url: res,
                    load: (function(item) {
                        return function(ld) {
                            var label = jsonld.getValues(ld, 'http://www.w3.org/2000/01/rdf-schema#label')[0],
                                types = jsonld.getValues(ld, '@type'),
                                description = jsonld.getValues(ld, 'http://purl.org/dc/elements/1.1/description')[0],
                                image = jsonld.getValues(ld, 'http://xmlns.com/foaf/0.1/depiction')[0];

                            for (var l=types.length; l--;) 
                                item.rdftype.push(types[l]);
                            item.label = label;
                            item.description = description;
                            item.image = image;
                            
                            item.rdfData = semlibItems.createBucketForNamedContent(item).bucket;
                            semlibItems.addItem(item, true);
                            previewer.buildPreviewForItem(item);
                            self.log('Created item from rest service: '+ item.label);
                        }
                    })(uris[k].item),
                    error: function(response, ioArgs) {
                        self.log("Error :| zomg.");
                    }
                });
            
            } else {
                uris[k].item.rdfData = semlibItems.createBucketForNamedContent(uris[k].item).bucket;
                semlibItems.addItem(uris[k].item, true);
                previewer.buildPreviewForItem(uris[k].item);
                self.log('Created item with no additional info: '+uris[k].item.label);
            }

            // Add it to temp xpointers and consolidate, if configured so
            // Dont add it if it already exists or it refers to something
            // not present (or detected yet?) on the page
            if (self.opts.consolidateNamedContents)
                if (!_ptv.isTempXpointer(uris[k].item.value) && (_ptv.contentURIs.indexOf(uris[k].item.isPartOf) !== -1)) {
                    _ptv.tempXpointers.push(uris[k].item.value);
                    toConsolidate = true;
                    self.log('Added named content item to temp xpointers');
                }
            
        } // for k in uris
        
        if (toConsolidate) {
            // _ptv.consolidate();
            // self.log('Consolidated named content items');
        }
        
    }, // checkForNamedContent()
    
    createItemForNode: function(node) {
        var self = this,
            content,
            content_short,
            pCont = _PUNDIT.tripleComposer.getSafePageContext(),
            item,
            namedContentID = dojo.attr(node, "about"),
            xp;

        // Build the xpointer as a custom xpointer to select everything
        // inside the given named content / node.

        // DEUG: format not supported by consolidation :|
        // xp = namedContentID + "#xpointer(//DIV[@about='"+ namedContentID  +"'])";
        
        // DEBUG: not rly selecting what we wanted to
        // xp = namedContentID + "#xpointer(start-point(string-range(//DIV[@about='"+ 
        //     namedContentID  +"'],'',1))/range-to(string-range(//DIV[@about='"+ 
        //     namedContentID +"'],'',2)))";
                        
        xp = self.xphelper.getXpFromChildNodes(node);

        content = self.xphelper.extractContentFromNode(node);
        content = content.replace(/(\r\n|\n|\r)/gm, "").replace(/\s+/g," ");
        content_short = content.length > 50 ? content.substr(0, 50)+' ..' : content;
        
        // If window location is an xpointer of a selected fragment
        // don't consider the fragment!!
        if (pCont.indexOf('#xpointer') !== -1)
            pCont = pCont.substring(0, pCont.indexOf('#'));
        
        // Create the item along its bucket
        item = {
            type: ['subject'],
            rdftype: [ns.fragments.named, ns.fragments.text],
            label: content_short,
            description: content,
            value: xp,
            isPartOf: xp.split('#')[0],
            pageContext: pCont
        }

        return item;
    },


});