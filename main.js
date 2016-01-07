var app = angular.module('ergo', []);

app.controller('main', function($scope) {
	var argument;
	var radius = 40;
	var repulsion = 50;
	var stiffness = 1000;
	var friction = 5000;
	$scope.selected;
	$scope.grabbed;
	$scope.hovered;
	$scope.nodeIndex = 0;
	$scope.immediateChildCount = 0;

	var Renderer = function(canvas){
		var canvas = $(canvas).get(0)
		var ctx = canvas.getContext("2d");
		var particleSystem;
		var container = window;

		var that = {
			init:function(system){
				particleSystem = system

				particleSystem.screenSize(canvas.width, canvas.height) 
				particleSystem.screenPadding(80) // leave an extra 80px of whitespace per side
				
			 $(window).resize(that.resize)
			 that.resize()
				
				// set up some event handlers to allow for node-dragging
				that.initMouseHandling()
			},
			
			redraw:function(){

				// draw canvas
				ctx.fillStyle = "white";
				ctx.fillRect(0,0, canvas.width, canvas.height);
				
				// draw edges
				particleSystem.eachEdge(function(edge, pt1, pt2){
					if(edge.data.show) {
						ctx.save();
						var color = edge.data.positive ? "rgba(0, 200, 0, 1)" : "rgba(200, 0, 0, 1)";
						lib.drawArrow(ctx, pt1, pt2, radius, color);
						ctx.restore();
					}
				});

				// draw nodes
				particleSystem.eachNode(function(node, pt){
					if(node.data.show) {
						ctx.save();
						ctx.beginPath();
						
						ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
						
						if(node.data.conclusion) {
							ctx.strokeStyle = "#ddd";
							ctx.lineWidth = 8;
							ctx.stroke();
							ctx.fillStyle = "#fefefe";
						} else {
							ctx.fillStyle = "#ddd"
						}
						
						if(node.data.hovered) {
							ctx.fillStyle = node.data.conclusion ? "rgba(255,255,255,.7)" : "rgba(200,200,200,.5)";
						}
						
						ctx.fill();
						
						if(node.data.selected) {
							ctx.shadowBlur = null;
							ctx.beginPath();
							ctx.arc(pt.x, pt.y, radius / 2, 0, 2 * Math.PI);
							ctx.fillStyle = "#aaa";
							ctx.fill();
						}
						
						/*var distance = node.subtract(_mouseP).magnitude();
						if(distance <= radius) {
							ctx.fillStyle = '#000';
						}*/
						
						ctx.restore();
					}
				});
			},
			
			resize:function(){
				var w = $(container).width(),
						h = $(container).height();
				canvas.width = w; canvas.height = h // resize the canvas element to fill the screen
				particleSystem.screenSize(w,h); // inform the system so it can map coords for us
				that.redraw();
			},
			
			initMouseHandling:function(){
				var dragOffset = null;
				$scope.selected = null;
				$scope.grabbed = null;

				// set up a handler object that will initially listen for mousedowns then
				// for moves and mouseups while dragging
				var handler = {
					clicked:function(e){
						var pos = $(canvas).offset();
						_mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
						var nearest = particleSystem.nearest(_mouseP);
						
						if(nearest.distance <= radius) {
							if($scope.selected) lib.deselect($scope.selected);
							lib.grab(nearest.node);
							lib.select(nearest.node);
							dragOffset = nearest.node.p.subtract(particleSystem.fromScreen(_mouseP));
						}
						else if($scope.selected) {
							lib.deselect($scope.selected);
						}

						$(canvas).bind('mousemove', handler.dragged)
						$(window).bind('mouseup', handler.dropped)

						return false
					},
					
					dragged:function(e){
						var pos = $(canvas).offset();
						var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);
						
						if ($scope.grabbed){
							var p = particleSystem.fromScreen(s).add(dragOffset);
							$scope.grabbed.p = p;
						}
						
						return false
					},

					dropped:function(e){
						if($scope.grabbed) lib.ungrab($scope.grabbed);
						$(canvas).unbind('mousemove', handler.dragged)
						$(window).unbind('mouseup', handler.dropped)
						_mouseP = null
						return false
					}
					
				}
				
				// start listening
				$(canvas).mousedown(handler.clicked);

			},
			
		};
		
		// open panel when double clicking on node
		// hide panel when double clicking on empty space
		$('#viewport').dblclick( function(e) {
			var pos = $(canvas).offset();
			_mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
			var nearest = particleSystem.nearest(_mouseP);
			
			if(nearest.distance <= radius) {
				$('.ui.sidebar').sidebar('setting', {dimPage: false, transition: 'overlay', closable: false}).sidebar('show');
			}
			else {
				$('.ui.sidebar').sidebar('setting', {dimPage: false, transition: 'overlay', closable: false}).sidebar('hide');
			}
		});
		
		$('#viewport').mousemove( function(e) {
			var pos = $(canvas).offset();
			_mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
			var nearest = particleSystem.nearest(_mouseP);

			if(nearest.distance <= radius) {
				lib.hover(nearest.node);
			} else if($scope.hovered) {
				lib.unhover($scope.hovered);
			}
		});
		
		return that
	}

	$(document).ready(function(){
		argument = arbor.ParticleSystem() // repulsion/stiffness/friction (500, 600, 0.5)
		argument.parameters({
			repulsion: 0,
			stiffness: stiffness,
			friction: friction,
			gravity: false
		});
		argument.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...

		// initial conclusion node
		argument.addNode('conclusion', {
			conclusion: true,
			content: "",
			showChildren: true,
			show: true
		});
		
		// initialize popup tips
		$('.popup-tips').popup();
	});
	
	$scope.addEdge = function(to, positive) {
		var newData = {
			conclusion: false,
			content: '',
			showChildren: true,
			show: true
		};
		var newEdge = {
			positive: positive,
			show: true
		};
		$scope.nodeIndex++;
		// Gotta handle arborjs glitch when there is only one node
		if(to.data.conclusion) {
			$scope.immediateChildCount++;
			newData.isImmediateChild = true;
		}
		var newNode = argument.addNode($scope.nodeIndex.toString(), newData);
		argument.addEdge(newNode, to, newEdge);
		// Gotta handle arborjs glitch when there is only one node
		if(to.data.conclusion && $scope.immediateChildCount == 1) {
			window.setTimeout(function() {
				argument.parameters({repulsion: repulsion});
			}, 250);
		}
	}
	
	$scope.pruneNode = function(node) {
		$('#confirm-delete').modal({
			onApprove: function() {
				lib.deselect(node);
				pruneNode(node);
			}
		}).modal('show');
	}
	
	var pruneNode = function(node) {
		var edges = argument.getEdgesTo(node);
		for(var i=0; i<edges.length; i++) {
			pruneNode(edges[i].source);
		}
		// Gotta handle arborjs glitch when there is only one node
		if(node.data.isImmediateChild) {
			if($scope.immediateChildCount == 1) {
				argument.parameters({repulsion: 0});
			}
			$scope.immediateChildCount--;
			setTimeout(function() {
				argument.pruneNode(node);
			}, 250);
		}
		else {
			argument.pruneNode(node);
		}
	}
	
	$scope.toggleChildren = function(node, show, includeThisOne) {
		var edgesTo = argument.getEdgesTo(node);
		for(var i=0; i<edgesTo.length; i++) {
			edgesTo[i].data.show = show;
			$scope.toggleChildren(edgesTo[i].source, show, true);
		}
		if(includeThisOne) {
			node.data.show = show;
		} else {
			node.data.showChildren = show;
		}
	}

	$scope.togglePanel = function() {
		$('.ui.sidebar').sidebar('setting', {dimPage: false, transition: 'overlay', closable: false}).sidebar('toggle');
	}

	$scope.eachNode = function() {
		argument.eachNode( (node, pt) => {
			console.log(node.data);
		});
	}

	var lib = {
		select: function(node) {
			$scope.selected = node;
			node.data.selected = true;
			$scope.$apply();
		},
		
		deselect: function(node) {
			$scope.selected = null;
			node.data.selected = false;
			$scope.$apply();
		},
		
		grab: function(node) {
			$scope.grabbed = node;
			node.data.grabbed = true;
			// while we're dragging, don't let physics move the node
			node.fixed = true
			$scope.$apply();
		},
		
		ungrab: function(node) {
			$scope.grabbed = null;
			node.data.grabbed = false;
			node.fixed = false;
			$scope.$apply();
		},
		
		hover: function(node) {
			$scope.hovered = node;
			node.data.hovered = true;
			$scope.$apply();
			$('#viewport').css({cursor: 'pointer'});
		},
		
		unhover: function(node) {
			$scope.hovered = null;
			node.data.hovered = false;
			$scope.$apply();
			$('#viewport').css({cursor: 'auto'});
		},
		
		pointOnLine: function(pt1, pt2, offset) {
			var vector1X = pt2.x - pt1.x;
			var vector1Y = pt2.y - pt1.y;

			var magnitude = Math.sqrt( Math.pow(vector1Y, 2) + Math.pow(vector1X, 2) );
			var directionX = vector1X / magnitude;
			var directionY = vector1Y / magnitude;
			
			magnitude += offset;
			
			var vector2X = directionX * magnitude;
			var vector2Y = directionY * magnitude;
			
			var dest = {};
			
			dest.x = vector2X + pt1.x;
			dest.y = vector2Y + pt1.y;
			
			return dest;
		},
		
		drawArrow: function(ctx, pt1, pt2, offset, color) {
			ctx.save();
			
			var dest = lib.pointOnLine(pt1, pt2, -(offset + 10));

			// draw a line from pt1 to pt2
			ctx.strokeStyle = "#ddd"
			ctx.lineWidth = 4;
			ctx.beginPath()
			ctx.moveTo(pt1.x, pt1.y)
			ctx.lineTo(dest.x, dest.y);
			ctx.stroke()
			
			//now the point
			ctx.strokeStyle = color;
			ctx.lineWidth = 8;
			var startArrow = lib.pointOnLine(pt1, pt2, -(offset + 28));
			ctx.beginPath();
			ctx.moveTo(startArrow.x, startArrow.y);
			ctx.lineTo(dest.x, dest.y);
			//ctx.lineTo(100,25);
			ctx.stroke();
			
			ctx.restore();
		},
		
		// not using right now
		/*drawEllipse: function(context, centerX, centerY, width, height, color) {
			
			context.beginPath();
			
			context.moveTo(centerX, centerY - height/2); // A1
			
			context.bezierCurveTo(
				centerX + width/2, centerY - height/2, // C1
				centerX + width/2, centerY + height/2, // C2
				centerX, centerY + height/2); // A2

			context.bezierCurveTo(
				centerX - width/2, centerY + height/2, // C3
				centerX - width/2, centerY - height/2, // C4
				centerX, centerY - height/2); // A1
		 
			context.fillStyle = color;
			context.fill();
			context.closePath();	
		}*/
	}
	
});

