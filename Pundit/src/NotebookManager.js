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
 * @class pundit.NotebookManager
 * @extends pundit.BasePanel
 * @description Provides a GUI (floating Panel) for showing items grouped according 
 * from their provenance ('My Item', 'Page Items', Vocabularies)
 */
dojo.provide("pundit.NotebookManager");
dojo.declare("pundit.NotebookManager", pundit.BasePanel, {
    constructor:function(params){
        var self = this;
        self.ownedNotebooksIds = [];
        self.activeNotebooksIds = [];
        self.notebooks = {};
        self.othersNotebooks = {};
        self.requests = {};
        self.initHTML();
        self.initContextMenu();
        self.initBehaviors();
        self.reader = new pundit.AnnotationReader();
        self.reader.onError(function(){
            console.log("An error occurred reading notebook information. ;(");
            self.setPanelLoading(false,'owned');
            self.setPanelLoading(false,'others' );
        });
        self.writer = new pundit.AnnotationWriter();
        self.writer.onError(function(){
            console.log("An error occurred writing notebook information. ;(");
            self.setPanelLoading(false,'owned');
            self.setPanelLoading(false,'others');
        });
        
        //FIXXX TODO tooltip_viewer shouldn't do this...
        tooltip_viewer.onNotebookActivationChanged(function(){
            if (self.isVisible())
                self.updateOtherNotebook();
        });
        self.notebookSharePanel= new pundit.BasePanel({
            drag:true,
            title:'Share Notebook',
            name:'notebook-sharePanel'
        })
    },
    initHTML:function(){
        var self= this;
        self.log('Init HTML Notebook Panel');
        //Add content to the base container
        var c =  '<div class="pundit-panel"><span>Your annotations are written in the current notebook.</br>Your current notebook is: &nbsp;</span><span id="pundit-current-notebook-name"></span></div>'
            c += '<div class="pundit-rp-notebook-creation pundit-panel" style="width:390px;">';
            c += '   <span class="pundit-pane-title">Create a new Notebook</span></br>';
            c += '   <span>Notebook Name:</span><input type="text" id="pundit-notebook-name-input" style="width:200px;margin-left:10px;"></input><input id="pundit-create-notebook-button" type="button" value="Create" disabled="true" style="margin-left:10px;"></input></br>';
            c += '</div>';
            c +=  '<div class="pundit-rp-notebooks pundit-panel pundit-panel-loading" style="margin-top:5px;">';
            c += '   <span class="pundit-pane-title">Your notebooks</span>';
            c += '    <ul id="pundit-notebook-list" class="pundit-items pundit-view-list pundit-stop-wheel-propagation" style="max-height:240px;overflow-y:auto"></ul>';
            c += '</div>';
            c +=  '<div id="pundit-others-notebooks-div" class="pundit-display-none pundit-rp-others-notebooks pundit-panel pundit-panel-loading" style="margin-top:5px;">';
            c += '   <span class="pundit-pane-title" >Notebooks you are watching</span>';
            c += '    <ul id="pundit-other-notebook-list" class="pundit-items pundit-view-list pundit-stop-wheel-propagation" style="max-height:240px;overflow-y:auto"></ul>';
            c += '</div>';
        self.addHTMLContent(c);
    },
    initContextMenu:function(){
        var self = this;
        

		if (_PUNDIT.config.modules['pundit.NotebookManager'].notebookActivation === true) {
			cMenu.addAction({
	            type: ['notebookItem'],
	            name: 'punditNotebookDisactivate',
	            label: 'Deactivate Notebook',
	            showIf: function(id) { 
	                if (self.notebooks[id].activated && !self.notebooks[id].current)
	                    return true;
	                else
	                    return false;
	            },
	            onclick: function(id) {
	                self.setPanelLoading(true, 'owned');
	                self.activateNotebook(id, '0', function(id,state){
                        semlibWindow.closeAllPanels();
	                    self.updateNotebookActivation(id, state);
                        _PUNDIT['myPundit'].getAnnotationVisibility(function(mode) {
                            if (mode === 'active')
                                tooltip_viewer.refreshAnnotations();    
                        });
                        
	                });
                    _PUNDIT.ga.track('cmenu', 'click', 'deactivate-notebook');
	                return true;
	            }
	        });
	
			cMenu.addAction({
	            type: ['notebookItem'],
	            name: 'punditNotebookActivate',
	            label: 'Activate Notebook',
	            showIf: function(id) { 
	                if (!self.notebooks[id].activated)
	                    return true;
	                else
	                    return false;
	            },
	            onclick: function(id) {
	                self.setPanelLoading(true, 'owned');
	                self.activateNotebook(id, '1', function(id,state){
                        semlibWindow.closeAllPanels();
	                    self.updateNotebookActivation(id, state);
                        _PUNDIT['myPundit'].getAnnotationVisibility(function(mode){
                            if (mode === 'active')
                                tooltip_viewer.refreshAnnotations();    
                        });
                        
	                });
                    _PUNDIT.ga.track('cmenu', 'click', 'activate-notebook');
	                return true;
	            }
	        });
			
	        cMenu.addAction({
	            type: ['otherNotebookItem'],
	            name: 'punditOtherNotebookDisactivate',
	            label: 'Deactivate Notebook',
	            showIf: function(id) { 
	                if (self.othersNotebooks[id].activated)
	                    return true;
	                else
	                    return false;
	            },
	            onclick: function(id) {
	                self.setPanelLoading(true,'others');
	                self.activateNotebook(id, '0', function(id,state){
	                    semlibWindow.closeAllPanels();
	                    self.updateNotebookActivation(id, state, 'others');
                        _PUNDIT['myPundit'].getAnnotationVisibility(function(mode){
    	                    if (mode === 'active')
    	                        //Do I have to call show active notebook only???
    	                        tooltip_viewer.refreshAnnotations();    
                        });
	                    
	                });
                    _PUNDIT.ga.track('cmenu', 'click', 'deactivate-other-notebook');
	                return true;
	            }
	        });
	        cMenu.addAction({
	            type: ['otherNotebookItem'],
	            name: 'punditOtherNotebookActivate',
	            label: 'Activate Notebook',
	            showIf: function(id) { 
	                if (!self.othersNotebooks[id].activated)
	                    return true;
	                else
	                    return false;
	            },
	            onclick: function(id) {
	                self.setPanelLoading(true,'others');
	                self.activateNotebook(id, '1', function(id,state){
	                    semlibWindow.closeAllPanels();
	                    self.updateNotebookActivation(id, state, 'others');
                        _PUNDIT['myPundit'].getAnnotationVisibility(function(mode){
    	                    if (mode === 'active')
    	                        //Do I have to call show active notebook only???
    	                        tooltip_viewer.refreshAnnotations();    
                        });
	                    
	                });
                    _PUNDIT.ga.track('cmenu', 'click', 'activate-other-notebook');
	                return true;
	            }
	        });
		}    

        cMenu.addAction({
            type: ['notebookItem'],
            name: 'punditNotebookSetPublic',
            label: 'Set Public',
            showIf: function(id) {
                if (self.notebooks[id].visibility !== 'public'){
                    return true;
                }
                else{
                    return false;
                }
            },
            onclick: function(id) {
                self.setPanelLoading(true, 'owned');
                self.writer.setNotebookVisibility(id, 'public', function(id,state){
                        self.updateNotebookVisibility(id,state)
                    });
                _PUNDIT.ga.track('cmenu', 'click', 'set-notebook-public');
                return true;
           }
        });
        cMenu.addAction({
            type: ['notebookItem'],
            name: 'punditNotebookSetPrivate',
            label: 'Set Private',
            showIf: function(id) { 
                if (self.notebooks[id].visibility !== 'private'){
                    return true;
                }
                else{
                    return false;
                }
            },
            onclick: function(id) {
                self.setPanelLoading(true, 'owned');
                self.writer.setNotebookVisibility(id, 'private', function(id,state){
                        self.updateNotebookVisibility(id,state)
                    });
                _PUNDIT.ga.track('cmenu', 'click', 'set-notebook-private');
                return true;
            }
        });

        cMenu.addAction({
            type: ['notebookItem'],
            name: 'punditNotebookCurrent',
            label: 'Set as Current Notebook',
            showIf: function(id) { 
                if (!self.notebooks[id].current)
                    return true;
                else
                    return false;
            },
            onclick: function(id) {
                self.setPanelLoading(true, 'owned');
                self.writer.setNotebookCurrent(id, self.updateCurrentNotebook(id));
                _PUNDIT.ga.track('cmenu', 'click', 'set-notebook-current');
                return true;
            }
        });

        cMenu.addAction({
            type: ['notebookItem'],
            name: 'punditNotebookViewInAsk',
            label: 'View in Ask the Pundit',
            showIf: function() { 
                return true;
            },
            onclick: function(id) {
                _PUNDIT.ga.track('cmenu', 'click', 'view-in-ask-the-pundit');
                window.open(self.opts.askBaseURL + id);
                return true;
            }
        });

        //Notebook sharing
		if (_PUNDIT.config.modules['pundit.NotebookManager'].notebookSharing === true) {
			cMenu.addAction({
				type: ['notebookItem'],
				name: 'punditShareNotebook',
				label: 'Share Notebook',
				showIf: function(id) { 
					if (self.notebooks[id].activated && self.notebooks[id].visibility === 'public')
						return true;
					else
						return false;
				},
          	  onclick: function(id) {
                  _PUNDIT.ga.track('cmenu', 'click', 'share-notebook');
               	 self.notebookSharePanel.emptyContent();
                	var html =  '<div class="pundit-panel"><span class="pundit-pane-title">This url is all you need to share your notebook:</span><br>';
                	html += '<textarea style="width:390px;height:40px;margin-bottom:5px;margin-top:5px">http://metasound.dibet.univpm.it/release_bot/build-development/pages/activate.html?id=' + id + '</textarea><br></div>';
           		 self.notebookSharePanel.addHTMLContent(html);
              	  var wdim = dojo.window.getBox();
                	self.notebookSharePanel.show((wdim.w - 400)/2, (wdim.h - 200)/2);
               	 	return true;
            	}
        	});
		}

    },
    initBehaviors:function(){
        var self = this,
            beh = {};
        dojo.connect(dojo.byId('pundit-create-notebook-button'), 'onclick', function(e){
            self.setPanelLoading(true,'owned');
            self.writer.createNotebook(dojo.byId('pundit-notebook-name-input').value, function(id){
                self.getNotebookInfo(id,'owned');
            });
            _PUNDIT.ga.track('gui-button', 'click', 'pundit-create-notebook-button');
        }); 
        dojo.connect(dojo.byId('pundit-notebook-name-input'), 'onkeyup', function(e){
            if (e.target.value !== ''){
                self.updateCreateBtn(true);
            }else{
                self.updateCreateBtn(false);
            }
        });
        beh['#' + self._id + ' div.pundit-rp-notebooks li span.pundit-icon-context-button'] = {
            'onclick': function(e){
                var parent = dojo.query(e.target).parent()[0],
                    id = dojo.attr(parent, 'about');
                cMenu.show(e.pageX - window.pageXOffset, e.pageY - window.pageYOffset, id, 'notebookItem');
            }
        };
        
        if (_PUNDIT.config.modules['pundit.NotebookManager'].notebookActivation === true) {
            beh['#' + self._id + ' div.pundit-rp-others-notebooks li span.pundit-icon-context-button'] = {
                'onclick': function(e){
                    var parent = dojo.query(e.target).parent()[0],
                    id = dojo.attr(parent, 'about');
                    cMenu.show(e.pageX - window.pageXOffset, e.pageY - window.pageYOffset, id, 'otherNotebookItem');
                }
            }; 
        }
        
        dojo.behavior.add(beh);
    },

    show:function(){
        this.inherited(arguments);
        var self = this;

        
        dojo.byId('pundit-current-notebook-name').innerHTML = "";
        
        //Get active notebooks and owned
        
        self.activesCompleted = false;
        self.ownedCompleted = false;
        
        //Get all the notebook that are active
        self.reader.getActiveNotebooks(function(ids){
            self.activeNotebooksIds = ids;
            self.activeCompleted = true;
            self.onNotebookIdsReceived();
        });
        
        //Get all the notebook that are owned by the user
        self.reader.getOwnedNotebooks(function(ids){
            self.ownedNotebooksIds = ids;
            self.ownedCompleted = true;
            self.onNotebookIdsReceived();
        });
        
        //Make both panel loading
        self.setPanelLoading('owned', true);
        self.setPanelLoading('others', true);
    },
    
    onNotebookInfoLoaded:function(){
        var self = this;
        self.requests = {};
        self.setPanelLoading(false, 'others');
        //dojo.removeClass(dojo.query('#' + self._id + ' pundit-rp-notebooks')[0], 'pundit-panel-loading');
        self.reader.getCurrentNotebookId(function(id){
            dojo.addClass(dojo.query('#' + self._id + ' li[about = '+ id +']')[0], 'pundit-current');
            dojo.removeClass(dojo.query('#' + self._id + ' .pundit-rp-notebooks')[0], 'pundit-panel-loading');
            self.notebooks[id].current = true;
            dojo.byId('pundit-current-notebook-name').innerHTML = self.notebooks[id].label;
        });
        dojo.behavior.apply();
    },
    activateNotebook:function(id, flag, cb){
        var self = this;
        //FIXXXXX
        //call the tooltipviewer for this????
        //tooltip_viewer.writer.setNotebookActive(id, flag, cb);
        //TODO MARCO should be ok
        self.writer.setNotebookActive(id, flag, cb);
    },
    //Change the activation state of the a notebook and update the gui accordingly
    updateNotebookActivation:function(id, state, type){
        var self = this,
            activated;
        if (state === '1'){
            activated = true;
            dojo.removeClass(dojo.query('#' + self._id + ' li[about = '+ id +']')[0], 'pundit-disactivated');
            dojo.addClass(dojo.query('#' + self._id + ' li[about = '+ id +']')[0], 'pundit-activated');
        }else{
            activated = false;
            dojo.removeClass(dojo.query('#' + self._id + ' li[about = '+ id +']')[0], 'pundit-activated');
            dojo.addClass(dojo.query('#' + self._id + ' li[about = '+ id +']')[0], 'pundit-disactivated');
        }
        if (typeof(type) !== 'undefined'){
            if (type === 'others'){
                self.othersNotebooks[id].activated = activated;
                self.setPanelLoading(false, 'others');    
            }
        }else{
            self.notebooks[id].activated = activated;
            self.setPanelLoading(false, 'owned');
        }
            
    },
    //Update the current notebook
    updateCurrentNotebook:function(id){
        var self = this;
        for (var i in self.notebooks){
            self.notebooks[i].current = false;
        }
        self.notebooks[id].current = true;
        
        dojo.query('#' + self._id + ' .pundit-rp-notebooks li').forEach(function(item){dojo.removeClass(item, 'pundit-current')})
        dojo.addClass(dojo.query('#' + self._id + ' li[about = '+ id +']')[0], 'pundit-current');
        dojo.byId('pundit-current-notebook-name').innerHTML = self.notebooks[id].label;
        self.setPanelLoading(false,'owned');
        
    },
    //Update notebook visibility
    updateNotebookVisibility:function(id, state){
        var self = this;
        if (state === 'public'){
            dojo.removeClass(dojo.query('#' + self._id + ' li[about = '+ id +']')[0], 'pundit-private');
            dojo.addClass(dojo.query('#' + self._id + ' li[about = '+ id +']')[0], 'pundit-public');
            self.notebooks[id].visibility = 'public'; 
        }
        if (state === 'private'){
            dojo.addClass(dojo.query('#' + self._id + ' li[about = '+ id +']')[0], 'pundit-private');
            dojo.removeClass(dojo.query('#' + self._id + ' li[about = '+ id +']')[0], 'pundit-public');
            self.notebooks[id].visibility = 'private';
        }
        self.setPanelLoading(false,'owned');
    },
    setPanelLoading:function(s, type){
        var self = this;
        if (s === true){
            if (type === 'owned')
                dojo.addClass(dojo.query('#' + self._id + ' .pundit-rp-notebooks')[0], 'pundit-panel-loading');
            else
                dojo.addClass(dojo.query('#' + self._id + ' .pundit-rp-others-notebooks')[0], 'pundit-panel-loading');
        }else{
            if (type === 'owned')
                dojo.removeClass(dojo.query('#' + self._id + ' .pundit-rp-notebooks')[0], 'pundit-panel-loading');
            else
                dojo.removeClass(dojo.query('#' + self._id + ' .pundit-rp-others-notebooks')[0], 'pundit-panel-loading');
        }
    },
    hide:function(){
        this.inherited(arguments);
        var self = this;
        
        self.notebooks = {};
        self.othersnotebooks = {};
        self.ownedNotebooksIds = [];
        self.activeNotebooksIds = [];
        
        dojo.empty(dojo.query('#' + self._id + ' .pundit-rp-notebooks ul')[0]);
    },
    
    updateCreateBtn:function(active){
        if (active){
            dojo.attr(dojo.byId("pundit-create-notebook-button"), 'disabled', false);
        }else{
            dojo.attr(dojo.byId("pundit-create-notebook-button"), 'disabled', true);
        }
    },
    //Fired when both public and owned notebook have been retrieved 
    //(it is necessary to separate public notebook that are owned by the user by 
    //the public notebooks of the others
    onNotebookIdsReceived:function(){
        var self = this;
        if (self.ownedCompleted && self.activeCompleted){
                self.setOtherNotebooks();
                self.getNotebooksInfo();
            }
    },
    //Remove from active notebook the user notebooks
    setOtherNotebooks:function(){
        var self = this;
        //for (var i in self.ownedNotebooksIds){
        for (var i = self.ownedNotebooksIds.length; i--;){
            var index = dojo.indexOf(self.activeNotebooksIds, self.ownedNotebooksIds[i])
            if (index !== -1)
                self.activeNotebooksIds.splice(index,1);
        }
    },
    //Retrieve the info for all the notebooks
    getNotebooksInfo:function(){
        var self = this;
        
        //for (var i in self.activeNotebooksIds){
        for (var i = self.activeNotebooksIds.length; i--;){
            self.getNotebookInfo(self.activeNotebooksIds[i], 'others')
        }
        
        for (var i = self.ownedNotebooksIds.length; i--;){
            self.getNotebookInfo(self.ownedNotebooksIds[i], 'owned')
        }
    },
    
    //Get notebook info
    //When finished the notebook item is added to the container
    //TODO extend to accept a function callback
    getNotebookInfo:function(notebookId, type){
        var self = this;
        self.requests[notebookId] = false;
        //Get Notebook Info
        
        //Create new notebook Items
        self.reader.getNotebookMetadata(notebookId, (function(_type){
            return function(id, metadata){

                // In this response there's an object with 1 key, that key
                // is the URI of this notebook on the current annotation server
                var meta = {};
                for (var nbURI in metadata) {
                    meta = metadata[nbURI];
                }

                var notebook = {
                    visibility:  meta[ns.notebooks.visibility][0].value,
                    created:     meta[ns.notebooks.created][0].value,
                    creator:     meta[ns.notebooks.creator][0].value,
                    creatorName: meta[ns.notebooks.creatorName][0].value,
                    id:          meta[ns.notebooks.id][0].value,
                    includes:    meta[ns.notebooks.includes],
                    type:        meta[ns.notebooks.type][0].value,
                    label:       meta[ns.notebooks.label][0].value
                };

            
                self.reader.checkNotebook(notebook.id, function(id,checked){
                    var completed = true;
                    if (checked === '0'){
                        notebook.activated = false;
                    }   
                    else{
                        notebook.activated = true;
                    }
                    
                    if (_type === 'owned')
                        self.notebooks[id] = notebook;
                    else
                        self.othersNotebooks[id] = notebook;
                    
                    self.requests[id] = true;
                
                    //Add notebookItem
                    self.addNotebookItem(notebook, _type);
                
                    
                    for (var j in self.requests){
                    //for (var j =  self.requests.length; j--;){
                        if (!self.requests[j]){
                            completed = false;
                            break;
                        }
                    }
                    if (completed){
                        self.onNotebookInfoLoaded();
                    }
                })
            }
        })(type));
    },
    //Add the notebook to the container
    addNotebookItem:function(notebook, type){
        var self = this,
        
            c = '<li about="'+ notebook.id +'" class="dojoDndItem pundit-shown">';
            c+= '   <span class="pundit-icon-context-button"></span>';
            c+= '   <span>' + notebook.label + ' (id:' + notebook.id + ')</span>';
            c+= '   <span class="pundit-item-visibility"></span>';
			if (_PUNDIT.config.modules['pundit.NotebookManager'].notebookActivation === true) {
                c+= '   <span class="pundit-item-activation pundit-disactivated"></span>';
			}
            c+= '   <span class="pundit-item-editability"></span>';
            c+= '   <span class="pundit-trim pundit-notebook-creator">' + notebook.creatorName + '</span>';
            // c+= '   <span class="pundit-trim pundit-created">' + notebook.created + '</span>';
            c+= '</li>';
        if (type === 'owned'){
            //self.notebooks[notebook.id] = notebook;
            dojo.query('#pundit-notebook-list').append(c);
        }else{
            //self.othersNotebooks[notebook.id] = notebook;
			dojo.removeClass('pundit-others-notebooks-div', 'pundit-display-none');
            dojo.query('#pundit-other-notebook-list').append(c);
        }

        if (notebook.visibility === 'public'){
            dojo.removeClass(dojo.query('#' + self._id + ' li[about = '+ notebook.id +']')[0], 'pundit-private');
            dojo.addClass(dojo.query('#' + self._id + ' li[about = '+ notebook.id +']')[0], 'pundit-public');
        }
        if (notebook.visibility === 'private'){
            dojo.addClass(dojo.query('#' + self._id + ' li[about = '+ notebook.id +']')[0], 'pundit-private');
            dojo.removeClass(dojo.query('#' + self._id + ' li[about = '+ notebook.id +']')[0], 'pundit-public');
        }
        
        if (notebook.activated){
            dojo.addClass(dojo.query('#' + self._id + ' li[about = '+ notebook.id +']')[0], 'pundit-activated');
            dojo.removeClass(dojo.query('#' + self._id + ' li[about = '+ notebook.id +']')[0], 'pundit-disactivated'); 
        }else{
            dojo.addClass(dojo.query('#' + self._id + ' li[about = '+ notebook.id +']')[0], 'pundit-disactivated');
            dojo.removeClass(dojo.query('#' + self._id + ' li[about = '+ notebook.id +']')[0], 'pundit-activated'); 
        }
    },
    //Update other notebooks
    updateOtherNotebook:function(){
        var self = this;
        self.setPanelLoading(true, 'others');
        dojo.empty('pundit-other-notebook-list');
        self.othersnotebooks = {};
        self.activeNotebooksIds = [];
        self.reader.getActiveNotebooks(function(ids){
            self.activeNotebooksIds = ids;
            self.setOtherNotebooks();
            //for (var i in self.activeNotebooksIds){
            for (var i = self.activeNotebooksIds.length; i--;){
                self.getNotebookInfo(self.activeNotebooksIds[i], 'others')
            }
        });
    }
});
            
            


