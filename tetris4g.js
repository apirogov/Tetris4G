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
	var fpm = 30; // frames per move
	var loading = true; //bool that indicates whether the game is ready to play or not
	var msgrenderer = null; //object that handles on screen text messages (init in setup)

	//World & Tetrominoes
	var spawnx = fieldsz/2; //Spawn field coordinates (kinda center of it)
	var spawny = fieldsz/2;
	var worldblocks = new Array(); //all blocks that are already settled
	var currtetr = null; //current tetromino -- controlled by keys and gravity
	var nexttetr = null; //next tetromino
	var maxtetrtime=5; //a tetromino is under control for 5 seconds only

	//User visible stats
	var score=0;
	var rows =0;
	
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
				return true; // moved successfully
			}

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
				p.text(currmsg[0],fieldszpx/2-p.textWidth(currmsg[0])/2, fieldszpx/2-15);
			}
		}
	}
	
	// ******************** functions ********************
	// next -> current, generate next
	function next_tetromino() {
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

	// check if there is a finished row or square
	// TODO: square detection
	function chk_rows() {
		//Init empty world block matrix
		var worldmatr=new Array();
		for (var i=0; i<fieldsz; i++) {
			worldmatr[i] = new Array();
			for (var j=0; j<fieldsz; j++)
				worldmatr[i][j] = null;
		}

		//add references of blocks to matrix
		for (var i=0; i<worldblocks.length; i++) {
			worldmatr[worldblocks[i].x][worldblocks[i].y] = worldblocks[i];
		}

		var rowcount=0;
		//get rows, mark blocks for deletion
		for (var iy=0; iy<fieldsz; iy++) {
			var isrow = true;
			var currcolor = null;
			for(var i=0; i<fieldsz; i++) {
				if (worldmatr[i][iy] == null || (currcolor!=null && worldmatr[i][iy].type != currcolor)) {
					isrow = false;
					break;
				} else if (currcolor == null)
					currcolor = worldmatr[i][iy];
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
				if (worldmatr[ix][i] == null || (currcolor!=null && worldmatr[ix][i].type != currcolor)) {
					iscol = false;
					break;
				} else if (currcolor == null)
					currcolor = worldmatr[ix][i];
			}
			if (iscol) {
				rowcount++;
				for(var i=0; i<fieldsz; i++)
					worldmatr[ix][i].to_remove = true;
			}
		}
		// remove that blocks
		for(var i=0; i<worldblocks.length; i++) {
			if (worldblocks[i].to_remove == true) {
				worldblocks.splice(i,1);
				i--;
			}
		}

		//update score/stats
		rows += rowcount;
		score += 10 * rowcount*rowcount;

		//show message if there were rows
		if (rowcount > 0) {
			var colors = [LBLUE, BLUE, ORANGE, YELLOW, GREEN, PURPLE, RED];
			var txt = "Row!";
			if (rowcount > 1)
				txt = rowcount.toString()+"x Row!";
			msgrenderer.push_msg(txt,20,colors[rowcount-1],2+0.2*rowcount);
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
			if (p.int(p.random(0,2)))
				tetr.move(0,y_force/p.abs(y_force));
			else
				tetr.move(x_force/p.abs(x_force),0);
		}

		if (is_tetromino) //apply new lock
			lock_direction = new_lock_direction;
	}
	
	//Checks for collision with spawn zone -> lose
	//TODO: not simply abort (its just for testing)
	function chk_gameover() {
		for(var i=0; i<worldblocks.length; i++) {
			if (worldblocks[i].x < spawnx+2 && worldblocks[i].x >= spawnx-2
					&& worldblocks[i].y < spawny+2 && worldblocks[i].y >= spawny-2)
				p.exit(); //abort (GAME OVER)
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

		//Init Tetromino queue
		nexttetr = new Tetromino(p.int(p.random(0,7)));
		next_tetromino();
		
		//Init world gravity lines
		gravln_left = -1;
		gravln_right = fieldsz;
		gravln_high = -1;
		gravln_low = fieldsz;
		
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
			if (backgroundimg.width<=0)
				loading = true;
			
			return;
		}

		/************* game logic ************/
		//TODO: missions etc...
		
		if (p.frameCount%fpm == 0) {
			for (var i=0; i<worldblocks.length; i++) //apply gravity to world
				apply_gravity(worldblocks[i]);
			apply_gravity(currtetr);
		}

		if (p.frameCount > currtetr.spawnframe+maxtetrtime*fps) //check the tetromino life state
			add_tetr_to_world();

		chk_rows(); //check rows/squares -> remove, add score etc.
		chk_gameover(); //check whether there are foreign blocks in spawn zone -> lose

		
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
		p.stroke(0,0,0,127);
		p.line(gravln_left*unitsz,gravln_high*unitsz,(gravln_right+1)*unitsz,(gravln_low+1)*unitsz);
		p.line(gravln_left*unitsz,(gravln_low+1)*unitsz,gravln_right*unitsz,(gravln_high+1)*unitsz);

		// render spawn zone
		p.noFill();
		p.stroke(255,0,0,127);
		p.rect((spawnx-2)*unitsz,(spawny-2)*unitsz,4*unitsz,4*unitsz)

		// render score and stuffz
		p.textSize(20);
		p.textFont(txtfont);
		p.fill(255);
		p.text("Time:",520,250);
		p.fill(0);
		p.text(p.int(((maxtetrtime*fps-(p.frameCount-currtetr.spawnframe))/fps)).toString(),520,280);
		p.fill(255);
		p.text("Rows:",520,340);
		p.fill(0);
		p.text(rows.toString(),520,370);
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
