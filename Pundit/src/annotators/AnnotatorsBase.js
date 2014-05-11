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
 * @class pundit.annotators.AnnotatorsBase
 * @extends pundit.baseComponent
 * @description TODO TODO TODO TODO 
 */
dojo.provide("pundit.annotators.AnnotatorsBase");
dojo.declare("pundit.annotators.AnnotatorsBase", pundit.BaseComponent, {


    // TODO: this .opts field doesnt get extended by subclasses but overwritten!
    opts: {
        something: ['yes']
    },

    constructor: function(options) {
        var self = this;

    }, // constructor()
        
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