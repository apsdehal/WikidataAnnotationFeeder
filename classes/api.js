/**
 * Class for querying any wiki's api
 * @author Amanpreet Singh <apsdehal@gmail.com>
 * dependencies: dojo.js <http://dojotoolkit.org/
 *
 * @param url string URL of the api you want to interact with, default => Wikidata's API
 * @param lang string Language in which you want to query Wiki's api, default => 'en'
 * @param cb function Callback function to execute
 */

dojo.require("dojo.io.script");
var api = {
	url: 'https://www.wikidata.org/w/api.php',
	lang: 'en',
	searchEntity: function( type, search, cb ){
		var handle = this;
		var params = {
			action: 'wbsearchentities',
			type:type,
			format: 'json',
			language: this.lang,
			search: search,
		};

		var dojoObject = dojo.io.script.get({
				url: handle.url,
				handleAs: 'json',
				content: params,
				callbackParamName: 'callback',
				load: function( response ) {
						if( response.success == 1 )
							cb( response.search );
				},
		});
	},
}