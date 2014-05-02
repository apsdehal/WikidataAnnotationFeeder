/**
 * Class for querying any wiki api
 * @author Amanpreet Singh <apsdehal@gmail.com>
 * dependencies: dojo.js <http://dojotoolkit.org/
 *
 * @param url string URL of the api you want to interact with, default => Wikidata's API
 * @param lang string Language in which you want to query Wiki's api, default => 'en'
 */

dojo.require("dojo.io.script");
var api = {
	url: 'https://www.wikidata.org/w/api.php',
	lang: 'en',
	type: 'jsonp',
	handle: this,
	searchEntity: function( type, search ){
		var params = {
			action: 'wbsearchentities'
			type:type,
			language: this.lang;
			search: search,
			callback: ''
		}
		return dojo.io.script.get(
				url: handle.url,
				content: params,
			)
	}
}