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

  var prevCanvasX = null;
  var prevCanvasY = null;
  var nextCanvasY = null;
  var isIsolated; // true if this point is isolated (no line segments)
  var point; // the point being processed in the while loop
  var pointsOnLine = []; // Array of [canvasx, canvasy] pairs.
  var first = true; // the first cycle through the while loop

  var ctx = e.drawingContext;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;

  // NOTE: we break the iterator's encapsulation here for about a 25% speedup.
  var arr = iter.array_;
  var limit = iter.end_;
  var predicate = iter.predicate_;

  for (var i = iter.start_; i < limit; i++) {
    point = arr[i];
    if (predicate) {
      while (i < limit && !predicate(arr, i)) {
        i++;
      }
      if (i == limit) break;
      point = arr[i];
    }
    
    var canvasx = e.dygraph.toDomXCoord(point.yval.from);

    if (point.canvasy === null || point.canvasy != point.canvasy) {
      if (stepPlot && prevCanvasX !== null) {
        // Draw a horizontal line to the start of the missing data
        ctx.moveTo(prevCanvasX, prevCanvasY);
        ctx.lineTo(canvasx, prevCanvasY);
      }
      prevCanvasX = prevCanvasY = null;
    } else {
      isIsolated = false;
      if (drawGapPoints || !prevCanvasX) {
        iter.nextIdx_ = i;
        iter.next();
        nextCanvasY = iter.hasNext ? iter.peek.canvasy : null;

        var isNextCanvasYNullOrNaN = nextCanvasY === null ||
            nextCanvasY != nextCanvasY;
        isIsolated = (!prevCanvasX && isNextCanvasYNullOrNaN);
        if (drawGapPoints) {
          // Also consider a point to be "isolated" if it's adjacent to a
          // null point, excluding the graph edges.
          if ((!first && !prevCanvasX) ||
              (iter.hasNext && isNextCanvasYNullOrNaN)) {
            isIsolated = true;
          }
        }
      }

      if (prevCanvasX !== null) {
        if (strokeWidth) {
          if (stepPlot) {
            ctx.moveTo(prevCanvasX, prevCanvasY);
            ctx.lineTo(canvasx, prevCanvasY);
          }

          ctx.lineTo(canvasx, point.canvasy);
        }
      } else {
        ctx.moveTo(canvasx, point.canvasy);
      }
      if (drawPoints || isIsolated) {
        pointsOnLine.push([canvasx, point.canvasy, point.idx]);
      }
      prevCanvasX = canvasx;
      prevCanvasY = point.canvasy;
    }
    first = false;
  }
  ctx.stroke();
  return pointsOnLine;
};

/**
 * Plotter which draws the central lines for a series.
 * @private
 */
Dygraph.SauterPlotter._linePlotter = function(e) {
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
Dygraph.SauterPlotter._errorPlotter = function(e) {
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

  var newYs;

  // setup graphics context
  var canvasx = NaN;
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

  while (iter.hasNext) {
    var point = iter.next();
    if ((!stepPlot && isNullUndefinedOrNaN(point.y)) ||
        (stepPlot && !isNaN(prevY) && isNullUndefinedOrNaN(prevY))) {
      prevX = NaN;
      continue;
    }

    if (stepPlot) {
      newYs = [ point.y_bottom, point.y_top ];
      prevY = point.y;
    } else {
      newYs = [ point.y_bottom, point.y_top ];
    }
    canvasx = e.dygraph.toDomXCoord(point.yval.from);
    newYs[0] = e.plotArea.h * newYs[0] + e.plotArea.y;
    newYs[1] = e.plotArea.h * newYs[1] + e.plotArea.y;
    if (!isNaN(prevX)) {
      if (stepPlot) {
        ctx.moveTo(prevX, prevYs[0]);
        ctx.lineTo(canvasx, prevYs[0]);
        ctx.lineTo(canvasx, prevYs[1]);
      } else {
        ctx.moveTo(prevX, prevYs[0]);
        ctx.lineTo(canvasx, newYs[0]);
        ctx.lineTo(canvasx, newYs[1]);
      }
      ctx.lineTo(prevX, prevYs[1]);
      ctx.closePath();
    }
    prevYs = newYs;
    prevX = canvasx;
  }
  ctx.fill();
};
