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
/**
 * @class pundit.AnalyticsHelper
 * @extends pundit.baseComponent
 * @description TODO
 */
dojo.provide("pundit.AnalyticsHelper");
dojo.declare("pundit.AnalyticsHelper", pundit.BaseComponent, {

    opts: {
        // Default tracking code for Pundit.
        // One might want to overwrite it.. or not.
        trackingCode: 'UA-45204976-2',
        doTracking: true
    },

    constructor: function(options) {
        var self = this;
        
        (function(i, s, o, g, r, a, m) {
            i['GoogleAnalyticsObject'] = r;
            i[r] = i[r] || function() {
                (i[r].q = i[r].q || []).push(arguments)
            }, i[r].l = 1 * new Date();
            a = s.createElement(o),
            m = s.getElementsByTagName(o)[0];
            a.async = 1;
            a.src = g;
            m.parentNode.insertBefore(a, m)
        })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

        // cookieDomain: none to make it work on localhost/ too, and maybe on domains 
        // where we dont have any control (bookmarklet?)
        ga('create', self.opts.trackingCode, {
           'cookieDomain': 'none',
           'cookieName': 'thepunditEventTracking',
           'cookieExpires': 20000
        });
        ga('send', 'pageview');
    },
    
    track: function(category, action, label, value) {
        if (this.opts.doTracking)
            ga('send', 'event', category, action, label, value);
    }

});