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
 * @class pundit.annotators.AnnotatorsConductor
 * @extends pundit.baseComponent
 * @description Drives the orchestra of pundit annotators
 * TODO TODO TODO TODO 
 */
dojo.provide("pundit.annotators.AnnotatorsConductor");
dojo.declare("pundit.annotators.AnnotatorsConductor", pundit.BaseComponent, {


    // TODO: this .opts field doesnt get extended by subclasses but overwritten!
    opts: {
        something: ['yes']
    },

    constructor: function(options) {
        var self = this;
        
        self.annotators = {};
        
        
        self.log('Annotators Conductor up and running');

    }, // constructor()
    
    registerAnnotator: function(anr) {
        var self = this;
        
        
        if (typeof(self.annotators[anr.itemRDFtype]) !== 'undefined') {
            self.log('ERROR: registering another annotator for rdf type '+anr.itemRDFtype+' ???');
            return;
        }
        
        self.annotators[anr.itemRDFtype] = anr;
        self.log('Registered annotator for type '+anr.itemRDFtype);
        
    }

    /*
    - creare item da quello che legge tramite server
    - fornire come salvare in RDF un item
    - fornire rappresentazioni HTML per preview
    - fornire rappr HTML per annotazione
    - fornire logica custom onmouseover dell'icona RDF
    */

});