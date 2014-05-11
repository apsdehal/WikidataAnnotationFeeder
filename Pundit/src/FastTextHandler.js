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
 * @class pundit.FastTextHandler
 * @extends pundit.BasePanel
 * @description ? TODO
 */
dojo.provide("pundit.FastTextHandler");
dojo.declare("pundit.FastTextHandler", pundit.BasePanel, {
    constructor:function(params){
        var self = this;

        self.initHTML();
        self.initContextMenu();
        self.initBehaviors();
        
        self._state = 0;
    },
    initHTML: function(){
        var self= this;
        self.log('Init HTML FastTextHandler Panel');

        var c =  '';
        c += '<div class="pundit-panel pundit-fth-container pundit-fth-state-0">';
        c += '  <div class="pundit-fth-fragment pundit-fth-first"> 111 </div>';
        c += '  <span class="pundit-pane-title"> .. with .. </span>';
        c += '  <div class="pundit-fth-fragment pundit-fth-second"> 222 </div>';
        
        c += '  <div class="pundit-fth-status-message">';
        c += '    <div class="pundit-fth-message-0">Select another text fragment!</div>';
        c += '  </div>';

        c += '  <div>';
        c += '    <span class="pundit-gui-button" id="pundit-fth-cancel-button"><span class="pundit-bicon pundit-remove-icon"></span><span>Cancel</span></span>';
        c += '    <span class="pundit-gui-button" id="pundit-fth-save-button"><span class="pundit-bicon pundit-save-icon"></span> Go to save </span>';
        c += '  </div>';

        c += '</div>';

        self.addHTMLContent(c);
    },
    initContextMenu: function(){
        var self = this;
        
        // TODO: add 2+2 actions to use FTH on my and page items
        // for steps 0 and 1
        
        cMenu.addAction({
            type: ['textSelectionHelper', 'annotatedtextfragment', 'bookmarkedtextfragment'],
            name: 'connectText0',
            label: 'Connect this text to..',
            showIf: function() {
                return self._state === 0;
            },
            onclick: function(item) {
                _PUNDIT.ga.track('cmenu', 'click', 'connect-this-text-to');
                self.step(item);
                return true;
            }
        });

        cMenu.addAction({
            type: ['textSelectionHelper', 'annotatedtextfragment', 'bookmarkedtextfragment'],
            name: 'connectText1',
            label: 'Connect to previously selected text',
            showIf: function() {
                return self._state === 1;
            },
            onclick: function(item) {
                _PUNDIT.ga.track('cmenu', 'click', 'connect-to-previously-selected-text');
                self.step(item);
                return true;
            }
        });


    },
    
    initBehaviors: function(){
        var self = this;
        
        dojo.connect(window, "storage", function(e) {
            
            // Skip all the local storage events, but the one on 
            // the state variable
            if (e.key !== "pundit-fth-state") {
                self.log('Localstorage event on other key, discarding');
                return false;
            }
            
            if (!(localStorage['pundit-fth-state'])) {
                self.log('ERROR: FTH state not defined?');
                return false;
            }
                    
            var lsState = parseInt(localStorage['pundit-fth-state'], 10),
                lsXP, lsText, lsItem;

            if (lsState === 0) {
                self.reset();
                self.log('Step changed to 0? CLOSE ALL!');
                
            } else if (lsState === 1) {

                if (!(localStorage['pundit-fth-first-xp'] 
                    && localStorage['pundit-fth-first-text'] 
                    && localStorage['pundit-fth-first-item'])) {
                    self.log('11: Something wrong, not everything is defined?!');
                    return false;
                }
                
                lsXP = localStorage['pundit-fth-first-xp'];
                lsText = localStorage['pundit-fth-first-text'];
                lsItem = JSON.parse(localStorage['pundit-fth-first-item']);
                
                self._state = 0;
                self.step(lsItem);
                
            } else if (lsState === 2) {

                if (!(localStorage['pundit-fth-second-xp'] 
                    && localStorage['pundit-fth-second-text'] 
                    && localStorage['pundit-fth-second-item'])) {
                    self.log('22: Something wrong, not everything is defined?!');
                    return false;
                }
                
                lsXP = localStorage['pundit-fth-second-xp'];
                lsText = localStorage['pundit-fth-second-text'];
                lsItem = JSON.parse(localStorage['pundit-fth-second-item']);
                
                self._state = 1;
                self.step(lsItem);
            }
        });
        
        dojo.connect(dojo.byId('pundit-fth-cancel-button'), "click", function() {
            _PUNDIT.ga.track('gui-button', 'click', 'pundit-fth-cancel-button');
            self.log('Cancel pressed: canceling panel');
            self.reset();
            return false;
        });

        dojo.connect(dojo.byId('pundit-fth-save-button'), "click", function() {

            _PUNDIT.ga.track('gui-button', 'click', 'pundit-fth-save-button');

            tripleComposer.addItemToSubject(self._first);
            tripleComposer.addItemToObject(self._second);

            semlibItems.addItem(self._first);
            previewer.buildPreviewForItem(self._first);
            semlibItems.addItem(self._second);
            previewer.buildPreviewForItem(self._second);
            
            if (!semlibWindow.isWindowOpen())
                semlibWindow.toggleWindow();
            
            // TODO: the panel is positioned before the end of the animation, GASP
            setTimeout(function() { 
                tripleComposer.dndTargetsClickHandler('', dojo.query('.pundit-tc-dnd.pre')[0], 'p');
                self.reset();
            }, 550);
            
            return false;
        });
        
        
    }, // initBehaviors()
    
    reset: function() {
        var self = this;
        
        self._state = 0;
        self._first = null;
        self._second = null;
        
        localStorage['pundit-fth-state'] = 0;
        localStorage.removeItem('pundit-fth-first-xp');
        localStorage.removeItem('pundit-fth-first-text');
        localStorage.removeItem('pundit-fth-first-item');
        localStorage.removeItem('pundit-fth-second-xp');
        localStorage.removeItem('pundit-fth-second-text');
        localStorage.removeItem('pundit-fth-second-item');
        
        self.hide();
    },
    
    step: function(item) {
        var self = this,
            text = item.description,
            xp = item.value;
        
        // TODO: text and xp are redundant, remove them from local storage
        // everywhere else, and just take them out from item
        
        switch (self._state) {
            case 0:

                localStorage['pundit-fth-first-xp'] = xp;
                localStorage['pundit-fth-first-text'] = text;
                localStorage['pundit-fth-first-item'] = JSON.stringify(item);
                localStorage['pundit-fth-state'] = 1;

                self._first = item;
                self._state = 1;

                dojo.query('.pundit-fth-first').innerHTML(text);
                dojo.query('.pundit-fth-second').innerHTML('..');
                dojo.query('.pundit-fth-container')
                    .removeClass('pundit-fth-state-1 pundit-fth-state-2')
                    .addClass('pundit-fth-state-0');

                self.show();
                
            break;
            
            case 1:

                localStorage['pundit-fth-second-xp'] = xp;
                localStorage['pundit-fth-second-text'] = text;
                localStorage['pundit-fth-second-item'] = JSON.stringify(item);
                localStorage['pundit-fth-state'] = 2;
                self._state = 2;
                self._second = item;

                dojo.query('.pundit-fth-second').innerHTML(text);
                dojo.query('.pundit-fth-container')
                    .removeClass('pundit-fth-state-0')
                    .addClass('pundit-fth-state-1');

                self.show();
            break;
            
            case 2:
                self.reset();
            break;
                
        }
        
    }
    

});