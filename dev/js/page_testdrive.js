// start of file
/**
	Page > Test Drive
	HTML and associated functions for this page.
**/


	/*
		loadPage_testdrive
		This function is called by the overall Navigate function, and populates
		page-level HTML.
	*/
	function loadPage_testdrive(){
		// debug("LOADING PAGE >> loadPage_testdrive");

		update_NavPanels();

		var content = '<h1 class="pagetitle">Test Drive</h1><div class="pagecontent">' +
			'<textarea id="tdtextarea" onkeyup="_UI.testdrive.sampletext=this.value; redraw_TestDrive()">'+_UI.testdrive.sampletext+'</textarea><br>' +
			'<canvas id="tdcanvas"></canvas><br>' +
			'<div id="genimg" style="display:none;"></div>'+
			'<canvas id="glypheditcanvas" style="display:none;"></canvas>'+
			'</div>';

		getEditDocument().getElementById("mainwrapper").innerHTML = content;
		document.getElementById("tdtextarea").focus();

		_UI.testdrive.canvas = document.getElementById('tdcanvas');
		_UI.testdrive.canvas.width = 800;
		_UI.testdrive.canvas.height = 700;
		_UI.testdrive.ctx = _UI.testdrive.canvas.getContext('2d');

		_UI.testdrive.cache = {};

		redraw_TestDrive();
	}

	/*
		makePanel_TestDriveAttributes
		This function is called by the overall Redraw function, and it loads content to
		the left panel - usually options for the Edit Canvas.
	*/
	function makePanel_TestDriveAttributes(){
		if(_UI.current_panel !== 'npAttributes') return;

		var content = '<div class="navarea_header">';
		content += '<h1 class="panelsupertitle">TEST DRIVE</h1>';
		content += '<h1 class="paneltitle">controls</h1>';

		content += '</div><div class="panel_section">';
		content += '<h2>options</h2><div>' + drawTDOptions() + '</div>';
		content += '</div><div class="panel_section">';
		content += '<h2>sample text</h2><div>' + drawSampletextButtons() + '</div>';
		content += '</td></tr></table></div>';

		return content;
	}


	/*
		readraw_TestDrive
		This function is called by the overall Redraw to update the canvas, or whatever
		content is in the main Content Area
	*/
	function redraw_TestDrive(){
		// debug("\n redraw_TestDrive - START");
		_UI.redrawing = true;

		var td = _UI.testdrive;
		var ps = _GP.projectsettings;

		if(_UI.current_panel === 'npAttributes') changefontscale(td.fontsize);
		document.getElementById('tdtextarea').value = td.sampletext;

		var lines = td.sampletext.split('\n');
		var tctx = td.ctx;
		var scale = td.fontscale;
		var textEm = (ps.upm*scale);
		var linegap = ((td.linegap*1)*scale);
		var pagepadding = 10;
		var curry = -linegap;

		tctx.clearRect(0,0,5000,5000);		

		for(var i=0; i<lines.length; i++){

			// calc Y val
			curry += (textEm + linegap);

			// draw glyphs
			drawGlyphSequence(lines[i], tctx, pagepadding, curry, scale, td.padsize, td.showglyphbox, td.showhorizontals, td.flattenglyphs);
		}

		_UI.redrawing = false;
	}

	function drawGlyphSequence(glyphstring, ctx, currx, curry, scale, padsize, showglyphbox, showhorizontals, flattenglyphs) {
		// debug('\n drawGlyphSequence - START');

		var cc, tc;
		glyphstring = glyphstring || '';
		currx = currx || 0;
		curry = curry || 0;
		scale = scale || 1;
		padsize = padsize || 0;

		var glypharr = glyphstring.split('');
		glypharr = findAndMergeLigatures(glypharr);

		if(showhorizontals) drawLine(curry);

		for(var g=0; g<glypharr.length; g++){
			tc = glypharr[g];
			cc = getGlyph(glyphToHex(tc));

			if(cc){
				if(showglyphbox){
					ctx.fillStyle = 'transparent';
					ctx.strokeStyle = _UI.colors.blue.l65;
					ctx.lineWidth = 1;

					ctx.strokeRect(
						currx.makeCrisp(),
						(curry.makeCrisp()-(_GP.projectsettings.ascent*scale)),
						round(cc.getTotalWidth()*scale),
						round(_GP.projectsettings.upm*scale)
					);
				}

				if(flattenglyphs){
					if(!_UI.testdrive.cache.hasOwnProperty(tc)){
						_UI.testdrive.cache[tc] = (new Glyph(clone(cc))).combineAllShapes(true);
					}

					currx += _UI.testdrive.cache[tc].drawGlyph(ctx, {'dz' : scale, 'dx' : currx, 'dy' : curry});

				} else {
					currx += cc.drawGlyph(ctx, {'dz' : scale, 'dx' : currx, 'dy' : curry});
				}

				currx += (padsize*1*scale);
				currx += calculateKernOffset(tc, glypharr[g+1])*scale;
			}
		}

		// debug(' drawGlyphSequence - END\n');
	}

	/*
		calculateKernOffset
		Takes two glyphs as arguments, and determines the number of Em units of
		offset between them.  First checks to see if there are custom kern values
		for the pair, and if not, returns 0. Left Side Bearing and Right Side Bearing
		are not returned, only kern values.
	*/
	function calculateKernOffset(c1, c2) {
		// debug('\n calculateKernOffset - START');
		// debug('\t passed: ' + c1 + ' and ' + c2);

		if(!c1 || !c2) return 0;

		c1 = parseUnicodeInput(c1).join('');
		c2 = parseUnicodeInput(c2).join('');
		// debug('\t converted: ' + c1 + ' and ' + c2);

		var k = _GP.kerning;
		var tlc, trc, re;

		for(var p in k){ if(k.hasOwnProperty(p)){
			for(var l=0; l<k[p].leftgroup.length; l++){
				tlc = k[p].leftgroup[l];
				// debug('\t checking leftgroup ' + tlc + ' against ' + c1);
				if(parseUnicodeInput(tlc)[0] === c1){
					// debug('\t LEFTGROUP MATCH! for ' + c1);
					for(var r=0; r<k[p].rightgroup.length; r++){
						trc = k[p].rightgroup[r];
						if(parseUnicodeInput(trc)[0] === c2){
							re = (k[p].value*-1);
							// debug('\t FOUND MATCH! returning ' + re);
							return re;
						}
					}
				}
			}
		}}

		// debug(' calculateKernOffset - END\n');
		return 0;
	}

	/*
		findAndMergeLigatures
		Takes an array of glyphs as an argument, and looks for glyph sequences
		that merge to ligatures.  Returns an array with merged results.
	*/
	function findAndMergeLigatures(carr) {
		// debug('\n findAndMergeLigatures - START');
		var ligs = sortLigatures();
		// debug('\t sorted ligs: ');
		// debug(ligs);

		var ligchars, carrot;
		for(var c=0; c<carr.length; c++){
			// for(var g=ligs.length-1; g>-1; g--){
			for(var g=0; g<ligs.length; g++){
				ligchars = hexToGlyph(ligs[g].id);
				// debug('\t checking ' + ligchars);
				carrot = carr.slice(c, (c+ligchars.length)).join('');
				// debug('\t against ' + carrot);
				if(carrot === ligchars){
					carr.splice(c, ligchars.length, ligchars);
					// debug('\t !Ligature Found! array['+c+'] is now ' + carr[c]);
				}
			}
		}

		// debug(' findAndMergeLigatures - END\n');
		return carr;
	}

	function drawLine(y){
		// debug('TESTDRIVE - Drawing h line at ' + y);
		y = y.makeCrisp();
		_UI.testdrive.ctx.strokeStyle = _UI.colors.blue.l65;
		_UI.testdrive.ctx.beginPath();
		_UI.testdrive.ctx.lineWidth = 1;
		_UI.testdrive.ctx.moveTo(0,y);
		_UI.testdrive.ctx.lineTo(_UI.testdrive.canvas.width,y);
		_UI.testdrive.ctx.stroke();
		_UI.testdrive.ctx.closePath();
	}

	function drawSampletextButtons(){
		var content = '<h3>pangrams</h3>';
		content += makeTDButton('the five boxing wizards jump quickly');
		content += makeTDButton('pack my box with five dozen liquor jugs');
		content += makeTDButton('the quick brown fox jumps over a lazy dog');
		content += makeTDButton('amazingly few discotheques provide jukeboxes');
		content += makeTDButton('quick enemy movement will<br>jeopardize six of the gunboats');
		content += '<br><h3>glyph sets</h3>';
		content += makeTDButton('abcdefghijklmnopqrstuvwxyz');
		content += makeTDButton('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
		content += makeTDButton('0123456789');
		content += makeTDSymbolButton();

		return content;
	}

	function makeTDButton(text){
		var val = text.replace('<br>', ' ');
		return '<button class="sampletext" onclick="_UI.testdrive.sampletext=\''+val+'\';redraw_TestDrive();">'+text+'</button><br>';
	}

	function makeTDSymbolButton(){
		return "<button class='sampletext' onclick='document.getElementById(\"tdtextarea\").value=\"!\\\"#$%&&#39;()*+,-./:;\\\<=\\\>?@[\\\\]^_`{|}~\";redraw_TestDrive();'>!\"#$%&&#39;()*+,-./:;\<=\>?@[\\]^_`{|}~</button><br>";
	}

	function drawTDOptions(){
		if(!_UI.testdrive.linegap) _UI.testdrive.linegap = _GP.projectsettings.linegap;
		if(!isval(_UI.testdrive.padsize)) _UI.testdrive.padsize = _GP.projectsettings.defaultlsb;

		var flattenmessage = "<h1>Combine Glyphs Shapes</h1>"+
			"In <a href=# onclick=navToProjectSettings()>Project Settings &rsaquo; Export Options</a> you have the option to combine all glyph shapes.<br>"+
			"Having glyphs with many overlapping paths in a font can sometimes cause issues.<br>"+
			"So, this setting will flatten each glyph as it&prime;s exported to your font.<br><br>"+
			"Selecting this option in Test Drive here will <i>preview</i> how your glyph shapes will be <br>"+
			"combined. This preview will not change your designs in Glyphr Studio. There is a<br>"+
			"Combine Shapes action in Glyph Edit if you wish to permanently combine shapes.<br><br>"+
			"As a warning, this process is time intensive, so the first time you type a letter<br>"+
			"it may take a few seconds to render.";

		var content = '<table class="detail">';
		content += '<tr><td> font size <span class="unit">(px)</span> </td><td><input type="number" value="'+_UI.testdrive.fontsize+'" onchange="changefontscale(this.value); redraw_TestDrive();"></td></tr>';
		content += '<tr><td> 96dpi font size <span class="unit">(pt)</span> </td><td><input type="number" disabled="disabled" id="roughptsize" valu="75"/></td></tr>';
		content += '<tr><td> line gap <span class="unit">(em units)</span> </td><td><input type="number" value="'+_UI.testdrive.linegap+'" onchange="_UI.testdrive.linegap=this.value*1; redraw_TestDrive();"></td></tr>';
		content += '<tr><td> glyph spacing <span class="unit">(em units)</span> </td><td><input type="number" value="'+_UI.testdrive.padsize+'" onchange="_UI.testdrive.padsize=this.value*1; redraw_TestDrive();"></td></tr>';
		content += '<tr><td> <label for="showglyphbox">show glyph boxes</label> </td><td>' + checkUI("_UI.testdrive.showglyphbox", _UI.testdrive.showglyphbox, true) + "</td></tr>";
		content += '<tr><td> <label for="showhorizontals">show baseline</label> </td><td>' + checkUI("_UI.testdrive.showhorizontals", _UI.testdrive.showhorizontals, true) + "</td></tr>";
		
		content += '<tr><td> <label for="flattenglyphs">preview combine glyph shapes</label>' + helpUI(flattenmessage) + ' </td><td>' + checkUI("_UI.testdrive.flattenglyphs", _UI.testdrive.flattenglyphs, false) + "</td></tr>";

		content += '<tr><td colspan=2><button onclick="createimg();">generate png file</button></td></tr>';
		content += '</table>';
		return content;
	}

	function navToProjectSettings() { 
		_UI.current_page = 'project settings';
		navigate();
	}

	function changefontscale(newval){
		_UI.testdrive.fontsize = newval*1;
		_UI.testdrive.fontscale = (newval/_GP.projectsettings.upm);
		document.getElementById('roughptsize').value = (newval*0.75);
	}

	function createimg(){
		var imgd = document.getElementById('tdcanvas').toDataURL();

		var win = window.open(document.location.href, 'Glyphr Test Drive');

		win.document.write('<!DOCTYPE html><html>'+
		'<head><title>Glyphr - Test Drive Image</title></head>'+
		'<body style="padding:40px; text-align:center;">'+
		'<img src="' + imgd + '" title="Glyphr Test Drive" style="border:1px solid #f6f6f6;">'+
		'</html>');
	}

// end of file