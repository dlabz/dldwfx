//Since SVG path element doesn't support different styles, we need to group strokes and surfaces by styleSheets

function RGBA(color){
	this.a = (color & 0xFF000000) >> 24;
	this.r = (color & 0x00FF0000) >> 16;
	this.g = (color & 0x0000FF00) >> 8;
	this.b = (color & 0x000000FF);
};

RGBA.prototype.toHex = function(){
	return [
		"#",
		"0"+this.r.toString(16).slice(-2),
		"0"+this.g.toString(16).slice(-2),
		"0"+this.b.toString(16).slice(-2)
	].join('');
}

RGBA.prototype.toShortHex = function(){
	return [
		"#",
		"0"+(this.r).toString(16).slice(-2),
		"0"+this.g.toString(16).slice(-2),
		"0"+this.b.toString(16).slice(-2)
	].join('');
}
/*	
function StrokeStyle(data){
	var data = data || {};
	this.color = data.color || null;
	this.opacity = data.opacity || null;
	this.lineWeight = data.lineWeight || null;
	this.lineCaps = data.lineCaps || null;
	this.lineJoin = data.lineJoin || null;
	this.linePattern = data.linePattern || null;
	this.miterAngle = data.miterAngle || null;
	this.miterLength = data.miterLength || null;
};

StrokeStyle.prototype.clone = function(){
	var data = JSON.parse(JSON.stringify(this));
	return new StrokeStyle(data);
}


function FillStyle(color){
	this.color = new RGBA(color);
}
*/
function FontStyle(){
	this.name;
	this.fullName;
	this.flags;
	this.spacing;
	this.panose;
}

function IndexedValues(){
	this.values = [];
}
IndexedValues.prototype.map = function(value){
	var id = this.values.indexOf(value);
	if(id == -1){
		id = this.values.length;
		this.values.push(value);
	}
		
	return id;
}
IndexedValues.prototype.get = function(id){	
	return this.values[id];
}
//we want as few path elements as possible, 
//so we index styles and reuse them.
//
function StyleMap(){
	
	this._values = new IndexedValues();
	this.combos = {};
	
	this.fillSet = null;
	this.fillColor = null; 

	
	this.lineColor = null;
	this.lineWeight = null;
	this.lineCaps = null;
	this.lineJoin = null;
	this.linePattern = null;
	
	this.miterAngle = null;
	this.miterLength = null;
	
	this.fontId;
	
	
	this.map = {
		
	}
	this.colors = {
		ids:[]
	}

};
//To index styles, we build uid-s for each style,
//and it's easier with integers
StyleMap.prototype.setValue = function(name,value){
	
	var id = this._values.map(value);
	//console.log('Style','setValue', name,value,'id',id);
	if(id > 0xFF)
		console.error('We never expected this much values');
	
	this[name] = id;
};

StyleMap.prototype.getValue = function(name){
	var id = this[name];
	return this._values.get(id);
};

StyleMap.FLAGS = {
	fillSet 	: 2^0,
	fillColor 	: 2^1,
	
	lineColor	: 2^2,
	lineWeight 	: 2^3,
	
	lineCaps	: 2^4,
	lineJoin	: 2^5,

	miterAngle	: 2^6,
	miterLength	: 2^7,
	
	linePattern	: 2^8
};

StyleMap.prototype.mapStyle = function(combo){
	//console.log("MAP",JSON.stringify(this));
	//console.log("EMPTY",JSON.stringify(combo));
	
	//presence of parameters is mapped to binary values
	//in form of 1111 1111
	var enc = 0;
	//only id-s of set values are added
	var data = [];
	
	for(var key in combo)
		if((key in this)&&(this[key] != null)){
					//console.log('requested:',key,this[key]);
			var value = this.getValue(key);
			//set value to the response object
			combo[key] = value;
			
			var vId = this[key];
			enc += StyleMap.FLAGS[key];
			data.push(('0'+vId.toString(16)).slice(-2));
			
			//console.log(StyleMap.FLAGS[key].toString(2),key,':',vId,value);
		}else
			delete combo[key];
		
		data.push(enc.toString(16));
		
		var suid = data.join('');
		combo.id = suid;
		
		//console.log('STYLE ID',suid);
		
		if(!(suid in this.combos))
			this.combos[suid] = combo;

	return suid;
}


StyleMap.prototype.mapColor = function(color, isFill){
	
	var colorId = this.colors.ids.indexOf(color);
	if(colorId == -1){
		colorId = this.colors.ids.length;
		this.colors.ids.push(color);
	}
	
	if(isFill)
		this.setValue("fillColor",color);
	else
		this.setValue("lineColor",color);
	
	return colorId;	
}

function Drawables(){
	this.segments = [];
	this.maps = [];
	
	this.dbMap = {};
	this.vpMap = {};
	this.layers = {};
	this.styles = {};
}

Drawables.prototype.classify = function(seg){
	var id = segments.length;
	segments.push(segment);
	
	if(seg.dbId > 0){
		if(!(seg.dbId in this.dbMap))
			this.dbMap[seg.dbId] = [id];
		else
			this.dbMap[seg.dbId].push(id);
	}
	
	if(seg.vpId){
		if(!(seg.vpId in this.vpMap))
			this.vpMap[seg.vpId] = [id];
		else
			this.vpMap[seg.vpId].push(id);
	}
	
	if(seg.layer){
		if(!(seg.layer in this.layers))
			this.layers[seg.layer] = [id];
		else
			this.layers[seg.layer].push(id);
	}

	if(seg.style){
		if(!(seg.style in this.styles))
			this.styles[seg.style] = [id];
		else
			this.styles.push(id);
	}
}




/**A path segment exist between two endpoints, 
  * which we'll use to sort segments in to 
  * compound paths and loops.  
  */
function PathSeg(cmd, endPoints, previous, points, flags){
	this.type = 'PathSegment';
	this.cmd = cmd;
	this.endPoints = endPoints || null;
	if(arguments.length > 3){
		this.points = points;
		this.flags = flags || null;
	}
	this.previous = previous || false;
};

PathSeg.build = function (code, [from,to, ...data], previous){
	const cmd = PathSeg.MAP.get(code);
	const seg = new PathSeg(cmd,[from,to],previous);

		console.log({seg,data})
	return seg
}
PathSeg.prototype.isRel = function(){
	const code = this.cmd.toString()
	
	return code == code.toUpperCase()
}
PathSeg.prototype.setTo = function([x,y]){
	this.endPoints[1] = [x,y];
}
PathSeg.prototype.setFrom = function([x,y]){
	this.endPoints[0] = [x,y];
}
PathSeg.prototype.getFrom = function(){
	if(!this.previous)
		return [0,0];
	
	return this.previous.getTo() || this.endPoints[0] || null 
}
PathSeg.prototype.getTo = function(){


	//const from = this
	//if(this.endPoints != null)
}


PathSeg.prototype.toString = function(){
	
	var data = [];
	
	
	switch (this.cmd.id) {
		case 1:
		return "Z"
		break;
		
		case 2 :
		case 3 :
		return this.cmd.cmd + this.endPoints[0].join(',');
		break;
		
		case 4 :
		if(!this.previous)
			data.push("M"+this.endPoints[0].join(','));
		
		var p = [
			this.endPoints[1][0] - this.endPoints[0][0],
			this.endPoints[1][1] - this.endPoints[0][1]
		]
		if(p[0] == 0)
			data.push("v"+p[1]);
		else if(p[1] == 0)
			data.push("h"+p[0]);
		else
			data.push("l"+p.join(','));	
		//data.push("L"+this.endPoints[1].join(','));	
		//console.log(this,data.join(' '));
		return data.join(' ');
		break;
		
		case 5 :
		if(!this.previous)
			data.push("M"+this.endPoints[0].join(','));
		data.push("l"+this.endPoints[1].join(','));	
		//console.log(this,data.join(' '));
		return data.join(' ');
		break;
		
		case 10 :
		if(!this.previous)
			data.push("M"+this.endPoints[0].join(','));
		
		data.push("A"+this.points[0].join(','));
		data.push(this.flags.join(' '));
		data.push(this.endPoints[1].join(','));
		//console.log(this,data.join(' '));
		return data.join(' ');
		break;
		
		case 11 :
		if(!this.previous)
			data.push("m"+this.endPoints[0].join(','));
		
		data.push("a"+this.points[0].join(','));
		data.push(this.flags.join(' '));
		data.push(this.endPoints[1].join(','));	
		return data.join(' ');
		break;
		
		default:
			console.warn(this.cmd,"Not Implemented!")
		break;
	}
	/*
	if((this.cmd > 1) && this.endPoints){
		data.push(this.cmd.toString());
		if(this.params){
			data.push(this.params.points[0].join(','));
			data.push(this.params.xAxisRotation);
			data.push(this.params.largeArcFlag);
			data.push(this.params.sweepFlag);
		}
		
		
		data.push(this.endPoints[this.endPoints.length - 1].join(','));

	}else		
		data.push(this.cmd.toString());
	
	return data.join(' ');
	*/
}

PathSeg.prototype.toRel = function(){
	if(((this.cmd == 4)) &&(this.cmd % 2) == 0){
		this.endPoints[1][0] -= this.endPoints[0][0];
		this.endPoints[1][1] -= this.endPoints[0][1];
		//if(this.params && this.params.points)
		//	for (var i = 1; i<this.params.points.length; i++){
		//		this.params.points[i][0] -= this.endPoints[0][0];
		//		this.params.points[i][1] -= this.endPoints[0][1];
		//	};
		this.cmd = PathSeg.TYPE.LINETO_REL;
	}
}

PathSeg.prototype.toAbs = function(){
	if((this.cmd % 2) == 1){
		this.endPoints[1][0] += this.endPoints[0][0];
		this.endPoints[1][1] += this.endPoints[0][1];
		if(this.params && this.params.points)
			for (var i = 1; i<this.params.points.length; i++){
				this.params.points[i][0] += this.endPoints[0][0];
				this.params.points[i][1] += this.endPoints[0][1];
			}
		this.cmd -=1;
	}
}

PathSeg.prototype.flip = function(){


	
	if((this.cmd % 2) == 1 ){
		//relative
		//both points are translated by the length of the segment
		this.endPoints[0][0] += this.endPoints[1][0];
		this.endPoints[0][1] += this.endPoints[1][1];
		
		//second point is inverted
		this.endPoints[1][0] *= -1;
		this.endPoints[1][1] *= -1;
		//first and secnd point switch places
		//this.endPoints.reverse();

		if(this.params && this.params.points)
			for (var i = 0; i<this.params.points.length; i++){
				this.params.points[i][0] += this.endPoints[1][1];
				this.params.points[i][1] += this.endPoints[1][1];
			}
	}else
		this.endPoints.reverse();
	
}





/*
Object.defineProperty(PathSeg.prototype, "relative", {
	get: function() { return this._abs },
	set: function(val) { 
		if(val)
			this.toRel();
		else
			this.toAbs();
	}
});
*/

function SegCmd(id, cmd){
	this.id = id;
	this.cmd = cmd;
};

SegCmd.prototype.toString = function(){
	return this.cmd;
};

SegCmd.prototype.valueOf = function(){
	return this.id;
};

PathSeg.TYPE = {
	UNKNOWN:new SegCmd(0,''),
	CLOSEPATH:new SegCmd(1,'z'),
	MOVETO_ABS:new SegCmd(2,'M',['first']),
	MOVETO_REL:new SegCmd(3,'m',['first']),
	LINETO_ABS:new SegCmd(4,'L',['last']),
	LINETO_REL:new SegCmd(5,'l',['last']),
	CURVETO_CUBIC_ABS:new SegCmd(6,'C'),
	CURVETO_CUBIC_REL:new SegCmd(7,'c'),
	CURVETO_QUADRATIC_ABS:new SegCmd(8,'Q'),
	CURVETO_QUADRATIC_REL:new SegCmd(9,'q'),
	ARC_ABS:new SegCmd(10,'A',["center","x-axis-rotation", "large-arc-flag", "sweep-flag","last"]),
	ARC_REL:new SegCmd(11,'a',["center","x-axis-rotation", "large-arc-flag", "sweep-flag","last"]),
	LINETO_HORIZONTAL_ABS:new SegCmd(12,'H',["last[0]"]),
	LINETO_HORIZONTAL_REL:new SegCmd(13,'h',["last[0]"]),
	LINETO_VERTICAL_ABS:new SegCmd(14,'V',["last[1]"]),
	LINETO_VERTICAL_REL:new SegCmd(15,'v',["last[1]"]),
	CURVETO_CUBIC_SMOOTH_ABS:new SegCmd(16,'S'),
	CURVETO_CUBIC_SMOOTH_REL:new SegCmd(17,'s'),
	CURVETO_QUADRATIC_SMOOTH_ABS:new SegCmd(18,'T'),
	CURVETO_QUADRATIC_SMOOTH_REL:new SegCmd(19,'t')
};

PathSeg.MAP = new Map([...Object.entries(PathSeg.TYPE)].map(([key,val])=>[val.toString(), key]))
console.log(PathSeg.MAP)

/* point[0], point[1], start, end, this.sx(major), this.sy(minor), rotation */
PathSeg.prototype.fromArc = function (startPoint, endPoint, startAngle, endAngle, majorRadius, minorRadius, rotation){
	var startPoint = polarToCartesian(centerPoint, majorRadius, startAngle);
	var	endPoint = polarToCartesian(centerPoint, minorRadius, endAngle);
					
	var angle = endAngle - startAngle;
				
	if(angle < 0)
		angle += Math.PI * 2;
	var large = +(angle>Math.PI);
	
	this.cmd = PathSeg.TYPE.ARC_ABS;
	
	this.endPoints = [
		startPoint,
		endPoint
	];	
	
	this.points[majorRadius,minorRadius];
	this.flags = [rotation,large,0];
	/*
	this.params = {
		points :[[radius,radius]],
		xAxisRotation : rotation,
		largeArcFlag : large,
		sweepFlag : 0
	}
*/
};
/** 
  * point[0], point[1], start, end, this.sx(major) 
  * 
  */
PathSeg.prototype.fromCircularArc = function(centerPoint, majorRadius, startAngle, endAngle){
	
	var startPoint = polarToCartesian(centerPoint, majorRadius, startAngle);
	var	endPoint = polarToCartesian(centerPoint, majorRadius, endAngle);
					
	var angle = endAngle - startAngle;
				
	if(angle < 0)
		angle += Math.PI * 2;
	var large = +(angle>Math.PI);
	
	this.cmd = PathSeg.TYPE.ARC_ABS;
	
	this.endPoints = [
		startPoint,
		endPoint
	];	
	
	this.points = [majorRadius,majorRadius]
	this.flags = [0,large,0];

	//var d =["M"+start.join(','),"A"+[cr,cr].join(' '), 0,large,0 ,end.join(' ')]	
};


/**
 * Converts polar coordinates to cartesian
 * @param {Object[]} center - Center point as array of values
 * @param {Number} center[].x - center X coordinate.
 * @param {Number} center[].y - center Y coordinate.
 * @param {Number} radius 
 * @param {Number} angleInDegrees 
 *
 * @returns {Array} resulting point as array [x,y]
 */
function polarToCartesian(center, radius, angleInDegrees) {
	var angleInRadians = angleInDegrees * Math.PI / 180.0;
	var x = center[0] + radius * Math.cos(angleInRadians);
	var y = center[1] + radius * Math.sin(angleInRadians);
	return [x,y];
}

function Path(segments) {
	this.draw = true;
	this.segments = segments || []; //[PathSeg,...]
}
Path.prototype.toString = function(){
	//console.log(this);
	var segStr = [];
	for (var i = 0; i < this.segments.length; i++){
		if(this.segments[i]){
			//this.segments[i].toRel();
			segStr.push(this.segments[i].toString());
		}else
			console.error(this.segments[i]);
	}
	return segStr.join(" ");
}
function CompoundPath() {
	this.paths; //[Path,..]
}



function parsePath(pathString){
	const splitPath = /([a-z])([^a-z]*)/ig;
	const matches = pathString.matchAll(splitPath)

	const path = new Path();

	var lastSeg;
	var position = [0,0]
	var close = [0,0]
	var last = [0,0];

	for (const [,cmd,values] of matches) {
		const arr = values.split(/[ ,]/).map(s=>Number.parseFloat(s))
		last = position
		console.log({cmd,values,position,close,last,arr})

		switch (cmd){
			case "M":
			close = arr;
			case "L":
			position = arr;
			break;
			case "m":
			close = arr;
			case "l":
			position[0] += arr[0];
			position[1] += arr[1];
			break;
			case "z":
			case "Z":
			position = close;
			break;
			case "h":
			position[0] += arr[0];
			break;
			case "v":
			position[1] += arr[0];
			break;

			default:
				console.info("NOT IMPLEMENTED: ", cmd)
			
		}
		
		const seg = PathSeg.build(cmd, [last,position], lastSeg)

		path.segments.push(seg)
		lastSeg = seg;
	}

	return path
}


const paths = [
	"M524916631,658884500h-25120625m25120625,-14886296v-122191680m0,0h-137233042m0,94073121h23311526m0,0l22898018,-22898018m0,0l65902873,65902873m-112112417,-274155952h41247445m95985597,14886296v122191680m0,-137077976h-5117165m0,0l-45434216,45434216m0,0l-45434216,-45434216",
	"M128413933,386941791v53568043m37878326,-91446370l-37878326,37878327m64662348,26784021l-64662348,-26784021m0,53568043l37878326,37878327m-37878326,-37878327l64662348,-26784022m26784022,-64662348h-53568044m26784022,64662348l-26784022,-64662348m0,129324697l26784022,-64662349m-26784022,64662349h8074916m0,0h6303859m0,0l27710998,-27710998m0,0l-15305751,-36951351m15305751,36951351l10822800,-26128551m34755556,-36041823l-60884107,25219023m26128551,10822800l-26128551,-10822800m26128551,10822800v-1286266m0,0l23647502,-23647502m-49776053,14110968l26784022,-64662348m35665084,35665084l-35665084,-35665084"
]


const cmds = paths.map(parsePath).map(path=>path.toString())
console.log(cmds)
/*
var zeroPlus = new PathSeg(PathSeg.TYPE.LINETO,[[0,0],[50,50]]);
console.log('			relativeZeroPlus',zeroPlus.toString());
zeroPlus.flip();
console.log('flipped	relativeZeroPlus',zeroPlus.toString());


var zeroMinus = new PathSeg(PathSeg.TYPE.LINETO_REL,[[0,0],[-50,-50]]);
console.log('			relativeZeroMinus',zeroMinus.toString());
zeroMinus.flip();
console.log('flipped	relativeZeroMinus',zeroMinus.toString());

var minusPlus = new PathSeg(PathSeg.TYPE.LINETO_REL,[[-50,-50],[100,100]]);
console.log('			relativeMinusPlus',minusPlus.toString());
minusPlus.flip();
console.log('flipped	relativeMinusPlus',minusPlus.toString());


var minusMinus = new PathSeg(PathSeg.TYPE.LINETO_REL,[[-50,-50],[-50,-50]]);
console.log('			relativeMinusMinus',minusMinus.toString());
minusMinus.flip();
console.log('flipped	relativeMinusMinus',minusMinus.toString());
*/