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
*/// TODO: nice comment explaining where to find info on this file

var punditConfig = {

    debugAllModules: false,

    annotationServerBaseURL : 'http://demo.as.thepund.it:8080/annotationserver/',

    vocabularies: [],

    useBasicRelations: true,

    modules: {

        'pundit.TooltipAnnotationViewer': {
            showInvalidXPointers: false,
            allowAnnotationEdit: true,
            debug: false
        },
        'pundit.NamedContentHandler': {
            active: false,
            debug: false
        },
        
        'pundit.Help': {
            introductionFile: 'example-introduction.html',
            introductionWindowTitle: 'Welcome to Pundit examples! :)',
            showIntroductionAtLogin: true
        },
        
        'pundit.ContactHelper': {
            instances: [
                {
                    title: 'Contact us!',
                    comment: 'Example form, say something to us!',
                    list: 'test2'
                }
            ]
        },

        'pundit.NotebookManager': {
            active: false
        },
        'pundit.ImageFragmentHandler': {
            active: true
        },
        'pundit.ImageAnnotationPanel': {
            active: true
        },
        'pundit.PageHandler': {
            active: false
        },
        'pundit.Recognizer': {
            active: false
        },
        'pundit.CommentTagPanel': {
            active: true,
            enableEntitiesExtraction: true
        },
        'pundit.selectors.VocabSelector': {
            debug: false
        },
        
        'selectors': {
            
            'EuropeanaEDM': {
                name: 'europeanaEDM', label: 'Europeana EDM', active: false
            }
        },
        'annotators': {}
    }

};