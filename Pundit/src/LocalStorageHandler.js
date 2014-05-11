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
*/dojo.provide("pundit.LocalStorageHandler");
dojo.declare("pundit.LocalStorageHandler", pundit.BaseComponent, {
    
    //debug : false,
    
    storeType : "localStorage",
    
    constructor: function(options){
        if (typeof(localStorage) !== 'undefined')
            this.createCallback(['storeRead', 'storeSave']);
        else
            alert('Local Storage not available in your browser :-(');
    },
    
    exists:function(key){
        if ((typeof(localStorage[key]) !== 'undefined') && (localStorage[key] !== null)) 
            return true;
        else
            return false;
    },
    
    save:function(key, val){
        var currentTime = new Date();
        localStorage[key] = dojo.toJson({value: val, created: currentTime.getTime()});
    },
    
    read:function(key){
        //this.fireOnStoreRead(dojo.fromJson(localStorage[key]));
        return dojo.fromJson(localStorage[key]);
    },
    
    clearStore:function(){
        localStorage.clear();
    },
    
    clearKey:function(key){
        if (typeof(localStorage[key]) !== 'undefined'){
            localStorage.removeItem(key);
        }
    }
    
});


