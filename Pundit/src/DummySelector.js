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
*/dojo.provide("pundit.DummySelector");
dojo.declare("pundit.DummySelector", pundit.BaseComponent, {

    //debug: false,
    defaultAnswer: 'http://dummy.default.answer/',

    constructor: function(options) {

        if ('answer' in options)
            this.answer = options.answer
        else
            this.answer = this.defaultAnswer;

        //this.onOkCallbacks = [];
        this.createCallback('Ok')

        this.log('DummySelector up and running');
        
    }, // constructor()

    openDialog: function() {
        this.fireOnOk(this.answer);
    }

});