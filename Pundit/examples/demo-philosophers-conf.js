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

    annotationServerBaseURL: 'http://as.thepund.it:8080/annotationserver/',

    vocabularies: [
        "https://dl.dropboxusercontent.com/u/769042/pundit-demo-philosophers.json",
        "https://dl.dropboxusercontent.com/u/769042/pundit-demo-philosophers-predicates.json"
    ],

    useBasicRelations: false,

    modules: {

        'pundit.Help': { showIntroductionAtLogin: false },
        
        'pundit.ContactHelper': {
            instances: [{
                title: 'Contact us!',
                comment: 'Drop us a line, give us some feedback!',
                list: 'demophilosophers'
            }]
        },

        'pundit.NotebookManager': { 
            active: true, 
            notebookSharing: false,
            askBaseURL: 'http://ask.as.thepund.it/#/myNotebooks/'
        },
        'pundit.ImageFragmentHandler': { active: false },
        'pundit.ImageAnnotationPanel': { active: false },
        'pundit.PageHandler': { active: false },
        'pundit.Recognizer': { active: false },
        'pundit.CommentTagPanel': { active: true, enableEntitiesExtraction: true },
        
        'selectors': {
            'Freebase': { active: true, sortBy: true, useTypeFilters: true },
            'DBPedia': { active: true },
            'Wordnet': { active: true },
            'DandelionPOI': { active: true, name: "DandelionPOI", label: "Dandelion POIS" },
            'DandelionGeo': { active: true, name: "DandelionGEO", label: "Dandelion GEO", limit: 999, useTypeFilters: true }
        }
    }

};