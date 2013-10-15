Dygraph.SauterPlotter = {};

Dygraph.SauterPlotter.PARTLY_NA_THRESHOLD = 0.15;
Dygraph.SauterPlotter.PARTLY_NA_PATTERN_LINE = [6,2];
Dygraph.SauterPlotter.PARTLY_NA_PATTERN_BARS = [1,2];
Dygraph.SauterPlotter.PARTLY_NA_PATTERN_COUNTER = [1,2];
Dygraph.SauterPlotter.NA_PATTERN_LINE = [2,6];
Dygraph.SauterPlotter.NA_PATTERN_COUNTER = [3,3];
Dygraph.SauterPlotter.halfUp = function(x){ return Math.round(x) + 0.5; };
Dygraph.SauterPlotter.halfDown = function(y){ return Math.round(y) - 0.5; }

/**
 * Draws a line with the styles passed in and calls all the drawPointCallbacks.
 * @param {Object} e The dictionary passed to the plotter function.
 * @private
 */
Dygraph.SauterPlotter._drawStyledLine = function(e,
    color, strokeWidth, strokePattern, drawPoints,
    drawPointCallback, pointSize, drawFunction) {
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

  var pointsOnLine = drawFunction(
      e, iter, strokeWidth, pointSize, drawPoints, drawGapPoints, stepPlot, color);
  if(drawPoints) {
    DygraphCanvasRenderer._drawPointsOnLine(
	      e, pointsOnLine, drawPointCallback, color, pointSize);
  }

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
	
  var naX = null;
  var naY = null;
  var prevCanvasX = null;
  var prevCanvasY = null;
  var nextCanvasY = null;
  var isIsolated; // true if this point is isolated (no line segments)
  var point; // the point being processed in the while loop
  var pointsOnLine = []; // Array of [canvasx, canvasy] pairs.
  var first = true; // the first cycle through the while loop

  var area = e.dygraph.plotter_.area;
  var xMin = area.x - 1;
  var xMax = area.x + area.w + 1;
  var ctx = e.drawingContext;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;

  // NOTE: we break the iterator's encapsulation here for about a 25% speedup.
  var arr = iter.array_;
  var limit = iter.end_;
  var predicate = iter.predicate_;
  
  function drawNaLine(fromX,toX,y){
	  // Don't draw N/A lines outside the displayed
	  // area since this uses a lot of computation power.
	  if(fromX < xMin) fromX = xMin;
	  if(toX > xMax) toX = xMax;
	  ctx.stroke();
	  ctx.beginPath();
      ctx.installPattern(Dygraph.SauterPlotter.NA_PATTERN_LINE);
      ctx.moveTo(fromX, y);
      ctx.lineTo(toX, y);
      ctx.stroke();
      ctx.uninstallPattern();
      ctx.beginPath();
  }

  for (var i = iter.start_; i < limit; i++) {
    point = arr[i];
    if (predicate) {
      while (i < limit && !predicate(arr, i)) {
        i++;
      }
      if (i == limit) break;
      point = arr[i];
    }
    
    if (point.canvasy === null || point.canvasy != point.canvasy) {
      if (stepPlot && prevCanvasX !== null) {
        // Draw a horizontal line to the start of the missing data
        ctx.moveTo(prevCanvasX, prevCanvasY);
        ctx.lineTo(point.canvasx, prevCanvasY);
      }
      if(naX === null) {
    	if (first) {
    	  naX = point.canvasx;
    	  naY = null;
    	} else {
	      naX = prevCanvasX;
	      naY = prevCanvasY;
    	}
      }
      prevCanvasX = prevCanvasY = null;
    } else {
      // draw the dotted N/A line if needed
	  if(naX !== null){
		// if the series starts with an N/A use the next value as y N/A anchor.
  	    if(naY === null) {
		  naY = point.canvasy
		}
  	    drawNaLine(naX,point.canvasx, naY);
        naX = naY = null;
      }
    	
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
            ctx.lineTo(point.canvasx, prevCanvasY);
          }

          ctx.lineTo(point.canvasx, point.canvasy);
        }
      } else {
        ctx.moveTo(point.canvasx, point.canvasy);
      }
      if (drawPoints || isIsolated) {
        pointsOnLine.push([point.canvasx, point.canvasy, point.idx]);
      }
      prevCanvasX = point.canvasx;
      prevCanvasY = point.canvasy;
    }
    first = false;
  }
  // Draw an N/A line to the end of the chart if:
  // 1. The last value is an N/A or
  // 2. The last value is within the plotting area.
  if(naX !== null || prevCanvasX < (area.x + area.w)){
	if(naY === null){
	  naY = prevCanvasY;
	  if(prevCanvasY === null){
		naY = area.y + (area.h / 2);
	  }
	}
	if(naX === null){
		naX = prevCanvasX;
	}
	drawNaLine(naX,xMax, naY);
  }
  ctx.stroke();
  return pointsOnLine;
};

/**
 * This does the actual drawing of lines on the canvas, for just one series.
 * Returns a list of [canvasx, canvasy] pairs for points for which a
 * drawPointCallback should be fired.  These include isolated points, or all
 * points if drawPoints=true.
 * @param {Object} e The dictionary passed to the plotter function.
 * @private
 */
Dygraph.SauterPlotter._drawCompressedSeries = function(e,
    iter, strokeWidth, pointSize, drawPoints, drawGapPoints, stepPlot, color) {
  var area = e.dygraph.plotter_.area;
  var xMin = area.x - 1;
  var xMax = area.x + area.w + 1;
  var yMid = area.y + (area.h / 2);
  // setup graphics context
  var ctx = e.drawingContext;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  
  // init loop variables
  var isPatternInstalled = false;
  var naX = null;
  var naY = null;
  var isPrevPartlyNa = false;
  var isNewYNan = true;
  var isPrevYNan = true;
  var prevX = NaN;
  var prevY = NaN;
  var newX = NaN;
  var newY = NaN;
  var point = undefined; // the point being processed in the while loop
  var first = true;
  
  function installPartlyNaPattern(){
	ctx.stroke();
    ctx.beginPath();
    ctx.installPattern(Dygraph.SauterPlotter.PARTLY_NA_PATTERN_LINE);
    isPatternInstalled = true;
  }
  
  function drawNaLine(fromX,toX,y){
	  // Don't draw N/A lines outside the displayed
	  // area since this uses a lot of computation power.
	  if(fromX < xMin) fromX = xMin;
	  if(toX > xMax) toX = xMax;
	  
	  ctx.stroke();
	  if(isPatternInstalled)
		uninstallPattern();
      ctx.installPattern(Dygraph.SauterPlotter.NA_PATTERN_LINE);
      ctx.beginPath();
      ctx.moveTo(fromX, y);
      ctx.lineTo(toX, y);
      ctx.stroke();
      ctx.uninstallPattern();
      ctx.beginPath();
  }
  
  function uninstallPattern(){
    ctx.stroke();
	ctx.beginPath();
    ctx.uninstallPattern(); 
    isPatternInstalled = false;
  }
  
  var isNullUndefinedOrNaN = function(x) {
    return (isNaN(x) || x === undefined || x === null);
  };
  
  while (iter.hasNext) {
    point = iter.next();
    // Define new x and y coordinates
    newY = point.canvasy;
    isNewYNan = isNullUndefinedOrNaN(newY);
    if(stepPlot || isNewYNan || first){
    	newX = e.dygraph.toDomXCoord(point.yval.from);
    } else {
    	newX = point.canvasx;
    }
    // Save the last valid x value as start coordinate
    if(isNewYNan && naX == null)
    	naX = newX;
    // Save the last or next valid y value for the n/a line
    if(!isPrevYNan) 
    	naY = prevY;
    
    // (Un)install the correct plotters
    if(isPrevPartlyNa && !isPatternInstalled){
	  installPartlyNaPattern();
	} else if (!isPrevPartlyNa && isPatternInstalled){
	  uninstallPattern();
	}

    // Do the actual drawing
    if (isPrevYNan && !first) {
      // Only draw the N/A line if:
      // The current point isn't N/A so we can plot all
      // N/A's together for a better performance and a smoother line.
      // Note: If we never get a valid y-val the N/A line will
      // be plotted after the while loop.
      if (!isNewYNan) {
        if(naY == null) 
        	naY = newY;
    	drawNaLine(naX,newX,naY);
      	naX = null;
      }
    } else {
      ctx.moveTo(prevX, prevY);
	  if (stepPlot || isNewYNan) {
	    ctx.lineTo(newX, prevY);
	  }
	
  	  if(!isNewYNan){
	    ctx.lineTo(newX, newY);
	  }
    }
	
    prevY = newY;
    prevX = newX;
    isPrevYNan = isNewYNan;
    isPrevPartlyNa = !isNewYNan && point.yval.naPercentage > Dygraph.SauterPlotter.PARTLY_NA_THRESHOLD;
    first = false;
  }
  
  // Draw the last part (from the center of the last value to the end).
  if(point){
	// Install correct patterns for last value.
	if(isPrevPartlyNa && !isPatternInstalled){
	  installPartlyNaPattern();
	} else if (!isPrevPartlyNa && isPatternInstalled){
	  uninstallPattern();
	}
	
	// Draw the line
    prevX = newX;
    newX = e.dygraph.toDomXCoord(point.yval.to);
    if(isPrevYNan){
      if(naX == null) naX = prevX;
      if(naY == null) naY = yMid;
   	  drawNaLine(naX,newX,naY);
   	  newY = naY;
   	} else {
      ctx.moveTo(prevX, newY);
      ctx.lineTo(newX, newY);
   	}
  }
  
  ctx.stroke();
  
  //Draw an N/A line to the end of the chart.
  if(newX < xMax){
    naX = newX;
	naY = newY;
	drawNaLine(naX, xMax, naY);
  }
  
  // Uninstall Pattern if nesseccary
  if(isPatternInstalled){
    uninstallPattern();
  }
  return [];
};

/**
 * Plotter which draws the central lines for a series.
 * @private
 */
Dygraph.SauterPlotter._plotLine = function(e, drawFunction) {
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
        pointSize,
        drawFunction
    );
  }

  Dygraph.SauterPlotter._drawStyledLine(e,
      e.color,
      strokeWidth,
      strokePattern,
      drawPoints,
      drawPointCallback,
      pointSize,
      drawFunction
  );
};

/**
 * Plotter which draws the central lines for a raw series.
 * @private
 */
Dygraph.SauterPlotter.linePlotter = function(e) {
  Dygraph.SauterPlotter._plotLine(e,Dygraph.SauterPlotter._drawSeries);
};

/**
 * Plotter which draws the central lines for a compressed series.
 * @private
 */
Dygraph.SauterPlotter.compressedLinePlotter = function(e) {
  Dygraph.SauterPlotter._plotLine(e,Dygraph.SauterPlotter._drawCompressedSeries);
};

/**
 * Draws the shaded error bars/confidence intervals for each series.
 * This happens before the center lines are drawn, since the center lines
 * need to be drawn on top of the error bars for all series.
 * @private
 */
Dygraph.SauterPlotter.compressedErrorPlotter = function(e) {
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
  var isPrevPartlyNa = false;
  var isPartlyNaColorSet = false;
  var newYs;
  var newX = NaN;
  var prevX = NaN;
  var prevY = NaN;
  var prevYs = [-1, -1];
  var first = true;
  // should be same color as the lines but only 15% opaque.
  var rgb = new RGBColorParser(color);
  var err_color =
      'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + fillAlpha + ')';
  var err_color_partly_na = Dygraph.SauterPlotter._createPattern(ctx, err_color, Dygraph.SauterPlotter.PARTLY_NA_PATTERN_BARS);
  
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
  };
  
  var installCorrectPattern = function(){
	  if(isPrevPartlyNa && !isPartlyNaColorSet){
  		ctx.fill();
  		ctx.beginPath();
  		ctx.fillStyle = err_color_partly_na;
  		isPartlyNaColorSet = true;
  	} else if (!isPrevPartlyNa && isPartlyNaColorSet){
  		ctx.fill();
  		ctx.beginPath();
  		ctx.fillStyle = err_color;
  		isPartlyNaColorSet = false;
  	}
  };

  while (iter.hasNext) {
    var point = iter.next();
    
    newYs = getYTopBottom(point);
    if(stepPlot || newYs === null || first){
    	newX = e.dygraph.toDomXCoord(point.yval.from);
    } else {
    	newX = point.canvasx;
    }
    
    if (isNullUndefinedOrNaN(prevY)) {
    	// Don't draw anything for N/A values
    } else {
    	// Install the correct pattern
    	installCorrectPattern();
    	// Draw the error bars
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
    }
    
    prevX = newX;
    prevY = point.y;
    prevYs = newYs;
    isPrevPartlyNa = point.yval.naPercentage > Dygraph.SauterPlotter.PARTLY_NA_THRESHOLD;
    first = false;
  }
  
  if (!isNullUndefinedOrNaN(prevY)) {
    //Draw the last part  (from the center of the last value to the end).
  	installCorrectPattern();
    newX = e.dygraph.toDomXCoord(point.yval.to);
	ctx.moveTo(prevX, prevYs[0]);
  	ctx.lineTo(newX, prevYs[0]);
  	ctx.lineTo(newX, prevYs[1]);
  	ctx.lineTo(prevX, prevYs[1]);
  }
  ctx.closePath();
  ctx.fill();
};


/**
 * Draws the bars for each series.
 */
Dygraph.SauterPlotter.barChartPlotter = function(e) {
	var BAR_WIDTH_THRESHOLD = 0.1;
	var widget = this;
	var ctx = e.drawingContext;
	var points = e.points;
	var y_bottom = e.dygraph.toDomYCoord(0);
	var y_top = e.dygraph.toDomYCoord(1);

	widget._setColor(ctx, e.color);

	var gapBetweenStates = 1.5;
	var minStateHeight = 0.5;
	// Do the actual plotting.
	for ( var i = 0; i < points.length; i++) {
		var p = points[i];
		var center_x = p.canvasx;

		
		var bar_width = 0;
		var fromXCoord = e.dygraph.toDomXCoord(p.yval.from);
		var toXCoord = e.dygraph.toDomXCoord(p.yval.to);
		bar_width = toXCoord - fromXCoord;
		
		bar_width = Math.floor(bar_width - bar_width / 1.5);
		if(bar_width < BAR_WIDTH_THRESHOLD){
			bar_width = BAR_WIDTH_THRESHOLD;
		}
		
		var states = p.yval.value;
		var totalHeight = y_bottom - y_top;
		var lastBase = y_top;
		var height = 0;
		var heightSum = 0;
		var previousCorrection = 0;
		if (states !== 'NaN') {
			for ( var j = states.length - 1; j >= 0; j--) {
				var percentage = parseFloat(states[j][1]);
				if(percentage == 0){
					continue;
				}
				
				height = (percentage * totalHeight);
				widget._setColor(ctx, widget.options.statecolors[states[j][0]]);

				var correctedHeight = height - gapBetweenStates
						- previousCorrection;
				var correction = 0;
				if (correctedHeight < minStateHeight) {
					correction = minStateHeight - correctedHeight;
					correctedHeight = minStateHeight;
				}

				ctx.fillRect(center_x - bar_width / 2, lastBase, bar_width, correctedHeight);

				previousCorrection = correction;
				lastBase = lastBase + correctedHeight + gapBetweenStates;
				heightSum = heightSum + correctedHeight + gapBetweenStates;
			}
		}

		if (p.yval.naPercentage > 0) {

			widget._setColor(ctx, widget.options.statecolors["unknown"]);
			// XXX: The gap height must also be subtracted here because
			// otherwise the x axis would be overwritten.
			height = totalHeight - heightSum - gapBetweenStates;
			ctx.fillRect(center_x - bar_width / 2, lastBase, bar_width, height);
			widget._setColor(ctx, e.color);
		}
	}
};


/**
 * Plots bars for the CounterPanel and may be used for both raw and 
 * compressed series.
 */
Dygraph.SauterPlotter.counterBarsPlotter = function(e){
	var BAR_SIZE_THRESHOLD = 0.2;
	var area = e.dygraph.plotter_.area;
	var xMin = area.x - 1;
	var xMax = area.x + area.w + 1;
	
    var ctx = e.drawingContext;
    var points = e.points;
    var strokeWidth = e.strokeWidth;
    var y_bottom = e.dygraph.toDomYCoord(0);
    if(y_bottom > area.y + area.h){
    	y_bottom = area.y + area.h - 2;
    }
    
    ctx.save();
    ctx.installPattern(Dygraph.SauterPlotter.NA_PATTERN_LINE);
    ctx.lineWidth = strokeWidth;
    
    function drawNaLine(fromX, toX){
  	  // Don't draw N/A lines outside the displayed
  	  // area since this uses a lot of computation power.
  	  if(fromX < xMin) fromX = xMin;
  	  if(toX > xMax) toX = xMax;
	  ctx.beginPath();
	  ctx.moveTo(fromX,Dygraph.SauterPlotter.halfDown(y_bottom));
	  ctx.lineTo(toX, Dygraph.SauterPlotter.halfDown(y_bottom));
	  ctx.stroke();
    }
    
    // The RGBColorParser class is provided by rgbcolor.js, which is
    // packed in with dygraphs.
    var color = new RGBColorParser(e.color);
    color.r = Math.floor( color.r);
    color.g = Math.floor(color.g);
    color.b = Math.floor(color.b);
    var defaultStyle = color.toRGB();
    var partlyNaStyle = Dygraph.SauterPlotter._createPattern(ctx, defaultStyle, Dygraph.SauterPlotter.PARTLY_NA_PATTERN_COUNTER, false, [4,2]);

    var iter = Dygraph.createIterator(points, 0, points.length,
        DygraphCanvasRenderer._getIteratorPredicate(
        		e.dygraph.getOption("connectSeparatedPoints")));
    
    var bar_width, bar_height, isPartlyNa, naPerc, p, fromX, toX;
    

    // Do the actual plotting.
    while (iter.hasNext) {
      p = iter.next();
      fromX = e.dygraph.toDomXCoord(p.yval.from);
      toX = e.dygraph.toDomXCoord(p.yval.to);
      
      if (isNaN(p.y) || p.y === undefined || p.y === null) {
    	// Don't draw N/A for the first value since its 
    	// differenance can't be computed and it will always be null.
    	// However if the value isn't undefined, the value was actually N/A
    	// so we want to draw the N/A line. (see jquery.panel.counter)
    	if(p.idx != iter.start_ || p.yval.value !== undefined) {
    	  drawNaLine(fromX + 1, toX - 1);
    	}
        continue;
      }

      bar_width = toX - fromX - 2;
      bar_height =  y_bottom - p.canvasy;
      
      if(bar_width < BAR_SIZE_THRESHOLD){
    	bar_width = BAR_SIZE_THRESHOLD;
      }
      if(bar_height < BAR_SIZE_THRESHOLD){
        bar_height = BAR_SIZE_THRESHOLD;
      }
      
      naPerc = 0;
      if(p.yval.naPercentage){
    	naPerc = p.yval.naPercentage;
      }
      isPartlyNa = naPerc > Dygraph.SauterPlotter.PARTLY_NA_THRESHOLD;
      
      if(isPartlyNa){
    	ctx.fillStyle = partlyNaStyle;
      } else {
    	ctx.fillStyle = defaultStyle;
      }
      
      ctx.fillRect(p.canvasx - bar_width / 2, p.canvasy, bar_width, bar_height);
    }
    
    //Draw an N/A line to the end of the chart.
    if(p.canvasx < (area.x + area.w)){
  	  drawNaLine(p.canvasx + bar_width / 2, area.x + area.w);
    }

	ctx.uninstallPattern();
    ctx.restore();
};

/**
 * Creates a striped pattern that may be set to a canvas fillStyle. 
 * @param ctx The context of the canvas to set to.
 * @param color The color of the pattern
 * @param pattern A number array where even values represent 
 * 		the width of the colored areas and the odd values the transparent ones. 
 * @param horizontal If set to true, the pattern will consist of 
 * 		horizontal lines, vertical lines are used otherwise.
 * @param linePattern Optional pattern for the line.
 * @returns
 */
Dygraph.SauterPlotter._createPattern = function(ctx, color, pattern, horizontal, linePattern){
	var ptrnCvs = document.createElement("canvas");
	var totalWidth = 0;
	for(var i=0;i<pattern.length;i++){
		totalWidth += pattern[i];
	}
	var totalHeight = 10;
	if(linePattern){
		totalHeight = 0;
		for(var i=0;i<linePattern.length;i++){
			totalHeight += linePattern[i];
		}
	}
	
	if (horizontal) {
		ptrnCvs.width = totalHeight;
		ptrnCvs.height = totalWidth;
	} else {
		ptrnCvs.width = totalWidth;
		ptrnCvs.height = totalHeight;
	}
	
	var ptrnCvsCtx = ptrnCvs.getContext("2d");
	var offset = 0;
	var lineWidth;
	var drawPos;
	ptrnCvsCtx.strokeStyle = color;
	
	if(linePattern){
		ptrnCvsCtx.installPattern(linePattern);
	}
	for(var i=0;i<pattern.length;i++){
		lineWidth = pattern[i];
		if(i % 2 == 0){
			drawPos = offset + (lineWidth / 2);
			ptrnCvsCtx.beginPath();
			if(horizontal) {
				ptrnCvsCtx.moveTo(0,drawPos);
				ptrnCvsCtx.lineTo(totalHeight,drawPos);
			} else {
				ptrnCvsCtx.moveTo(drawPos,0);
				ptrnCvsCtx.lineTo(drawPos,totalHeight);
			}
			ptrnCvsCtx.lineWidth = lineWidth;
			ptrnCvsCtx.stroke();
		}
		offset += lineWidth;
	}
	if(linePattern){
		ptrnCvsCtx.uninstallPattern();
	}
	
	return ctx.createPattern(ptrnCvs, "repeat");
};