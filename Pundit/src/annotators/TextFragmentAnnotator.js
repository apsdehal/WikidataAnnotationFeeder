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
 * @class pundit.annotators.TextFragmentAnnotator
 * @extends pundit.baseComponent
 * @extends pundit.annotators.AnnotatorsBase
 * @description TODO TODO TODO TODO 
 */
dojo.provide("pundit.annotators.TextFragmentAnnotator");
dojo.declare("pundit.annotators.TextFragmentAnnotator", pundit.annotators.AnnotatorsBase, {

    // TODO: this .opts field doesnt get extended by subclasses but overwritten!
    opts: {
        something: ['yes']
    },

    constructor: function(options) {
        var self = this;
        
        self.itemRDFtype = "http://purl.org/pundit/ont/ao#fragment-text";
        self.selectorRDFtype = "http://purl.org/pundit/ont/ao#selector-xpointer";
        
        self.log('TextFragmentAnnotator up and running!');

    }, // constructor()
    
    registerAnnotator: function() {
        var self = this;
        _PUNDIT.conductor.register(self);
    }, // registerAnnotator()
    
    createItem: function() {
        
    },
    
    getItemRDF: function() {
        
    },
    
    getItemPreview: function() {
        
    },
    
    getItemAnnotationHTML: function() {
        
    },
    
    handleAnnotationIconMouseOver: function() {
        
    }


    /*
    - creare item da quello che legge tramite server
    - fornire come salvare in RDF un item
    - fornire rappresentazioni HTML per preview
    - fornire rappr HTML per annotazione
    - fornire logica custom onmouseover dell'icona RDF
    */

});