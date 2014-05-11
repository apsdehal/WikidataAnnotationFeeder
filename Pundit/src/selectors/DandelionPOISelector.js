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
 * @class pundit.selectors.DandelionPOISelector
 * @extends pundit.selectors.SelectorBase
 * @description
 * TODO TODO TODO TODO
 */
dojo.provide("pundit.selectors.DandelionPOISelector");
dojo.declare("pundit.selectors.DandelionPOISelector", pundit.selectors.SelectorBase, {

    opts: {
        // Number of items to display in the suggestion list
        limit: 30,

        // Ms to wait after a keystroke before querying the reconciliator service
        keyInputTimerLength: 500,
        keywordMinimumLength: 3,

        layouts: ['list', 'tile'],
        dandelionBaseURL: 'https://dandelion.eu/api/v1/datagem/25/data.json',
        basePOICategory: ["http://www.freebase.com/schema/location/location",
                          "http://dbpedia.org/ontology/Place",
                          "http://schema.org/Place",
                          "http://www.w3.org/2003/01/geo/wgs84_pos#SpatialThing"]
    },

    constructor: function(options) {
        var self = this;

        self.requests = {};
        self.log('Selector '+self.name+' up and running.');
    }, // constructor()

    getItemsForTerm:function(term, func, errorFunc, maxRes){
        var self = this;
        if (typeof(self.limit) === 'undefined'){
            maxRes = 10;
        }else{
            maxRes = self.limit;
        }
        // TODO: cache the results? 
        self.requests[term] = {f: func, items: [], done: 0};

        //Add function for error
        if (typeof errorFunc !== 'undefined')
            self.requests[term].ef = errorFunc;

        self.requests[term].jobId = _PUNDIT.loadingBox.addJob('DandelionPOI query: '+term);

        var args ={
            url: self.opts.dandelionBaseURL,
            callbackParamName: "callback",
            timeout: 2000,
            failOk: true,
            content: {
                '$limit': self.opts.limit,
                '$where': 'icontains(name, "' + term + '")',
                '$order': 'name'
            },
            load: function(r) {
                self.requests[term].len = r.length;
                if (r.length === 0) {
                    self._itemRequestDone(term);
                    return;
                }

                //for (var i in r){
                for (var i = r.length;i--;){
                    var item = {};

                    item.type = ['subject']
                    item.value = r[i].acheneID;
                    item.label = r[i].name;

                    item.description = r[i].municipality + ' (' + r[i].province + ')';

                    item.rdftype = [r[i].category];
                    for(var j = self.opts.basePOICategory.length; j--;)
                        item.rdftype.push(self.opts.basePOICategory[j]);

                    item.rdfData = semlibItems.createBucketForItem(item).bucket;
                    self.requests[term].items.push(item);
                    //self._getItemDescription(item, word);
                }
                self._itemRequestDone(term);

            },
            error: function(error) {
                self.log(error);
                func([]);
                _PUNDIT.loadingBox.setJobKo(self.requests[term].jobId);
                if (typeof self.requests[term].ef !== 'undefined')
                    self.requests[term].ef();
                return false;
            }
        };
        var deferred = dojo.io.script.get(args);
    },

    _itemRequestDone: function(term) {
        var self = this,
            req = self.requests[term];

        //Request has been canceled
        if (typeof req.canceled !== 'undefined')
            return

        self.log('Done loading items for term '+term+'.. calling the function.');
        req.f(req.items, term);

        _PUNDIT.loadingBox.setJobOk(req.jobId);

    },

    cancelRequests:function(){
        var self = this,
            reqs = self.requests;

        for (var i in reqs){
            reqs[i].len = 0;
            self._itemRequestDone(i);
            reqs[i].canceled = true;
        }
    }
});


