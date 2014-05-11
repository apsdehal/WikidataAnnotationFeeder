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
 * @class pundit.PageHandler
 * @extends pundit.baseComponent
 * @description Provides a GUI (floating Panel) and set of facilities 
 * for the creation of comments and tags. Tags can be retrieved both using 
 * DBpedia Spotlight (annotating the text comment). Tags can be removed and navigated
 * Created comments and tags are then saved to pundit annotation server
 */
dojo.provide("pundit.PageHandler");
dojo.declare("pundit.PageHandler", pundit.BaseComponent, {

    constructor: function(options) {
        var self = this;
        //TODO If use it put on onother place
        (function() {   
            var h = document.getElementsByTagName('head')[0],
            d = document.createElement('script');
            d.type = 'text/javascript';
            d.src = 'https://dl.dropbox.com/u/11242318/html2canvas.js';
            h.appendChild(d);
        })();
        
        self.saver = new pundit.AnnotationWriter({debug: self.opts.debug});
        var a = '<form id="pundit-upload-form" method="post" action="http://192.168.65.101:8080/annotationserver/api/services/upload/image" enctype="multipart/form-data"  style="display:none">';
            a+= '<input id="pundit-file" type="file" name="file" size="45" /></form>';
            a+= '<canvas id="pundit-screenshot" style="z-index:9999999999999999999999999; background: white; width:400px; position:fixed; top:100px; left:400px; display:none; border:solid 5px"></canvas>';
        dojo.query('body').append(a);
        
//        a = '<div id="pundit-page-annotation-container" style="margin-top:20px;background:red"><div id="pundit-page-annotation-anchor" ></div></div>';
//        dojo.query('body').prepend(a);
//        
//        semlibItems.addItem({
//                value: self.fakePageXpointer,
//                label: "I'm a fake item living",
//                rdftype: 'http://fake.org/fake',
//                type: 'subject',
//                description: 'Fake'
//            });
        
//        _PUNDIT.init.onInitDone(function(){
//            self.fakePageXpointer = tooltip_viewer.helper.getXpFromNode(dojo.byId('pundit-page-annotation-anchor'));
//            
//        })
        
        
        self.initBehaviors();
    },
    
    initBehaviors:function(){
        var self = this;

        dojo.connect(dojo.byId('pundit-screenshot'), 'onclick', function(){
            dojo.style(dojo.byId('pundit-screenshot'), 'display', 'none');
        });

        cMenu.addAction({
            type: ['punditThisPageMenu'],
            name: 'AddPageToMyItems',
            label: 'Add This Page to My Items',
            showIf: function() {
                var item = _PUNDIT['items'].itemContainers.MyItems.getItemFromUri(_PUNDIT.tripleComposer.getSafePageContext());
                return (typeof(item) === 'undefined');
            },
            onclick: function() {
                var item = _PUNDIT['pageHandler'].createItemFromPage();
                previewer.buildPreviewForItem(item);
                semlibMyItems.addItem(item, true);
                semlibMyItems.show_pundittabfiltermyitemspages();
                return true;
            }
        });
        
        cMenu.addAction({
            type: ['punditThisPageMenu'],
            name: 'AddCommentTagToPage',
            label: 'Comment or Tag this page',
            showIf: function() { 
                return true;
            },
            onclick: function() {
                var item = _PUNDIT['items'].getItemByUri(_PUNDIT.tripleComposer.getSafePageContext());
                if (typeof(item) === 'undefined')
                    item =_PUNDIT['pageHandler'].createItemFromPage();

                _PUNDIT['commentTag'].initPanel(item, "Comment and tags");
                // DEBUG: This is temporally set to false when the panel is used as an Entity Extraction tool :)
                _PUNDIT['commentTag'].saveComment = true;
                return true;
            }
        });

    },
    
    createItemFromPage:function(){
        var self = this,
            item = {};
        item = self.getPageMetadata();
        item.value = _PUNDIT.tripleComposer.getSafePageContext();
        item.label = document.title || "No title";
        if (typeof item.description === 'undefined'){
            item.description = item.label;
        }
        item.rdftype = [ns.page];
        item.type = ['subject'];
        item.rdfData = semlibItems.createBucketForPage(item).bucket;
        
        //self.createScreenshot();
        
        return item;
    },
    
    getPageMetadata:function(){
        var self = this;
        var metadata ={};
        dojo.query('meta').forEach(function(item){
            if (item.name === 'keywords'){
                if (typeof item.content !== 'undefined')
                    metadata.keywords = item.content.split(',');
            }
            if (item.name === 'description'){
                if (typeof item.content !== 'undefined')
                    metadata.description = item.content;
            }
            //Add this to item?
            if (item.name === 'author'){
                if (typeof item.content !== 'undefined')
                    metadata.author = item.content;
            }
        });
        return metadata;
    },
    
    createScreenshot:function(){
//        if (options && options.profile && window.console && window.console.profile) {
//            console.profile();
//        }
        var self= this,
            date = new Date(),
            html2obj,
            //$message = null,
            //timeoutTimer = false,
            timer = date.getTime(),
            options = {};
        options.canvas = dojo.byId('pundit-screenshot');
        options.onrendered = options.onrendered || function( canvas ) {
            var $canvas = dojo.byId('pundit-screenshot');
            dojo.style(dojo.byId('pundit-screenshot'), {
                display: 'block',
                width:'400px',
                height: ''
            });
            //finishTime = new Date();

//            if (options && options.profile && window.console && window.console.profileEnd) {
//                console.profileEnd();
//            }
//            $canvas.css({
//                position: 'absolute',
//                left: 0,
//                top: 0
//            }).appendTo(document.body);
//            $canvas.siblings().toggle();

//            $(window).click(function(){
//                $canvas.toggle().siblings().toggle();
//                throwMessage("Canvas Render " + ($canvas.is(':visible') ? "visible" : "hidden"));
//            });
//            throwMessage('Screenshot created in '+ ((finishTime.getTime()-timer)) + " ms<br />",4000);

            // test if canvas is read-able
            try {
                //TODO Check browser support
                //Probably is not supported on Android < 3
                var dataUri = $canvas.toDataURL();
                var blob  = self.dataURItoBlob(dataUri);
                
                //var fd = new FormData(document.forms[0]);
                //document.form[0].file.value = blob;
                //fd.append('image',blob);
                //fd.append("fileName", "The name that I\'ve choosen");
                //TODO Use Base 64 to upload the image
                //self.saver.uploadImage(fd);
                //Convert to Bin
                
                // Upload
                
            } catch(e) {
                if ($canvas.nodeName.toLowerCase() === "canvas") {
                    // TODO, maybe add a bit less offensive way to present this, but still something that can easily be noticed
                    alert("Canvas is tainted, unable to read data");
                }
            }
        };

        html2obj = html2canvas([document.body], options);
    },
    dataURItoBlob:function(dataURI) {
        var binary = atob(dataURI.split(',')[1]);
        var array = [];
        for(var i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        return new Blob([new Uint8Array(array)], {type: 'image/jpg'});
    }
});

