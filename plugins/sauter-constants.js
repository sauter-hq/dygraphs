/**
 * @license
 * Copyright 2012 Dan Vanderkam (danvdk@gmail.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */
/*global Dygraph:false */

Dygraph.Plugins.Constants = (function() {

/*

Current bits of jankiness:
- Direct area access

*/

"use strict";


/**
 * Draws the horizontal constants in the specified color.
 *
 * @constructor
 */
var constants = function() {
};

constants.prototype.toString = function() {
  return "Sauter Constants Plugin";
};

constants.prototype.activate = function(g) {
  return {
	  willDrawChart: this.willDrawChart
  };
};

constants.prototype.willDrawChart = function(e) {
  // Draw the new constants. Lines appear crisper when pixels are rounded to
  // half-integers. This prevents them from drawing in two rows/cols.
  var g = e.dygraph;
  var ctx = e.drawingContext;
  var area = e.dygraph.plotter_.area;
  var areaLeft = halfUp(area.x);
  var areaRight = areaLeft + area.w;
  var areaTop = area.y;
  var areaBottom = area.y + area.h;

  function halfUp(x)  { return Math.round(x) + 0.5; }
  function halfDown(y){ return Math.round(y) - 0.5; }
  
  function drawHorizontalLine(y){
  	ctx.beginPath();
	ctx.moveTo(areaLeft, y);
	ctx.lineTo(areaRight, y);
	ctx.closePath();
	ctx.stroke();
  };

  var axisIdx, i;
  var axes = ["y", "y2"];
  var stroking, strokePattern, domY;
  for (axisIdx = 0; axisIdx < axes.length; axisIdx++) {
	var constants = g.getOptionForAxis("constants", axes[axisIdx]);
    if (constants) {
      ctx.save();
      // Step through all the constants of the axis
      for (i = 0; i < constants.length; i++) {
	    strokePattern = constants[i].linePattern;
	    stroking = strokePattern && (strokePattern.length >= 2);
	    if (stroking) {
	      ctx.installPattern(strokePattern);
	    }
	    
	    ctx.strokeStyle = constants[i].lineColor;
	    ctx.lineWidth = constants[i].lineWidth;
	    domY = g.toDomYCoord(constants[i].value, axisIdx);
	    
	    // Prevent from drawing outside the area
	    if(domY > areaTop && domY < areaBottom)
	    	drawHorizontalLine(halfDown(domY));
	    
	    if (stroking) {
	      ctx.uninstallPattern();
	    }
	  }
      ctx.restore();
    }
  }
};

constants.prototype.destroy = function() {
};

return constants;

})();
