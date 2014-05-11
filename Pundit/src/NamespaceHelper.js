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
*/dojo.provide("pundit.NamespaceHelper");
dojo.declare("pundit.NamespaceHelper", pundit.BaseComponent, {

    constructor: function(options) {
        var self = this;
        
        self.rdf_type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
        self.rdf_value = "http://www.w3.org/1999/02/22-rdf-syntax-ns#value";
        self.rdf_property = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property";
        self.rdf_XMLLiteral = "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral";
        
        self.rdfs_label = "http://www.w3.org/2000/01/rdf-schema#label";
        self.rdfs_comment = "http://www.w3.org/2000/01/rdf-schema#comment";
        self.rdfs_resource = "http://www.w3.org/2000/01/rdf-schema#Resource";
        self.rdfs_literal = "http://www.w3.org/2000/01/rdf-schema#Literal";
        self.rdfs_seeAlso = "http://www.w3.org/2000/01/rdf-schema#seeAlso";
        
        // Types used to denote a webpage, a text fragment, an image, an annotation
        self.page = "http://schema.org/WebPage";
        self.image = "http://xmlns.com/foaf/0.1/Image";
        //self.image_fragment = "http://purl.org/pundit/ont/fragment-image";
        self.annotation = "http://www.openannotation.org/ns/Annotation";

        self.pundit_annotationId = "http://purl.org/pundit/ont/ao#id";
        self.pundit_annotationDate = "http://purl.org/dc/terms/created";
        self.pundit_authorName = "http://purl.org/dc/elements/1.1/creator";
        self.pundit_userName = "http://xmlns.com/foaf/0.1/name";
        self.pundit_authorURI = "http://purl.org/dc/terms/creator";
        self.pundit_hasTarget = "http://www.openannotation.org/ns/hasTarget";
        self.pundit_hasTag = "http://purl.org/pundit/ont/ao#hasTag";
        self.pundit_hasComment = "http://schema.org/comment";
        self.pundit_isIncludedIn = "http://purl.org/pundit/ont/ao#isIncludedIn";

        self.pundit_VocabCategory = "http://purl.org/pundit/vocab/category";
        
        // Annotation server constants
        self.annotationServer                   = _PUNDIT.config.annotationServerBaseURL;
        self.annotationServerApi                = self.annotationServer + "api/";
        self.annotationServerApiNotebooks       = self.annotationServer + "api/notebooks/";
        self.annotationServerApiNotebooksGraph  = self.annotationServer + "api/notebooks/graph/";
        self.annotationServerApiUsers       	= self.annotationServer + "api/users/";
        self.annotationServerApiCurrentNotebook = self.annotationServer + "api/notebooks/current";
        self.annotationServerApiAnnotations     = self.annotationServer + "api/annotations/";
        self.annotationServerMetadataSearch     = self.annotationServer + "api/annotations/metadata/search";
        self.annotationServerStorage            = self.annotationServer + "api/services/preferences/";
        self.annotationServerVocabProxy         = self.annotationServer + "api/services/proxy";
        self.annotationServerUsersCurrent       = self.annotationServer + "api/users/current";
        self.annotationServerUsersLogout        = self.annotationServer + "api/users/logout";
        self.annotationServerNotebooksActive    = self.annotationServer + "api/notebooks/active";
        self.annotationServerApiOwnedNotebooks  = self.annotationServer + "api/notebooks/owned";
        self.annotationServerContact            = self.annotationServer + "api/services/email";


        self.lodLiveURL  = "http://thepund.it/lodlive/app_en.html";

        self.notebooksNamespace = "http://swickynotes.org/notebook/resource/";
        self.usersNamespace = "http://swickynotes.org/notebook/resource/";
        
        
        // TODO x marco: move this into the component using these urls, as configurable parameters
        self.dbpediaSpotlightAnnotate = "http://spotlight.dbpedia.org/rest/annotate?text=";
        self.dbpediaKeywordSearch = "http://lookup.dbpedia.org/api/search.asmx/KeywordSearch";
        

        // RDF predicates used in items to translate to RDF the item's fields.
        // Not present in this list: 
        // .value which contains the full URL
        // .rdfData which can get created by a .createBucketFor* method
        self.items = {
            // Short label (usually 30-40 chars or so)
            label: self.rdfs_label,
            prefLabel: "http://www.w3.org/2004/02/skos/core#prefLabel",
            altLabel: "http://www.w3.org/2004/02/skos/core#altLabel",
            // Long description or content of a text fragment
            description: "http://purl.org/dc/elements/1.1/description",
            // Image contained in the text fragment, or associated with the item
            image: "http://xmlns.com/foaf/0.1/depiction",
            // RDF types of this item
            type: self.rdf_type,
            // Page where this item has been created
            pageContext: "http://purl.org/pundit/ont/ao#hasPageContext",
            isPartOf: "http://purl.org/dc/terms/isPartOf",
            
            // Selector
            selector: "http://www.w3.org/ns/openannotation/core/hasSelector",
            parentItemXP: "http://purl.org/pundit/ont/ao#parentItemXP"
        },
        
        // DEBUG: this has to be moved to each annotator, not in the general conf
        self.fragments = {
            image: "http://purl.org/pundit/ont/ao#fragment-image",
            text: "http://purl.org/pundit/ont/ao#fragment-text",
            named: "http://purl.org/pundit/ont/ao#named-content"
        },
        
        
        self.selectors = {
            polygon: {
                value: "http://purl.org/pundit/ont/ao#selector-polygon",
                label: "Polygonal Selector",
                description: "A polygonal selection described by the coordinates of the its points normalized according to the resource image and width"
            },
            rectangle: {
                vale: "http://purl.org/pundit/ont/ao#selector-rectangle",
                label: "Rectangular Selector",
                description: "A polygonal selection described by the coordinates of the top left vertex, width and height normalized according to the resource image and width"
            }
        }
        
        self.fragmentBaseUri = "http://purl.org/pundit/fragment/";
        self.selectorBaseUri = "http://purl.org/pundit/selector/";
        
        self.notebooks = {
            visibility: 'http://open.vocab.org/terms/visibility',
            created: 'http://purl.org/dc/terms/created',
            creator: 'http://purl.org/dc/terms/creator',
            creatorName: 'http://purl.org/dc/elements/1.1/creator',
            id: 'http://purl.org/pundit/ont/ao#id',
            includes: 'http://purl.org/pundit/ont/ao#includes',
            type: self.rdf_type,
            label: self.rdfs_label
        }
                
        self.log('NamespaceHelper configured and ready!');
        
    }, // constructor

    getLabelFromUri: function(uri) {
        var label;
        
        // Freebase custom labels
        if (uri.match(/http:\/\/www\.freebase\.com\/schema\//)) {
            label = uri.substring(31).replace(/\//g, ': ').replace(/_/g, ' ');
            return label;
        }
        
        // All other label types, take the last part
        label = uri.substring(uri.lastIndexOf('/') + 1);
        if (label.indexOf('#') !== -1)
            label = label.substring(label.lastIndexOf('#') + 1);

        return label;
    }

});