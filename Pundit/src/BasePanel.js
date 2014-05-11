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
    Provides the base GUI a of floating panel. Different parameters 
    can be specified to enable draggability and preview. Basic methods can be inherited 
    to extend it features
    @class pundit.BasePanel
    @extends pundit.baseComponent
    @constructor
    @module pundit
    @param options {object} See object properties
 */
dojo.provide("pundit.BasePanel");
dojo.declare("pundit.BasePanel", pundit.BaseComponent, {

    constructor:function(options){
        var self = this;
        
        self.log('Base Panel Contructor');
        
        self.inShowing = false;
        
        // TODO: move these property out, and declare+init them directly 
        // into an {opts} field .. ? :)
        
        /**
            The name of the panel used to create a unique id
            @property name
            @type String
        **/
        self.name = options.name;

        /**
            The title of the panel 
            @property title
            @type String
        **/
        self.title = options.title || 'Panel';

        /**
            if set to true it enable the panel to be dragged
            @property drag
            @type String
        **/
        self.drag = options.drag || false; 

        /**
            if set to true enable the preview visualization (
            otherwise the normal preview (in Pundit Window) is used
            assigned explicitly dojo's 'declaredClass' field will be used.
            @property preview
            @type String
        **/
        self.preview = options.preview || false;
        

        self.width = options.width || '400';
        self.height = options.height;
        
        self.initBaseHTML();
        
        //Adjust width and height of the container
        
        dojo.style(dojo.query('#' + self._id + ' ul.pundit-fp-content-list')[0], {
            width:  parseInt(self.width) +  'px'
        });
        if (typeof self.height !== 'undefined'){
            dojo.style(dojo.query('#' + self._id + ' ul.pundit-fp-content-list')[0], {
                height: self.height + 'px'
            });
        }
        
        dojo.style(dojo.query('#' + self._id + ' .pundit-fp-content-container')[0], 'width', self.width - 10 + 'px');

        
        if (self.preview){
            self.showPreview = function(uri){
                var self = this;
                previewer.show(uri, '#' + self._id + ' .pundit-fp-preview');
                dojo.addClass(dojo.query('#' + self._id+ ' .pundit-fp-content-list')[0], 'pundit-preview');
                dojo.style(dojo.query('#' + self._id + ' ul.pundit-fp-content-list')[0], {
                    width:  parseInt(self.width) + parseInt(250) + 'px' 
                });
                
//                dojo.style(dojo.query('#' + self._id + ' pundit-fp-preview-list')[0], {
//                    left:  parseInt(self.width + 30) 
//                });
                
                
                var h = dojo.position(dojo.query('#' + self._id+ ' .pundit-fp-content-list')[0]).h;
                dojo.style(dojo.query('#' + self._id+ ' .pundit-fp-preview')[0], 'height', h +'px');
            };
            self.hidePreview= function(){
                var self = this;
                dojo.removeClass(dojo.query('#' + self._id+ ' .pundit-fp-content-list')[0], 'pundit-preview');
                dojo.style(dojo.query('#' + self._id + ' ul.pundit-fp-content-list')[0], {
                    width:  parseInt(self.width) + 'px' 
                });
                //dojo.style(dojo.query('#' + self._id+ ' .pundit-fp-content-list')[0], 'width', '400px');
            };
        }
        
        self.initBaseBehaviors();
    },
    initBaseHTML:function(){
        var self = this;
        self.log('Init HTML Base Panel');
        if (typeof self.name !== 'undefined')
            self._id = 'pundit-fp-' + self.name;
        else
            self._id = 'pundit-fp-' + Math.rand(100);
        
        var c ='<div id="' + self._id + '" class="pundit-base pundit-fp pundit-hidden pundit-disable-annotation pundit-stop-wheel-propagation">';
        c += '  <div class="pundit-fp-header"><span class="pundit-fp-title">' + self.title + '</span>';
        c += '     <span class="pundit-fp-close pundit-icon-close"></span>';

        // TODO: activate again the full screen? There 2 while() which freeze browsers
        // c += '     <span class="pundit-fp-fullscreen pundit-icon-fullscreen"></span>';
        c += '</div>';
        c += '  <ul class="pundit-fp-content-list pundit-horizontal-list">';
        c += '      <li>';
        c += '          <div class="pundit-fp-content-container pundit-fp-container">';
        c += '          </div>';
        c += '      </li>';
        c += '      <li class="pundit-fp-preview-list pundit-stop-wheel-propagation fillheight">';
        c += '          <div class="pundit-fp-container fillheight pundit-stop-wheel-propagation">';
        c += '              <span id="' + self._id + '-preview-hide" style="cursor: pointer">- [hide preview]</span><div id ="' + self._id + '-preview" class="pundit-fp-preview pundit-moreinfo-panel pundit-stop-wheel-propagation fillheight"></div>';
        c += '          </div>';
        c += '      </li>';
        c += '  </ul>';
        c += '</div>';
        
        dojo.query('body').append(c);
    },
    
    initBaseBehaviors:function(){
        var self= this;
        
        if (self.drag){
            
            var hider = dojo.byId(self._id + '-preview-hide');
            var prev = dojo.byId(self._id + '-preview');
            dojo.connect(hider, 'onclick', function (evt) {
                if (prev.getAttribute('style') !== 'visibility: hidden; cursor: pointer') {
                    prev.setAttribute('style','visibility: hidden; cursor: pointer');    
                    hider.innerHTML = '+ [show preview]'
                } else {
                    prev.setAttribute('style','');
                    hider.innerHTML = '- [hide preview]'
                }
                
            });
            
            dojo.connect(dojo.query('#' + self._id+ ' .pundit-fp-header')[0], 'onmousedown', function (e){
                //dojo.stopEvent(e);
                self.moving = true;
                self.start = {
                    left : dojo.style(self._id, 'left'),
                    top : dojo.style(self._id, 'top'),
                    x: e.pageX,
                    y: e.pageY
                };
            });
        
            dojo.connect(window, 'onmousemove', function(e){
                if (self.moving === true) {

                    if (e.clientY > 0 && e.clientY < window.innerHeight - 10){
                        dojo.stopEvent(e);
                        dojo.style(self._id, 'left', self.start.left - self.start.x + e.pageX + 'px');
                        dojo.style(self._id, 'top', self.start.top - self.start.y + e.pageY + 'px');
                    }
                }
            });
            dojo.connect(window, 'onmouseup', function(e){
                self.moving = false;
            });
        }
        
        dojo.connect(dojo.query('#' + self._id+ ' .pundit-fp-close')[0], 'onclick', function(){
           self.hide();
        });
        
        dojo.connect(dojo.query('#' + self._id+ ' .pundit-fp-fullscreen')[0], 'onclick', function(){
            var winW = 600, winH = 400;
            /*
            
            // TODO: avoiding this to go fullscreen, the thing will just crash browsers :|
            if (document.body && document.body.offsetWidth) {
                winW = document.body.offsetWidth;
                winH = document.body.offsetHeight;
            }
            if (document.compatMode=='CSS1Compat' &&
                document.documentElement &&
                document.documentElement.offsetWidth ) {
                winW = document.documentElement.offsetWidth;
                winH = document.documentElement.offsetHeight;
            }
            if (window.innerWidth && window.innerHeight) {
                winW = window.innerWidth;
                winH = window.innerHeight;
            }

            dojo.style(self._id, 'left', '0px');
            dojo.style(self._id, 'top', '0px');


            var panel_inner = dojo.query('#' + self._id + ' .pundit-fp-content-list.pundit-horizontal-list');
            panel_inner.style('width', winW - 23 + 'px');
            panel_inner.style('height', winH - 20 + 'px');

            var container = dojo.query('#' + self._id + ' .pundit-fp-content-container.pundit-fp-container');
            container.style('width', winW - 23 - 10);
            container.style('height', winH - 30);
            */
                /*
                
            // TODO: why is this going full screen?
            if (dojo.query('#' + self._id + '-image-annotation-container').length > 0) {
                console.log('fullscreen');

                var container_annotation = dojo.query('#' + self._id + '-image-annotation-container');
                container_annotation.style('width', winW - 143);
                container_annotation.style('height', winH - 30);

                var kineticjs = dojo.query('#' + self._id + '-image-annotation-container .kineticjs-content');
                kineticjs.style('width', winW - 143);
                kineticjs.style('height', winH - 30);

                var image_canvas = dojo.query('#' + self._id + '-image-annotation-container .kineticjs-content canvas');
                // while ((image_canvas.attr('width')[0] < (winW - 143)) && (image_canvas.attr('height')[0] < (winH - 70))) {
                //     self.zoomIn();
                // }
            }
                */

        });
        
        dojo.behavior.apply();
    },
    /**
    * @method hide
    * @description Hide the panel.
    */
    hide: function(){
        var self = this;
        dojo.style(dojo.query('#' + self._id + '.pundit-fp')[0], 'opacity', 0);
        //Destroy the container once the animation has completed
        //Destroy or just make the block display none
        self.inShowing = false;
        self.hideTimeout = setTimeout(function(){
            dojo.addClass(self._id, 'pundit-hidden');
            self.hidePreview();
        },1000);
        
    },
    /**
    * @method show
    * @description Show the panel.
    */
    show: function(x,y){
        var self = this;
        if (self.isVisible())
            return;
        self.inShowing = true;
        clearTimeout(self.hideTimeout);
        dojo.removeClass(self._id, 'pundit-hidden');
        if (typeof x !== 'undefined' && typeof y !== 'undefined') {
            
            // DEBUG: what is this ?????!???
            if (dojo.query('pundit-fp-notebook-sharePanel').length > 0)
                dojo.style('pundit-fp-notebook-sharePanel', {
                    left:x,
                    top:y }
                );
        }
        dojo.style(dojo.query('#' + self._id + '.pundit-fp')[0], 'opacity',1);

        /*
        // TODO: this pushes the window to full screen.. but breaks browsers :P
        setTimeout(function(){

            if (dojo.query('#' + self._id + '-image-annotation-container').length > 0) {
                console.log('show');
                var winW = dojo.style(self._id, 'width');
                var winH = dojo.style(self._id, 'height');

                var container_annotation = dojo.query('#' + self._id + '-image-annotation-container');
                container_annotation.style('width', winW - 120);
                container_annotation.style('height', winH - 30);

                var kineticjs = dojo.query('#' + self._id + '-image-annotation-container .kineticjs-content');
                kineticjs.style('width', winW - 140);
                kineticjs.style('height', winH - 30);

                var image_canvas = dojo.query('#' + self._id + '-image-annotation-container .kineticjs-content canvas');
                // while ((image_canvas.attr('width')[0] < (winW - 143)) && (image_canvas.attr('height')[0] < (winH - 70))) {
                //     self.zoomIn();
                // }
            }
        },10);
        */
        
        //dijit.focus(dojo.byId('pundit-ctp-comment-input'));
    },
    
    /**
    * @method isVisible
    * @description Check if the panel is visible
    * @return {boolean} True if it is visible, false otherwise
    */
    isVisible:function(){
      return this.inShowing;
    },
    
    /**
    * @method getPosition
    * @description Get the current position of the panel
    * @return {object} An object containing the position of the panel (x,y,w,h)
    */
    getPosition:function(){
        return dojo.position(this._id);
    },
    
    /**
    * @method showPreview
    * @description shows the preview of the item. Depending on the parameter 
    * (preview) passed to the component the preview is shown inside the panel 
    * (preview = true) or in the Pundit Window. (preview = false)
    * @param uri {string} The uri of the item to preview 
    */
    showPreview: function(uri){
        var self = this;
        previewer.show(uri);
    },
    /**
    * @method hidePreview
    * @description Hide the preview panel.
    */
    hidePreview: function(){
        var self = this;
        dojo.removeClass(dojo.query('#' + self._id+ ' li.pundit-fp-preview-list')[0], 'pundit-preview');
    },
    /**
    * @method addHTMLContent
    * @description Add html content to the panel content container.
    * @param uri {string} The HTML to be added to create the content of the panel
    */
    addHTMLContent: function(html){
        var self = this;
        dojo.query('#' + self._id + ' .pundit-fp-content-container').append(html);
    },
    /**
    * @method emptyContent
    * @description Remove all the HTML content of the panel
    */
    emptyContent:function(){
        var self = this;
        dojo.empty(dojo.query('#' + self._id + ' .pundit-fp-content-container')[0]);
    }
});
