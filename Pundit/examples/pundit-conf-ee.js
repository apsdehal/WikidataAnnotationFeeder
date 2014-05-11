// TODO: nice comment explaining where to find info on this file

var punditConfig = {

    debugAllModules: false,

    annotationServerBaseURL: 'http://188.226.156.66:8080/annotationserver/',

    vocabularies: [],

    useBasicRelations: true,

    modules: {
        
        'pundit.TooltipAnnotationViewer': {
            debug: false
        },

        'pundit.ng.EntityEditorHelper': {
            endpoint: "http://demo-cloud.api.korbo.org/v1",
            basketID: 1,
            active: true,
            debug: true
        },
        
        'pundit.ng.ImageAnnotatorHelper': {
            active: false,
            debug: false
        },
        
        'pundit.Help': {
            active: false
        },
        'pundit.NamedContentHandler': {
            active: false
        },
        
        'selectors': {},
        'annotators': {}
    }

};
