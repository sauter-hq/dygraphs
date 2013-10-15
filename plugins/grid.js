/**
 * @license
 * Copyright 2012 Dan Vanderkam (danvdk@gmail.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */
/*global Dygraph:false */

Dygraph.Plugins.Grid = (function() {

/*

Current bits of jankiness:
- Direct layout access
- Direct area access

*/

"use strict";


/**
 * Draws the gridlines, i.e. the gray horizontal & vertical lines running the
 * length of the chart.
 *
 * @constructor
 */
var grid = function() {
};

grid.prototype.toString = function() {
  return "Gridline Plugin";
};

grid.prototype.activate = function(g) {
  return {
    willDrawChart: this.willDrawChart
  };
};

grid.prototype.willDrawChart = function(e) {
  // Draw the new X/Y grid. Lines appear crisper when pixels are rounded to
  // half-integers. This prevents them from drawing in two rows/cols.
  var g = e.dygraph;
  var ctx = e.drawingContext;
  var layout = g.layout_;
  var area = e.dygraph.plotter_.area;
  var areaLeft = halfUp(area.x);
  var areaRight = areaLeft + area.w;
  var areaTop = halfDown(area.y);
  var areaBottom = halfDown(area.y + area.h);

  function halfUp(x)  { return Math.round(x) + 0.5; }
  function halfDown(y){ return Math.round(y) - 0.5; }
  
  function drawHorizontalLine(y){
  	ctx.beginPath();
	ctx.moveTo(areaLeft, y);
	ctx.lineTo(areaRight, y);
	ctx.closePath();
	ctx.stroke();
  };
  var drawVerticalLine = function(x){
  	ctx.beginPath();
	ctx.moveTo(x, areaTop);
	ctx.lineTo(x, areaBottom);
	ctx.closePath();
	ctx.stroke();
  };
  

  if (g.getOption('drawChartBorder')) {
	ctx.save();
    ctx.strokeStyle = g.getOption('chartBorderColor');
    ctx.lineWidth = g.getOption('chartBorderWidth');
    drawHorizontalLine(halfUp(area.y));
    drawHorizontalLine(halfDown(area.y  + area.h));
    drawVerticalLine(halfUp(area.x));
    drawVerticalLine(halfDown(area.x  + area.w));
    ctx.restore();
  }

  var x, y, i, ticks;

  // draw grids for the different y axes
  if (g.getOption('drawYGrid')) {
    var axes = ["y", "y2"];
    var strokeStyles = [], lineWidths = [], drawGrid = [], stroking = [], strokePattern = [];
    for (i = 0; i < axes.length; i++) {
      drawGrid[i] = g.getOptionForAxis("drawGrid", axes[i]);
      if (drawGrid[i]) {
        strokeStyles[i] = g.getOptionForAxis('gridLineColor', axes[i]);
        lineWidths[i] = g.getOptionForAxis('gridLineWidth', axes[i]);
        strokePattern[i] = g.getOptionForAxis('gridLinePattern', axes[i]);
        stroking[i] = strokePattern[i] && (strokePattern[i].length >= 2);
      }
    }
    ticks = layout.yticks;
    ctx.save();
    for (i = 0; i < ticks.length; i++) {
      var axis = ticks[i][0];
      if(drawGrid[axis]) {
        if (stroking[axis]) {
          ctx.installPattern(strokePattern[axis]);
        }
        ctx.strokeStyle = strokeStyles[axis];
        ctx.lineWidth = lineWidths[axis];
        y = halfDown(area.y + ticks[i][1] * area.h);
        drawHorizontalLine(y);
        if (stroking[axis]) {
          ctx.uninstallPattern();
        }
      }
    }
    ctx.restore();
  }

  // draw grid for x axis
  if (g.getOption('drawXGrid') && g.getOptionForAxis("drawGrid", 'x')) {
    ticks = layout.xticks;
    ctx.save();
    ctx.strokeStyle = g.getOptionForAxis('gridLineColor', 'x');
    ctx.lineWidth = g.getOptionForAxis('gridLineWidth', 'x');
    var strokePattern = g.getOptionForAxis('gridLinePattern', 'x');
    var stroking = strokePattern && (strokePattern.length >= 2);
    if (stroking) {
      ctx.installPattern(strokePattern);
    }
    for (i = 0; i < ticks.length; i++) {
      x = halfUp(area.x + ticks[i][0] * area.w);
      drawVerticalLine(x);
    }
    if (stroking) {
      ctx.uninstallPattern();
    }
    ctx.restore();
  }
};

grid.prototype.destroy = function() {
};

return grid;

})();
