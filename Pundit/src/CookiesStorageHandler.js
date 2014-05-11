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
*/dojo.provide("pundit.CookiesStorageHandler");
dojo.declare("pundit.CookiesStorageHandler", pundit.BaseComponent, {
    
    // storeType : "cookiesStorage",
    
    constructor: function(options){
        var self = this;
        dojo.cookie("mystestcookie","mytestcookie");
        if (typeof(dojo.cookie("mystestcookie")) !== 'undefined'){
            dojo.cookie("mystestcookie",{
                expires : -1
            });
            this.createCallback(['storeRead', 'storeSave']);
            self.log('Using Cookie storage');
        }else{
            alert('Cookie Storage cannot be created. :-( Check you cookies preferences!')
            return false;
        }
        
    },
    
    exists:function(key){
        if (typeof(dojo.cookie(key)) !== 'undefined')
            return true;
        else
            return false;
    },
    
    save:function(key, val){
        var currentTime = new Date();
        dojo.cookie(key, dojo.toJson({value: val, created: currentTime.getTime()}), {expires : 30});
    },
    
    read:function(key){
        this.fireOnStoreRead(dojo.fromJson(dojo.cookie(key)));
        //return dojo.fromJson(dojo.cookie(key));
    },
    
    clearStore:function(){
        //Delete only Javascript cookie
        var cookies = document.cookie.split(";");
        for(i=0; i < cookies.length; i++)
        {
            var cookieName = cookies[i].split("=")[0];
            dojo.cookie(cookieName, "", {expires : -1});
        }
    },
    
    clearKey:function(key){
        dojo.cookie(key, '', {expires:-1});
    }
});

