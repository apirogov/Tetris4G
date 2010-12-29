// click handlers
function addClickHandlers() {
	$("#start").click(function() {
		$("#menu").slideUp(600);
		$("#help").slideUp(600);
		$("#browsertip").slideUp(600);
		$("#warning").slideUp(600);
		$("#game").css("display","inline");

		// attaching the sketch function to the canvas
		var p = new Processing($("#canvas1").get(0), sketch);
	});

	$("#showhelp").click(function() {
		if ($("#help").css("display")=="none") {
			$("#help").slideDown(600);
			$("#showhelp").attr("value","Hide help");
		} else {
			$("#help").slideUp(600);
			$("#showhelp").attr("value","Show help");
		}
	});
	
	$("#warning").hover(
		function() {
			$(this).fadeTo("fast", 1);
		},
		function() {
			$(this).fadeTo("slow", 0.5);
		}
	);
}

// ready event for document -- executed when DOM is ready
$(document).ready(addClickHandlers);
$(document).ready( function() {
	//browser detection and support "information"
	var tested = false;
	var weardown = false;
	var txt = "You are using ";
	if (navigator.userAgent.indexOf("Firefox") != -1) {
		$("#warning").append(txt + "Firefox.<br/>");
		tested = true;
	}
	else if (navigator.userAgent.indexOf("Chrome") != -1) {
		$("#warning").append(txt + "Google Chrome.<br/>");
		tested = true;
	}
	else if (navigator.userAgent.indexOf("Opera") != -1) {
		$("#warning").append(txt + "Opera.<br/>");
	}
	else if (navigator.userAgent.indexOf("Netscape.") != -1) {
		$("#warning").append(txt + "Opera<br/>");
	}
	else if (navigator.userAgent.indexOf("MSIE") != -1) {
		$("#warning").append(txt + "Microsoft Internet Explorer.<br/>");
		weardown = true;
	}
	else {
		$("#warning").append(txt + "an unidentified Browser.<br/>");
		$("#warning").css("background-color", "orange");
	}

	if (tested == true) {
		$("#warning").append("<b>The game was successfully tested with your browser.</b>");
		$("#warning").css("background-color", "green");
	} else {
		$("#browsertip").delay(3000).slideDown(600);
		$("#warning").append("<b>The game was not tested with your browser. Try yourself.</b>");
	}
	if (weardown == true) {
		$("#warning").append("<b><font size='5'> <br/>Would you please refrain from using our worthy game with such an unworthy \"browser\"!  </font> </b>");
	}
	$("#warning").slideDown(600);
	$("#warning").delay(3000).fadeTo("slow", 0.5);
});

// implement indexOf if not present
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (obj, fromIndex) {
        if (fromIndex == null) {
            fromIndex = 0;
        } else if (fromIndex < 0) {
            fromIndex = Math.max(0, this.length + fromIndex);
        }
        for (var i = fromIndex, j = this.length; i < j; i++) {
            if (this[i] === obj)
                return i;
        }
        return -1;
    };
}

// ******************** game code *******************

// Simple way to attach js code to the canvas is by using a function
function sketch(p) {
	// ******************** constant vars ********************
	// geometry
	var fieldszpx = 480; // field size in px (height and width)
	var unitsz = 20; // unit of size in canvas of one block (height and width) --> grid
	var fieldsz = fieldszpx/unitsz; //width + height of the grid in units
	
	//coordinates of preview rect
	var previewx = 480+(640-480)/2-unitsz*2;
	var previewy = 80;

	// colors
	var LBLUE = p.color(0, 255, 255);
	var BLUE = p.color(0, 0, 255);
	var ORANGE = p.color(255, 127, 0);
	var YELLOW = p.color(255, 255, 0);
	var GREEN = p.color(0, 255, 0);
	var PURPLE = p.color(255, 0, 255);
	var RED = p.color(255, 0, 0);
	var BLACK = p.color(0, 0, 0);
	var colors = [LBLUE, BLUE, ORANGE, YELLOW, GREEN, PURPLE, RED, BLACK];
	
	// ******************** global vars ********************
	
	// required images+fonts (loaded in setup)
	var backgroundimg = null;
	var txtfont = null;

	// global vars/objects
	var fps = 30; // framerate
	var loading = true; //bool that indicates whether the game is ready to play or not
	var msgrenderer = null; //object that handles on screen text messages (init in setup)
	var visrenderer = null; //object that handles effects of vanishing blocks
	
	var game_over = false; //stops game if set 'true'
	var finished = false; // true=everything done, game can be left
	var musicon = false; // true = play soundtrack in loop
	// var game_over_frame = 0; //frame at which game stopped
	// var finish_time = 5; //time until game is left after game over
	// var finish_frame = 0; //frame when game should be left

	//Init sound effects channel array
	var channel_max = 10;			// number of channels
	var audiochannels = new Array();
	for (a=0;a<channel_max;a++) {	// prepare the channels
		audiochannels[a] = new Array();
		audiochannels[a]['channel'] = new Audio();	// create a new audio object
		audiochannels[a]['finished'] = -1;			// expected end time for this channel
	}

	//World & Tetrominoes
	var spawnx = fieldsz/2; //Spawn field coordinates (kinda center of it)
	var spawny = fieldsz/2;
	var worldblocks = new Array(); //all blocks that are already settled
	var worldmatr = null; //worldmatr[x][y] => block at x,y or null
	var currtetr = null; //current tetromino -- controlled by keys and gravity
	var nexttetr = null; //next tetromino
	//time vars -- "_f" = "time in frames"
	var move_time = 1; //seconds -- time between movements by gravity
	var move_time_f = move_time * fps;
	var maxtetrtime = 5; //seconds -- time a tetromino is under control
	var maxtetrtime_f = maxtetrtime * fps;

	//User visible stats
	var score=0;
	var blocksremoved=0; //number of removed blocks
	
	// position of world gravity lines
	var gravln_left = null;
	var gravln_right = null;
	var gravln_high = null;
	var gravln_low = null;
	
	var key_force = null; //force of the control keys to move tetrominos
	var lock_direction = null; //0=left, 1=right, 2=up, 3=down -- direction where player can´t move the tetronimo (=opposite direction of greatest gravity force)



	// ******************** classes ********************
	// simple block - color is corresponding to type of the tetris shape
	function Block(x, y, type) {
		this.x = x;
		this.y = y;
		this.type = type; //0-6 -> Tetrominos/normal colors, >6 -> special blocks
		//Special Block numbers:
		//TODO
		this.last_move_done = true;

		var types = [LBLUE, BLUE, ORANGE, YELLOW, GREEN, PURPLE, RED];
		var step = 256/unitsz;

		// x,y are optional offset coordinates (if the stored x and y are relative)
		// pre = true -> draw in preview window with relative coords, else undefined or false
		this.draw = function(x,y,pre) {
			var cx=this.x;
			var cy=this.y;
			if (typeof x != 'undefined' && x!=null)
				cx += x;
			if (typeof y != 'undefined' && y!=null)
				cy += y;

			if (typeof pre=='undefined' || pre==null)
				pre=false;

			// set block color depending on its type
			if (this.type > 6 || this.type < 0)
				var clr = BLACK;
			else
				var clr = types[this.type];

			// render the block
			p.noFill();
			p.strokeWeight(1);
			for(var i=0; i<unitsz/2; i++) {
				p.stroke(p.red(clr)+step*i, p.green(clr)+step*i, p.blue(clr)+step*i);
				if (!pre)		//render in game field
					p.rect(cx*unitsz+i, cy*unitsz+i, unitsz-2*i-1, unitsz-2*i-1);
				else if (pre==true)	//render in preview
					p.rect(previewx+cx*unitsz+i+2*unitsz, previewy+cy*unitsz+i+2*unitsz, unitsz-2*i-1, unitsz-2*i-1);
			}
		}

		// checks a hypothetical collision of that block if it was moved by x,y
		this.chk_touch = function(dx,dy) {
			var x = this.x+dx;
			var y = this.y+dy;

			if (x < 0 || y < 0 || x == fieldsz || y == fieldsz) //touches walls?
				return true;

			//check for collision with world
			for (var j=0; j<worldblocks.length; j++) {
				if (x == worldblocks[j].x && y == worldblocks[j].y)
					return true;
			}

			return false;
		}

		// interface to move a single block... only moves if there is space
		this.move = function(dx,dy) {
			if (this.chk_touch(dx,dy)==false) {
				this.x += dx;
				this.y += dy;
				this.last_move_done = true;
				return true; // moved successfully
			}

			this.last_move_done = false;
			return false; //not moved
		}

		//just for compatibility with a Tetromino
		this.get_boundaries = function() {
			return [this.x, this.x, this.y, this.y];
		}
	}
	
	// tetris shape object (on creation spawns in center)
	function Tetromino(type) {
		this.type = type; //number index for the forms: I,J,L,O,S,T,Z

		//Grid coordinates -> spawn point
		this.x = spawnx;
		this.y = spawny;

		this.spawnframe = p.frameCount;
		
		//Set blocks with relative coordinates (to make rotation easier)
		this.blocks = new Array();

		switch (type) {
		case 0: //I
			this.blocks.push(new Block(-1,-2, type));
			this.blocks.push(new Block(-1,-1, type));
			this.blocks.push(new Block(-1,0, type));
			this.blocks.push(new Block(-1,1, type));
			break;
		case 1: //J
			this.blocks.push(new Block(0,-2, type));
			this.blocks.push(new Block(0,-1, type));
			this.blocks.push(new Block(0,0, type));
			this.blocks.push(new Block(-1,0, type));
			break;
		case 2: //L
			this.blocks.push(new Block(-1,-2, type));
			this.blocks.push(new Block(-1,-1, type));
			this.blocks.push(new Block(-1,0, type));
			this.blocks.push(new Block(0,0, type));
			break;
		case 3: //O
			this.blocks.push(new Block(-1,-1, type));
			this.blocks.push(new Block(-1,0, type));
			this.blocks.push(new Block(0,-1, type));
			this.blocks.push(new Block(0,0, type));
			break;
		case 4: //S
			this.blocks.push(new Block(-2,0, type));
			this.blocks.push(new Block(-1,0, type));
			this.blocks.push(new Block(-1,-1, type));
			this.blocks.push(new Block(0,-1, type));
			break;
		case 5: //T
			this.blocks.push(new Block(-2,-1, type));
			this.blocks.push(new Block(-1,-1, type));
			this.blocks.push(new Block(0,-1, type));
			this.blocks.push(new Block(-1,0, type));
			break;
		case 6: //Z
			this.blocks.push(new Block(-2,-1, type));
			this.blocks.push(new Block(-1,0, type));
			this.blocks.push(new Block(-1,-1, type));
			this.blocks.push(new Block(0,0, type));
			break;
		default:
		}

		//returns outermost coordinates of the tetromino for gravity calculation
		//returns: array [left, right, top, bottom]
		this.get_boundaries = function() {
			var left=this.blocks[0].x;
			var right=this.blocks[0].x;
			var upper=this.blocks[0].y; //top is a reserved word -.-
			var bottom=this.blocks[0].y;

			for (var i=0; i<this.blocks.length; i++) {
				if (this.blocks[i].x < left)
					left = this.blocks[i].x;
				if (this.blocks[i].x > right)
					right = this.blocks[i].x;
				if (this.blocks[i].y < upper)
					upper = this.blocks[i].y;
				if (this.blocks[i].y > bottom)
					bottom = this.blocks[i].y;
			}

			return [this.x+left, this.x+right, this.y+upper, this.y+bottom]; //return absolute coordinate boundaries
		}

		//draw at correct coordinates on game field
		this.draw = function() {
			for(var i=0; i<this.blocks.length; i++) {
				this.blocks[i].draw(this.x,this.y);
			}
		}

		//Draw that tetromino in the preview field on the right
		this.draw_preview = function() {
			for(var i=0; i<this.blocks.length; i++) {
				this.blocks[i].draw(null,null,true);
			}
		}

		// checks for hypothetical collisions if rotated
		this.chk_rotate_touch = function(rotxy_x, rotxy_y) {

			// check hypothetical collision, if true, dont rotate...
			for(var i=0; i<this.blocks.length; i++) {
				var x = this.blocks[i].x;
				var y = this.blocks[i].y;
				var cx = this.x + rotxy_x[x+2][y+2];
				var cy = this.y + rotxy_y[x+2][y+2];

				if (this.blocks[i].chk_touch(cx,cy) == true)
					return true; //would collide
			}

			return false; //no collisions
		}

		//performs rotation with given matrix
		this.rotate = function(rotxy_x, rotxy_y) {
			//perform rotation
			for(var i=0; i<this.blocks.length; i++) {
				var x = this.blocks[i].x;
				var y = this.blocks[i].y;
				this.blocks[i].x += rotxy_x[x+2][y+2];
				this.blocks[i].y += rotxy_y[x+2][y+2];
			}

			return true; //successful rotation
		}

		//90° right turn
		this.rotate_right = function() {
			//rotation matrix matrix[x][y] -> x or y value to add to coordinates for the 90° right rotation
			var rotxy_x = [[3, 2, 1, 0],[2, 1, 0,-1],[1, 0,-1,-2],[0,-1,-2,-3]];
			var rotxy_y = [[0,-1,-2,-3],[1, 0,-1,-2],[2, 1, 0,-1],[3, 2, 1, 0]];

			if (this.chk_rotate_touch(rotxy_x,rotxy_y))
				return false;

			this.rotate(rotxy_x, rotxy_y)
			return true;
		}

		//90° left turn
		this.rotate_left = function() {
			var rotxy_x = [[3, 2, 1, 0],[2, 1, 0,-1],[1, 0,-1,-2],[0,-1,-2,-3]];
			var rotxy_y = [[0,-1,-2,-3],[1, 0,-1,-2],[2, 1, 0,-1],[3, 2, 1, 0]];

			// workaround - do 2 unchecked rotations, test before third (which would be the left turn)
			// on success - rotate the third time, on failure, rotate 2 more times (original position)
			this.rotate(rotxy_x, rotxy_y);
			this.rotate(rotxy_x, rotxy_y);

			if (this.chk_rotate_touch(rotxy_x,rotxy_y)) {
				this.rotate(rotxy_x, rotxy_y);
				this.rotate(rotxy_x, rotxy_y);
				return false;
			}

			this.rotate(rotxy_x, rotxy_y);
			return true;
		}

		// check hypothetical collision for every block of tetromino with any block of the world or the walls
		this.chk_touch = function(dx,dy) {
			var touch = false;
			for(var i=0; i<this.blocks.length; i++) {
				if (this.blocks[i].chk_touch(this.x+dx, this.y+dy))
					return true;
			}

			return false;
		}

		// move the tetromino (x,y - relative directions), drop on collision
		this.move = function(x,y) {
			if (this.chk_touch(x,y)) {
				play_sound("drop");
				add_tetr_to_world();
				return false;
			}

			this.x += x;
			this.y += y;
			return true; //moved
		}

		/* rest of initialization */
		//apply random rotation
		for (var i = p.int(p.random(0,4)); i > 0; i--) {
			this.rotate_right();
		}
	}

	// Object that handles the screen text message queue
	function MessageRenderer() {
		var msgqueue = new Array();
		
		var currmsg = null;
		var startframe = 0;
		var fadetime = 0.25; //seconds

		var rm_permanent = false;
		var rm_start = 0;

		// remove a permament message
		this.shift_msg = function() {
			if (currmsg != null && currmsg[3] == 0) {
				rm_permanent = true;
				rm_start = p.frameCount;
			}
		}

		// add a message (string, fontsize, color, duration in seconds) 
		// if duration == 0 then the message will stay until shift_msg ist called
		this.push_msg = function(str, size, color, duration) {
			msgqueue.push([str,size,color,duration]);
		}

		this.render = function() {
			// Remove old message if duration is over
			if (currmsg != null)
				if (currmsg[3] != 0) // not a permanent message
					if ((p.frameCount-startframe) > (fps*currmsg[3]+(2*fadetime*fps)) )
						currmsg = null;

			// load new
			if (currmsg == null) {
				if (msgqueue.length>0) {
					currmsg = msgqueue.shift();
					startframe = p.frameCount;
				} else
					return;
			}

			// render if there's anything
			if (currmsg != null) {
				var clr = currmsg[2];
				var screentime = (p.frameCount-startframe) / fps; //in sec

				//if fading, set alpha value
				if (screentime <= fadetime) //fadein
					p.fill(p.red(clr),p.green(clr),p.blue(clr), 255/fadetime*screentime);
				else if ( currmsg[3] != 0 && screentime > fadetime+currmsg[3]) //fadeout
					p.fill(p.red(clr),p.green(clr),p.blue(clr), 255 - 255/fadetime*(screentime-fadetime-currmsg[3]));
				else if ( currmsg[3] == 0 && rm_permanent) {  // fade a permanent out
					var alpha = 255 - 255/fadetime * ((p.frameCount-rm_start)/fps);
					p.fill(p.red(clr),p.green(clr),p.blue(clr), alpha);
					if (alpha < 10) { //invisible -> remove it
						currmsg=null;
						rm_permanent = false;
						return;
					}
				} else //normal
					p.fill(clr);

				//show on center of game field
				p.textFont(txtfont);
				p.textSize(currmsg[1]);
				p.text(currmsg[0],fieldszpx/2-txtfont.width(currmsg[0])*currmsg[1]/2, fieldszpx/2-15);
			}
		}
	}
	
	//type for effects of vanishing blocks(used by 'VisualEffectRenderer')
	function Effect(x, y, color, duration) {
		this.x = x;
		this.y = y;
		this.color = color;
		this.start_frame = p.frameCount;
		this.end_frame = this.start_frame + duration*fps;
		this.fade_step1 = 255 / (duration*fps);
		this.fade_step2 = 150 / (duration*fps);
		this.alpha1 = 255;
		this.alpha2 = 150;
		
		this.fade = function () {
			this.alpha1 -= this.fade_step1;
			this.alpha2 -= this.fade_step2;
			if (this.alpha2 < 0)
				this.alpha2 = 0;
		}
	}
	
	// renders visual effects when blocks are destroyed
	// use push_effects(blocks, [duration]) or push_effect(block, [duration]) to add effects
	function VisualEffectRenderer() {
		var effects = new Array(); //[x, y, color, duration]
		var duration0 = 2;
		
		//add an array of blocks (Array of 'Block', [duration in seconds])
		this.push_effects = function(blocks, duration) {
			var seconds = duration0;
			if (duration != null)
				seconds = duration;
			for (var i = 0; i < blocks.length; i++) {
				effects.push(new Effect(blocks[i].x, blocks[i].y, colors[blocks[i].type], seconds));
			}		
		}
		
		//add one block ('Block', [duration in seconds])
		this.push_effect = function(block, duration) {
			var seconds = duration0;
			if (duration != null)
				seconds = duration;
			effects.push(new Effect(block.x, block.y, colors[block.type], seconds));
		}
		
		this.render = function() {
			for (var i = 0; i < effects.length; i++) {
				if (p.frameCount < effects[i].end_frame) {
					effects[i].fade();
					if (p.frameCount % 30 == 0) msgrenderer.push_msg(effects[i].alpha1, 40, RED, 1);
					p.text(effects[i].alpha, 50, 50);
					//p.fill(p.red(effects[i].color),p.green(effects[i].color),p.blue(effects[i].color), effects[i].alpha);
					p.stroke(effects[i].color, effects[i].alpha1);
					p.fill(effects[i].color, effects[i].alpha2);
					p.rect(effects[i].x*unitsz, effects[i].y*unitsz, unitsz, unitsz);
				} else {
					effects.splice(i, 1); //delte effect because finisehd
				}
			}
		
		}
	
	}
	
	// ******************** functions ********************
	
	//plays sound (s=id name without "sfx_" prefix)
	//code from: http://www.storiesinflight.com/html5/audio.html
	function play_sound(s) {
		if (typeof audiochannels == 'undefined')
			return;

		s = "sfx_"+s; //add id prefix
		for (a=0;a<audiochannels.length;a++) {
			thistime = new Date();
			if (audiochannels[a]['finished'] < thistime.getTime()) {			// is this channel finished?
				audiochannels[a]['finished'] = thistime.getTime() + document.getElementById(s).duration*1000;
				audiochannels[a]['channel'].src = document.getElementById(s).src;
				audiochannels[a]['channel'].load();
				audiochannels[a]['channel'].play();
				break;
			}
		}
	}

	// next -> current, generate next
	function next_tetromino() {
		play_sound("spawn");
		currtetr = nexttetr;
		currtetr.spawnframe = p.frameCount;
		nexttetr = new Tetromino(p.int(p.random(0,7)));
	}

	// blocks of the tetromino get translated & added to world blocks (relative to absolute coords)
	function add_tetr_to_world() {
		for(var i=0; i<currtetr.blocks.length; i++) {
			var x = currtetr.x+currtetr.blocks[i].x;
			var y = currtetr.y+currtetr.blocks[i].y;
			var type = currtetr.type;
			worldblocks.push(new Block(x,y,type));
		}

		next_tetromino();
	}
	
	//Calculate worldmatr from worldblocks
	function update_worldmatr() {
		worldmatr =new Array();
		//Init empty world block matrix
		for (var i=0; i<fieldsz; i++) {
			worldmatr[i] = new Array();
			for (var j=0; j<fieldsz; j++)
				worldmatr[i][j] = null;
		}

		//add references of blocks to matrix
		for (var i=0; i<worldblocks.length; i++) {
			worldmatr[worldblocks[i].x][worldblocks[i].y] = worldblocks[i];
		}
	}

	// check if there is a finished row or square (of a single color + any joker/special blocks)
	// TODO: square detection, fix bug with 4x4 etc.!!!
	function chk_rows_and_squares() {
		var colors = [LBLUE, BLUE, ORANGE, YELLOW, GREEN, PURPLE, RED]; /* for message text color */

		/***** ROW + COL DETECTION *****/
		var rowcount=0;
		
		if (worldmatr == null)
			return false; //not possible at the moment
		
		//get rows, mark blocks for deletion
		for (var iy=0; iy<fieldsz; iy++) {
			var isrow = true;
			var currcolor = null;
			for(var i=0; i<fieldsz; i++) {
				if (worldmatr[i][iy] == null 
						|| (currcolor!=null && worldmatr[i][iy].type<=6 && worldmatr[i][iy].type != currcolor)) {
					isrow = false;
					break;
				} else if (currcolor == null)
					currcolor = worldmatr[i][iy].type;
			}
			if (isrow) {
				rowcount++;
				for(var i=0; i<fieldsz; i++)
					worldmatr[i][iy].to_remove = true;
			}
		}

		//get cols, mark blocks for deletion
		for (var ix=0; ix<fieldsz; ix++) {
			var iscol = true;
			var currcolor = null;
			for(var i=0; i<fieldsz; i++) {
				if (worldmatr[ix][i] == null
						|| (currcolor!=null && worldmatr[ix][i].type<=6 && worldmatr[ix][i].type != currcolor)) {
					iscol = false;
					break;
				} else if (currcolor == null)
					currcolor = worldmatr[ix][i].type;
			}
			if (iscol) {
				rowcount++;
				for(var i=0; i<fieldsz; i++)
					worldmatr[ix][i].to_remove = true;
			}
		}
		//update score/stats + show message if there were rows
		if (rowcount > 0) {
			blocksremoved += rowcount*fieldsz;
			var addscore = 10 * rowcount*rowcount;
			score += addscore;

			var txt = "Row! (+"+addscore.toString()+")";
			if (rowcount > 1)
				txt = rowcount.toString()+"x "+txt;
			msgrenderer.push_msg(txt,20,colors[rowcount-1],2+0.2*rowcount);
			//play sound
			if (rowcount == 1)
				playsound("row");
			else if (rowcount == 2)
				playsound("row2");
			else if (rowcount > 2)
				playsound("row3");
		}

		/***** SQUARE DETECTION *****/

		//sort world blocks -> important to find the big (4x4 etc) blocks FIRST
		//sorts the blocks in a way that lower coordinates come first
		worldblocks.sort(function(a,b) {
			return (a.x+a.y) - (b.x+b.y);
		})

		//look for 3x3 squares, then try to expand to sides (a 3x3 square might be something bigger like 4x4)
		for(var i=0; i<worldblocks.length; i++) {
			var ix=worldblocks[i].x;
			var iy=worldblocks[i].y;

			//dont even look at the surrounding of that block if it doesn't meet the conditions
			if (worldmatr[ix][iy]==null)
				continue;
			if (ix>fieldsz-3 || iy>fieldsz-3) //cant be a square from here... out of game field
				continue;
			if (worldblocks[i].last_move_done==true) //that block was falling down... doesn't count
				continue;
			if (worldblocks[i].to_remove==true) //is already part of a square
				continue;

			else { //look for a 3x3 square growing from this block down and right
				var clr=worldblocks[i].type;
				var square = true;

				for(var y=0; y<3; y++) {
					for(var x=0; x<3; x++) {
						if (worldmatr[ix+x][iy+y]==null || worldmatr[ix+x][iy+y].to_remove==true
								|| (worldmatr[ix+x][iy+y].type<=6 && worldmatr[ix+x][iy+y].type != clr)) {
							square = false;
							break;
						}
					}
					if (square==false) //saves time
						break;
				}

				if (square) {
					var squareside = 3; //minimal square

					//check whether the square is bigger...
					
					var onemore=true;
					do {
						onemore=true;
						for(var i=0; i<=squareside; i++) {
							var x = ix+i;
							var y = iy+squareside;
							if (x>=fieldsz || y>=fieldsz) { //out of bound?
								onemore=false;
								break;
							}

							if (worldmatr[x][y]==null || worldmatr[x][y].to_remove==true
									|| (worldmatr[x][y].type<=6 && worldmatr[x][y].type != clr)) {
								onemore=false;
								break;
							}
							
							x=ix+squareside;
							y=iy+i;
							if (x>=fieldsz || y>=fieldsz) { //out of bound?
								onemore=false;
								break;
							}

							if (worldmatr[x][y]==null || worldmatr[x][y].to_remove==true
									|| (worldmatr[x][y].type<=6 && worldmatr[x][y].type != clr)) {
								onemore=false;
								break;
							}
						}

						if(onemore)
							squareside++;
					} while(onemore==true);
					

					//set blocks for removal
					for(var y=0; y<squareside; y++)
						for(var x=0; x<squareside; x++) {
							worldmatr[ix+x][iy+y].to_remove = true;
						}
					
					//update score/stats + show message
					blocksremoved += squareside*squareside;
					var addscore = squareside*squareside * (squareside-2)*(squareside-2);
					score += addscore;
					msgrenderer.push_msg((squareside.toString()+"x"+squareside.toString()+" Square! (+"+addscore.toString()+")"),20,colors[squareside-3],2+0.2*(squareside-3));

					//play sound
					if (squareside == 3)
						play_sound("sq3");
					else if (squareside == 4)
						play_sound("sq4");
					else if (squareside >= 5)
						play_sound("sq5");
				}
			}
		}

		remove_marked_blocks();
	}

	// remove blocks which are marked to be removed (block.to_remove == true)
	// TODO: check whether these are special mission/bonus blocks and do something accordingly
	function remove_marked_blocks() {
		for(var i=0; i<worldblocks.length; i++) {
			if (worldblocks[i].to_remove == true) {
				visrenderer.push_effect(worldblocks.splice(i,1),1);
				i--;
			}
		}
	}
	
	// moves block/tetromino 'tetr' according to gravity and set 'lock_direction'
	function apply_gravity(tetr) {
		var bounds = tetr.get_boundaries(); //array [left, right, top, bottom]
		var x_force = (bounds[0] - gravln_left) - (gravln_right - bounds[1]); //0=no grav <0=left >0=right
		var y_force = (bounds[2] - gravln_high) - (gravln_low - bounds[3]); //0=no grav <0=up >0=down

		var new_lock_direction = -1; //temporary buffer for new lock_direction, applied only if object=tetromino

		// check whether the object is a tetromino or a block
		var is_tetromino = true;
		if (bounds[0]==bounds[1] && bounds[2]==bounds[3])
			is_tetromino = false;
		
		//search for greatest force and apply 'lock_direction'
		if (p.abs(x_force) > p.abs(y_force)) {
			if (x_force > 0) {
				tetr.move(1, 0);
				new_lock_direction = 0;
			} else {
				tetr.move(-1, 0);
				new_lock_direction = 1;
			}
			if (key_force > p.abs(x_force)) {
				new_lock_direction = -1;
			}
		} else if (p.abs(y_force) > p.abs(x_force)) {
			if (y_force > 0) {
				tetr.move(0, 1);
				new_lock_direction = 2;
			} else {
				tetr.move(0, -1);
				new_lock_direction = 3;
			}
			if (key_force > p.abs(y_force)) {
				new_lock_direction = -1;
			}
		} else {
			new_lock_direction = -1; //no direction locked if equal gravity to all sides
			//blocks on the border of gravity areas get moved randomly
			if (p.int(p.random(0,2))) {
				if (y_force!=0)
					tetr.move(0,y_force/p.abs(y_force));
				else
					tetr.move(0,p.int(p.random(0,3))-1);
			} else {
				if (x_force!=0)
					tetr.move(x_force/p.abs(x_force),0);
				else
					tetr.move(p.int(p.random(0,3))-1,0);
			}
		}

		if (is_tetromino) //apply new lock
			lock_direction = new_lock_direction;
	}
	
	//returns 'true' if 'block' is part of a "tower of blocks" from the LEFT
	function check_tower(block) {
		for (var x = block.x; x > 0; x--) { //also checks if block is really part of wordblocks ;)
			if (worldmatr[x] == null) {
				msgrenderer.push_msg("FAIL!", 50, RED, 1);
				break;
			}
				
			if (worldmatr[x][block.y] == null)
				return false;
		}
		return true;
	}
	
	// sets all 'gravln_[...]' according to constitution of 'worldblocks'
	//TODO: turn all world blocks anti clock wise --> same algo can be applied to get all gravlines
	function update_gravlines() {
		var cand = new Array(); //candidates
		var span = 0; //distance between new gravline and "ground"
		
		
		for (var i = 0; i < cand.length; i++) {
			
		}
	
	}
	
	//Checks for collision with spawn zone -> lose
	function chk_gameover() {
		for(var i=0; i<worldblocks.length; i++) {
			if (worldblocks[i].x < spawnx+2 && worldblocks[i].x >= spawnx-2
					&& worldblocks[i].y < spawny+2 && worldblocks[i].y >= spawny-2) {
						game_over = true;
			}
		}
	}
	
	function finish() {
		msgrenderer.push_msg("GAME OVER!", 50, RED, 0);
		play_sound("gameover");
		game_over = true;
		finished = true;
	}


// ******************** processingjs ********************
	p.setup = function() {
		p.frameRate(fps);
		msgrenderer = new MessageRenderer();
		visrenderer = new VisualEffectRenderer();

		//load Font
		txtfont = p.loadFont("./gfx/loveya.svg",30);
		if(isNaN(txtfont.width("a"))) //Fallback to a TTF default font
			txtfont = p.loadFont("Comic Sans MS",30);

		//load GFX
		backgroundimg = p.requestImage("./gfx/background.png");

		//start soundtrack if music is turned on
		document.getElementById("sfx_soundtrack").volume=0.1; //not that loud...
		if(musicon)
			document.getElementById("sfx_soundtrack").play();
		
		game_over = false;
		finished = false;

		//Init Tetromino queue
		nexttetr = new Tetromino(p.int(p.random(0,7)));
		next_tetromino();
		
		//Init world gravity lines
		gravln_left = -1   +5;
		gravln_right = fieldsz   -5;
		gravln_high = -1   +5; //DEBUG insertion
		gravln_low = fieldsz   -5; //DEBUG insertion
		
		//Init key_force
		key_force = (fieldsz/10); //TODO need to convert to int? float should do it as well regarding that the greatest force decides movement...
	
		lock_direction = -1;
	}

	p.draw = function() {
		//show loading message until all gfx are loaded
		if (loading) {
			p.background(127);
			p.fill(255);
			p.textFont(p.loadFont("Courier New", 20));
			p.text("Loading game data...",100,100);

			loading = false;
			if (backgroundimg.width <= 0) {
				loading = true;
				if (backgroundimg.width == -1)
					p.text("Error while loading game data!",50,50);
			}
			
			return;
		}

		/************* game logic ************/
		//TODO: missions etc...
		
		if (!game_over) {
			update_worldmatr(); //recalculate blocks in world matrix
			update_gravlines();

			if (p.frameCount%move_time_f == 0) {
				for (var i=0; i<worldblocks.length; i++) //apply gravity to world
					apply_gravity(worldblocks[i]);
				apply_gravity(currtetr);
			}

			if (p.frameCount > currtetr.spawnframe+maxtetrtime_f) { //check the tetromino life state
				add_tetr_to_world();
				play_sound("tetr_timeout");
			}

			chk_rows_and_squares(); //check rows/squares -> remove, add score etc.
			chk_gameover(); //check whether there are foreign blocks in spawn zone -> lose
		} else {
			if (!finished) {
				finish();
			}
		}

		
		/*************  rendering  *************/
		// game background
		p.image(backgroundimg);

		// Preview window
		p.stroke(BLACK);
		p.strokeWeight(3);
		p.fill(80);
		p.rect(previewx-3,previewy-3,unitsz*4+6,unitsz*4+6);
		p.strokeWeight(1);

		// render gravity zones
		//Diagonal lines
		p.stroke(0,0,0,127);
		p.line(gravln_left*unitsz+unitsz/2,gravln_high*unitsz+unitsz/2,
				gravln_right*unitsz+unitsz/2,gravln_low*unitsz+unitsz/2);
		p.line(gravln_left*unitsz+unitsz/2,gravln_low*unitsz+unitsz/2,
				gravln_right*unitsz+unitsz/2,gravln_high*unitsz+unitsz/2);
		//Gravity force lines
		p.stroke(255,0,0,127);
		p.line(gravln_left*unitsz+unitsz/2, 0, gravln_left*unitsz+unitsz/2, fieldszpx);
		p.line(gravln_right*unitsz+unitsz/2, 0, gravln_right*unitsz+unitsz/2, fieldszpx);
		p.line(0, gravln_high*unitsz+unitsz/2, fieldszpx, gravln_high*unitsz+unitsz/2);
		p.line(0, gravln_low*unitsz+unitsz/2, fieldszpx, gravln_low*unitsz+unitsz/2);
		

		// render spawn zone
		p.noFill();
		p.stroke(255,0,0,127);
		p.rect((spawnx-2)*unitsz,(spawny-2)*unitsz,4*unitsz,4*unitsz)

		// render score and stuffz
		p.textSize(20);
		p.textFont(txtfont);
		if (!game_over) { //show rest time if game is running
			p.fill(255);
			p.text("Time:",520,250);
			p.fill(0);
			p.text(p.int(((maxtetrtime_f-(p.frameCount-currtetr.spawnframe))/fps)).toString(),520,280);
		}
		p.fill(255);
		p.text("Removed:",520,340);
		p.fill(0);
		p.text(blocksremoved.toString(),520,370);
		p.fill(255);
		p.text("Score:",520,420);
		p.fill(0);
		p.text(score.toString(),520,450);
		
		//draw world & tetrominoes
		for(var i=0; i<worldblocks.length; i++) {
			worldblocks[i].draw();
		}
		currtetr.draw();
		nexttetr.draw_preview();

		msgrenderer.render(); //render text messages
		visrenderer.render(); //render visual effects
	}

	p.keyPressed = function() {
		// Leave (abort) game
		if (p.keyCode == p.ESC) {
			p.exit();
			document.getElementById("sfx_soundtrack").pause();
			$("#game").css("display","none");
			$("#menu").css("display","inline");
		}
		
		if (p.key == 109) { //m -> toggle music
			if (musicon)
				document.getElementById("sfx_soundtrack").pause();
			 else
				document.getElementById("sfx_soundtrack").play();
			 musicon = !musicon;
		}
		
		if (!game_over) {
			//rotation
			if (p.key == 101) // e
				currtetr.rotate_right();
			else if (p.key == 113) // q
				currtetr.rotate_left();
			
			if (p.keyCode == p.LEFT || p.key == 97) { // left & a
				if (lock_direction != 0) {
					currtetr.move(-1,0);
				}
			} else if (p.keyCode == p.RIGHT || p.key == 100) { // right & d
				if (lock_direction != 1) {
					currtetr.move(1,0);
				}
			}
			if (p.keyCode == p.UP || p.key == 119) { // up & w
				if (lock_direction != 2) {
					currtetr.move(0,-1);
				}
			} else if (p.keyCode == p.DOWN || p.key == 115) { // down & s
				if (lock_direction != 3) {
					currtetr.move(0,1);
				}
			}
			
			if (p.key == 32) { //space
				//TODO: move tetromino DOWN in gravity direction...
			}
		}
	}
}

