Dygraph.SauterPlotter = {};
/**
 * Draws a line with the styles passed in and calls all the drawPointCallbacks.
 * @param {Object} e The dictionary passed to the plotter function.
 * @private
 */
Dygraph.SauterPlotter._drawStyledLine = function(e,
    color, strokeWidth, strokePattern, drawPoints,
    drawPointCallback, pointSize) {
  var g = e.dygraph;
  // TODO(konigsberg): Compute attributes outside this method call.
  var stepPlot = g.getOption("stepPlot", e.setName);

  if (!Dygraph.isArrayLike(strokePattern)) {
    strokePattern = null;
  }

  var drawGapPoints = g.getOption('drawGapEdgePoints', e.setName);

  var points = e.points;
  var iter = Dygraph.createIterator(points, 0, points.length,
      DygraphCanvasRenderer._getIteratorPredicate(
          g.getOption("connectSeparatedPoints")));  // TODO(danvk): per-series?

  var stroking = strokePattern && (strokePattern.length >= 2);

  var ctx = e.drawingContext;
  ctx.save();
  if (stroking) {
    ctx.installPattern(strokePattern);
  }

  Dygraph.SauterPlotter._drawSeries(
      e, iter, strokeWidth, pointSize, drawPoints, drawGapPoints, stepPlot, color);


  if (stroking) {
    ctx.uninstallPattern();
  }

  ctx.restore();
};

/**
 * This does the actual drawing of lines on the canvas, for just one series.
 * Returns a list of [canvasx, canvasy] pairs for points for which a
 * drawPointCallback should be fired.  These include isolated points, or all
 * points if drawPoints=true.
 * @param {Object} e The dictionary passed to the plotter function.
 * @private
 */
Dygraph.SauterPlotter._drawSeries = function(e,
    iter, strokeWidth, pointSize, drawPoints, drawGapPoints, stepPlot, color) {
  // setup graphics context
  var ctx = e.drawingContext;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  
  // init loop variables
  var prevX = NaN;
  var prevY = NaN;
  var newX = NaN;
  var newY = NaN;
  var point; // the point being processed in the while loop

  while (iter.hasNext) {
    point = iter.next();
    if (isNaN(prevY) || prevY === undefined || prevY === null) {
      prevX = e.dygraph.toDomXCoord(point.yval.from);      
      prevY = point.canvasy;
      continue;
    }

    newY = point.canvasy;
    var isNewYNan = isNaN(newY);
    
    if(stepPlot || isNewYNan){
      newX = e.dygraph.toDomXCoord(point.yval.from);
    } else {
      newX = point.canvasx;
    }
    
	if (stepPlot || isNewYNan) {
	  ctx.moveTo(prevX, prevY);
	  ctx.lineTo(newX, prevY);
	} else {
	  ctx.moveTo(prevX, prevY);
	}
	if(!isNewYNan){
	  ctx.lineTo(newX, newY);
	}
    prevY = newY;
    prevX = newX;
  }
  ctx.stroke();
  return [];
};

/**
 * Plotter which draws the central lines for a series.
 * @private
 */
Dygraph.SauterPlotter._compressedLinePlotter = function(e) {
  var g = e.dygraph;
  var setName = e.setName;
  var strokeWidth = e.strokeWidth;

  // TODO(danvk): Check if there's any performance impact of just calling
  // getOption() inside of _drawStyledLine. Passing in so many parameters makes
  // this code a bit nasty.
  var borderWidth = g.getOption("strokeBorderWidth", setName);
  var drawPointCallback = g.getOption("drawPointCallback", setName) ||
      Dygraph.Circles.DEFAULT;
  var strokePattern = g.getOption("strokePattern", setName);
  var drawPoints = g.getOption("drawPoints", setName);
  var pointSize = g.getOption("pointSize", setName);

  if (borderWidth && strokeWidth) {
    Dygraph.SauterPlotter._drawStyledLine(e,
        g.getOption("strokeBorderColor", setName),
        strokeWidth + 2 * borderWidth,
        strokePattern,
        drawPoints,
        drawPointCallback,
        pointSize
        );
  }

  Dygraph.SauterPlotter._drawStyledLine(e,
      e.color,
      strokeWidth,
      strokePattern,
      drawPoints,
      drawPointCallback,
      pointSize
  );
};

/**
 * Draws the shaded error bars/confidence intervals for each series.
 * This happens before the center lines are drawn, since the center lines
 * need to be drawn on top of the error bars for all series.
 * @private
 */
Dygraph.SauterPlotter._compressedErrorPlotter = function(e) {
  var g = e.dygraph;
  var setName = e.setName;
//  var errorBars = g.getOption("errorBars") || g.getOption("customBars");
//  if (!errorBars) return;

  var fillGraph = g.getOption("fillGraph", setName);
  if (fillGraph) {
    g.warn("Can't use fillGraph option with error bars");
  }

  var ctx = e.drawingContext;
  var color = e.color;
  var fillAlpha = g.getOption('fillAlpha', setName);
  var stepPlot = g.getOption("stepPlot", setName);
  var points = e.points;

  var iter = Dygraph.createIterator(points, 0, points.length,
      DygraphCanvasRenderer._getIteratorPredicate(
          g.getOption("connectSeparatedPoints")));


  // setup graphics context
  var newYs;
  var newX = NaN;
  var prevX = NaN;
  var prevY = NaN;
  var prevYs = [-1, -1];
  // should be same color as the lines but only 15% opaque.
  var rgb = new RGBColorParser(color);
  var err_color =
      'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + fillAlpha + ')';
  ctx.fillStyle = err_color;
  ctx.beginPath();

  var isNullUndefinedOrNaN = function(x) {
    return (x === null ||
            x === undefined ||
            isNaN(x));
  };
  
  var getYTopBottom = function(point){
	  if(!isNullUndefinedOrNaN(point.y)) {
        newYs = [ point.y_bottom, point.y_top ];
        newYs[0] = e.plotArea.h * newYs[0] + e.plotArea.y;
        newYs[1] = e.plotArea.h * newYs[1] + e.plotArea.y;
      } else {
        newYs = null;
      }
	  return newYs;
  }

  while (iter.hasNext) {
    var point = iter.next();
    if (isNullUndefinedOrNaN(prevY)) {
      prevX = e.dygraph.toDomXCoord(point.yval.from);
      prevY = point.y;
      prevYs = getYTopBottom(point);
      continue;
    }

    newYs = getYTopBottom(point);
    
    if(stepPlot || newYs === null){
    	newX = e.dygraph.toDomXCoord(point.yval.from);
    } else {
    	newX = point.canvasx;
    }
    
    if (prevYs !== null) {
      if (stepPlot || newYs === null) {
        ctx.moveTo(prevX, prevYs[0]);
        ctx.lineTo(newX, prevYs[0]);
        ctx.lineTo(newX, prevYs[1]);
      } else {
        ctx.moveTo(prevX, prevYs[0]);
        ctx.lineTo(newX, newYs[0]);
        ctx.lineTo(newX, newYs[1]);
      }
      ctx.lineTo(prevX, prevYs[1]);
      ctx.closePath();
    }
    prevX = newX;
    prevY = point.y;
    prevYs = newYs;
  }
  ctx.fill();
};
