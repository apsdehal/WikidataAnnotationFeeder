// TODO: nice comment explaining where to find info on this file

var punditConfig = {

    debugAllModules: false,

    annotationServerBaseURL: 'http://demo-cloud.as.thepund.it:8080/annotationserver/',

    vocabularies: [],

    useBasicRelations: true,

    modules: {
        
        'pundit.TooltipAnnotationViewer': {
            debug: false
        },
        
        'pundit.ng.ImageAnnotatorHelper': {
            active: true,
            debug: true
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
