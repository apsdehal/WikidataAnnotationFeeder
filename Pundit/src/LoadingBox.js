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
*/dojo.provide("pundit.LoadingBox");
dojo.declare("pundit.LoadingBox", pundit.BaseComponent, {
    
    opts: {
        states: ['pundit-state-wait', 'pundit-state-ok', 'pundit-state-ko'],
        hideTimerMS: 2000,
        hideAfterClickMS: 6000
    },

    constructor: function(){
        var self = this, lb, lbw;
            
        self.hideTimer = null;
        self.jobTimers = {};
        self.currentState = self.opts.states[0];
        
        lb =  "<div id='pundit-lbw-box' class='pundit-hidden'>";
        lb += "<span class='pundit-lbw-box-icon'></span>";
        lb += "<span class='pundit-lbw-box-message'></span>"; 
        lb += "</div>";
        dojo.query('#pundit-gui-topbar').append(lb);

        lbw = "<div id='pundit-lbw' class='pundit-base'><ul id='pundit-lbw-box-list'></ul>";
        lbw += "</div>";
        dojo.query('body').append(lbw);

        self.initBehaviors();
    },
    
    initBehaviors: function() {
        var self = this;
        
        dojo.connect(dojo.query('#pundit-lbw-box .pundit-lbw-box-icon')[0], 'onclick', function(e) {
            self.log('Showing last events');
            self.showAll();
            self.hide(self.opts.hideAfterClickMS);
        });
        
    }, // initBehaviors

    _add: function(msg, state) {
        var self = this,
            markup = '',
            jobId = 'job' + (0|Math.random()*999999);
        
        markup += "<li class='"+state+"' id='"+jobId+"'><span class='pundit-lbw-box-icon'></span>";
        markup += "<span class='pundit-lbw-box-message'>"+msg+"</span></li>";
        dojo.query('#pundit-lbw-box-list').prepend(markup);

        // TODO: add a timer to hide the loading job if it takes too long, or it has been
        // delayed by onInit or other stuff

        self.hideJob(jobId);

        return jobId;
    },

    addJob: function(msg) {
        var self = this,
            jobId = self._add(msg, 'pundit-state-wait');
        self.log('Added job '+jobId);
        self.setLoadingBox(msg, 'pundit-state-wait');
        return jobId; 
    },
    
    setJobOk: function(jobId) {
        var self = this;
        
        dojo.query('#'+jobId).removeClass(self.opts.states.join(' ')).addClass('pundit-state-ok');
        dojo.query('#'+jobId).removeClass('pundit-hidden');
        self.setLoadingBox('Done: ' +dojo.query('#'+jobId+' .pundit-lbw-box-message').html(), 'pundit-state-ok');
        self.hideJob(jobId);
        self.log('Set OK on job '+jobId);
    },

    setJobKo: function(jobId) {
        var self = this;
        
        dojo.query('#'+jobId).removeClass(self.opts.states.join(' ')).addClass('pundit-state-ko');
        dojo.query('#'+jobId).removeClass('pundit-hidden');
        self.setLoadingBox('Error: ' +dojo.query('#'+jobId+' .pundit-lbw-box-message').html(), 'pundit-state-ko');
        self.hideJob(jobId);
        self.log('Set KKKO on job '+jobId);
    },
    
    setLoadingBox: function(msg, state) {
        var self = this;
        
        self.currentState = state || self.currentState;
        
        dojo.query('#pundit-lbw-box').removeClass(self.opts.states.join(' ')).addClass(self.currentState);
        dojo.query('#pundit-lbw-box .pundit-lbw-box-message').html(msg);
        self.showLoadingBox();
    },
    
    showAll: function() {
        var self = this;
        
        self.showLoadingBox();
        dojo.query('#pundit-lbw li').removeClass('pundit-hidden');
    },
    
    showLoadingBox: function() {
        var self = this;
        
        clearTimeout(self.hideTimer);
        dojo.query('#pundit-gui-topbar-title').addClass('pundit-hidden');
        dojo.query('#pundit-lbw-box, #pundit-lbw').removeClass('pundit-hidden');
    },
    
    hide: function(delay) {
        var self = this,
            delay = delay || self.opts.hideTimerMS;
        
        clearTimeout(self.hideTimer);
        self.hideTimer = setTimeout(function() { self._hide(); }, delay);
    },

    hideJob: function(jobId, delay) {
        var self = this,
            delay = delay || self.opts.hideTimerMS;
        
        clearTimeout(self.jobTimers[jobId]);
        self.jobTimers[jobId] = setTimeout(function() { self._hideJob(jobId); }, delay);
    },
    
    _hideJob: function(jobId) {
        var self = this;
        
        dojo.query('#'+jobId).addClass('pundit-hidden');
        
        // There's errors? Oh noes.. keep them there
        if (dojo.query('#pundit-lbw li.pundit-state-ko').length > 0) 
            self.setLoadingBox(dojo.query('#pundit-lbw li.pundit-state-ko .pundit-lbw-box-message').html(), 'pundit-state-ko');

        // There's still stuff to load, no errors
        else if (dojo.query('#pundit-lbw li.pundit-state-wait').length > 0) 
            self.setLoadingBox(dojo.query('#pundit-lbw li.pundit-state-wait .pundit-lbw-box-message').html(), 'pundit-state-wait');

        // If all the li are hidden, hide everything, we're fine.
        // Just hide everything, and keep last icon set
        if (dojo.query('#pundit-lbw li:not(.pundit-hidden)').length === 0)
            self.hide()
            
    }, // _hideJob()
    
    _hideAllJobs: function() {
        dojo.query('#pundit-lbw, #pundit-lbw li').addClass('pundit-hidden');
    },
    
    _hide: function() {
        var self = this;
        
        dojo.query('#pundit-gui-topbar-title').removeClass('pundit-hidden');
        dojo.query('#pundit-lbw-box').addClass('pundit-hidden');
        self._hideAllJobs();
    }
    
});