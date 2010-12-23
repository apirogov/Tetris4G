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

// Simple way to attach js code to the canvas is by using a function
function sketch(p) {

	p.setup = function() {
	}

	p.draw = function() {
		p.background(100);
		p.line(480,0,480,480);
	}

	p.keyPressed = function() {
		/* Leave game */
		if (p.keyCode = p.ESC) {
			$("#game").css("display","none");
			$("#menu").css("display","inline");
		}
	}
}
