/**
@author Matt Crinklaw-Vogt (tantaman)
*/
(function( $ ) {
	if (!$.event.special.destroyed) {
		$.event.special.destroyed = {
		    remove: function(o) {
		    	if (o.handler) {
		    		o.handler();
		    	}
		    }
		}
	}

	function ctrlPtComparator(l,r) {
		return l.position - r.position;
	}

	function bind(fn, ctx) {
		if (typeof fn.bind === "function") {
			return fn.bind(ctx);
		} else {
			return function() {
				fn.apply(ctx, arguments);
			}
		}
	}

	var browserPrefix = "";
	var agent = window.navigator.userAgent;
	if (agent.indexOf('WebKit') >= 0)
		browserPrefix = '-webkit-';
	else if (agent.indexOf('Mozilla') >= 0)
		browserPrefix = '-moz-';
	else if (agent.indexOf('Microsoft') >= 0)
		browserPrefix = '-ms-';
	else
		browserPrefix = '';

	function GradientSelection($parent, opts) {
		this.opts = opts;

        this.$el = $('<div class="gradientPicker-root gradientPicker-' + opts.orientation + '"></div>');
        $parent.append(this.$el);

        this.$el.addClass('gradientPicker-root');
        this.$el.addClass('gradientPicker-' + opts.orientation);

		var $preview = $("<canvas class='gradientPicker-preview'></canvas>");
		this.$el.append($preview);
		this.canvas = $preview[0];
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
		this.g2d = this.canvas.getContext("2d");

		var $ctrlPtContainer = $("<div class='gradientPicker-ctrlPts'></div>");
		this.$el.append($ctrlPtContainer);
		this.$ctrlPtContainer = $ctrlPtContainer;

		this.updatePreview = bind(this.updatePreview, this);

        this.regenerateControlPoints();

		this.docClicked = bind(this.docClicked, this);
		this.destroyed = bind(this.destroyed, this);
		$(document).bind("click", this.docClicked);
		this.$el.bind("destroyed", this.destroyed);
		this.previewClicked = bind(this.previewClicked, this);

		$preview.click(bind(this.previewClicked, this));
        $ctrlPtContainer.click(bind(this.previewClicked, this));

		this.updatePreview();
	}

	GradientSelection.prototype = {
		docClicked: function() {
			this.ctrlPtConfig.hide();
		},

		createCtrlPt: function(ctrlPtSetup) {
			return new ControlPoint(this.$ctrlPtContainer, ctrlPtSetup, this.opts.orientation, this, this.ctrlPtConfig)
		},

		destroyed: function() {
			$(document).unbind("click", this.docClicked);
		},

		updateOptions: function(opts) {
			$.extend(this.opts, opts);
            this.regenerateControlPoints();
			this.updatePreview();
		},

		updatePreview: function() {
		    var result = [];

			this.controlPoints.sort(ctrlPtComparator);
            var grad;
			if (this.opts.orientation == "horizontal") {
				grad = this.g2d.createLinearGradient(0, 0, this.g2d.canvas.width, 0);
			} else {
			    grad = this.g2d.createLinearGradient(0, 0, 0, this.g2d.canvas.height);
			}
			for (var i = 0; i < this.controlPoints.length; ++i) {
			    var pt = this.controlPoints[i];
			    grad.addColorStop(pt.position, pt.color);
			    result.push({
			        position: pt.position,
			        color: pt.color
			    });
			}

			this.g2d.fillStyle = grad;
			this.g2d.fillRect(0, 0, this.g2d.canvas.width, this.g2d.canvas.height);

			if (this.opts.generateStyles)
				var styles = this._generatePreviewStyles();

            (typeof this.opts.change == 'function') && this.opts.change(result, styles);
		},

        regenerateControlPoints: function() {
            if (this.controlPoints) {
                for (var i = 0; i < this.controlPoints.length; ++i) {
                    this.removeControlPoint(this.controlPoints[i]);
                }
            }
            this.controlPoints = [];
            this.ctrlPtConfig = new ControlPtConfig(this.$el, this.opts);
            for (var i = 0; i < this.opts.controlPoints.length; ++i) {
                var ctrlPt = this.createCtrlPt(this.opts.controlPoints[i]);
                this.controlPoints.push(ctrlPt);
            }
        },

		removeControlPoint: function(ctrlPt) {
			var cpidx = this.controlPoints.indexOf(ctrlPt);

			if (cpidx != -1) {
				this.controlPoints.splice(cpidx, 1);
				ctrlPt.$el.remove();
			}
		},

		previewClicked: function(e) {
			var offset = $(e.target).offset();
			var x = e.pageX - offset.left;
			var y = e.pageY - offset.top;

            var imgData;
            if (this.opts.orientation == 'horizontal') {
                imgData = this.g2d.getImageData(x,0,1,1);
            } else {
                imgData = this.g2d.getImageData(0,y,1,1);
            }
			var colorStr = "rgb(" + imgData.data[0] + "," + imgData.data[1] + "," + imgData.data[2] + ")";

			var cp = this.createCtrlPt({
				position: this.opts.orientation == 'horizontal'
                    ? (x / this.g2d.canvas.width)
                    : (y / this.g2d.canvas.height),
				color: colorStr
			});

			this.controlPoints.push(cp);
			this.controlPoints.sort(ctrlPtComparator);

            cp.showConfigView();
            e.stopPropagation();
		},

		_generatePreviewStyles: function() {
			//linear-gradient(top, rgb(217,230,163) 86%, rgb(227,249,159) 9%)
			var str = this.opts.type + "-gradient(" + ((this.opts.type == "linear") ? (this.opts.fillDirection + ", ") : "");
			var first = true;
			for (var i = 0; i < this.controlPoints.length; ++i) {
				var pt = this.controlPoints[i];
				if (!first) {
					str += ", ";
				} else {
					first = false;
				}
				str += tinycolor(pt.color).toHexString() + " " + ((pt.position*100)|0) + "%";
			}

			str = str + ")"
			var styles = [str, browserPrefix + str];
			return styles;
		}
	};

	function ControlPoint($parentEl, initialState, orientation, listener, ctrlPtConfig) {
		this.$el = $("<div class='gradientPicker-ctrlPt'></div>");
		$parentEl.append(this.$el);
		this.$parentEl = $parentEl;
		this.configView = ctrlPtConfig;
		this.orientation = orientation;

		if (typeof initialState === "string") {
			initialState = initialState.split(" ");
			this.position = parseFloat(initialState[1])/100;
			this.color = tinycolor(initialState[0]).toHexString();
		} else {
			this.position = initialState.position;
            // rgb object -> hex (we can't assign rgb object as background color)
			this.color = tinycolor(initialState.color).toHexString();
		}

		this.listener = listener;
		this.outerWidth = this.$el.outerWidth();
		this.outerHeight = this.$el.outerHeight();

		this.$el.css("background-color", this.color);
        // then convert back to get rgb from green
        this.color = tinycolor(this.$el.css('backgroundColor')).toHexString();

        if (orientation == "horizontal") {
			var pxLeft = ($parentEl.width() - this.$el.outerWidth()) * (this.position);
			this.$el.css("left", pxLeft);
		} else {
			var pxTop = ($parentEl.height() - this.$el.outerHeight()) * (this.position);
			this.$el.css("top", pxTop);
		}
		
		this.drag = bind(this.drag, this);
		this.stop = bind(this.stop, this);
		this.clicked = bind(this.clicked, this);
		this.colorChanged = bind(this.colorChanged, this);
		this.$el.draggable({
			axis: (orientation == "horizontal") ? "x" : "y",
			drag: this.drag,
			stop: this.stop,
			containment: $parentEl
		});
		this.$el.css("position", 'absolute');
		this.$el.click(this.clicked);
	}

	ControlPoint.prototype = {
		drag: function(e, ui) {
		    // convert position to a %
		    if (this.orientation == 'horizontal') {
		        var left = ui.position.left;
		        this.position = (left / (this.$parentEl.width() - this.outerWidth));
		    } else {
		        var top = ui.position.top;
		        this.position = (top / (this.$parentEl.height() - this.outerHeight));
		    }
			this.listener.updatePreview();
		},

        stop: function(e, ui) {
            this.listener.updatePreview();
            this.configView.show(this.$el.position(), this.color, this);
        },

        clicked: function(e) {
            if (this == this.configView.getListener() && this.configView.visible) {
                // second click
                this.hideConfigView();
            } else {
                this.showConfigView();
            }
            e.stopPropagation();
            e.preventDefault();
        },

        showConfigView: function() {
            this.configView.show(this.$el.position(), this.color, this);
        },

        hideConfigView: function() {
            this.configView.hide();
        },

		colorChanged: function(c) {
			this.color = c;
			this.$el.css("background-color", this.color);
			this.listener.updatePreview();
		},

		removeClicked: function() {
			this.listener.removeControlPoint(this);
			this.listener.updatePreview();
		}
	};

	function ControlPtConfig($parent, opts) {
		//color-chooser
		this.$el = $('<div class="gradientPicker-ptConfig" style="visibility: hidden"></div>');
		$parent.append(this.$el);
		var $colorPicker = $('<div class="color-chooser"></div>');
		this.$el.append($colorPicker);
		var $rmEl = $("<div class='gradientPicker-close'></div>");
		this.$el.append($rmEl);

		this.colorChanged = bind(this.colorChanged, this);
		this.removeClicked = bind(this.removeClicked, this);
		$colorPicker.ColorPicker({
			onChange: this.colorChanged,
            onShow: function (colpkr) {
                $(colpkr).show();
                return false;
            },
            onHide: function (colpkr) {
                $(colpkr).hide();
                return false;
            }
		});
		this.$cpicker = $colorPicker;
		this.opts = opts;
		this.visible = false;

		$rmEl.click(this.removeClicked);
	}

	ControlPtConfig.prototype = {
		show: function(position, color, listener) {
			this.visible = true;
			this.listener = listener;
			this.$el.css("visibility", "visible");
			this.$cpicker.ColorPickerSetColor(color);
			this.$cpicker.css("background-color", color);
			if (this.opts.orientation === "horizontal") {
				this.$el.css("left", position.left);
			} else {
				this.$el.css("top", position.top);
			}
		},

		hide: function() {
			if (this.visible) {
				this.$el.css("visibility", "hidden");
				this.visible = false;
			}
		},

        getListener: function() {
            return this.listener;
        },

		colorChanged: function(hsb, hex, rgb) {
			hex = "#" + hex;
			this.listener.colorChanged(hex);
			this.$cpicker.css("background-color", hex)
		},

		removeClicked: function() {
			this.listener.removeClicked();
			this.hide();
		}
	};

	var methods = {
		init: function(opts) {
            if (opts.orientation && opts.orientation == 'vertical' && !opts.fillDirection) {
                opts.fillDirection = "top";
            }

			opts = $.extend({
				controlPoints: ["#FFF 0%", "#000 100%"],
				orientation: "horizontal",
				type: "linear",
				fillDirection: "left",
				generateStyles: true,
				change: function() {}
			}, opts);

			this.each(function() {
				var $this = $(this);
				var gradSel = new GradientSelection($this, opts);
				$this.data("gradientPicker-sel", gradSel);
			});
		},

		update: function(opts) {
			this.each(function() {
				var $this = $(this);
				var gradSel = $this.data("gradientPicker-sel");
				if (gradSel != null) {
					gradSel.updateOptions(opts);
				}
			});
		}
	};

	$.fn.gradientPicker = function(method, opts) {
		if (typeof method === "string" && method !== "init") {
			methods[method].call(this, opts);
		} else {
			opts = method;
			methods.init.call(this, opts);
		}
	};
})( jQuery );