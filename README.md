GradientChooser
====

A jQuery plugin to allow you to add gradient choosers to your website.

* The type of gradient (radial, linear) is configurable as well as the fill direction of the gradient.
* Currently works in Webkit, Mozilla and Opera.  Support for IE maybe be coming in a future version.
* Control points can be added by clicking on the gradient preview
* Control points may be remove by clicking the "x" on that control point's color configuration
* The colors of individual control points may be assigned


Options
====

```fillDirection``` default: left.  Can be any CSS3 support direction for linear gradients.  E.g., top, left, bottom, right, 45deg, etc.  

```type``` default: linear.  linear or radial

```controlPoints``` color and position pairs used to set the initial state of the gradient picker.  Written in the following form: ```controlPoints: ["green 0%", "orange 100%"]```

```change``` the callback to call when the gradient has been updated / changed.  Callbacks receive two parameters: ```points``` and ```styles```.  ```points``` contains the information for each gradient control point.  ```styles``` contains the generate CSS.  The first entry in the styles array is the CSS3 standard style.  The second entry is the browser specific style (-moz,-webkit,-o,etc.)

```generateStyles``` defualt: true.  Option to not generate styles and instead only pass back the ```points``` array.


Live Demo
====
http://tantaman.github.com/jquery-graident-picker/example_usage/gradientPicker.html

Example Usage
====

```javascript
			$("#ex1").gradientPicker({
				change: function(points, styles) { // styles include standard style and browser-prefixed style
					for (i = 0; i < styles.length; ++i) {
						$left.css("background-image", styles[i]);
					}
				},
				fillDirection: "bottom",
				controlPoints: ["green 0%", "yellow 50%", "green 100%"]
			});

			$("#ex2").gradientPicker({
				// points is an array of point objects containing the color and position of a graident control point.
				change: function(points, styles) { 
					for (i = 0; i < styles.length; ++i) {
						$right.css("background-image", styles[i]);
					}
				},
				controlPoints: ["green 0%", "orange 100%"]
			});

			$("#ex3").gradientPicker({
				type: "radial",
				change: function(points, styles) {
					for (i = 0; i < styles.length; ++i) {
						$bottom.css("background-image", styles[i]);
					}
				},
				controlPoints: ["blue 0%", "yellow 100%"]
			});
```