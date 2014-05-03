/**
 * Class for querying any wiki's api
 * @author Amanpreet Singh <apsdehal@gmail.com>
 * dependencies: dojo.js <http://dojotoolkit.org/
 *
 * @param url string URL of the api you want to interact with, default => Wikidata's API
 * @param lang string Language in which you want to query Wiki's api, default => 'en'
 */

//Including the required dojo js file
dojo.require("dojo.io.script");
var API = {
	url: 'https://www.wikidata.org/w/api.php',
	lang: 'en',

	/**
	 * Basic setup function for taking up various type of actions for AJAX requests
	 *
	 * @param params object Parameters to be passed to AJAX call
	 * @param cb function Callback function to be called on the result of the query that happened.
	 */

	basicCall: function( params , cb ){
		var handle = this;

		dojo.io.script.get({
			url: handle.url,
			handleAs: 'json',
			content: params,
			callbackParamName: 'callback',
			load: function( response ) {
					if( response.success == 1 )
						cb( response );
			},
		});
	},

	/**
	 * Function to get a specific type of entity from wikiapi
	 *
	 * @param type string Defines what to search among Item and Properties
	 * @param search string Basic parameter to be searched
	 * @param cb function Callback to be applied on the result.
	 */

	searchEntities: function( type, search, cb ){
		var params = {
			action: 'wbsearchentities',
			type:type,
			format: 'json',
			language: this.lang,
			search: search,
		};
		this.basicCall( params, cb );
	},

	/**
	 * Function to get an arsenal of items from wikiapi
	 *
	 * @param search string Basic parameter to be searched
	 * @param cb function Callback to be applied on the result.
	 */

	searchItems: function( search, cb ){
		this.searchEntities('item', search, cb);
	},


	/**
	 * Function to get an arsenal of properties from wikiapi
	 *
	 * @param search string Basic parameter to be searched
	 * @param cb function Callback to be applied on the result.
	 */

	searchProperties: function( search, cb ){
		this.searchEntities('property', search, cb);
	},

	/**
	 * Function to get an arsenal of value items from wikiapi
	 *
	 * @param search string Basic parameter to be searched
	 * @param cb function Callback to be applied on the result.
	 */

	searchValues: function( search, cb ){
		this.searchEntities('item', search, cb);
	},

	getEntities: function( id, cb ){
		var params = {
			action: 'wbgetentities',
			ids:id,
			format: 'json',
		};
		this.basicCall(params, cb);
	}
}