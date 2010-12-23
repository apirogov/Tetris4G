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
	var fieldsz = 480; // field size (height and width)
	var unitsz = 10; // unit of size in canvas of one block (height and width) --> grid
	// colors
	var LBLUE = p.color(0, 255, 255);
	var BLUE = p.color(0, 0, 255);
	var ORANGE = p.color(255, 127, 0);
	var YELLOW = p.color(255, 255, 0);
	var GREEN = p.color(0, 255, 0);
	var PURPLE = p.color(255, 0, 255);
	var RED = p.color(255, 0, 0);
	var BLACK = p.color(0, 0, 0);
	
	// ******************** classes ********************
	// simple block -- type: 0(light blue), 1(blue), 2(organge), 3(yellow), 4(green), 5(purple), 6(red)
	function Block(x, y, type) {
		this.x = x;
		this.y = y;
		this.type = type;
		
		this.draw = function() {
			switch(type) {
				case 0:
					p.stroke(LBLUE); //green
					break;
				case 1:
					p.stroke(BLUE); //green
					break;
				case 2:
					p.stroke(ORANGE); //green
					break;
				case 3:
					p.stroke(YELLOW); //green
					break;
				case 4:
					p.stroke(GREEN); //green
					break;
				case 5:
					p.stroke(PURPLE); //green
					break;
				case 6:
					p.stroke(RED); //green
					break;
				default:
					p.stroke(BLACK); //black
			}
			p.rect(this.x, this.y, unitsz, unitsz);
		}
	}
	
	// tetris object
	function Tetris(type) {
		this.type = type;
		
		this.draw = function() {
			
		}	
	}

// ******************** processings ********************
	p.setup = function() {
	
	}

	p.draw = function() {
		// playing field
		p.background(100);
		p.line(fieldsz, 0, fieldsz, fieldsz);
		
		// DEBUG
		for (var x = 5; x < fieldsz; x += 2*unitsz) {
			for (var y = 5; y < fieldsz; y += 2*unitsz) {
				p.rect(x, y, unitsz, unitsz);
			}
		}
		
		// DEBUG
		for (var x = unitsz; x < fieldsz; x += 2*unitsz) {
			var myblock = new Block(x, 20, (x-unitsz) / (2*unitsz));
			myblock.draw();
		}
	}

	p.keyPressed = function() {
		// Leave game
		if (p.keyCode = p.ESC) {
			p.exit();
			$("#game").css("display","none");
			$("#menu").css("display","inline");
		}
	}
}
