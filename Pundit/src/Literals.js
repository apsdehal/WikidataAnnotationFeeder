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
*/dojo.provide('pundit.Literals');
dojo.declare('pundit.Literals', pundit.BaseComponent, {
    
    constructor: function(options) { },
            
    createLiteralItem: function(literalValue){
        var item = {},
            label = literalValue;
        
        if (typeof(literalValue) !== 'undefined') {            
        
            if (label.length > 20)
                label = literalValue.substring(0, 20) + '...';
        
            item.type = ['object'];
            item.value = literalValue;
            item.rdftype = [ns.rdfs_literal];
            item.rdfData = [];
            item.label = label;
            
            // TODO DEBUG: x marco perche' il literal creator dovrebbe chiamare previewer? :|
            previewer.buildPreviewForItem(item);
            return item;
        }
    }
});
