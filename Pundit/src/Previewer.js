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
 * @class pundit.Previewer
 * @extends pundit.baseComponent
 * @description Offers facilities to create a nice and common HTML preview
 * of a given pundit item, extracting its properties from its bucket.<br>
 * Shows, hides and sets loading on demand.
 */
dojo.provide('pundit.Previewer');
dojo.declare('pundit.Previewer', pundit.BaseComponent, {

    /*
    TODO: how to make this configurable? We are extracting stuff from the
    bucket.. 
    opts: {
        fields: ['url', 'label', 'altLabel', 'description', 'image', 'types', 'moreInfoHref', 'moreInfoName', 'html']
    },
    */
    
    // TODO: move this comment to some @property and some into the class declaration
    /*
    * @constructor
    * @description Initializes the component
    * @param options {object}
    * @param options.debug {boolean} wether or not to activate debug mode for this component
    */
    constructor: function(options) {
        var self = this;
        self.previewCache = {};
        self.currentSelectedItem = null;
        self.currentPreviewURI = null;
        self.log('Previewer up and running!');
    },
    
    /**
    * @method setLoading
    * @description Sets or unsets the loading state for the preview area.
    * @param v {boolean} If true the loading state will be activated, if
    * false will be deactivated.
    */
    setLoading: function(v, containerSelector) {
        if (typeof(containerSelector) === 'undefined')
            containerSelector = '#pundit-gui-preview';
        var r = dojo.query(containerSelector),
            c = 'pundit-panel-loading';
        return (v) ? r.addClass(c) : r.removeClass(c);
    },
    
    /**
    * @method buildPreviewForItem
    * @description Extracts informations from the passed item and creates a
    * cached version of the preview for future uses.
    * @param item {object - pundit item} a semlib item, with at least its bucket and
    * a value.
    * @param item.rdfData {object - triplesBucket} The associated triplesBucket 
    * to extract the informations from.
    * @param item.value {string - URI} Unique URI of this item's resource.
    */
    buildPreviewForItem: function(item) {
        var self = this,
            pr = "",
            b = new pundit.TriplesBucket({bucket: item.rdfData}),
            label = b.getObject(item.value, ns.items.label)[0] || item.label,
            prefLabel = b.getObject(item.value, ns.items.label)[0] || '',
            image = b.getObject(item.value, ns.items.image)[0] || '',
            selector = b.getObject(item.value, ns.items.selector)[0] || '',
            altLabel = b.getObject(item.value, ns.items.altLabel).join(', ') || '',
            description = b.getObject(item.value, ns.items.description)[0] || 'No description available',
            types = b.getObject(item.value, ns.items.type) || [];
        
        pr += "<div class='pundit-preview-main-info'>";
        pr += "<h4>Preview </h4>";
        pr += "<h2>"+label+"</h2>";
        if ((types[0] === ns.fragments.image || types[0] === ns.image)){
            pr += "<div id='pundit-preview-image-container' style='display:inline-block;position:relative'><img src='"+image+"' class='pundit-image-preview-large'></img></div>";
        }
            
        pr += "<p>";
        if (image !== ''){
            if (!(types[0] === ns.fragments.image || types[0] === ns.image)){
                pr += "<img src='"+image+"'>";
            }
            
        }
            
        pr += description+"</p>";

        // Alt label: "also known as" from freebase
        if (altLabel !== '' && altLabel !== label) pr += "<h5><em>Also known as :</em> "+altLabel+"</h5>";
        pr += "</div>";
        // If the item has valid types, show them and the goto link
        if (types.length > 0) {
            pr += "<ul><li class='header'>Types :</li>";

            // TODO: what to do if there's no type label? 
            for (var j=types.length; j--;) 
                if (b.getObject(types[j], ns.rdfs_label).length > 0)
                    pr += "<li>"+b.getObject(types[j], ns.rdfs_label)[0]+"</li>";
                else
                    pr += "<li>"+types[j]+"</li>";
            pr += "</ul>";

            pr += "<a href='"+item.value+"' target='_blank'>More info...</a>";
			if (_PUNDIT.config.enableSemanticExpansion) {
				pr += "<br />";
				//TODO: remove this very dirty hack!
				var linkForLodLive = item.value;
				if (linkForLodLive.indexOf("europeana.eu") !== -1) {
					var pieces = linkForLodLive.split("/");
					linkForLodLive = "http://data.europeana.eu/item/" + pieces[pieces.length-2] + "/" + pieces[pieces.length-1];
				}
				pr += "<a href='"+ ns.lodLiveURL + "?" + encodeURI(linkForLodLive) + "' target='_blank'>(NEW!) Explore in LodLive</a>";	
			}
			

        } else if (b.bucket.length === 0) {
            pr += "<ul><li class='header'>Data type:</li>";
            pr += "<li>Literal</li></ul>"
        }

        self.log('Created preview for '+label)
        self.previewCache[item.value] = pr;
        
    }, // buildPreviewForItem()

    /**
    * @method exists
    * @description Check if a preview for the given URI is present.
    * @param uri {string} Uri of the resource
    * @return {boolean} True if exists, false otherwise
    */
    exists: function(uri) {
        return typeof(this.previewCache[uri]) !== 'undefined';
    },

    /**
    * @method show
    * @description Shows the preview for a given resource in the preview area.
    * @param uri {string} Uri of the resource
    */
    show: function(uri, containerSelector) {
        var self = this;
        
        // Already showing this preview
        if (self.currentPreviewURI === uri)
            return;

        self.currentPreviewURI = uri;

        if (!self.exists(uri)) {
            self.log('ERROR: called show() for unknown uri'+ uri);
            self.hide();
            return;
        }
        
        if (typeof(containerSelector) === 'undefined')
            containerSelector = '#pundit-gui-preview';
        
        self.log('Displaying preview for '+uri);

        dojo.query(containerSelector).removeClass('pundit-panel-loading');
        dojo.query(containerSelector).html(self.previewCache[uri]);
        
        //Add image fragment on image
        //TODO Handle multiple selectors!
        var points = [];
        var item = _PUNDIT.items.getItemByUri(uri);
        if (typeof item === 'undefined')
            return;
        if (item.rdftype[0] === ns.fragments.image){
            var style = dojo.style(dojo.query('#pundit-preview-image-container img')[0]),
            w = style.width.replace('px',''),
            h = style.height.replace('px','');
            var s = new Kinetic.Stage({
                container: "pundit-preview-image-container",
                width: w,
                height: h
            });
            // dojo.style(dojo.byId('pundit-preview-image-container'), {
            dojo.style(s.getContent(), {
                left: style.marginLeft,
                top: style.marginTop,
                position: 'absolute'
            });
            var l = new Kinetic.Layer();
            s.add(l);
            
            for (var i = item.selectors.length; i--;){
                points = [];
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
                        fill: '#FFCC00',
                        stroke: 'black',
                        strokeWidth: 3,
                        opacity: 0.75
                    });
                    l.add(poly);
                    s.draw();
                }
            
            }
            
        }
        
        
    }, // show()
    
    /**
    * @method hide
    * @description Hides the preview area.
    */
    hide: function(containerSelector) {
                
        if (typeof(containerSelector) === 'undefined')
            containerSelector = '#pundit-gui-preview';            

        dojo.query(containerSelector).empty();
    }

});