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
*/dojo.provide("pundit.PageItems");
dojo.declare("pundit.PageItems", pundit.Items, {
    constructor:function(){
        var self = this;
        //self.name = 'Items';
        self.name = 'page-items';
        self.init(self.name);
        self.initBehaviors(self.name);
        self.initContextualMenu();
    },
    
    initContextualMenu:function(){
        var self = this;
        //Add to myItems
        cMenu.addAction({
            //type: ['semlibItems'],
            type: ['pundit-page-items'],
            name: 'pageItemsToMyItems',
            label: 'Add to My Items',
            showIf: function(item) {
                return !semlibMyItems.uriInItems(item.value);;
            },
            onclick: function(item) {
                _PUNDIT.ga.track('cmenu', 'click', 'page-item-add-to-myitems');
                semlibMyItems.addItem(item, true);
                return true;
            }
        });
        //Remove from myItems
        cMenu.addAction({
            //type: ['semlibItems'],
            type: ['pundit-page-items'],
            name: 'removeVocabFromMyItems',
            label: 'Remove from My Items',
            showIf: function(item) { 
                return semlibMyItems.uriInItems(item.value);
            },
            onclick: function(item) {
                _PUNDIT.ga.track('cmenu', 'click', 'page-item-remove-from-myitems');
                semlibMyItems.removeItemFromUri(item.value);
                return true;
            }
        });
        cMenu.addAction({
            type: ['pundit-' + self.name],
            name: 'open'+ self.name +'ResourceItemWebPage',
            label: 'Open Web page',
            showIf: function(item) {
                if (_PUNDIT.items.isTerm(item))
                    return true;
                else
                    return false;
            },
            onclick: function(item) {
                _PUNDIT.ga.track('cmenu', 'click', 'page-item-open-web-page');
                window.open(item.value, 'SemLibOpenedWebPage');
                return true;
            }
        });
    }
});