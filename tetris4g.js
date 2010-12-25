// click handlers
function addClickHandlers() {
	$("#start").click(function() {
		$("#menu").css("display","none");
		$("#game").css("display","inline");
		$("#help").css("display","none");

		// attaching the sketch function to the canvas
		var p = new Processing($("#canvas1").get(0), sketch);
	});

	$("#showhelp").click(function() {
		if ($("#help").css("display")=="none") {
			$("#help").css("display","inline");
			$("#showhelp").attr("value","Hide help");
		} else {
			$("#help").css("display","none");
			$("#showhelp").attr("value","Show help");
		}
	});
}

// ready event for document -- executed when DOM is ready
$(document).ready(addClickHandlers);

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
	
	// ******************** global vars ********************
	
	// required images+fonts (loaded in setup)
	var backgroundimg = null;
	var txtfont = null;

	// global vars/objects
	var fps = 30; // framerate
	var loading = true; //bool that indicates whether the game is ready to play or not
	var msgrenderer = null; //object that handles on screen text messages (init in setup)

	//World & Tetrominoes
	var worldblocks = new Array(); //all blocks that are already settled
	var currtetr = null; //current tetromino
	var nexttetr = null; //next tetromino
	
	// position of world gravity lines
	var gravln_left = null;
	var gravln_right = null;
	var gravln_high = null;
	var gravln_low = null;


	// ******************** classes ********************
	// simple block - color is corresponding to type of the tetris shape
	function Block(x, y, type) {
		this.x = x;
		this.y = y;
		this.type = type;

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
	}
	
	// tetris shape object (on creation spawns in center)
	function Tetromino(type) {
		this.type = type; //number index for the forms: I,J,L,O,S,T,Z

		//Grid coordinates
		this.x = fieldsz/2;
		this.y = fieldsz/2;
		
		//boundaries //TODO SET!!!
		this.left = 0;
		this.right = 0;
		this.top = 0;
		this.bottom = 0;

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

		//90° right turn
		this.rotate_right = function() {
			var rotxy_x = [[3,2,1,0],[2,1,0,-1],[1,0,-1,-2],[0,-1,-2,-3]];
			var rotxy_y = rotxy_x.slice(0).reverse();

			for(var i=0; i<this.blocks.length; i++) {
				var x = this.blocks[i].x;
				var y = this.blocks[i].y;
				this.blocks[i].x += rotxy_x[x+2][y+2];
				this.blocks[i].y += rotxy_y[x+2][y+2];
			}
		}

		this.rotate_left = function() {
			//for easiness' sake
			this.rotate_right();
			this.rotate_right();
			this.rotate_right();
		}

		// check collision for every block of tetromino with any block of the world or the walls
		this.chk_touch = function(dx,dy) {
			var touch = false;
			for(var i=0; i<this.blocks.length; i++) {
				var x = this.x+this.blocks[i].x+dx;
				var y = this.y+this.blocks[i].y+dy;
	
				if (x < 0 || y < 0 || x == fieldsz || y == fieldsz) //touches walls?
					return true;

				//check for collision with world
				for (var j=0; j<worldblocks.length; j++) {
					if (x == worldblocks[j].x && y == worldblocks[j].y)
						return true;
				}
			}
		}

		// move the tetromino (x,y - relative directions), drop on collision
		this.move = function(x,y) {
			if (this.chk_touch(x,y))
				addTetrToWorld();
			else {
				this.x += x;
				this.y += y;
			}
		}

		/* rest of initialization */
		//apply random rotation
		
		for (var i = p.int(p.random(3)); i > 0; i--) {
			this.rotate_right();
		}
		//TODO delete (old)
		// switch(p.int(p.random(0,4))) {
		// case 0:
			// this.rotate_right();
			// break;
		// case 1:
			// this.rotate_left();
			// break;
		// case 2:
			// this.rotate_right();
			// this.rotate_right();
			// break;
		// }
	}

	// next -> current, generate next
	function nextTetromino() {
		currtetr = nexttetr;
		nexttetr = new Tetromino(p.int(p.random(0,7)));
	}

	// blocks of the tetromino get translated & added to world blocks (relative to absolute coords)
	function addTetrToWorld() {
		for(var i=0; i<currtetr.blocks.length; i++) {
			var x = currtetr.x+currtetr.blocks[i].x;
			var y = currtetr.y+currtetr.blocks[i].y;
			var type = currtetr.type;
			worldblocks.push(new Block(x,y,type));
		}

		nextTetromino();
	}


	// check if there is a finished row
	function chk_rows() {
		//TODO
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
				p.text(currmsg[0],fieldszpx/2-p.textWidth(currmsg[0])/2, fieldszpx/2-15);
			}
		}
	}

	
// ******************** processingjs ********************
	p.setup = function() {
		p.frameRate(fps);
		msgrenderer = new MessageRenderer();

		//load Font
		txtfont = p.loadFont("./gfx/loveya.svg",30); //slow :(

		//load GFX
		backgroundimg = p.requestImage("./gfx/background.png");

		//DEBUG: Message testing
		msgrenderer.push_msg("Test",20,RED,3);
		msgrenderer.push_msg("ROW!!!",30,BLUE,2);

		//Init Tetromino queue
		nexttetr = new Tetromino(p.int(p.random(0,7)));
		nextTetromino();
		
		//Init world gravity lines
		gravln_left = -1;
		gravln_right = fieldsz;
		gravln_high = -1;
		gravln_low = fieldsz;
	}

	p.draw = function() {
		//show loading message until all gfx are loaded
		if (loading) {
			p.background(127);
			p.fill(255);
			p.textFont(p.loadFont("Courier New", 20));
			p.text("Loading game data...",100,100);

			loading = false;
			if (backgroundimg.width<=0)
				loading = true;
			
			return;
		}

		/************* game logic ************/
		//TODO: gravity, rows, game over, score etc...

		
		/*************  rendering  *************/
		// game background
		p.image(backgroundimg);
		// Preview window
		p.stroke(BLACK);
		p.strokeWeight(3);
		p.fill(80);
		p.rect(previewx-3,previewy-3,unitsz*4+6,unitsz*4+6);
		p.strokeWeight(1);
		//TODO: render score, etc infos
		
		//draw world & tetrominoes
		for(var i=0; i<worldblocks.length; i++) {
			worldblocks[i].draw();
		}
		currtetr.draw();
		nexttetr.draw_preview();

		msgrenderer.render(); //render text messages
	}

	p.keyPressed = function() {
		// Leave (abort) game
		if (p.keyCode == p.ESC) {
			p.exit();
			$("#game").css("display","none");
			$("#menu").css("display","inline");
		}

		//rotation
		if (p.key == 101) // e
			currtetr.rotate_right();
		else if (p.key == 113) // q
			currtetr.rotate_left();

		//movement
		if (p.keyCode == p.UP || p.key == 119) { // up & w
			currtetr.move(0,-1);
		} else if (p.keyCode == p.DOWN || p.key == 115) { // down & s
			currtetr.move(0,1);
		}
		if (p.keyCode == p.LEFT || p.key == 97) { // left & a
			currtetr.move(-1,0);
		} else if (p.keyCode == p.RIGHT || p.key == 100) { // right & d
			currtetr.move(1,0);
		}
		if (p.key == 32) { //space
			//TODO: move tetromino DOWN in gravity direction...
		}
	}
}
