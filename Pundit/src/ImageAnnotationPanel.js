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
 * @class pundit.ImageAnnotationPanel
 * @extends pundit.BasePanel
 * @description Provides a GUI (floating Panel) for showing items grouped according 
 * from their provenance ('My Item', 'Page Items', Vocabularies)
 */
dojo.provide("pundit.ImageAnnotationPanel");
dojo.declare("pundit.ImageAnnotationPanel", pundit.BasePanel, {

    constructor:function(options){
        var self= this;
        
        //Lazy loading kinetic lib
        //TODO Embed using dojo style
        (function() {   
            var h = document.getElementsByTagName('head')[0],
            d = document.createElement('script');
            d.type = 'text/javascript',
            // d.src = 'http://thepund.it/lib/kinetic/kinetic-v4.0.1.js';
            d.src = 'http://thepund.it/lib/kinetic/kinetic-v4.5.1.min.js';
            h.appendChild(d);
        })();
        
        // Zoom and canvas parameters
        self.deltaScale = 0.1;
        self.dotRadius = 5; // Screen pixel dimension
        self.strokeWidth = 10; 
        self.lineStrokeWidth = 3;
        self.dashArray = [10, 5, 1, 5];
        
        self.crypto = new pundit.Crypto();
        
        self.createdShapes = [];
        self.selectedShape = null;
        
        //Make this programable
        self.containerSize = {
            w:480,
            h:360
        };
        
        cMenu.addAction({
            type: ['imageSelectionHelper'],
            name: 'AnnotateImage',
            label: 'Annotate a part of this image',
            showIf: function(item) {
                return true
            },
            onclick: function(item) {
                _PUNDIT.ga.track('cmenu', 'click', 'annotate-a-part-of-this-image');
                self.initialize(item.image);
                return true;
            }
        });
    },
    initialize:function(imageSrc){
        var self = this;
		
		//It has to forget the shapes drown in previous panels !
		self.createdShapes = [];
		
        if (typeof (Kinetic) === 'undefined'){
            alert('Kinetic Lib not loaded Yet... Try again! :P');
            return;
        }
        self.imageSrc = imageSrc;
        self.initHTML();
        self.initBehavior();
        self.initAnnotationCanvas();
        self.show();
        dojo.behavior.apply();
    },
    initHTML:function(){
        var self= this;
        self.log('Init HTML Resource Panel');
        //Add content to the base container
        self.log('Resource Panel Contructor');
        var c =  '<ul id ="' + self._id + '-image-ann-container" class="pundit-horizontal-list">';
        c += '  <li style="width:100px">';
        c += '      <span id="pundit-image-annotation-zoom" class="pundit-zoom-in-icon" style="display:block;width:25px;height:25px;margin-left:auto;margin-right:auto;"></span><span style="display:block;text-align:center;">Zoom in</span></br>';
        c += '      <span id="pundit-image-annotation-pan" class="pundit-zoom-out-icon" style="display:block;width:25px;height:25px;margin-left:auto;margin-right:auto;"></span><span style="display:block;text-align:center;">Zoom out</span></br>';
        c += '      <span id="pundit-image-annotation-polygon" class="pundit-draw-polygon-icon" style="display:block;width:25px;height:25px;margin-left:auto;margin-right:auto;"></span><span style="display:block;text-align:center;">Draw Polygon</span></br>';
        c += '      <span id="pundit-image-annotation-delete" class="pundit-delete-icon" style="display:block;width:25px;height:25px;margin-left:auto;margin-right:auto;"></span><span style="display:block;text-align:center;">Delete Selected</span></br>';
        c += '      <span id="pundit-image-annotation-myitem" class="pundit-favorite-icon" style="display:block;width:25px;height:25px;margin-left:auto;margin-right:auto;"></span><span style="display:block;text-align:center;">Add to My Item</span></br>';
        c += '      <span id="pundit-image-annotation-add-comment"" class="pundit-tag-icon" style="display:block;width:25px;height:25px;margin-left:auto;margin-right:auto;"></span><span style="display:block;text-align:center;">Add Comment/Tag</span></br>';
        c += '  </li>';
        c += '  <li>';
        c += '      <div id="' + self._id + '-image-annotation-container" class="pundit-stop-wheel-propagation pundit-rp-image-annotation-container" style="width:480px;height:360px;overflow:auto;z-index:1000000000;background:lightGrey"></div>';
        c += '</li></ul>';
        self.addHTMLContent(c);
    },
    initAnnotationCanvas:function(imageUrl){
        var self = this,
        imageObj = new Image();
        
        //Stage    
        self.stage = new Kinetic.Stage({
            container: self._id + "-image-annotation-container"
        //draggable: true 
        });
        
        //Draw Layer
        self.layer = new Kinetic.Layer({
        });
        
        self.isDrawing = true;
        
        //Init behavior of canvas
        self.layer.drawingNewLine = false;
        self.layer.finishedDrawingNewLine = false;
        self.newDots = [];
        
        dojo.connect(self.stage.getContent(), 'onclick', function(e){
            //Check drawing
            if (!self.isDrawing) 
                return;
            //TODO check different type of shapes
            
            //Do I need to check the line?
            if (self.layer.finishedDrawingNewLine)
                return;
            
            var pos = self.stage.getMousePosition(),
                scale = self.stage.getScale(),
                len,
                strokeWidth,
                dashArray = [];
            
            len = self.newDots.length;
                
            //Compensate scale and offset
            self.newDots[len] = self.buildAnchor(self.layer, (pos.x - self.stage.getX())/scale.x, (pos.y - self.stage.getY())/scale.y);
               
            //Attach event on first dot!
            //On click close the line and remove the event handler;   
            strokeWidth = self.strokeWidth / self.stage.getScale().x;
            
            //for (var i in self.dashArray){
            for (var i = self.dashArray.length; i--;){
                dashArray.push(self.dashArray[i] / self.stage.getScale().x)
            }
            self.layer.newLine = new Kinetic.Line({
                dashArray: dashArray,
                strokeWidth: self.lineStrokeWidth,
                stroke: "#f00",
                lineCap: "round",
                alpha: 1,
                name: 'tempLine'
            });
            
            self.layer.add(self.layer.newLine);
            self.layer.draw();
            self.layer.drawingNewLine = true;
        });
        
        //Disable shape drag and modify when clicking on the stage
        self.stage.on('click', function(){
            //if (self.modifyingShape){
            self.deselectShape();
            self.layer.draw();
        });        
        
        //Draw to update the line
        self.stage.on('mousemove', function(evt) {
            if (!self.layer.drawingNewLine) return;
                self.stage.draw();
        });


        self.layer.on('beforeDraw', function() {
            if (self.layer.newLine){
                self.updateNewLine(self.layer);
            }
            if (self.selectedShape !== null){
                self.updatePoly(self.selectedShape);
            }
        });
        
        // On background image loaded
        imageObj.onload = function() {
            //Positionate the image at the center of the canvas
            var scale = 1,
            image = new Kinetic.Image({
                x: 0,
                y: 0,
                image: imageObj
            }),
            iw = imageObj.width,
            ih = imageObj.height;
            
            self.iw = iw;
            self.ih = ih;
            
            //Set image as background
            self.layer.background = image;
            self.layer.add(image);
            image.moveToBottom();
            
            //Set the right scale
            scale = Math.min(self.containerSize.w / iw, self.containerSize.h / ih);
            //Resize stage
            self.stage.setWidth(parseInt(iw * scale));
            self.stage.setHeight(parseInt(ih * scale));
            self.stage.setScale({
                x:scale, 
                y:scale
            });
            
            if (iw > ih){
                self.isPanImg = true;
                if (iw < self.containerSize.w){
                    //should I this to center canvas
                    dojo.style(dojo.query(self.stage.getContent())[0], {
                        left: parseInt(0.5 * (self.containerSize.w - iw * scale)),
                        top: parseInt(0.5 * (self.containerSize.h - ih * scale)),
                        width: parseInt(iw * scale),
                        height: parseInt(ih * scale)
                    });
                }
                else{
                    self.centerCanvasContainer();
                }
                
            }else{
                self.isPanImg = false;
                if (ih < self.containerSize.h){
                    dojo.style(dojo.query(self.stage.getContent())[0], {
                        left: parseInt(0.5 * (self.containerSize.w - iw * scale)),
                        top: parseInt(0.5 * (self.containerSize.h - ih * scale)),
                        width: parseInt(iw * scale),
                        height: parseInt(ih * scale)
                    });
                }
                else{
                    self.centerCanvasContainer();
                }
            }
            self.stage.draw();
        }
        
        imageObj.src = self.imageSrc;
        self.stage.add(self.layer);
        self.stage.draw();
        
    },
    initBehavior:function(){
        var self= this;
        
        //Cannot use stage event for this... For some weird reason some event are lost...
        dojo.connect(dojo.byId("pundit-image-annotation-zoom"),'onclick', function(){
            self.zoomIn();

            
            _PUNDIT.ga.track('gui-button', 'click', 'pundit-image-annotation-zoom');
            
        });
        dojo.connect(dojo.byId("pundit-image-annotation-pan"),'onclick', function(){
            var scale = null;
            scale = self.stage.getScale();
            scale.x = scale.x - self.deltaScale;
            scale.y = scale.y - self.deltaScale;
            
            self.stage.setWidth(parseInt(self.stage.getWidth() * (1 - self.deltaScale)));
            self.stage.setHeight(parseInt(self.stage.getHeight() * (1 - self.deltaScale)));
            
            self.stage.setScale({x:self.stage.getWidth()/self.iw,y:self.stage.getHeight()/self.ih});
            
            self.centerCanvasContainer();

            self.updateShapeRendering(scale.x);
            self.stage.draw();
            _PUNDIT.ga.track('gui-button', 'click', 'pundit-image-annotation-pan');
            
        });
    
        dojo.connect(dojo.byId("pundit-image-annotation-polygon"),'onclick', function(){
            if (self.isDrawing)
                return
            else{
                if (self.createdShapes.length > 0){
                    return;
                }
                self.isDrawing = true;
                self.layer.finishedDrawingNewLine = false;
                self.deselectShape();
            }
            
            _PUNDIT.ga.track('gui-button', 'click', 'pundit-image-annotation-polygon');
        });
        
        dojo.connect(dojo.byId("pundit-image-annotation-delete"),'onclick', function(){
            if (self.selectedShape !== null){
            //if (self.modifyingShape){
                //self.modifyingShape = false;
                self.isDrawing = false;
                var dots = self.stage.get('.dot-' + self.selectedShape.getId());
                //for (var i in dots){
                for (var i = dots.length; i--;){
                    dots[i].remove();
                    // self.layer.remove(dots[i]);
                }
                
                // self.layer.remove(self.selectedShape);
                self.selectedShape.remove();
                
                for (var i = self.createdShapes.length; i--;){
                    if (self.createdShapes[i].getId() === self.selectedShape.getId())
                        self.createdShapes.splice(i,1);
                }
                
                self.selectedShape = null;
                
                self.layer.finishedDrawingNewLine = true;
                self.stage.draw();
                _PUNDIT.ga.track('gui-button', 'click', 'pundit-image-annotation-delete');
            }
        });
        
        dojo.connect(dojo.byId("pundit-image-annotation-myitem"),'onclick', function(){
            if (self.createdShapes.length > 0) {
                var item = self.createItemFromCreatedShape();
                if (!semlibMyItems.uriInItems(item.value)) {
                    // Create the needed bucket and init the preview for this item
                    item.rdfData = semlibItems.createBucketForImageRegionFragment(item).bucket;
                    previewer.buildPreviewForItem(item);
                        
                    semlibMyItems.addItem(item, true);
                    //semlibWindow.show_pundittabmyitems();
                    semlibMyItems.show_pundittabfiltermyitemsimagesfragment();
                }
                self.selectedShape = null;
                self.hide();
                _PUNDIT.ga.track('gui-button', 'click', 'pundit-image-annotation-myitem');
            }
        });
        
        dojo.connect(dojo.byId("pundit-image-annotation-add-comment"),'onclick', function(){
            
            if (self.createdShapes.length > 0) {
                //Create Item
                var item = self.createItemFromCreatedShape();
                item.rdfData = semlibItems.createBucketForImageRegionFragment(item).bucket;
            
                self.selectedShape = null;
            
                _PUNDIT['commentTag'].initPanel(item, "Comment and tags");    
                _PUNDIT.ga.track('gui-button', 'click', 'pundit-image-annotation-add-comment');

            } else {
                //TODO: Alert the user: "DRAW A POLYGON FIRST"
            }
        });
    },

    //Update the newLine which is draw to help in polygon creation
    updateNewLine:function(layer){
        var self= this,
        pos = self.stage.getMousePosition(),
        len = self.newDots.length,
        points = [];
        if (typeof pos === 'undefined')
            return false;
        for (var i=0; i<len; i++) 
            points = points.concat([self.newDots[i].attrs.x, self.newDots[i].attrs.y]);
            
        if (layer.drawingNewLine)
            points = points.concat((pos.x - self.stage.getX()) / self.stage.getScale().x, (pos.y - self.stage.getY())/self.stage.getScale().y);
        else 
            points = points.concat([self.newDots[0].attrs.x, self.newDots[0].attrs.y]);
        
        layer.newLine.setPoints(points); 

        layer.newLine.setZIndex(1);
        
    },
    //Build an anchor point of the polygon (when creating the polygon)
    buildAnchor: function(layer, x, y) {

        var self= this,
            len,
            radius = self.dotRadius / self.stage.getScale().x,
            strokeWidth = self.strokeWidth / self.stage.getScale().x,
            anchor = new Kinetic.Circle({
                x: x,
                y: y,
                radius: radius,
                stroke: "#666",
                fill: "#fc0",
                strokeWidth: strokeWidth,
                draggable: false,
                name: 'dot'
            });
        
        // Add special behavior for the first dot to close the line and draw the polygon
        len = self.newDots.length;
        if (len === 0) {
            // add hover styling
            anchor.on("mouseover", function(evt) {
                document.body.style.cursor = "pointer";
                this.setStrokeWidth((self.strokeWidth + 1) / self.stage.getScale().x);
            });

            anchor.on("mouseout", function() {
                document.body.style.cursor = "default";
                this.setStrokeWidth(self.strokeWidth / self.stage.getScale().x);
                layer.draw();
            });
            
            anchor.on('click', function(evt) {
                var len = self.newDots.length,
                    strokeWidth,
                    unixTimestamp,
                    id,
                    points = [],
                    lines,
                    poly,
                    dots;
                self.layer.finishedDrawingNewLine = true;                        
                self.newDots[0].off('click');
                self.layer.drawingNewLine = false;
                self.layer.draw();
                evt.cancelBubble = true;
                
                //Draw the filled polygon
                points = [];
                for (var i=0; i<len; i++) 
                    points = points.concat([self.newDots[i].attrs.x, self.newDots[i].attrs.y]);
                points.concat([self.newDots[0].attrs.x, self.newDots[0].attrs.y]);
                strokeWidth = self.strokeWidth / self.stage.getScale().x;
                poly = new Kinetic.Polygon({
                    points: points,
                    fill: '#ff0000',
                    stroke: 'black',
                    strokeWidth: self.lineStrokeWidth,
                    opacity: 0.3
                });
                
                
                unixTimestamp = new Date().getTime();
                id = 'poly' + self.crypto.hex_md5(self.imageSrc + unixTimestamp + dojo.toJson(points));
                poly.setId(id);
                
                //Make a function for this!
                dots = self.newDots;
                for (var i = dots.length; i--;){
                    // self.layer.remove(dots[i]);
                    dots[i].remove();
                }
                self.newDots = [];
                
                //Make a function for this
                lines = self.stage.get('.tempLine');
                for (var i = lines.length; i--;){
                    // self.layer.remove(lines[i]);
                    lines[i].remove();
                }
                  
                poly.on('click', function(e){
                    e.cancelBubble = true;
                    
                    if (typeof self.selectedShape === 'undefined' || self.selectedShape !== this){
                        self.selectShape(this);
                    }
                    self.layer.draw();
                });

                poly.on('dragstart',function(){
                    //self.modifyingShape = false;
                    self.selectedShape = null;
                    var dots = self.stage.get('.dot-' + this.getId());
                    for (var i = dots.length; i--;){
                        // self.layer.remove(dots[i]);
                        
                        dots[i].remove();
                    }
                    self.layer.draw();
                });
                poly.on('dragend',function(){
                    //self.modifyingShape = true;
                    self.selectedShape = this;
                    var pos = this.getPosition(),
                        dots = this.getPoints();
                    for (var i = dots.length; i--;){
                        self.dragPoints.push(self.buildTempAnchor(self.layer, this.getId(), dots[i].x + pos.x, dots[i].y + pos.y));
                    }
                    
                    this.setPosition({
                        x:0,
                        y:0
                    });
                    self.updatePoly(this);
                    self.layer.draw();
                });
                    
                    
                self.createdShapes.push(poly);
                self.layer.add(poly);
                  
                self.layer.newLine = null;
                self.layer.drawingNewLine = false;    
                self.isDrawing = false;
                
                self.layer.draw();
                    
                
                return;
            });
        }

        layer.add(anchor);
        return anchor;
    },
    //Update poligon
    updatePoly:function(pol){
        var self = this,
            shapeType = pol.shapeType;
        
        //Polygon
        if (shapeType === "Polygon" ){
            var dots = self.layer.get('.dot-' + pol.getId()),
                len = dots.length,
                points = [];
            for (var i=0; i<len; i++) 
                points = points.concat([dots[i].attrs.x, dots[i].attrs.y]);
            points.concat([dots[0].attrs.x, dots[0].attrs.y]);
            pol.setPoints(points);
        }
        
        //Handle others shapes

    },
    //Create a temp anchor when modifying the polygon
    buildTempAnchor:function(layer, classId, x, y) {

        var self= this,
        radius = self.dotRadius / self.stage.getScale().x,
        strokeWidth = self.strokeWidth / self.stage.getScale().x,
        anchor = new Kinetic.Circle({
            x: x,
            y: y,
            radius: radius,
            stroke: "#fc0",
            fill: "#ff0000",
            strokeWidth: strokeWidth,
            draggable: true,
            name: 'dot-' + classId
        });
        
        // add hover styling
        anchor.on("mouseover", function(evt) {
            document.body.style.cursor = "pointer";
            this.setStrokeWidth((self.strokeWidth + 1) / self.stage.getScale().x);
            layer.draw();
        });

        anchor.on("mouseout", function() {
            document.body.style.cursor = "default";
            this.setStrokeWidth(strokeWidth);
            layer.draw();
        });

        layer.add(anchor);
        return anchor;
    },
    hide:function(){
        this.inherited(arguments);
        var self = this;
        dojo.destroy(self._id + '-image-ann-container');
    },
    //Create the item associated to the created shape
    createItemFromCreatedShape:function(){
        //TODO Create multiple selector
        //At the current state only one selector is used
        var self= this,
            unixTimestamp = new Date().getTime(),
            points,
            scale = self.stage.getScale(),
            sw = self.stage.getWidth(),
            sh = self.stage.getHeight(),
            selectors = [],
            item;
        
        //for (var i in self.createdShapes){
        for (var i = self.createdShapes.length; i--;){
            //Shape is Polygon
            if (self.createdShapes[i].shapeType === 'Polygon'){
                points = self.createdShapes[i].getPoints();
                //for (var j in points){
                for (var j = points.length; j--;){
                    points[j].x = ((points[j].x *scale.x)/sw);
                    points[j].y = ((points[j].y *scale.y)/sh);
                }
                var shape = {
                    type: self.createdShapes[i].shapeType.toLowerCase(), 
                    points: points
                }
                //Add Created Shapes
                selectors.push(shape);
            }//Shape is Polygon
            
            //TODO More shapes
        }
        
        var parentImageXpointer;
        var imgs = dojo.query('img');
        for (var ii= 0; ii < imgs.length; ii++) {
            // the control on the class attribute avoids preview from being considered
            if (imgs[ii].src === self.imageSrc && (imgs[ii].getAttribute("class") == null || imgs[ii].getAttribute("class").indexOf("pundit-") === -1) ) {
                var helper = new pundit.XpointersHelper();
                parentImageXpointer = helper.getXpFromNode(imgs[ii]);
            }
        }
        
        item = {
            type: ['subject'],
            rdftype: [ns.fragments.image],
            //TODO User should add a label and a description for this item
            label: 'Fragment of ' + self.imageSrc.substring(self.imageSrc.lastIndexOf('/') + 1, self.imageSrc.length),
            description: 'This fragment represents a part of the image ' + self.imageSrc.substring(self.imageSrc.lastIndexOf('/') + 1, self.imageSrc.length),
            //Make Item unique even if has the same selector of other
            value: ns.fragmentBaseUri + 'image/' + self.crypto.hex_md5(self.imageSrc + unixTimestamp + dojo.toJson(selectors)),
            image: self.imageSrc,
            parentItemXP: parentImageXpointer,
            //Add a pundit-image-content for the images (so that you can handle different image resolution)
            //In this case use this as isPartOf (otherwise use the uri of the image)
            isPartOf: self.imageSrc,
            pageContext: _PUNDIT.tripleComposer.getSafePageContext(),
            selectors: selectors
        };
        //self.createdShapes = [];
        
        console.log('Ara che item DELLA MADONNA', item);
        item_pippo = item;
        
        return item;
    },
    
    selectShape:function(shape){
        var self = this;
        
        //Deselect other shape
        self.deselectShape();

        //Select the shape and make it draggable
        if (shape.shapeType === "Polygon"){
            var dots = shape.getPoints();
            self.dragPoints = [];
            //for (var i in dots){
            for (var i = dots.length; i--;){
                self.dragPoints.push(self.buildTempAnchor(self.layer, shape.getId(), dots[i].x, dots[i].y));
            }
            shape.setDraggable(true);
        }
        
        self.selectedShape = shape;
    },
    
    //TODO extend with multiple shape selectable
    deselectShape:function(){
        var self = this;
        
        if (self.selectedShape === null)
            return;
        
        if (self.selectedShape.shapeType === "Polygon"){
            var anchors = self.layer.get('.dot-' + self.selectedShape.getId());
            //for (var i in anchors){
            for (var i = anchors.length; i--;){
                // var anchor = anchors[i];
                // self.layer.remove(anchor);   
                anchors[i].remove()
            }
            self.selectedShape.setDraggable(false);
        }
        self.selectedShape = null;
        self.stage.draw();
    },
    
    //Update dot and line dimension when zooming the image to have the same dimension at every scale
    //DEBUG Not working properly :-(
    updateShapeRendering:function(scale){
        var self = this,
            shapes = self.layer.getChildren();
        
        //for (var i in shapes){
        for (var i = shapes.length; i--;){
            var shape = shapes[i];
            if (typeof shape.attrs['strokeWidth'] !== 'undefined'){
                shape.setStrokeWidth(self.strokeWidth / scale);
            }
            if (typeof shape.attrs['radius'] !== 'undefined'){
                shape.setRadius(self.dotRadius / scale);
            }
            if (typeof shape.attrs['dashArray'] !== 'undefined'){
                var dashArray = [];
                //for (var j in self.dashArray){
                for (var j = self.dashArray.length; j--;){
                    dashArray.push(self.dashArray / scale);
                }
                shape.attrs['dashArray'] = dashArray;
            }
        }
    },
    centerCanvasContainer:function(){
        var self = this;
        if (self.stage.getWidth() < self.containerSize.w){
            dojo.style(dojo.query(self.stage.getContent())[0], {
                left: 0.5 * (self.containerSize.w - self.stage.getWidth())
            });
        }else{
            dojo.style(dojo.query(self.stage.getContent())[0], {
                left: 0
            });
        }           
        if (self.stage.getHeight() < self.containerSize.h){
            dojo.style(dojo.query(self.stage.getContent())[0], {
                top: 0.5 * (self.containerSize.h - self.stage.getHeight())
            });
        }else{
            dojo.style(dojo.query(self.stage.getContent())[0], {
                top: 0
            });
        }
    },
    zoomIn: function() {
        var self= this;
        //console.log('STAGE: ' + self.stage.getWidth() + ', ' + self.stage.getHeight() + ', ' + self.stage.getScale().x);
        var scale = self.stage.getScale();
        scale.x += self.deltaScale;
        scale.y += self.deltaScale;
        
        self.stage.setWidth(parseInt(self.stage.getWidth() * (1 + self.deltaScale)));
        self.stage.draw();
        self.stage.setHeight(parseInt(self.stage.getHeight() * (1 + self.deltaScale)));
        self.stage.setScale({x:self.stage.getWidth()/self.iw,y:self.stage.getHeight()/self.ih});
        
        self.centerCanvasContainer();
        
        //TODO THis has to be done after centering the image
        //Fix this to scrool!
//            self.stage.setDragBounds({
//                left:(self.containerSize.w - dim.width * scale.x),
//                right: 0,
//                top: (self.containerSize.h - dim.height * scale.y),
//                bottom: 0
//            });
            
        self.updateShapeRendering(scale.x);
        self.stage.draw();
    }
});