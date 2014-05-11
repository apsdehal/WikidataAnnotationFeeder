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
*/
(function() {
    var h = document.getElementsByTagName('head')[0],
        d = document.createElement('script'),
        l = document.createElement('link');

    l.rel = 'stylesheet';
    l.href = 'https://as.thepund.it/bm/demo-philosophers/css/pundit.css';
    l.type = 'text/css';
    l.media = 'screen';
    l.charset = 'utf-8';
    h.appendChild(l);

    // Important: without var !!
    punditConfig = {

        debugAllModules: false,
        vocabularies: [
        ],

        useBasicRelations: true,
    
        modules: {

        }

    };

    djConfig = {
        afterOnLoad: true,
        useXDomain: true,
        baseUrl: "https://as.thepund.it/bm/demo-philosophers/dojo/",
        require: ["dojo.Bookmarklet"]
    };
    d.type = 'text/javascript';
    d.src = 'https://as.thepund.it/bm/demo-philosophers/dojo/dojo.xd.js';
    h.appendChild(d);

})();
