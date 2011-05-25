/**
 * Handsontable is a simple jQuery plugin for editable tables with basic copy-paste compatibility with Excel and Google Docs
 */
(function($){

	function handsontable(settings) {
		var container = $(this);
		
		var priv = {
			isMouseDown: false,
			isCellEdited: false,
			selStart: {},
			selEnd: {},
			editProxy: false
		}
		
		var grid = {
			/**
			 * Populate cells at position with 2d array
			 * @param {Object} start Start selection position
			 * @param {Object} end End selection position
			 * @param {Array} input 2d array
			 */
			populateFromArray: function(start, end, input) {
				var r, rlen, c, clen, td;
				rlen = Math.max(start.row, end.row);
				clen = Math.max(start.col, end.col);
				for(r = Math.min(start.row, end.row); r <= rlen; r++) {
					if(!input[r]) {
						continue;
					}
					for(c = Math.min(start.col, end.col); c <= clen; c++) {
						if(input[r][c]) {
							td = grid.getCellAtCoords.call(this, {row: r, col: c});
							td.html(input[r][c]);
						}
					}
				}
			}, 
			
			/**
			 * Returns coordinates given td object
			 */
			getCellCoords: function(td) {
				return {
					row: td.parent().index(),
					col: td.index()
				}
			},
			
			/**
			 * Returns td object given coordinates
			 */
			getCellAtCoords: function(coords) {
				var td = this.find('tr:eq('+coords.row+') td:eq('+coords.col+')');
				return td;
			}, 
			
			/**
			 * Returns array of td objects given start and end coordinates
			 */
			getCellsAtSelection: function(start, end) {
				var r, rlen, c, clen, output = [];
				rlen = Math.max(start.row, end.row);
				clen = Math.max(start.col, end.col);
				for(r = Math.min(start.row, end.row); r <= rlen; r++) {
					for(c = Math.min(start.col, end.col); c <= clen; c++) {
						output.push( grid.getCellAtCoords.call(this, {row: r, col: c}) );
					}
				}
				return output;
			}
		}
		
		var keyboard = {
			/**
			 * Parse paste input
			 * @param {String} input
			 * @return {Array} 2d array
			 */
			parsePasteInput: function(input) {
				var rows = [], r, rlen;
				if(input.indexOf("\t")) { //Excel format
					rows = input.split("\n");
					if(rows[rows.length-1] === '') {
						rows.pop();
					}
					for(r=0, rlen=rows.length; r<rlen; r++) {
						rows[r] = rows[r].split("\t");
					}
				}
				return rows;
			}
		}
		
		var methods = {
			init: function(settings) {
				
				var r, c, table, tr, td;
				table = $('<table>');
				for(r=0; r < settings.rows; r++) {
					tr = $('<tr>');
					for(c=0; c < settings.cols; c++) {
						td = $('<td>');
						tr.append(td);
						td.mousedown(function(event){
							//priv.editProxy.blur();
							var td = $(this);
							methods.selectionStart.call(container, td);
							methods.toggleSelection.call(container, td);
							//event.preventDefault();
							
						});
						td.mouseover(function(event){
							if(priv.isMouseDown) {
								methods.toggleSelection.call(container, $(this));
							}
							event.preventDefault();
							event.stopPropagation();
						});
						td.click(function(event){
							event.stopPropagation();
						});
					}
					table.append(tr);
				}
				
				priv.selectionArea = $("<div class='selectionArea'>");
				priv.selectionArea.css({
					position: 'absolute'
				});
				container.append(priv.selectionArea);
				
				container.append(table);
				methods.createEditProxy.call(container);
				
				
				
				$(window).mouseup(function(){
					priv.isMouseDown = false;
					
				});
				$(window).click(function(){
					methods.clearSelection.apply(container);
				});
				$(window).keypress(function(event){
					console.log('keypress', event.keyCode);
					switch(event.keyCode) {
						default:
							console.log('priv.isCellEdited', priv.isCellEdited);
							if(!priv.isCellEdited) {
								/*methods.editStart.apply(this, [event]);
								/*priv.editProxy.val(
									priv.editProxy.val() //+
									//String.fromCharCode(event.which||event.charCode||event.keyCode)
								);* /
								methods.editKeyDown.apply(this);
								priv.editProxy.focus();*/
							}
							break;
					}
				});
				$(window).keydown(function(event){
					//console.log('keydown', event.keyCode);
					switch(event.keyCode) {
						case 13: /* return */
							methods.editStop.apply(container, [event]);
							event.preventDefault();
							break;
							
						case 8: /* backspace */
						case 46: /* delete */
							methods.emptySelection.apply(container, [event]);
							break;
					}
				});
				
				priv.editProxy.bind('paste',function(event){
					setTimeout(function(){
						var input = priv.editProxy.val();
						console.log("sie wkleja", priv.editProxy.val());
						methods.editStop.apply(container, [event]);
						
						var inputArray = keyboard.parsePasteInput(input);
						grid.populateFromArray(priv.selStart, priv.selEnd, inputArray);
						console.log(inputArray);
						
					}, 100);
				});
			},
			
			selectionStart: function(td) {
				priv.isMouseDown = true;
				methods.clearSelection.apply(this);
				priv.selStart = grid.getCellCoords.call(this, td);
				
				
				
				var tdOffset = td.offset();
				var containerOffset = priv.editProxy.parent().offset();
				priv.editProxy.css({
					position: 'absolute',
					top: (tdOffset.top-containerOffset.top)+'px',
					left: (tdOffset.left-containerOffset.left)+'px',
					width: td.width(),
					height: td.height(),
					opacity: 0
				}).val(td.html()).show();
				

				
				setTimeout(function(){
					priv.editProxy.focus();
				}, 1);
			},
			
			toggleSelection: function(clickedTd) {
				var td, tds;
				methods.clearSelection.apply(this);
				priv.selEnd = grid.getCellCoords.call(this, clickedTd);
				tds = grid.getCellsAtSelection.call(this, priv.selStart, priv.selEnd);
				for(td in tds) {
					tds[td].addClass('selected');
				}
				methods.highlightSelected.apply(this);
			},
			
			highlightSelected: function() {
				var tds = grid.getCellsAtSelection.call(this, priv.selStart, priv.selEnd);
				var first = tds[0];
				var last = tds[tds.length-1];
				var firstOffset = first.offset();
				var lastOffset = last.offset();
				var containerOffset = priv.editProxy.parent().offset();
				priv.selectionArea.css({
					top: (firstOffset.top-containerOffset.top-2)+'px',
					left: (firstOffset.left-containerOffset.left-2)+'px',
					height: (lastOffset.top-firstOffset.top+last.height()+9)+'px',
					width: (lastOffset.left-firstOffset.left+last.width()+9)+'px'
				}).show();
			},
					
			isSelected: function() {
				var undefined = function(){}();
				if(priv.selEnd.row == undefined) {
					return false;
				}
				return true;
			},
			
			clearSelection: function() {
				if(!methods.isSelected.apply(this)) {
					return;
				}
				if(priv.isCellEdited) {
					methods.editStop.apply(this);
				}
				tds = grid.getCellsAtSelection.call(this, priv.selStart, priv.selEnd);
				for(td in tds) {
					tds[td].removeClass('selected');
				}
				priv.selEnd.row = undefined;
			},
			
			emptySelection: function() {
				var td, tds;
				tds = grid.getCellsAtSelection.call(this, priv.selStart, priv.selEnd);
				for(td in tds) {
					tds[td].html('');
				}
			},
			
			createEditProxy: function() {
				var container = this;
				priv.editProxy = $('<textarea class="editInput">').hide();
				priv.editProxy.keydown(function(){
					methods.editKeyDown.apply(container);
				});
				priv.editProxy.blur(function(){
					//methods.editStop.apply(container);
				});
				container.append(priv.editProxy);
			},
			
			editStart: function(event) {
				priv.isCellEdited = true;
				priv.editProxy.css({
					opacity: 1
				//}).val(td.html() + priv.editProxy.val()).show();
				});
			},
			
			editKeyDown: function(event) {
				var length = priv.editProxy.val().length;
				if(length > 3) {
					priv.editProxy.width(length * 10);
				}
				methods.editStart.apply(this);
			},
			
			editStop: function(event) {
				console.log('stop');
				priv.isCellEdited = false;
				var td = grid.getCellAtCoords.call(this, priv.selStart);
				td.html( priv.editProxy.val() );
				priv.editProxy.hide().val('');
			}
		};
		
		methods.init(settings);
	}

	var settings = {
		'rows': 5,
		'cols': 5
	};
  
	$.fn.handsontable = function(options) {
		return this.each(function() {
			var currentSettings = $.extend({}, settings);
			if (options) {
				$.extend(currentSettings, options);
			}
			handsontable.call(this, currentSettings);
		});
	};
	
})(jQuery);