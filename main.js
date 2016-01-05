var argument;

(function($){

	var Renderer = function(canvas){
		var canvas = $(canvas).get(0)
		var ctx = canvas.getContext("2d");
		var img = document.getElementById("ellipse");
		var particleSystem
		var container = window

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
				
				var radius = 40;

				ctx.fillStyle = "white";
				ctx.fillRect(0,0, canvas.width, canvas.height);
				
				particleSystem.eachEdge(function(edge, pt1, pt2){
					
					var color = edge.data.positive ? "rgba(0, 200, 0, 1)" : "rgba(200, 0, 0, 1)";
					
					arrow(ctx, pt1, pt2, radius, color);
				});

				particleSystem.eachNode(function(node, pt){

					ctx.fillStyle = "#ddd";

					ctx.beginPath();
					ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
					ctx.fill();

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
				// no-nonsense drag and drop (thanks springy.js)
				var dragged = null;

				// set up a handler object that will initially listen for mousedowns then
				// for moves and mouseups while dragging
				var handler = {
					clicked:function(e){
						var pos = $(canvas).offset();
						_mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
						dragged = particleSystem.nearest(_mouseP);

						if (dragged && dragged.node !== null){
							// while we're dragging, don't let physics move the node
							dragged.node.fixed = true
						}

						$(canvas).bind('mousemove', handler.dragged)
						$(window).bind('mouseup', handler.dropped)

						return false
					},
					dragged:function(e){
						var pos = $(canvas).offset();
						var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

						if (dragged && dragged.node !== null){
							var p = particleSystem.fromScreen(s)
							dragged.node.p = p
						}

						return false
					},

					dropped:function(e){
						if (dragged===null || dragged.node===undefined) return
						if (dragged.node !== null) dragged.node.fixed = false
						dragged.node.tempMass = 1000
						dragged = null
						$(canvas).unbind('mousemove', handler.dragged)
						$(window).unbind('mouseup', handler.dropped)
						_mouseP = null
						return false
					}
					
				}
				
				// start listening
				$(canvas).mousedown(handler.clicked);

			},
			
		}
		return that
	}    

	$(document).ready(function(){
		argument = arbor.ParticleSystem(500, 600, 0.5) // repulsion/stiffness/friction
		argument.parameters({gravity:true}) // use center-gravity to make the graph settle nicely (ymmv)
		argument.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...

		// add some nodes to the graph and watch it go...
		argument.addEdge('b','a', {positive: true})
		argument.addEdge('c','a', {positive: false})
		argument.addEdge('d','a', {positive: true})
		argument.addEdge('e','a', {positive: true})
		//sys.addNode('f', {})
		
	});

})(this.jQuery)

function drawEllipse(context, centerX, centerY, width, height, color) {
	
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
}

var arrow = function(ctx, pt1, pt2, offset, color) {
	
	var dest = pointOnLine(pt1, pt2, -(offset + 5));

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
	var startArrow = pointOnLine(pt1, pt2, -(offset + 28));
	ctx.beginPath();
	ctx.moveTo(startArrow.x, startArrow.y);
	ctx.lineTo(dest.x, dest.y);
	//ctx.lineTo(100,25);
	ctx.stroke();
}

var pointOnLine = function(pt1, pt2, offset) {
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
}

var magnitude = function() {
	
}

$('#myCanvas').bind('mousemove', function (e) {
	var offset = $(this).offset();
	var p1 = [200.0, 200.0];
	var p2 = [e.pageX - offset.left, e.pageY - offset.top];

	ctx.clearRect(0, 0, 400, 400);
	grid();
	arrow(p1, p2);
})                                  

var addEdge = function() {
	argument.addEdge('f','e', {positive: false})
}

var sidebar = function() {
	$('.ui.sidebar').sidebar('setting', {dimPage: false}).sidebar('toggle');
}

var eachNode = function() {
	argument.eachNode( (node, pt) => {
		console.log(node);
	});
}