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
*/dojo.provide("pundit.TooltipAnnotationViewer");
dojo.declare("pundit.TooltipAnnotationViewer", pundit.BaseComponent, {

    opts: {
        hideMouseLeaveMS: 500,
        enableHighlightingMode: true,
        highlightingMode: false,
        showInvalidXPointers: false,
        allowAnnotationEdit: false
    },

    constructor: function(options) {
        var self = this;

        self.createCallback([
            'AnnotationIconMouseEnter', 
            'AnnotationIconMouseLeave', 
            'AnnotationIconMouseClick',
            'Consolidate',
            'NotebookActivationChanged'
        ]);
        
        self.initBehaviors();
        self.hideTimer = [];
        self.highlightCount = [];
        
        self.helper = new pundit.XpointersHelper();
        self.reader = new pundit.AnnotationReader();
        self.writer = new pundit.AnnotationWriter();
        self.jobId = null;
        
        self.initReader();
        self.initWriter();

        self.contentURIs = self.helper.getContentURIs();
        self.initContextualMenu();
        
        //refresh all
        self.refreshPageItems = false;
        
        tripleComposer.onSave(function() {
            self.refreshAnnotations();
        });

        // True if we are not ready to show annotations: we must
        // wait for them to be loaded and consolidated
        self.isRefreshingAnnotations = true;

        self.wipe();
        _PUNDIT.init.onInitDone(function() {
            self.refreshAnnotations();
        });

        self.notebooks = {};
        self._onLoadAnnotationShown = false;

        self.log("TooltipAnnotationViewer Up and running");

    }, // constructor()
    
    initWriter: function() {
        var self = this;

        self.writer.onSetNotebookActive(function(id, flag) { 
            semlibWindow.closeAllPanels();
            self.refreshAnnotations();
            self.fireOnNotebookActivationChanged();
        });
    },

    initReader: function() {
        var self = this;
        
        // First step: get metadata for thcuris on this page
        self.reader.onAnnotationMetadata(function(g) {

            // Already in progress?
            if (!self.jobId) {
                //When deleting one annotation I need to resfresh all page items
                if (self.refreshPageItems){
                    //TODO use function for this
                    semlibItems.itemsDnD.forInItems(function(item){
                    if (item.data.rdftype[0] !== ns.rdf_property)
                        semlibItems.removeItemFromUri(item.data.value);
                    });
                    self.refreshPageItems = false;
                }
                
                self.jobId = _PUNDIT.loadingBox.addJob('Downloading annotation content');
                self.addAnnotations(g);

                // ok object
                for (var notebook_id in self.notebooks) {
                    self.reader.checkNotebook(notebook_id);
                }

                self.consolidate();
                dojo.behavior.apply();
            } else {
                console.log('DEBUG: two refresh() Too fast?!?');
            }
            
        });
        
        // Second step: addAnnotations is calling AnnotationContent
        // on every valid annotation
        self.reader.onAnnotationContent(function(g, id) {
            self.log('Annotation content for '+id+' received');
            self.addAnnotationContent(id, g);
            self.reader.getAnnotationItemsFromId(id);
        });
        
        self.reader.onAnnotationItems(function(g, id) {
            self.log('Annotation items for '+id+' received');
            self.addAnnotationItems(id, g);
            if (--self.annToDownload === 0) {
                self.consolidate();
                _PUNDIT.loadingBox.setJobOk(self.jobId);
                self.isRefreshingAnnotations = false;
                self.jobId = null;

                if (_PUNDIT.tripleComposer.tryToShowAnnotation) {
                    try {
                        self.showAnnotationPanel(_PUNDIT.tripleComposer.tryToShowAnnotation);
                        self.log('Showing annotation after full reload.');
                    } catch (e) {
                        self.log('Failed to show annotation after full reload.');
                    }
                    _PUNDIT.tripleComposer.tryToShowAnnotation = null;
                }
                
                self.showAnnotationOnLoad();
            }
        });
        
        self.reader.onNotebookChecked(function(id, flag) {
            self.log('Notebook ' + id + ' cheked: active = ' + flag);
            self.notebooks[id] = flag;
        });

        self.reader.onError(function(e) {
            // TODO: add a callback for each call, and handle the errors
            console.log('TODO: Reader got an error, deal with it!', e);
            return false;
        });
        
    }, // initReader()
    
    showAllAnnotationsOnItem: function(xp) {
        var self = this;
        
        for (var i = self.xpointersAnnotationsId[xp].length - 1; i >= 0; i--) {
            self.log('RDF Icon click: Opening panel for annotation '+self.xpointersAnnotationsId[xp][i]);
            self.showAnnotationPanel(self.xpointersAnnotationsId[xp][i], xp);
        }
        
        var y = dojo.position(dojo.query('span.'+self.xpointersClasses[xp])[0], true).y,
            bodyTop = dojo.query('body')[0].scrollTop;
            
        if ((y - bodyTop < dojo.position('pundit-gui', true).h) || (y - bodyTop  > window.innerHeight))
            dojox.fx.smoothScroll({
                node : dojo.query('span.'+self.xpointersClasses[xp])[0],
                offset: {y: dojo.position('pundit-gui', true).h + 100},
                win: window,
                duration: 800
            }).play();
        
        return true;	
	},

	areAllAnnotationsOnItemOpened: function(xp) {
		var self = this;
		if (typeof(self.xpointersAnnotationsId[xp]) === 'undefined')
            return false;
        return semlibWindow.getOpenedPanelsByXpointer(xp).length > 0;
	},

    initContextualMenu: function() {
        var self = this;

        if (self.opts.showInvalidXPointers === true) {
            cMenu.addAction({
                type: ['punditThisPageMenu'],
                name: 'showAllBrokenAnnotations',
                label: 'Show broken annotations',
                showIf: function() {
                    return self.invalidXpointers.length > 0;
                },
                onclick: function() {
                    _PUNDIT.tooltipViewer.showAllBrokenAnnotations();
                    return true;
                }
            });
        }

        cMenu.addAction({
            type: ['annotatedtextfragment'],
            name: 'openAll',
            label: 'Show all annotations on this item',
            showIf: function(item) { 
                return true;
            },
            onclick: function(item) {
                var toShow = item.value;
                // TODO: hack to support image fragment anntoations: TO REMOVE
                if (item.rdftype.indexOf(ns.fragments.image) !== -1) {
                    toShow = item.parentItemXP;
                } 
                // TODO: fix this it shuold not be necessary to hide panels but they
                //  are not positioned correctly at the moment.
                semlibWindow.closePanelByXpointer(toShow);
                self.showAllAnnotationsOnItem(toShow);
                return true;
            }
        });

        cMenu.addAction({
            type: ['annotatedtextfragment'],
            name: 'closeAll',
            label: 'Close all annotations on this item',
            showIf: function(item) { 
                return self.areAllAnnotationsOnItemOpened(item.value);
            },
            onclick: function(item) {
                _PUNDIT.ga.track('cmenu', 'click', 'close-all-annotation-on-this-item');
                semlibWindow.closePanelByXpointer(item.value);
                return true;
            }
        });
        
        // Zoom on the xpointer if it's consolidated
        cMenu.addAction({
            type: ['__all'],
            name: 'zoomItem',
            label: 'Zoom on this item',
            showIf: function(item) { 
                if (typeof(item) === 'undefined') return false;
                return self.xpointersClasses[item.value];
            },
            onclick: function(item) {
                _PUNDIT.ga.track('cmenu', 'click', 'zoom-on-this-item');
                self.zoomOnXpointer(item.value);
                return true;
            }
        });
        
        cMenu.addAction({
            type: ['bookmarkedtextfragment'],
            name: 'removeSelection',
            label: 'Remove from My Items',
            showIf: function(item){
                if (typeof semlibMyItems.getItemFromUri(item.value) !== 'undefined')
                    return true;
                else
                    return false;
            },
            onclick: function(item) {
                //semlibMyItem.removeMyItem();
                
                //DEBUG Remove item from my items and from page items
                _PUNDIT.ga.track('cmenu', 'click', 'remove-from-my-items');
                semlibMyItems.removeItemFromUri(item.value);
                self.removeTempXpointer(item.value);
                
                //tooltip_viewer.refreshAnnotations();

                tooltip_viewer.consolidate();
                return true;
            }
        });

        cMenu.addAction({
            type: ['textfragment','annotatedtextfragment'],
            name: 'AddAnnotatedItemToMyItems',
            label: 'Add to My Items',
            showIf: function(item) { 
                return !semlibMyItems.uriInItems(item.value);
            },
            onclick: function(item) {
                _PUNDIT.ga.track('cmenu', 'click', 'add-to-my-items');
                tooltip_viewer.highlightByXpointer(item.value);
                var item = semlibItems.getItemFromUri(item.value);
                if (typeof item !== 'undefined'){
                    //tripleComposer.addItemToSubject(item);
                    semlibMyItems.addItem(item, true);
                    //semlibWindow.show_pundittabmyitems();
                    semlibMyItems.show_pundittabfiltermyitemsfragment();
                }
		        return true;
            }
        });
        
        cMenu.addAction({
            type: ['annotatedtextfragment', ],
            name: 'RemoveAnnotatedItemFromMyItems',
            label: 'Remove from My Items',
            showIf: function(item) { 
                return semlibMyItems.uriInItems(item.value);
            },
            onclick: function(item) {
                _PUNDIT.ga.track('cmenu', 'click', 'remove-annotated-from-my-items');
	            semlibMyItems.removeItemFromUri(item.value);
	            tooltip_viewer.removeTempXpointer(item.value);
                // tooltip_viewer.refreshAnnotations();
                // DEBUG: not sure we can avoid the refreshAnnotations() process
                tooltip_viewer.consolidate();
	            return true;
	        }
        });
        
        cMenu.addAction({
            type: ['punditThisPageMenu'],
            name: 'TurnHighlightingOn',
            label: 'Turn Highlighting On',
            showIf: function() { 
                return self.opts.enableHighlightingMode && !self.opts.highlightingMode;
            },
            onclick: function() {
                _PUNDIT.ga.track('cmenu', 'click', 'turn-highlighting-on');
                self.opts.highlightingMode = true;
                tooltip_viewer.consolidate();
                return true;
            }
        });
        
        cMenu.addAction({
            type: ['punditThisPageMenu'],
            name: 'TurnHighlightingOff',
            label: 'Turn Highlighting Off',
            showIf: function() { 
                return self.opts.enableHighlightingMode && self.opts.highlightingMode;
            },
            onclick: function() {
                _PUNDIT.ga.track('cmenu', 'click', 'turn-highlighting-on');
                self.opts.highlightingMode = false;
                tooltip_viewer.consolidate();
                return true;
            }
        });
        
        
        // Subscribe the callbacks for the annotatedtextfragment type: 
        // show: highlight the passed xpointer
        cMenu.onTypeShow_annotatedtextfragment(function(xp) {
            self.highlightByXpointer(xp);
        });
        cMenu.onTypeHide_annotatedtextfragment(function(xp) {
            self.removeHighlightByXpointer(xp);
        });

        // Subscribe the callbacks for the bookmarkedtextfragment type: 
        // show: highlight the passed xpointer
        cMenu.onTypeShow_bookmarkedtextfragment(function(xp) {
            self.highlightByXpointer(xp);
        });
        cMenu.onTypeHide_bookmarkedtextfragment(function(xp) {
            self.removeHighlightByXpointer(xp);
        });
        
    }, // initContextualMenu()

    getAnnotationFromAnnId: function(ann_id) {
        for (var xp in this.annotations) //ok object
            if (this.annotations[xp].id === ann_id) 
                return this.annotations[xp];
    },

    showAllBrokenAnnotations: function() {
        var self = this;
        
        for (var i=self.invalidAnnIds.length; i--;) {
            var id = self.invalidAnnIds[i];
            console.log('Showing BROKEN ann '+id);
            self.showAnnotationPanel(id, null);
        }
        
    },

    showAllAnnotations: function() {
        var self = this;
        
        if (self.annIds === null || self.annIds === undefined) {
            self.log("ERROR: Annotaion panel not ready, not showing all annotations.");
            return;
        } 

        for (var i=self.annIds.length; i--;) {
            var annId = self.annIds[i];
                self.showAnnotationPanel(annId);
        }
    },
    
    removeTargetFromAnnotation: function(uri, ann_id) {
        var self = this,
            index;
        
        if ((index = self.annotations[ann_id].targets.indexOf(uri)) !== -1) 
            self.annotations[ann_id].targets.splice(index, 1);        
    },

	/**
        Determines if an annotation has targets appointed
        @method annotationHasTargets
        @description 
        @param ann_id {string} the id of the annotation to be checked
        @return true if the annotation has targets, false otherwise
    */
	annotationHasTargets: function(ann_id) {
		var self = this;
		return !(self.annotations[ann_id].targets == 0);
	},

	isNotebookActive: function(notebook_id) {
		var self = this;
		return self.notebooks[notebook_id] == 1;		
	},
	
	/**
        Creates and shows the view panel of an annotation.
        @method showAnnotationPanel
        @param ann_id {string} the id of the annotation to be visualized
        @param clickedXP {string} the xpointer correspoding to the page fragment that user selected.
    */
    showAnnotationPanel: function(ann_id, clickedXP) {
        var self = this,
            panel_id = 'dialog_'+ann_id+'_content';

        // Is the panel already there?
        if (dojo.query('#'+panel_id).length > 0) {
            self.log("Panel for annotation id "+ann_id+" is already open!");
            return;
        }

        var ann = self.annotations[ann_id],
            panel_content = '',
            panel_buttons = '',
            c = ann.content,
            m = ann.metadata,
            items = ann.items,
            notebook_url = m[ns.pundit_isIncludedIn][0].value,
            notebook_id = notebook_url.split("/")[notebook_url.split("/").length-1],
            panelXpointers = [],
            author_name,
            author_uri = m[ns.pundit_authorURI][0].value,
            annotation_date = m[ns.pundit_annotationDate][0].value,
            isBroken = false;

        self.log("Showing annotation panel for "+ann_id);

        var relXps = [];
        for (var i = m[ns.pundit_hasTarget].length; i--;) {
            if (m[ns.pundit_hasTarget][i]['value'] !== _PUNDIT.tripleComposer.getSafePageContext())
                relXps.push(m[ns.pundit_hasTarget][i]['value']);
        }

        self.log('Annotation with '+relXps.length+' targets');

        // For each collected xpointer: setup colors, classes, coords etc..
        for (i = relXps.length; i--;) {
            var uri = relXps[i];
            
            // If the target of this annotation is not consolidated, erase it from targets
            // of the annotation and dont pass it to AW .. 
            // TODO Check if the target uri is the page and handle consequently 
            if ((typeof(self.xpointersClasses[uri]) === 'undefined')) {
                self.log("ERROR: trying to show annotation panel for "+uri+" but its not consolidated on this page");
                self.removeTargetFromAnnotation(uri, ann_id);
                if (!(self.annotationHasTargets(ann_id))) {
                    // TODO: this case has to be addressed with some message to the user in future versions
                    self.log("ERROR: none of the annotation target is present in the page (ann_id: " + ann_id + ")");
                    isBroken = true;
                    // return;
                }
                continue;
            } else {
                
                var cl = self.xpointersClasses[uri].join('');

                // consolidated xpointers selected by this panel (used later on when closing)
                panelXpointers.push(uri);

                // Colors for the fragments: if this fragment hasnt been highlighted, pick
                // a new color from the stack and initialize usedColors at 1. If it's already 
                // highlighted, use this same color and just add 1 to usedColors.
                if (typeof(self.xpointersColors[uri]) === 'undefined') {
                    self.xpointersColors[uri] = self.colors.pop() || self.fallbackColor;
                    self.usedColors[self.xpointersColors[uri]] = 1;
                    self.log('Assigned color to target: '+self.xpointersColors[uri]);
                } else 
                    self.usedColors[self.xpointersColors[uri]] = self.usedColors[self.xpointersColors[uri]] + 1;

                dojo.query('span.'+cl).addClass(self.xpointersColors[uri]);
            }
        } // for i in relXps


        // TODO: ACL on the annotation? On the notebook?
        // TODO: add again the EDIT button
        if (author_uri === myPundit.user.uri) {
            panel_buttons += "<span class='pundit-gui-button delete' about='"+ann_id+"'>Delete</span>";

            if (self.opts.allowAnnotationEdit)
                panel_buttons += "<span class='pundit-gui-button edit' data-nbId='"+notebook_id+"' data-annId='"+ann_id+"'>Edit</span>";
        }


        if (_PUNDIT.config.modules['pundit.NotebookManager'].active === true && _PUNDIT.config.modules['pundit.NotebookManager'].activateFromAnnotations === true) {
            if (self.isNotebookActive(notebook_id)) {
                panel_buttons += "<span class='pundit-gui-button deactivate' about='"+notebook_id+"'>Deactivate</span>";
            } else {
                panel_buttons += "<span class='pundit-gui-button activate' about='"+notebook_id+"'>Activate</span>";
            }
        }

        if (typeof(m[ns.pundit_authorName]) !== 'undefined' && m[ns.pundit_authorName][0].value !== '') 
            author_name = m[ns.pundit_authorName][0].value;
        else 
            author_name = "User: " + author_uri.substr(author_uri.lastIndexOf('/')+1, author_uri.length);

        // Header with metadata
        panel_content += "<div class='pundit-metadata'>";
        // DEBUG: if we remove a line here, the min-height of the whole annotation box gets in the
        // way and messes it up a bit .......
        // TODO: this is the right place to insert notebook or other infos
        if (isBroken) {
            panel_content += "<span class='pundit-error-msg'>Apparently, this annotation should be shown on this page, sadly Pundit is not able to handle it properly. :(</span>";
        }
        panel_content += "<span class='author'><em>Created by</em> : "+author_name+"</span>";
        panel_content += "<span class='date'><em>On</em> : "+ annotation_date.split('T')[0] +", "+annotation_date.split('T')[1]+"</span>"
        panel_content += "<span class='author'><em>ID</em> : "+ann_id+"</span>";
        panel_content += "</div>";

        // Produce the statements html: at this stage the .content hash has a field for
        // each subject used in statements. 
        panel_content += self.getStatementsHTML(c, items);
        
        var closeFunction = (function(uris, id){
            return function() {
                // Foreach fragment uri used in this annotation, remove
                // the color class from the related span bits
                for (var i = uris.length; i--;) {
                    var cl = self.xpointersClasses[uris[i]].join(''),
                        color = self.xpointersColors[uris[i]];

                    if (self.usedColors[color] === 1) {
                        dojo.query('span.'+cl).removeClass(color);
                        delete self.xpointersColors[uris[i]];
                        if (color !== self.fallbackColor)
                            self.colors.push(color);
                    } else 
                        self.usedColors[color] = self.usedColors[color] - 1;

                }
                dojo.destroy(id);
                delete semlibWindow.panels[id];
                //semlibWindow.positionPanels();
            }
        })(panelXpointers, panel_id);

        self.log("Adding new annotation window item, with id "+panel_id);
        // When everything is ready, we can append the content to the annotation
        // window, which will position it correclty
        semlibWindow.awAdd({
            id: panel_id,
            content: panel_content,
            buttons: panel_buttons,
            xpointers: panelXpointers,
            positioningXpointer: clickedXP || panelXpointers[0],
            title: "By " + author_name + " on " + annotation_date.split("T")[0],
            onClose: closeFunction,
            isBroken: isBroken
        });

        dojo.behavior.apply();

        if (!semlibWindow.isAnnotationWindowOpen())
            semlibWindow.toggleAnnotationWindow();
        
    }, // showAnnotationPanel()

    /**
    * @method addHyperlinksToText
    * @description Searches for http urls in the text and turns them into HTML hyperlinks.
    * @param text {string} 
    * @return {string}
	*/
	// TODO: Move this function to an helper? It can be useful in different points    
	addHyperlinksToText: function(text) {
	    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i;
	    return text.replace(exp,"<a target='_blank' href='$1'>$1</a>"); 
	},
	
    // Returns the HTML rendering of the statements founds in the given
    // content json object
    getStatementsHTML: function(c, items) {
        var self = this,
            statement = '';
		    
		for (var subject in c) {
            statement += '<div class="pundit-statement"><div class="pundit-subject">';
            statement += self.getTriplePartHTML(c, items, subject);

	        self.log('Getting statement from annotation: subject :'+ subject.substr(0, 41)+'..');

            // Comments: no "more details" panel or anything
            // TODO: use a special class name and style them someway
			var comments = self.getCommentsFromTriples(c, subject);
			if (comments.length != 0) {
				statement += '<div class="pundit-predicate">';
                statement += '<span>Comments:</span>';
				statement += '<div class="pundit-object">';
                // Each comment on its own row, no more details
                for (var j = comments.length; j--;) 
					statement += '<span>'+ self.addHyperlinksToText(comments[j]) + '</span>';
				statement += '</div></div>';	
			}
                
            // Tags: no "more details" on the predicate, show the tags
            // as normal triple objects
			var tags = self.getTagsFromTriples(c, subject);
			if (tags.length != 0) {
				statement += '<div class="pundit-predicate">';
				statement += '<span>Tags:</span>';
                for (var j = tags.length; j--;) {
    				statement += '<div class="pundit-object">';
					statement += self.getTriplePartHTML(c, items, tags[j]);
    				statement += '</div>';
				}
				statement += '</div>';	
			}
            
	        for (var property in c[subject]) {
                
                // TODO: can we better handle these explicit names here?
                if (property === ns.pundit_hasComment || property === ns.pundit_hasTag) 
                    break;
                
                statement += '<div class="pundit-predicate">';
                statement += self.getTriplePartHTML(c, items, property);
                

				for (var k = c[subject][property].length - 1; k >= 0; k--) {
                    var object = c[subject][property][k];
                    statement += '<div class="pundit-object">';
                	statement += self.getTriplePartHTML(c, items, object.value, object.type);
					statement += '</div>'; // .object 
                } // for triple's objects in c[subject][property]	
				statement += '</div>'; // .predicate 
                
	        } // for property in c[subject]
			statement += '</div></div>'; // .statement .subject
            
		} // for subject in c
            
        self.log('Produced statements HTML');
        return statement;
		
    }, // getStatementsHTML()


	/* 
	Gets all the objects that are sementic tags in triples with the given subject
	*/
    getTagsFromTriples: function(triples, subject) {
		
        var	result = [];
        var chunks = triples[subject];
        for (var predicate in chunks) {
            var objects = chunks[predicate];
            for (var k = objects.length; k--;)
                if (predicate === ns.pundit_hasTag && objects[k].type === 'uri') {
                    result.push(objects[k].value);
                }
        }
		
        return result;
		
    }, // getTagsFromTriples()

	/* 
	Gets all the objects that are literal comments in triples with the given subject
	*/
    getCommentsFromTriples: function(triples, subject) {
		
        var	result = [];
        var chunks = triples[subject];
        for (var predicate in chunks) {
            var objects = chunks[predicate];
            for (var k = objects.length; k--;) {
                if (predicate === ns.pundit_hasComment && objects[k].type === 'literal') {
                    result.push(objects[k].value);
                }	
            }
        }
        return result;
		
    }, // getCommentsFromTriples()


    // This is the renderer for each part of the statement: subject, predicate, object
    // TODO: add all of the extra data parts .. found.. somewhere.
    getTriplePartHTML: function(c, items, uri, type) {
        var self = this,
            tp = '',
            label = '', classes = '', 
            content = '', extra = '', 
			comment = '', typeLabel = '', currType = '',
            currentItem = '';
        	
		self.log('TriplePartHTML for '+ uri.substr(0, 30));

        // TODO: what to do here? return a default rendered something?
        if (items === null || typeof(items) === 'undefined' || (type !== 'literal' && typeof(items[uri]) === 'undefined')) {
            self.log("No items for uri "+uri.substr(0, 30)+"... :|");
            console.log('TODO: something wrong rendering items? ', uri, type, items);
            return '<span>(ERR) '+uri.substr(0, 30)+'</span>';
        }
        
        
        currentItem = items[uri];
        // It's a literal!
        if (typeof(type) !== 'undefined' && type === 'literal') {
            
            // cut the uri if it's too long
            if (uri.indexOf('<') === -1 && uri.length > 20)
                label = uri.substr(0, 20) + "...";
            else
                label = uri;

            content = '<li><em>Datatype</em>: Literal</li>';
            extra = '<li><em>Full content</em>: '+uri+'</li>';

        // It's an item!
        } else {
            
            // Label: if the label is not set, use the last part of the uri. 
			if (typeof(currentItem[ns.rdfs_label]) !== 'undefined')
				label = currentItem[ns.rdfs_label][0].value;	
            else 
    			// FIX ME: do something better like check for last / or something
                label = uri.substr(uri.length-20, 20);	

            // Comment
			if (currentItem[ns.rdfs_comment]) 
				comment = "<li><em>Comment:</em> "+currentItem[ns.rdfs_comment][0].value+"</li>";
            
            // Is there an image?  
            if (currentItem[ns.items.image]){
                if (currentItem[ns.items.type][0].value === ns.fragments.image){
                    content += "<li><em>Image Fragment</em><div class='pundit-image-fragment-preview' style='position:relative' about='" + uri + "'><img class='pundit-image-preview-large' src='"+currentItem[ns.items.image][0].value+"' /></div></li>";
                } else {
                    content += "<li><em>Image</em><img src='"+currentItem[ns.items.image][0].value+"' / class='pundit-image-preview-large'></li>";
                }
                
            } 
                
            
            // Types
            var typeList = [];
            if (typeof(currentItem[ns.rdf_type]) !== 'undefined') {
                content += '<li><em>Types</em>: ';
                for (var i = currentItem[ns.rdf_type].length - 1; i >= 0; i--) {
                    
                    currType = currentItem[ns.rdf_type][i].value;
                    typeList.push(currType);
                    
                    // Get type label if it's there
                    if (typeof(items[currType]) !== 'undefined' && typeof(items[currType][ns.rdfs_label]) !== 'undefined')
                        typeLabel = items[currType][ns.rdfs_label][0].value;
                    else
                        typeLabel = ns.getLabelFromUri(currType);
                    
                    content += '<a class="go_to" target="_blank" href="' +currType+ '">'+typeLabel+'</a>, ';
                }
                content = content.substr(0, content.length-2);
                content += '</li>';
            }
            
            var xpointer;
            // TODO: hack for supporting image fragments. Color is the same as the color of the entire image.
            if (typeList.indexOf(ns.fragments.image) !== -1) {
                xpointer = currentItem[ns.items.parentItemXP][0].value
            } else {
                xpointer = uri;
            }

			var descriptionLabel = '';
			
			// It's a text fragment or an image in the page
			if (typeList.indexOf(ns.fragments.text) !== -1 || typeList.indexOf(ns.image) !== -1 || typeList.indexOf(ns.fragments.image) !== -1) {
				descriptionLabel = 'Full content';
				// It's in the page: show zoom
	            if (self.xpointersClasses[xpointer]) {
					extra += '<li><a href="#" class="zoom" about="'+xpointer+'"><em>Zoom on this item</em></a></li>';	

				// It's not in the page: show link to original page, using its page context
				} else {
					var pageContext = currentItem[ns.items.pageContext][0].value,
					    fragment = uri.split('#')[1];
                    var originUrl;
                    if (typeof(fragment) !== 'undefined') {
                        originUrl = pageContext + "#" + fragment;
                    } else {
                        originUrl = pageContext;
                    }   
					extra += '<li><em><a href="' + originUrl + '">Show in origin page</a></em></li>';
				}

			// It's another kind of item: show more info link	
			} else {
                descriptionLabel = 'Description';
			    extra += '<li><a href="' + uri + '" target="_blank">More info</a></li>';
			}
			
			if (_PUNDIT.config.enableSemanticExpansion) {
				//TODO: remove this very dirty hack!
				var linkForLodLive = uri;
				if (linkForLodLive.indexOf("europeana.eu") !== -1) {
					var pieces = linkForLodLive.split("/");
					linkForLodLive = "http://data.europeana.eu/item/" + pieces[pieces.length-2] + "/" + pieces[pieces.length-1];
				}
				extra += "<li><a href='"+ ns.lodLiveURL + "?" + encodeURI(linkForLodLive) +"' target='_blank'>(NEW!) Explore in LodLive</a></li>";	
			}
            
            // Description: if it's an image, dont show the full content
            if (currentItem[ns.items.description] && typeList.indexOf(ns.image) === -1) 
                content += "<li><em>" + descriptionLabel + "</em>: " + currentItem[ns.items.description][0].value + "</li>";
			
		} // if type !== literal
        
		classes = self.xpointersColors[xpointer] || '';

        tp += '<span class="pundit-moreinfo '+classes+'">'+label+'</span>';
        tp += '<span class="pundit-moreinfo-subpanel pundit-hidden"><ul>';
        tp += comment + content + extra;
        tp += '</ul></span>';
		return tp;
        
    }, // getTriplePartHTML()

    // Adds the content of an annotation: subject - predicate - object
    addAnnotationContent: function(ann_id, content) {
        var self = this;
        
        self.annotations[ann_id].content = content;
        self.log("Added content to annotation "+ann_id);

    }, // addAnnotationContent()
    
    // Gets data about items used in annotation with given id. 
    // DEBUG: WTF? Must be called when we have the triples so we
    // cant spare/delay any call.. :|
    addAnnotationItems: function(ann_id, items) {
        var self = this,
            c = self.annotations[ann_id].content;

        self.annotations[ann_id].items = items;
        for (var subject in c) {
            self.log('Adding SUBJECT item: '+ subject.substr(0, 41)+'..');
            self.extractItemFromAnnContent(subject, items);

            for (var predicate in c[subject]) {
                // self.log('Adding PREDICATE item: ('+subject.substr(0,20)+') :'+ predicate.substr(0, 41)+'..');
                
                for (var k = c[subject][predicate].length - 1; k >= 0; k--) {

                    var object = c[subject][predicate][k];
                    if (object.type === 'literal') {
                        // FIXME: literal items are not to be created at all!!
                        // self.extractLiteralItem(object.value);
                    } else 
                        self.extractItemFromAnnContent(object.value, items);

                } // for k
            } // for predicate
        } // for subject

    }, // addAnnotationItems()

    // FIXME: not used !
    /*
    extractLiteralItem: function(value) {
        var self = this,
            item = semlibLiterals.createLiteralItem(value);
            
        semlibItems.addItem(item);
        self.log('Created LITERAL item for '+value.substr(0, 30)+'..');
    },
    */

    extractItemFromAnnContent: function(uri, it) {
        var self = this,
            item = {value: uri};

        self.log('Extracting item from content: '+uri.substr(0,40));

        if (typeof(it) === 'undefined' || it === null) {
            self.log('No items to extract from.')
            return;
        }
        
        if (typeof(it[uri]) === 'undefined') {
            self.log("Cant extract item for this uri!!");
            console.log('TODO: Error? Literallone?', it, uri);
            return;
        }

        // Add each field declared in ns.items
        // DEBUG TODO: they could be arrays? 
        for (var field in ns.items) {
            var fieldUri = ns.items[field];
            if (typeof(it[uri][fieldUri]) !== 'undefined') {
                if (field === 'selector') {
                    var selector = it[uri][fieldUri][0].value;
                    var selectorValue = it[selector][ns.rdf_value][0].value;
                    if (typeof(item['selectors']) === 'undefined') {
                        item['selectors'] = [];
                    }
                    item['selectors'].push(dojo.fromJson(selectorValue))
                } else {
                   item[field] = it[uri][fieldUri][0].value;
                }
            }
                
        }

        // Add every type
        item['rdftype'] = [];
        for (var i=it[uri][ns.items.type].length; i--;) 
            item['rdftype'].push(it[uri][ns.items.type][i].value);
        

        // It is a text fragment
        // TODO: check every type, not just the first
        if (it[uri][ns.items.type][0].value ===  ns.fragments.text) {

            // Overwrite type, add other stuff
            item['type'] = ['subject'];

            // Create the needed bucket and init the preview for this item
            item.rdfData = semlibItems.createBucketForTextFragment(item).bucket;
            previewer.buildPreviewForItem(item);
                        
            semlibItems.addItem(item);
            self.log('Created and added a TEXT item '+item.value.substr(0, 30)+'..');
            return;
        } // if type == ns.fragments.text
        
        
        // TODO: x marco siam sicuri che e' sempre il primo tipo? 
        // It is an item coming from a vocabulary
        if (it[uri][ns.items.type][0].value ===  ns.rdfs_resource) {
            item['type'] = ['subject']; 

            // Create the needed bucket and init the preview for this item
            item.rdfData = semlibItems.createBucketForVocabItem(item).bucket;
            previewer.buildPreviewForItem(item);
            semlibItems.addItem(item);
            self.log('Created and added VOCAB item '+item.value.substr(0, 30)+'..');
            return;
        }
        
        // default fallback: assuming it's a proper item, use createBucketForItem
        // and  hope for the best
        self.log('Assuming proper item for '+item.value.substr(0, 30)+'..');
        
        item['type'] = ['subject']; 
        item.rdfData = semlibItems.createBucketForItem(item).bucket;
        previewer.buildPreviewForItem(item);
        semlibItems.addItem(item);
        self.log('Created and added DEFAULT item '+item.value.substr(0, 30)+'..');    
            
    }, // extractItemFromAnnContent()

    refreshAnnotations: function() {
        var self = this;
        
        self.log("Refresing annotations");
        
        self.isRefreshingAnnotations = true;

        self.backup = {
            usedColors: self.usedColors,
            colors: self.colors,
            xpointersColors: self.xpointersColors
        };

        self.wipe();
        self.contentURIs = self.helper.getContentURIs();
        self.reader.getAnnotationMetadataFromUri(self.contentURIs);
    },

    wipe: function() {
        var self = this;

        // self.wipeConsolidatedAnnotations();

        // List of xpointers of selected fragment that are not part of annotations.
        // Dont wipe it if there's something in it
        self.tempXpointers = self.tempXpointers || [];

        // List of xpointers that are in annotations
        self.annXpointers = [];
        
        // List of consolidated xpointers
        self.xpointers = [];
        
        // Not consolidated ones
        self.invalidXpointers = [];
        self.invalidAnnIds = [];
        
        // TODO: merge all of these in a single object maybe even into the .xpointers field ..
        self.xpointersClasses = {};
        self.xpointersColors = {};
        self.xpointersAnnotationsId = {};

        // DEBUG: why do we need this? :|
        // self.xpointersContent = {};

        self.xpaths = [];
        self.annotations = {};
        self.contentURIs = [];

        // TODO: create more classes in the css or find a clever solution to make them
        // dinamically starting from rgb color values
        self.colors = ['col1', 'col2', 'col3', 'col4', 'col5', 'col6', 'col7', 'col9', 'col10', 'col11', 'col12', 'col13', 'col14', 'col15', 'col16', 'col17', 'col18', 'col19', 'col20', 'col21', 'col22', 'col23', 'col24', 'col25'];
        self.usedColors = {};
        self.fallbackColor = ['col1'];
    },

    consolidate: function() {
        var self = this,
            foo; 
        
	    // RE-ADDED by Christian...does it sounds good?	
	    self.wipeConsolidatedAnnotations();

        for (var i = self.annXpointers.length; i--;)    
            self.xpointers.push(self.annXpointers[i]);
        
        //DEBUG could this create duplicates???
        for (var k = self.tempXpointers.length; k--;)
            self.xpointers.push(self.tempXpointers[k]);
        
        // Set valid xpointers and split them into xpaths
        foo = self.helper.getXPathsFromXPointers(self.xpointers);
        self.xpointers = foo.xpointers;
        self.xpaths = foo.xpaths;
        self.invalidXpointers = foo.invalidXpointers;
        
        for (var i = self.xpointers.length; i--;) {
            var uri = self.xpointers[i];
            self.xpointersClasses[uri] = ['consxp'+i];
        }

        // Sort the xpaths
        self.sortedXpaths = self.helper.splitAndSortXPaths(self.xpaths);

        // Match the given classes to the newly created xpointers
        self.htmlClasses = self.helper.getClassesForNewXpointers(self.xpointers, self.sortedXpaths, self.xpaths, self.xpointersClasses);

        // Finally update the DOM with the new xpointers and classes
        self.helper.updateDOM(self.sortedXpaths, self.htmlClasses);

        for (xp in self.xpointersClasses) {
            var cl = self.xpointersClasses[xp].join(''),
                spans = dojo.query('.'+cl),
                n = spans.length-1,
                id = 'icon_'+cl,
                content = '';
            
            if (n<0)
                continue

            /*
            
            // DEBUG: why are we doing this? :|
            
            // Grasp the content using dojo's html() function on every
            // consolidated element with that class
            spans.forEach(function(s) {
                content += self.helper.extractContentFromNode(s);
            });
            self.xpointersContent[xp] = content;
            self.log("Content extracted from xpointer: "+ content);
            */
            
            self.log("Adding RDF icon for "+id);
            if (self.isAnnXpointer(xp))
                dojo.place('<a class="pundit-icon-annotation" id="'+id+'"></a>', spans[n], 'after');
            else if (self.isTempXpointer(xp))
                dojo.place('<a class="pundit-icon-annotation selected_fragment_icon" id="'+id+'"></a>', spans[n], 'after');

            // Mouse enter on the RDF icon
            dojo.connect(dojo.byId(id), 'onmouseenter', (function(_c, _x) { 
                return function (e) {
                    self.highlightByXpointer(_x);
                    if (self.isAnnXpointer(_x))
                        self.fireOnAnnotationIconMouseEnter(_x);
                };
            })(cl, xp));
            
            // Mouse leave from the RDF icon
            dojo.connect(dojo.byId(id), 'onmouseleave', (function(_c, _x) { 
                return function () {
                    self.removeHighlightByXpointer(_x)
                    if (self.isAnnXpointer(_x))
                        self.fireOnAnnotationIconMouseLeave(_x);
                };
            })(cl, xp));
            
            // Mouse click on the RDF icon
            dojo.connect(dojo.byId(id), 'onclick', (function(_c, _x) {
                return function (e) {

                    _PUNDIT.ga.track('gui-button', 'click', 'rdf-icon');

                    // If the annotation window is open, it might be the case where
                    // another fragment own an annotation in which this fragment is involved.
                    // This line recalls the annotation near the clicked fragment
                    if (semlibWindow.isAnnotationWindowOpen()) {
                        var panels = semlibWindow.getOpenedPanelsByXpointer(_x);
                        for (var j=panels.length; j--;) 
                            semlibWindow.setPositioningXpointer(panels[j].id, _x);
                    }
	
                    e.preventDefault();
                    self.fireOnAnnotationIconMouseClick(_x);
                    
                    var item = _PUNDIT['items'].getItemByUri(_x);
                    
                    // TODO: hack to show annotations of image fragments: TO BE REMOVED!
                    if (typeof(item) === 'undefined') {

                        // get the element corresponding to the XPointer
                        var helper = new pundit.XpointersHelper();
                        var xpath = helper.getXPathsFromXPointers([_x]).xpaths[_x].startxpath;
                        var el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

                        //look into the element for images
                        var imgsInEl = dojo.query('img', el);
                        // var imgsInEl = dojo.query(el).children().children('img');
                        for (var imgsi=0; imgsi<imgsInEl.length; imgsi++) {
                            var imgUrl = imgsInEl[imgsi].src;
                            item = _PUNDIT['items'].getItemsFromParentItem(imgUrl)[0];
                        }
                    }
                    
                    // Handle different classes
                    if (self.isAnnXpointer(_x))
                        cMenu.show(e.pageX - window.pageXOffset, e.pageY - window.pageYOffset, item, 'annotatedtextfragment');
                    else if (self.isTempXpointer(_x))
                        cMenu.show(e.pageX - window.pageXOffset, e.pageY - window.pageYOffset, item, 'bookmarkedtextfragment');

                    // Prevent default delegation if the RDF icon is inside a
                    // link or something active
                    dojo.stopEvent(e);
                    return false;
                };
            })(cl, xp));

        } // for i in xpointersClasses

        self.log("DOM is consolidated.");

        // restore the backup! yay
        if (typeof(self.backup.xpointersColors) !== 'undefined') {
            self.xpointersColors = self.backup.xpointersColors;
            self.colors = self.backup.colors;
            self.usedColors = self.backup.usedColors;
        }

        for (var xp in self.xpointersColors) {
            var cl = self.xpointersClasses[xp].join('');
            dojo.query('span.'+cl).addClass(self.xpointersColors[xp]);
        }
        
        if (self.opts.highlightingMode){
            self.highlightAll();
        }
        
        self.fireOnConsolidate();

        if (self.opts.showInvalidXPointers === true) {
            console.log('-----------------------------------------------')
            console.log('BROKEN ANNOTATIONS FOR '+self.invalidXpointers.length+' XPOINTERS');
            self.invalidAnnIds = [];
            for (var i=self.invalidXpointers.length; i--;) {
                var xp = self.invalidXpointers[i],
                    anns = self.xpointersAnnotationsId[xp];
                for (var j in anns) {
                    var id = anns[j],
                        meta = self.annotations[id].metadata,
                        author = meta[_PUNDIT.ns.pundit_authorName][0].value,
                        date = meta[_PUNDIT.ns.pundit_annotationDate][0].value,
                        nb = meta[_PUNDIT.ns.pundit_isIncludedIn][0].value.substr(41, 8),
                        label = 'No content retrieved';
                    try {
                        label = self.annotations[id].items[xp][_PUNDIT.ns.items.label][0].value;
                    } catch(e) {}
                    console.log('BROKEN ANN '+id+' ('+author+', '+date+', nb '+nb+'): '+label);
                    self.invalidAnnIds.push(id);
                }
            }
        }
        
        
        self.log("Consolidate() is done.")
    }, // consolidate()
    
    showAnnotationOnLoad: function() {
        var self = this;
                
        if (self._onLoadAnnotationShown)
            return;
        
        self.queryObject = _PUNDIT.tripleComposer.getQueryParametersObject();
        if ('pundit-show' in self.queryObject) {
            try {
                var id = self.queryObject['pundit-show'],
                    xp = self.annotations[id].targets[0];
                self.showAnnotationPanel(id);
                setTimeout(function() { self.zoomOnXpointer(xp); }, 1000);
            } catch (e) {
                console.log('Error trying to show an annotation on load.')
            }
        }

        self._onLoadAnnotationShown = true;
        
    },

    highlightByXpointer: function(xp) {
        var self = this;
        
        if (xp in self.xpointersClasses) {
            if (typeof(self.hideTimer[xp]) !== 'undefined')
                clearTimeout(self.hideTimer[xp]);
            else
                self.hideTimer[xp] = null;

            // Keep a counter of how many times they asked for this xpointer
            // to be highlighted. If multiple components asked for it, multiple
            // components shall ask to remove it, later
            if (typeof(self.highlightCount[xp]) === 'undefined')
                self.highlightCount[xp] = 0;
            self.highlightCount[xp]++;
            
            dojo.query('span.'+self.xpointersClasses[xp].join('')).addClass('active');
        }
    }, // highlightByXpointer()
    
    removeHighlightByXpointer: function(xp) {
        var self = this;
        
        
        if (xp in this.xpointersClasses) {

            // If the number of components highlighting the fragment is 0, we can
            // remove the highglight
            self.highlightCount[xp]--;
            if (self.highlightCount[xp] > 0) return;
            
            clearTimeout(self.hideTimer[xp]);
            self.hideTimer[xp] = setTimeout(function() { 
                if (self.xpointersClasses[xp] && !self.highlightingMode)
                    dojo.query('span.'+self.xpointersClasses[xp].join('')).removeClass('active'); 
            }, self.opts.hideMouseLeaveMS);
        }
    }, // removeHighlightByXpointer()
    
    highlightAll:function(){
        dojo.query('.cons').forEach(function(item){
            dojo.addClass(item, 'active');
        });
    },

    hideZoom: function() {
        dojo.destroy('pundit-zoomed-fragment');
    },

    zoomOnXpointer: function(xp) {
	    
        if (typeof(this.xpointersClasses[xp]) === 'undefined')
            return;
	    
        var self = this,
            cl = self.xpointersClasses[xp].join(' '),
            top = Infinity, left = Infinity, 
            bottom = -Infinity, right = -Infinity, y = Infinity,
            border = 5, st;

        self.log('Zooming on class '+cl);
		
        dojo.query('.cons.'+cl+', .cons.'+cl+' img').forEach(function(item) {
            var c = dojo.position(item, true);
            top = Math.min(top, c.y);
            left = Math.min(left, c.x);
            bottom = Math.max(bottom, c.y+c.h);
            right = Math.max(right, c.x+c.w);
            y = Math.min(y, c.y);
        });

        if (dojo.query('#pundit-zoomed-fragment').length > 0)
            dojo.destroy('pundit-zoomed-fragment');

        dojo.query('body').append('<div id="pundit-zoomed-fragment"><span class="pundit-icon-close"></span></div>');
        dojo.behavior.apply();

        st = {
            position: 'absolute',
            left: (left - border-1) +'px',
            top: (top - border-1) +'px',
            height: (bottom - top + 2*border)+'px',
            width: (right - left + 2*border)+'px'
        };
        dojo.style('pundit-zoomed-fragment', st);

        //setTimeout(function() { 
            dojo.toggleClass('pundit-zoomed-fragment', 'pundit-shown');
        //}, 20);
        
        var bodyTop = dojo.query('body')[0].scrollTop;
        if ((y - bodyTop < dojo.position('pundit-gui', true).h) || (y - bodyTop + dojo.position('pundit-zoomed-fragment', true).h > window.innerHeight)) 
            dojox.fx.smoothScroll({
                node : dojo.query('#pundit-zoomed-fragment')[0],
                offset: {x: 0, y: dojo.position('pundit-gui', true).h + 100},
                win: window,
                duration: 800
            }).play();
        

    }, // zoomOnXpointer()

	
    wipeConsolidatedAnnotations: function () {
        var self = this;
        dojo.query('.pundit-icon-annotation, .selected_fragment_icon').forEach(function(node) {
            dojo.destroy(node);
        });
		
        self.unwrap('cons');
        // TODO: instead of body, we can look for a common ancestor
        // to do less merging
        self.helper.mergeTextNodes(dojo.query('body')[0]);
        self.log("Wiped all consolidated annotations");
    }, // wipeConsolidatedAnnotations()
	
    unwrap: function(c){
        var nodes = dojo.query('.'+c);
        for (var i = nodes.length; i--;) {
            var parent = dojo.query(nodes[i]).parent()[0];
            while (nodes[i].firstChild) 
                parent.insertBefore(nodes[i].firstChild, nodes[i]);
            dojo.destroy(nodes[i]);
        }
    }, // unwrap()
	
    initBehaviors : function() {
        var self = this;
        dojo.behavior.add({
            // Show more info on sub/pred/ob in the annotation panel
            'div.pundit-statement span.pundit-moreinfo': {
                'onclick': function(e) {
                    dojo.toggleClass(dojo.query(e.currentTarget).next()[0], 'pundit-hidden');
                    e.preventDefault();
                    
                    var node = dojo.query(e.target).next().children().children().children('.pundit-image-fragment-preview');
                    if (node.length > 0 && dojo.query(node).children('.kineticjs-content').length === 0){
                        var fragmentUri = dojo.attr(dojo.query(node)[0], 'about');
                        //var node = dojo.query('div.pundit-image-fragment-preview[about=' + fragmentUri +'] img')[0]
                        var style = dojo.style(dojo.query(node).children('img')[0]),
                        w = style.width.replace('px',''),
                        h = style.height.replace('px',''),
                        item = _PUNDIT['items'].getItemByUri(fragmentUri);
            
                        var s = new Kinetic.Stage({
                            container: dojo.query(e.target).next().children().children().children('.pundit-image-fragment-preview')[0],
                            width: w,
                            height: h
                        });
                        dojo.style(s.getContent(),{
                            left: style.marginLeft,
                            top: style.marginTop,
                            position: 'absolute'
                        });
                        var l = new Kinetic.Layer();
                        s.add(l);
                        for (var i = item.selectors.length; i--;){
                            var points = [];
                            //points = item.selectors[0].points;
                            if (item.selectors[i].type === 'polygon'){
                                for (var j = item.selectors[i].points.length; j--;){
                                    points.push({
                                        x : item.selectors[i].points[j].x * parseInt(w),
                                        y : item.selectors[i].points[j].y * parseInt(h)
                                    });
                                }
                                
                                var p = [];
                                for (var k = points.length; k--;){
                                    p = p.concat([points[k].x, points[k].y]);
                                }
                                p = p.concat([points[0].x, points[0].y]);
                                var poly = new Kinetic.Polygon({
                                    points: p,
                                    fill: '#00D2FF',
                                    stroke: 'black',
                                    strokeWidth: 2,
                                    opacity: 0.3
                                });
                                l.add(poly);
                                s.draw();
                            }    
                        }
                        
            
                    }
                    
                    
                    semlibWindow.positionPanels();
                }
            },
            'div.pundit-statement a.zoom': {
                'click': function(e) { 
                    var xp = dojo.attr(e.currentTarget, 'about'),
                    panel = dojo.query(e.currentTarget).parents('.pundit-aw-panel')[0];
                    self.zoomOnXpointer(xp);
                    semlibWindow.setPositioningXpointer(dojo.attr(panel, 'id'), xp);
                    e.preventDefault(); 
                },
                'onmouseover': function(e) {
                    self.highlightByXpointer(dojo.attr(e.currentTarget, 'about'));
                },
                'onmouseout': function(e) {
                    self.removeHighlightByXpointer(dojo.attr(e.currentTarget, 'about'))
                }
            },
            '#pundit-tc-reset-button': {
                'click': function() {
                    _PUNDIT.ga.track('gui-button', 'click', 'pundit-tc-edit-reset');
                    tripleComposer.clearDnDTriples();
                    dojo.query('#pundit-tc-container').removeClass("pundit-edit-mode");
                    _PUNDIT.tripleComposer.isEditing = false;
                }
            },
            'div.pundit-aw-panel-buttons span.edit': {
                'click': function(e) {
                    _PUNDIT.ga.track('gui-button', 'click', 'pundit-tc-edit');
                    var annId = dojo.attr(e.currentTarget, 'data-annId'),
                        nbId = dojo.attr(e.currentTarget, 'data-nbId');
                    self.editAnnotation(nbId, annId);
                }
            },
            'div.pundit-aw-panel-buttons span.activate': {
                'click': function(e) {
                    var notebook_id = dojo.attr(e.currentTarget, 'about');
                    self.writer.setNotebookActive(notebook_id, "1");
                }
            },
            'div.pundit-aw-panel-buttons span.deactivate': {
                'click': function(e) {
                    var notebook_id = dojo.attr(e.currentTarget, 'about');
                    self.writer.setNotebookActive(notebook_id, "0");
                }
            },
            'div.pundit-aw-panel-buttons span.delete': {
                'click': function(e) {
                    _PUNDIT.ga.track('gui-button', 'click', 'pundit-tc-delete');
                    var ann_id = dojo.attr(e.currentTarget, 'about'),
                        deleteJobId = _PUNDIT.loadingBox.addJob('Deleting annotation ');

                    dojo.query('#dialog_'+ann_id+'_content').addClass('pundit-panel-loading');
                    dojo.query('#dialog_'+ann_id+'_content .pundit-gui-button.delete').style('display', 'none');
                    self.refreshPageItems = true;
                    self.writer.deleteAnnotation(ann_id, function() {
                        // TODO: how to intercept errors? 
                        // TODO: on error, hide loading, show delete button again
                        
                        // On succesful delete: close the panel, refresh
                        // annotations
                        // Don't close it (it fire a repositioning panel. Destroy it
                        semlibWindow.destroyPanelById(ann_id);
                        
                        self.refreshAnnotations();
                        _PUNDIT.loadingBox.setJobOk(deleteJobId);
                    });
                }
            },
            'div#pundit-zoomed-fragment span.pundit-icon-close': {
                'click': function(e) {
                    self.hideZoom();
                }
            }
        });
        
    }, // initBehaviours()

    editAnnotation: function(nbId, annId) {
        var self = this,
            ann = self.annotations[annId].content,
            triples = 0;
        
        self.log('Editing annotation '+annId+' from notebook '+nbId);

        _PUNDIT.tripleComposer.isEditing = annId;

        dojo.query('#pundit-tc-edit-msg')[0].innerHTML = "Editing annotation "+annId;
        dojo.query('#pundit-tc-container').addClass("pundit-edit-mode");
        
        tripleComposer.clearDnDTriples();
    
        for (var sUri in ann) {
            for (var pUri in ann[sUri]) {
                for (var oUri in ann[sUri][pUri]) {
                    var ob = ann[sUri][pUri][oUri],
                        s = semlibItems.getItemFromUri(sUri), 
                        p = semlibItems.getItemFromUri(pUri), 
                        o;
                    
                    if (ob.type === "uri") {
                        o = semlibItems.getItemFromUri(ob.value);
                    } else {
                        o = semlibLiterals.createLiteralItem(ob.value);
                    }
                    
                    triples++;
                    
                    if (tripleComposer.getNumberOfTriples() !== triples)
                        tripleComposer.addDnDTriple();

                    tripleComposer.addItemToSubject(s);
                    tripleComposer.addItemToPredicate(p);
                    tripleComposer.addItemToObject(o);
                    
                }
            }
        }
        
        if (!_PUNDIT.GUI.isWindowOpen())
            _PUNDIT.GUI.toggleWindow();
        
    }, // editAnnotation()

    addAnnotations: function(graph) {
        var self = this,
            nAnn = 0, 
            nXps = 0, 
            annIds = [];

        self.log('Adding annotations from raw graph......')
        
        // Empty annXpointer and ids
        self.annXpointers = [];
        self.annIds = [];
        

        for (var ann_uri in graph) {
            
            var a = graph[ann_uri],
                ann_targets, ann_id, 
                isAnn = false;

            // Check the type of each received object: if the type is not annotation
            // raise an error and discard it.
            // DEBUG: is this enough or do we need a better check?
            for (var t = a[ns.rdf_type].length; t--;) 
                if (a[ns.rdf_type][t].value === ns.annotation)
                    isAnn = true;
            
            if (!isAnn) {
                self.log('ERROR: invalid annotation from /search query! .. discarded.');
                continue;
            }
            
            //DEBUG Just in case no target in the annotation.
            ann_targets = a[ns.pundit_hasTarget] || [];
            ann_id = a[ns.pundit_annotationId][0].value;

            var notebook_url = a[ns.pundit_isIncludedIn][0].value;
            var notebook_id = notebook_url.split("/")[notebook_url.split("/").length - 1];

            self.notebooks[notebook_id] = null;

            self.log('Adding annotation '+ann_id+' with '+ann_targets.length+' targets');
            
            // TODO DEBUG: in this cycle annotations without xpointers get lost :(
            if (ann_targets.length === 0){
                self.annIds.push(ann_id);
                a[ns.pundit_hasTarget] = []; 
                self.annotations[ann_id] = {
                    targets: [],//whose the target? the page?
                    metadata: a, 
                    id: ann_id
                };
            } else {
                for (var i = ann_targets.length; i--;) {
                    // val is an xpointer
                    var val = ann_targets[i].value;
                
                    if (val.match(/#xpointer\(start-point\(string-range\(/)) {
                    
                        if (dojo.indexOf(self.annIds, ann_id) === -1)
                            self.annIds.push(ann_id);
                    
                        // Save the xpointer and the annotation
                        self.xpointers.push(val);
                        self.annXpointers.push(val);

                        if (ann_id in self.annotations)
                            self.annotations[ann_id].targets.push(val);
                        else self.annotations[ann_id] = {
                            targets: [val],
                            metadata: a, 
                            id: ann_id
                        };
                    
                        // Finally the xpointer > annotation_id relation
                        if (typeof(self.xpointersAnnotationsId[val]) === 'undefined')
                            self.xpointersAnnotationsId[val] = [ann_id];
                        else
                            self.xpointersAnnotationsId[val].push(ann_id);
                    
                    } else if (val === _PUNDIT.tripleComposer.getSafePageContext()){
                        //If the target of the annotation is the page than attach the annotation to 
                        //a virtual node on top of the page so that the annotation appear as first  
                        if (dojo.indexOf(self.annIds, ann_id) === -1)
                            self.annIds.push(ann_id);
                        
                        if (ann_id in self.annotations){
                            
                        }
                        else self.annotations[ann_id] = {
                            targets: [],
                            metadata: a, 
                            id: ann_id
                        };
                    } else {
                        self.log('Ops, annotation target is not an xpointer?');
                        // DEBUG TODO: full-page annotations? Other kind of targets?
                    }
                } // for i in ann_targets
            }
            
        } // for ann_uri in graph
        
        
        self.annToDownload = self.annIds.length;
        if (self.annToDownload === 0) {
            _PUNDIT.loadingBox.setJobOk(self.jobId);
            self.jobId = null;
            self.log('No annotations added: nothing to display on this page.');
            self.isRefreshingAnnotations = false;
        } else {
            self.log('Added '+self.annToDownload+' annotations ready to be downloaded');
            for (var i = self.annIds.length; i--;) 
                self.reader.getAnnotationContentFromId(self.annIds[i]);
        }

    }, // addAnnotations
    
    isAnnXpointer: function(xp) {
        for (var i = this.annXpointers.length; i--;){
            if (xp === this.annXpointers[i])
                return true;
        }
        return false;
    },
    
    isTempXpointer:function(xp) {
        for (var i = this.tempXpointers.length; i--;){
            if (xp === this.tempXpointers[i])
                return true;
        }
        return false;
    },
    
	resetTempXpointers: function() {
		this.tempXpointers = [];
	},

    // TODO: removeTempXpointer must remove the xpointer from self.xpointers as well .. !
    removeTempXpointer: function(xp){
        for (var i = this.tempXpointers.length; i--;){
            if (xp === this.tempXpointers[i]){
                if (typeof semlibMyItems.getItemFromUri(xp) === 'undefined')
                    this.tempXpointers.splice(i,1);
            }
        }
        for (var i = this.xpointers.length; i--;){
            if (xp === this.xpointers[i]){
                this.xpointers.splice(i,1);
            }
        }
        //Remove Class if the xp is not a page item
        if (typeof semlibMyItems.getItemFromUri(xp) === 'undefined')
            delete tooltip_viewer.xpointersClasses[xp];
    }
    
});