
/* implement indexOf if not present */
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
	}
}
