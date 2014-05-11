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
*/dojo.provide("pundit.GUI");
dojo.declare("pundit.GUI", pundit.BaseComponent, {
    
    opts: {
        positionPanelsTimerMS: 150,
        topbarHeight: 25,
        initialWindowHeight: 200,
        collapsedWindowHeight: 0,
        minWindowHeight: 130,
        maxWindowHeight: 500
    },

    constructor: function(options){
        var self = this;
        self.createCallback(['windowResize','windowClose','windowAnnotationResize','resizeEnd']);                
        // Indexed by panel id
        self.panels = {};
        self.positionPanelsTimer = null;
        self.resizeEndTimer = null;
        self._currentWindowHeight = 0;
        
        self.initWindow();
        self.initBehaviors();

        // Resize and position the windows right away, before the init
        // is done, just to keep things ordered if user doesnt log in
        self.resizeSemlibWindow(self.opts.initialWindowHeight);
        //DEBUG Show was called twice here and in onInitDone. 
        self.show();

        // Resize and show again the windows when the init is done, and
        // every component added its own parts to the windows
        _PUNDIT.init.onInitDone(function() {
            self.resizeSemlibWindow(self.opts.initialWindowHeight);
            self.show();
            //self.fixFixedNodeTopPosition(self.opts.collapsedWindowHeight + self.opts.topbarHeight);
            
            // TODO: AVOID a million places where we resize body, create a clean
            // function and just put everything there! This is a messssssssss
            if (_PUNDIT.myPundit.logged === true) {
                dojo.query('#pundit-gui-topbar').addClass('pundit-logged-in').removeClass('pundit-logged-off');
            }
            // self.show();
            semlibMyItems.onMyItemAdded(function(newItems){
                self.updateNewMyItems(newItems);
            })
        });
        
        _PUNDIT.requester.onLogin(function(data) {
            self.show();
            dojo.query('#pundit-gui-topbar').addClass('pundit-logged-in').removeClass('pundit-logged-off');
        });

        _PUNDIT.requester.onLogout(function(data) {
            dojo.query('#pundit-gui-topbar').addClass('pundit-logged-off').removeClass('pundit-logged-in');
        });
        
        self.log("GUI up and running!");
    },

    initWindow: function() {
        
        var self = this, sw, aw;
        sw = '<div id="pundit-gui-topbar" class="pundit-base pundit-logged-off pundit-disable-annotation">';
        sw +=   '<span id="pundit-gui-topbar-title">Pundit</span>';
        sw +=   '<span class="pundit-gui-button" id="pundit-aw-expander"><span class="pundit-annotations-expand-icon"></span></span>';
        sw +=   '<span class="pundit-gui-button" id="pundit-gui-expander"><span class="pundit-window-expand-icon"></span></span>';
        sw += '</div>';

        sw += '<div id="pundit-gui" class="pundit-base tundra startup pundit-disable-annotation pundit-stop-wheel-propagation"">';
        sw +=   '<div id="pundit-gui-resize-handler"></div>';

        sw +=   '<ul id="pundit-gui-panel-container" class="pundit-horizontal-list">';
        sw +=      '<li id="pundit-gui-left" class="pundit-stop-wheel-propagation"><div id="pundit-gui-preview" class="pundit-moreinfo-panel"></div></li>';
        sw +=       '<li id="pundit-gui-center"></li>';
        sw +=   '   <li id="pundit-gui-right"></li>';
        sw +=   '</ul>';
        sw +=   '<ul id="pundit-gui-footer" class="pundit-horizontal-list">';
        sw +=       '<li id="pundit-gui-footer-left"></li>';
        sw +=       '<li id="pundit-gui-footer-center">';
        sw +=           '<span class="pundit-gui-button" id="pundit-tab-vocabs">Vocabulary</span>';
        sw +=           '<span class="pundit-gui-button" id="pundit-tab-page-items"><span id="pundit-page-items-number" class="pundit-items-number">0</span>Page Items</span>';
        sw +=           '<span class="pundit-gui-button pundit-selected" id="pundit-tab-my-items"><span id="pundit-my-items-number" class="pundit-items-number">0</span> My Items</span>';
        sw +=       '</li>';
        sw +=       '<li id="pundit-gui-footer-right">'
        sw +=           '<span class="pundit-gui-button pundit-selected" id="pundit-tab-tc">Triple Composer</span>';
        sw +=       '</li>';
        sw +=   '</ul>'; // pundit-gui-footer

        sw += '</div>'; // pundit-gui
        
        dojo.query('body').append(sw);


        aw = '<div id="pundit-aw" class="pundit-base startup pundit-disable-annotation" >';
        aw += '<div class="pundit-shown-content"></div>';
        aw += '</div>';

        dojo.query('body').append(aw);
        
        self.resizeAnnotationWindow();
        
    }, // initWindow

    // Show both pundit and annotation windows, both collapsed
    show: function() {
        var self = this;

        dojo.addClass('pundit-gui', 'pundit-hidden'); 
        dojo.removeClass('pundit-gui', 'startup');
        dojo.query('body').addClass('pundit-gui-hidden');

        dojo.addClass('pundit-aw', 'pundit-hidden'); 
        dojo.removeClass('pundit-aw', 'startup');
        dojo.query('body').addClass('pundit-aw-hidden');
        
        dojo.style('pundit-gui', 'height', self.opts.collapsedWindowHeight + 'px');
        dojo.query('body').style({
            'marginTop': self.opts.collapsedWindowHeight + self.opts.topbarHeight + 'px',
            'background-position-y': self.opts.collapsedWindowHeight + self.opts.topbarHeight + 'px'
        })

        //self.fixFixedNodeTopPosition(self.opts.collapsedWindowHeight + self.opts.topbarHeight);

        dojo.query('#pundit-aw').style('marginTop',  self.opts.collapsedWindowHeight + self.opts.topbarHeight + 1 + 'px');

        setTimeout(function() { self.resizeAnnotationWindow(); }, 500);
    },

    // Hide both top and annotation windows
    hide: function() {
        dojo.removeClass('pundit-gui', 'pundit-hidden pundit-shown'); 
        dojo.addClass('pundit-gui', 'startup');
        dojo.query('body').removeClass('pundit-gui-hidden pundit-gui-shown');

        dojo.removeClass('pundit-aw', 'pundit-hidden pundit-shown'); 
        dojo.addClass('pundit-aw', 'startup');
        dojo.query('body').removeClass('pundit-aw-hidden pundit-aw-shown');
    },

    initBehaviors: function() {
        var self = this;
        
        // On consolidate, reposition panels. Set this behavior after
        // the whole pundit has been initialized
        _PUNDIT.init.onInitDone(function() {
            tooltip_viewer.onConsolidate(function() {
                self.positionPanels();
            });
            
            dojo.connect(dojo.byId('pundit-mypundit-myitems-button'), 'onclick', function() {
                //DEBUG self.show_pundittabmyitems() doesn't work
                self.show_pundittabmyitems();
                dojo.removeClass('pundit-new-myitems', 'pundit-visible');
            });
        });

        
        // Window toggle
        dojo.connect(dojo.byId('pundit-gui-expander'), 'onclick', function() {
            _PUNDIT.ga.track('gui-button', 'click', '#pundit-gui-expander');
            self.toggleWindow();
        });

        // Annotation Window
        dojo.connect(dojo.byId('pundit-aw-expander'), 'onclick', function() {
            _PUNDIT.ga.track('gui-button', 'click', '#pundit-aw-expander');
            self.toggleAnnotationWindow(); 
        });

        // Center panel tabs
        var centerTabs = {
            //'#tabItems': {  
            '#pundit-tab-page-items': {  
                //container: '#pundit-Items-container',
                container: '#pundit-page-items-container',
                filter: function(){ semlibItems.showOnlyItems(dojo.query('#pundit-items li')); }
            },
            //'#tabMyItems': {
            '#pundit-tab-my-items': {
                //container: '#pundit-MyItems-container',
                container: '#pundit-my-items-container',
                //TODO Is this still needed??? and can work? pundit-items as variable name???
                filter: function(){ semlibMyItems.showOnlyItems(pundit-items.getNodesWhereField('favorite', true)); } 
            },
            //'#tabReconciliator': '#reconSelectorContainer',

            '#pundit-tab-vocabs:' : {container:'#pundit-vocabs-container'}
        };

        // Pass button id and panel id to the closure, return a function
        // which hides every button, shows panel and highlights the pushed
        // button
        for (var tab in centerTabs) {
            var f = (function(but, tab) {
                return function() {
                    if (!self.isWindowOpen())
                        self.toggleWindow();
                    dojo.query('#pundit-gui-center .pundit-tab, #pundit-gui-footer-center .pundit-gui-button').removeClass('pundit-selected');
                    dojo.query(but).addClass('pundit-selected');
                    dojo.query(tab.container).addClass('pundit-selected');

                    _PUNDIT.ga.track('gui-button', 'click', but);

                    // TODO Find a better way for this
                    if (but === '#pundit-tab-my-items'){
                        dojo.removeClass('pundit-new-myitems','pundit-visible');
                        semlibMyItems.emptyNewMyItems();
                    }
                };
            })(tab, centerTabs[tab]);
            
            self['show_'+tab.substr(1).replace(/-/g, '')] = f;
            dojo.connect(dojo.query(tab)[0], 'onclick', f);
        }


        // Right panel tabs
        var rightTabs = {
            '#pundit-tab-tc': '#pundit-tc-container'
            //'#tabMySemlib': '#mySemlibContainer'
        };

        for (var tab in rightTabs) {
            var f = (function(but, pan) {
                return function() {
                    if (!self.isWindowOpen())
                        self.toggleWindow();
                    dojo.query('#pundit-gui-right .pundit-tab, #pundit-gui-footer-right .pundit-gui-button').removeClass('pundit-selected');
                    dojo.query(but).addClass('pundit-selected');
                    dojo.query(pan).addClass('pundit-selected');
                };
            })(tab, rightTabs[tab]);
            
            self['show_'+tab.substr(1)] = f;
            dojo.connect(dojo.query(tab)[0], 'onclick', f);
        }



        dojo.connect(dojo.byId('pundit-gui-resize-handler'), "mousedown", function(evt){
            if (evt.button === dojo.mouseButtons.LEFT) {
                evt.stopPropagation();

                dojo.addClass('pundit-gui-resize-handler', 'dragging');
                b = dojo.query('body')[0];
                dojo.style(b, '-webkit-user-select', 'none');
                dojo.style(b, 'user-select', 'none');
                
                self._isResizing = true;
                self._currentY = evt.clientY - evt.offsetY;
                self._offsetY = evt.offsetY;
                self._moveListener = dojo.connect(dojo.doc, "mousemove", function (e) {
                    e.stopPropagation();
                    if (!self._isResizing) {
                        // DEBUG: does this disconnect work? .. mah.
                        dojo.disconnect(self._moveListener);
                        return false;
                    }
                    if (e.pageY !== self._currentY) {
                        self._currentY = e.clientY - self._offsetY - self.opts.topbarHeight;
                        dojo.style('pundit-gui-resize-handler', 'top', self._currentY + 'px');
                    }
                });
            }
        });
        
        dojo.connect(dojo.doc, "mouseup", function(evt){
            if (self._isResizing) {
                var b = dojo.query('body')[0];
                dojo.style(b, '-webkit-user-select', 'text');
                dojo.style(b, 'user-select', 'text');
                dojo.removeClass('pundit-gui-resize-handler', 'dragging');
                
                // DEBUG: Does this disconnect work? .. mah
                dojo.disconnect(self._moveListener);
                self._isResizing = false;
                self.resizeSemlibWindow(evt.clientY - self._offsetY - self.opts.topbarHeight);
                if (dojo.exists('pundit-zoomed-fragment')) {
                    dojo.destroy('pundit-zoomed-fragment');
                    clearTimeout(self.positionPanelsTimer);
                    self.positionPanelsTimer = setTimeout(function() { tooltip_viewer.zoomOnXpointer(tooltip_viewer.zoomedXp); }, 1100);
                }
            }
        });
        
        
        if (!dojo.isMozilla)
            dojo.behavior.add({
                '.pundit-stop-wheel-propagation': {
                    'onmousewheel': function(e){
                        self.handleScroll(e);
                        dojo.stopEvent(e);
                    }
                }
            });
        else
            dojo.behavior.add({
                '.pundit-stop-wheel-propagation': {
                    'DOMMouseScroll': function(e){
                        self.handleScroll(e);
                        dojo.stopEvent(e);
                    }
                }
            });
                
        
        /*
        //Set preview overflow on pundit-gui items to visible to make it full 
        //visible. Make it again scrollable on mouse out
        
        // DEBUG TODO: x marco perche'!? :(
        
        dojo.behavior.add({
            // Context button shows the contextual menu for this type
            '#pundit-gui .pundit-items li': {
                'onmouseover': function (e) {
                      dojo.addClass('pundit-gui-left', 'previewVisible');
                },
                'onmouseout':function (e) {
                    dojo.removeClass('pundit-gui-left', 'previewVisible');
                }
            },
            '#pundit-gui .pundit-items li span': {
                'onmouseover': function (e) {
                      dojo.addClass('pundit-gui-left', 'previewVisible');
                },
                'onmouseout':function (e) {
                    dojo.removeClass('pundit-gui-left', 'previewVisible');
                }
            }
        });
        */
        
    }, // initBehaviors()
    
    handleScroll:function(e){
        //Rise up the DOM until the element is exactly the one with our class!
        var target = e.target;
        while (!dojo.hasClass(dojo.query(target)[0], 'pundit-stop-wheel-propagation')){
            target = dojo.query(target).parent()[0];
        }
        var h = dojo.position(dojo.query(target)[0]).h
        var dy = e.wheelDeltaY;
        if (Math.abs(dy) > h){
            if (dy > 0)
                dy = (h/2);
            else
                dy = - (h/2);
        }
        dojo.query(target)[0].scrollTop -= dy;
        dojo.stopEvent(e);
    },
    
    toggleWindow: function(){
        var self = this;
        
        self.fireOnWindowClose();
        if (self.isWindowOpen()) {
                        
            
            //semlibResourcesPanel.hide();            
            
            dojo.style('pundit-gui', {
                'height': self.opts.collapsedWindowHeight + 'px'
            });
            dojo.query('body').style({
                'marginTop': self.opts.collapsedWindowHeight + self.opts.topbarHeight + 'px',
                'background-position-y': self.opts.collapsedWindowHeight + self.opts.topbarHeight + 'px'
            })
            self.fixFixedNodeTopPosition(-self._currentWindowHeight);

            dojo.query('#pundit-aw').style('marginTop',  self.opts.collapsedWindowHeight + self.opts.topbarHeight + 'px');
        } else {
            dojo.style('pundit-gui', {
               'height': self._currentWindowHeight  + 'px'
            });
            dojo.query('body').style({
                'marginTop': self._currentWindowHeight + self.opts.topbarHeight + 'px',
                'background-position-y': self._currentWindowHeight + 'px'
            });
            
            self.fixFixedNodeTopPosition(self._currentWindowHeight);
            
            dojo.query('#pundit-aw').style('marginTop',  self._currentWindowHeight + self.opts.topbarHeight + 1 + 'px');
        }
        
        if (dojo.exists('pundit-zoomed-fragment')){
            dojo.destroy('pundit-zoomed-fragment');
            clearTimeout(self.positionPanelsTimer );
            self.positionPanelsTimer = setTimeout(function() { tooltip_viewer.zoomOnXpointer(tooltip_viewer.zoomedXp);}, 1500);
        }
        
        dojo.query('#pundit-gui').toggleClass('pundit-hidden');
        dojo.query('#pundit-gui').toggleClass('pundit-shown');
        dojo.query('body').toggleClass('pundit-gui-hidden');
        dojo.query('body').toggleClass('pundit-gui-shown');
        self.resizeAnnotationWindow();

    }, // toggleWindow()

    toggleAnnotationWindow: function() {
        var a = dojo.query('#pundit-aw'),
            b = dojo.query('body'),
            self = this;
        
        //dojo.style('pundit-aw', 'display', 'block');
        a.toggleClass('pundit-hidden');
        a.toggleClass('pundit-shown');
        b.toggleClass('pundit-aw-hidden');
        b.toggleClass('pundit-aw-shown');
        
        if (dojo.exists('pundit-zoomed-fragment')){
            dojo.destroy('pundit-zoomed-fragment');
            clearTimeout(self.positionPanelsTimer );
            self.positionPanelsTimer = setTimeout(function() { tooltip_viewer.zoomOnXpointer(tooltip_viewer.zoomedXp);}, 1500);
        }
        self.resizeAnnotationWindow();
    },
    
    resizeSemlibWindow: function(h) {
        var self = this,
            h = parseInt(h, 10); // Accept measure both in px and in number
        
        if (typeof self.firstResize === 'undefined')
            self.firstResize = true;
        
        if (h < self.opts.minWindowHeight)
            h = self.opts.minWindowHeight;
            
        if (h > self.opts.maxWindowHeight)
            h = self.opts.maxWindowHeight;
        
        dojo.style('pundit-gui', 'height', h + 'px');
        dojo.query('#pundit-gui-panel-container, #pundit-gui-left, #pundit-gui-center, #pundit-gui-right').style('height', (h-30) + 'px');
        dojo.query('.pundit-tab-content').style('height', (h-54) + 'px');
        
        var prevWinHeight = self._currentWindowHeight;
        
        
        self._currentWindowHeight = h;
        
        dojo.query('body').style({
            'marginTop': h + self.opts.topbarHeight + 'px',
            'background-position-y': h + 'px'
        });

        dojo.query('#pundit-aw').style('marginTop', h + self.opts.topbarHeight + 1 + 'px');
        
        dojo.style('pundit-gui-resize-handler', 'top', self._currentWindowHeight + 'px');
        
        self.fireOnWindowResize(h);
        
        if (self.firstResize){
            self.firstResize = false;
            self.fixFixedNodeTopPosition(self.opts.collapsedWindowHeight + self.opts.topbarHeight);
        }
        else
            self.fixFixedNodeTopPosition(h - prevWinHeight);
        
        self.resizeAnnotationWindow();
        self.positionPanels();
    }, // resizeSemlibWindow()
    
    resizeAnnotationWindow: function() {
        var self = this,
            b = dojo.query('body')[0],
            bh = dojo.position(b, true).h;
        clearTimeout(self.resizeEndTimer);   
        self.fireOnWindowAnnotationResize();
        dojo.style('pundit-aw', 'height', bh + 'px');
        dojo.style(dojo.query('#pundit-aw div.pundit-shown-content')[0], 'height', bh + 'px');
        self.resizeEndTimer = setTimeout(function(){
//            if (dojo.style('pundit-aw', 'width') === 0)
//                dojo.style('pundit-aw', 'display', 'none');
            self.fireOnResizeEnd();
        }, 1000);
    },
    
    isWindowOpen: function() {
        return dojo.hasClass('pundit-gui', 'pundit-shown');
    },
    
    isAnnotationWindowOpen: function() {
        return dojo.hasClass('pundit-aw', 'pundit-shown');
    },

    getOpenedPanelsByXpointer: function(xp) {
        var self = this, ret = []

        for (var id in self.panels)
            if (dojo.indexOf(self.panels[id].trackXPs, xp) !== -1) 
                ret.push(self.panels[id])
        return ret;
    },
    
	isSomePanelOpen: function() {
	   var self = this;
       for (var id in self.panels)
           return true;
    },

    closePanelByXpointer: function(xp) {
        var self = this;
        self.log('Closing panels by xpointer '+ xp.substr(-30));
        
        // If the panel tracks the given xpointer, call its
        // onClose function
        for (var id in self.panels)
            if (dojo.indexOf(self.panels[id].trackXPs, xp) !== -1) 
                self.panels[id].close();
        self.positionPanels();
            
    },
    
	closeAllPanels: function() {
		var self = this;
        self.log('Closing all panels');
        
        for (var id in self.panels)
        	self.panels[id].close();
        
	},

    closePanelById: function(id) {
        var self = this;
        self.log('Closing panels by id '+ id);
        
        if (typeof(self.panels['dialog_'+id+'_content']) !== 'undefined'){
            self.panels['dialog_'+id+'_content'].close();
            self.positionPanels();
        }
    },
    
    destroyPanelById:function(id){
        var self = this;
        self.log('Closing panels by id '+ id);
        
        if (typeof(self.panels['dialog_'+id+'_content']) !== 'undefined'){
            self.panels['dialog_'+id+'_content'].close();
        }
    },
    
    setPositioningXpointer: function(id, xp) {
        this.panels[id].positioningXpointer = xp;
        this.positionPanels();
    },
    
    togglePanel: function(id) {
        var self = this;
        
        if (self.panels[id].expanded === false) 
            self.showPanel(id);
        else 
            self.collapsePanel(id);
            
        self.positionPanels();
    },

    showPanel: function(id) {
        var self = this;
        
        dojo.query('.pundit-aw-panel').forEach(function(e, i) {
            if (dojo.attr(e, 'id') !== id)
                self.collapsePanel(dojo.attr(e, 'id'));
        });
        
        self.panels[id].expanded = true;
        dojo.removeClass(id, 'pundit-hidden');
        dojo.addClass('collapse_'+id, 'pundit-expanded');
        dojo.removeClass('collapse_'+id, 'pundit-collapsed');
        
        // TODO: color the fragments in the DOM only when expanding the panel?
        
    },
    
    collapsePanel: function(id) {
        var self = this;
        
        self.panels[id].expanded = false;
        dojo.addClass(id, 'pundit-hidden');
        dojo.removeClass('collapse_'+id, 'pundit-expanded');
        dojo.addClass('collapse_'+id, 'pundit-collapsed');
    },
    
    positionPanels: function() {
        var self = this;

        //if (_PUNDIT.myPundit && _PUNDIT.myPundit.logged === false) {
        //    return false;
        //}
        
        clearTimeout(self.positionPanelsTimer);
        self.positionPanelsTimer = setTimeout(function() { self._positionPanels();}, self.opts.positionPanelsTimerMS);
    },
    
    _positionPanels: function() {
        var self = this,
            bodyOffset = parseInt(dojo.style(dojo.query('body')[0], 'marginTop')),
            focusedPanel = {},
            orderedIds = [],
            coords = {},
            position,
            y;

        // First round: position all of the panels to their requested
        // top (using positioningXpointer). Gather some info on the focused
        // panel, there must be only one.
        for (var id in self.panels) {
            var p = self.panels[id],
                cl = tooltip_viewer.xpointersClasses[p.positioningXpointer];
            
            if (typeof cl !== 'undefined') {
                if (dojo.byId('icon_'+cl) === null)
                    continue;
                
                // TODO: can choose wether to position the annotation at the highest
                // or lowest bound of the annotation. Icon is at bottom, first span
                // at top.
                // coords = dojo.position(dojo.byId('icon_'+cl), true);
                coords = dojo.position(dojo.query('span.cons.'+cl)[0], true);
                
                y = coords.y - bodyOffset;

            } else {
                // DEBUG: full page annotations ?
                coords = {y: bodyOffset, x: 0};
                dojo.style(id, 'top', coords.y + 'px');
            }
            
            if (p.expanded) 
                focusedPanel = {id: id, coords: coords, panelHeight: dojo.position(dojo.byId(id), true).h};
            else
                self.collapsePanel(id);
            
            orderedIds.push({id: id, coords: coords, panelHeight: dojo.position(dojo.byId(id), true).h});
        }

        // Sort the panels according to their top/left coordinates
        orderedIds = orderedIds.sort(function(a, b) {
            if (a.coords.y === b.coords.y) return a.coords.x - b.coords.x;
            return a.coords.y - b.coords.y;
        });
        
        var collH = 28,
            margin = 5,
            firstSpot = 0,
            len = orderedIds.length;

        // Second round: go through the panels from top to bottom, positioning
        // them at the first available spot free. If it's the focused panel,
        // add its height to firstSpot
        for (var i=0; i<len; i++) {

            if (orderedIds[i].coords.y > firstSpot) {
                position = orderedIds[i].coords.y;
                firstSpot = orderedIds[i].coords.y + collH+margin;
            } else {
                position = firstSpot;
                firstSpot += collH+margin;
            }
            
            if (orderedIds[i].id === focusedPanel.id) 
                firstSpot = firstSpot - collH + focusedPanel.panelHeight;
            
            dojo.style(orderedIds[i].id, 'top', (position - bodyOffset) + 'px');
        }
    }, // positionPanels()
        
    awAdd: function(o) {
        var self = this,
            c = '', colorButtons = '', color;

        // DEBUG: need to add xpointersColors equivalent to this object?
        self.panels[o.id] = {
            id: o.id,
            content: o.content,
            positioningXpointer: o.positioningXpointer,
            trackXPs: o.xpointers,
            close: o.onClose,
            expanded: true,
            isBroken: o.isBroken
        };
        
        for (var i = o.xpointers.length; i--;) {
            var color = tooltip_viewer.xpointersColors[o.xpointers[i]];
            colorButtons += '<span id="pundit-aw-button-color-'+color+'-'+o.id+'" class="pundit-button-color '+color+'">'+color+'</span>';
        }

        c += "<div class='pundit-aw-panel "+(o.isBroken ? "pundit-broken-ann" : "")+"' id='"+o.id+"'>";
        c += "<div class='pundit-aw-panel-buttons'>"+colorButtons + o.buttons+"</div>";
        c += "<div class='pundit-aw-panel-header'>";
        //Add page icon
        if (o.xpointers.length === 0)
            c += "    <span class=pundit-icon-page></span>";
        
        c += "    <span class='pundit-aw-panel-title'>"+o.title+"</span>";
        c += "    <span class='pundit-aw-button pundit-icon-close' id='close_"+o.id+"'></span><span class='pundit-aw-button pundit-icon-collapse pundit-collapsed' id='collapse_"+o.id+"'></span>";
        c += "</div>";
        c += "<div class='pundit-aw-panel-content' id='content_"+o.id+"'>"+o.content+"</div></div>"
                
        dojo.query('#pundit-aw div.pundit-shown-content').append(c);
        
        dojo.connect(dojo.byId("close_"+o.id), 'onclick', function () {
            o.onClose();
            self.positionPanels();
        });
        dojo.connect(dojo.byId("collapse_"+o.id), 'onclick', function() {
            self.togglePanel(o.id);
        });
        
        if (typeof color !== 'undefined')
            dojo.connect(dojo.byId("pundit-aw-button-color-"+color+"-"+o.id), 'onclick', function() {
                if (!self.isAnnotationWindowOpen()) 
                    self.toggleAnnotationWindow();
                self.showPanel(o.id);
                self.positionPanels();
            });
            
        // TODO: add a mouseover on the color button?
        
        self.showPanel(o.id);
        self.positionPanels();
        
    }, // awAdd

    initNotebookShareDialog: function(id) {
        var self = this,
        h = "<div id='pundit-login-popup-content' class='off tundra'>";

        h += "<p>To share this notebook just copy the following URL and send it over (e.g. by e-mail).</p>";
	    h += "<p><strong>" + ns.annotationServer  + "/pages/activate.html?id=" + id + "</strong></p>";

        h += "</div>";
		
        var dialog = new dijit.Dialog({
            style: "width: 600px"
        });
        dialog.attr("content", h);
        dialog.attr("title", "Share Notebook");
        dojo.addClass(dojo.byId(dialog.id), 'tundra');
        // Emulating closable: false. Thanks dojo! ;)
        //dojo.destroy(dialog.closeButtonNode);
        

		return dialog;

	    

    }, // initSimpleDialog
    
    fixFixedNodeTopPosition:function(topDelta){
        dojo.query('body *').forEach(function(item){
            if ((dojo.style(item, 'position') === 'fixed') && (typeof dojo.style(item, 'bottom') === 'undefined' || dojo.style(item, 'bottom') === 'auto') && (typeof dojo.style(item, 'top') !== 'undefined' || dojo.style(item, 'top') === 'auto') && !dojo.hasClass(item, 'pundit-base')){
                //TODO Do this just at the beginning???
                //But What if a new fixed element is created?
                dojo.query(item).style({
                    	'-webkit-transition-property': 'top',
                        '-webkit-transition-duration': '1s',
                        '-moz-transition-property': 'top',
                        '-moz-transition-duration': '1s'
                });
                dojo.style(item, 'top', parseInt(dojo.style(item, 'top')) + topDelta + 'px');
            }
        });
    },
    
    updateNewMyItems:function(newItems){
        var self = this;
        if (newItems.length > 0){
            dojo.addClass('pundit-new-myitems', 'pundit-visible');
            dojo.query('#pundit-new-myitems').html('(+' + newItems.length +')');
        }
        //semlibWindow.show_pundittabmyitems();
    }
});