// TODO: nice comment explaining where to find info on this file

var punditConfig = {

    debugAllModules: false,

    annotationServerBaseURL: 'http://as.thepund.it:8080/annotationserver/',

    vocabularies: [

        // 'http://metasound.dibet.univpm.it/release_bot/build-development/examples/vocabs/dante_sample_taxonomy.jsonp',

        // DEBUG: christian's relations
        //'http://korbo.netseven.it/backend.php/21?callback=_PUNDIT.vocab.initJsonpVocab',
        
        // DEBUG: christian's relations
        //'http://korbo.netseven.it/backend.php/68?callback=_PUNDIT.vocab.initJsonpVocab'
        
        // Wittgesntein Realtions
        // 'http://metasound.dibet.univpm.it/release_bot/build-development/examples/vocabs/wittgestein-relations.jsonp',
        // Wittgesntein Taxonomy
        // 'http://metasound.dibet.univpm.it/release_bot/build-development/examples/vocabs/wittgestein-taxonomy.jsonp'
        
        // 'http://www.wittgensteinsource.org/js/witt_subjects_taxonomy.json',
        // 'http://www.wittgensteinsource.org/js/witt-test.json',
        // 'http://www.wittgensteinsource.org/js/witt_sources_taxonomy.json',
        // 'http://www.wittgensteinsource.org/js/witt_relations.json'
        // 'http://thepund.it/vocabularies/simplewitt.jsonp'
        // 'http://thepund.it/vocabularies/simplewitt_rel.jsonp'

    ],

    useBasicRelations: true,

    modules: {
        
        'pundit.Help': {
            introductionFile: 'example-introduction.html',
            introductionWindowTitle: 'Welcome to Pundit examples! :)',
            showIntroductionAtLogin: true
        },
        'pundit.NamedContentHandler': {
            active: false
        },
        
        'selectors': {},
        'annotators': {}
    }

};
