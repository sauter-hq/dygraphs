/**
 * @license Copyright 2013 SAUTER AG
 */

Dygraph.Plugins.Legend = (function() {
	/*
	 * Current bits of jankiness: - Uses two private APIs: 1.
	 * Dygraph.optionsViewForAxis_ 2. dygraph.plotter_.area - Registers for a
	 * "predraw" event, which should be renamed. - I call calculateEmWidthInDiv
	 * more often than needed.
	 * 
	 */

	/* jshint globalstrict: true */
	/* global Dygraph:false */
	"use strict";

	/**
	 * Creates the legend, which appears when the user hovers over the chart.
	 * The legend can be either a user-specified or generated div.
	 * 
	 * @constructor
	 */
	var legend = function() {
		this.bubble_div_ = null;
		this.date_div_ = null;
		this.crosshair_div_ = null;
	};

	legend.prototype.toString = function() {
		return "Sauter Legend Plugin";
	};

	// (defined below)
	var generateBubbleHTML, generateDateHTML, updateBubble, updateDate, updateCrosshair, hideCursorOutsideChart;

	/**
	 * This is called during the dygraph constructor, after options have been
	 * set but before the data is available.
	 * 
	 * Proper tasks to do here include: - Reading your own options - DOM
	 * manipulation - Registering event listeners
	 * 
	 * @param {Dygraph}
	 *            g Graph instance.
	 * @return {object.<string, function(ev)>} Mapping of event names to
	 *         callbacks.
	 */
	legend.prototype.activate = function(g) {
		var bubbleDiv;
		var dateDiv;
		var crosshairDiv;

		var activateLegend = g.getOption("showLabelsOnHighlight");
		
		if(!activateLegend){
			return;
		}
		
		bubbleDiv = document.createElement("div");
		bubbleDiv.className = "dygraph-sauter-bubble";

		dateDiv = document.createElement("div");
		dateDiv.className = "dygraph-sauter-date";

		crosshairDiv = document.createElement("div");
		crosshairDiv.className = "dygraph-sauter-crosshair";
		
		// TODO(danvk): come up with a cleaner way to expose this.
		g.graphDiv.appendChild(bubbleDiv);
		g.graphDiv.appendChild(dateDiv);
		g.graphDiv.appendChild(crosshairDiv);

		this.bubble_div_ = bubbleDiv;
		this.date_div_ = dateDiv;
		this.crosshair_div_ = crosshairDiv;

		return {
			select : this.select,
			deselect : this.deselect,
			predraw : this.predraw,
			didDrawChart : this.didDrawChart
		};
	};
	
	legend.prototype.select = function(e) {
		var xValue = e.selectedX;
		var points = e.selectedPoints;
		var area = e.dygraph.plotter_.area;
		var chartWidth = area.x + area.w;
		var dygraph = e.dygraph;
		var xCanvas = e.selectedPoints[0].canvasx;
		
		updateBubble(this.bubble_div_, dygraph, xValue, xCanvas, points, chartWidth);
		updateDate(this.date_div_, dygraph, xValue, xCanvas, points, chartWidth);
		updateCrosshair(this.crosshair_div_, xCanvas, chartWidth);
	};

	legend.prototype.deselect = function(e) {
		this.bubble_div_.style.display = "none";
		this.date_div_.style.display = "none";
		this.crosshair_div_.style.display = "none";
	};

	legend.prototype.didDrawChart = function(e) {
		this.deselect(e);
	};

	// Right edge should be flush with the right edge of the charting area
	// (which
	// may not be the same as the right edge of the div, if we have two y-axes.
	// TODO(danvk): is any of this really necessary? Could just set "right" in
	// "activate".
	/**
	 * Position the labels div so that: - its right edge is flush with the right
	 * edge of the charting area - its top edge is flush with the top edge of
	 * the charting area
	 * 
	 * @private
	 */
	legend.prototype.predraw = function(e) {
	};

	/**
	 * Called when dygraph.destroy() is called. You should null out any
	 * references and detach any DOM elements.
	 */
	legend.prototype.destroy = function() {
		this.bubble_div_ = null;
		this.date_div_ = null;
		this.crosshair_div_ = null;
	};

	
	updateBubble = function(container, dygraph, xValue, xCanvas, points, chartWidth) {
		// Decide whether to show or not.
		if(hideCursorOutsideChart(container, xCanvas, chartWidth)){
			return;
		}
		
		var bubbleHtml = generateBubbleHTML(dygraph, xValue, points);
		if(bubbleHtml === ""){
			container.style.display = "none";
			return;
		}
		container.innerHTML = bubbleHtml;
		if(xCanvas > (chartWidth/2)){
			container.style.right = (chartWidth - xCanvas + 10) +"px";
			container.style.left = null;
		}else{
			container.style.right = null;
			container.style.left = (xCanvas + 5) +"px";
		}
		container.style.display = "inline-block";
	};
	
	
	updateDate = function(container, dygraph, xValue, xCanvas, points, chartWidth) {
		// Decide whether to show or not.
		if(hideCursorOutsideChart(container, xCanvas, chartWidth)){
			return;
		}
		
		var dateHtml = generateDateHTML(dygraph, xValue, points);
		container.innerHTML = dateHtml;
		var containerWidth = 130;
		
		var leftPosition =  xCanvas - containerWidth/2;
		if(leftPosition < 0){
			leftPosition = 0;
		} else if(leftPosition + containerWidth > chartWidth){
			leftPosition = chartWidth - containerWidth;
		}
		
		container.style.left = leftPosition +"px";
		container.style.display = "inline-block";
		container.style.width = containerWidth + "px";
	};
	
	updateCrosshair = function(container, xCanvas, chartWidth) {
		// Decide whether to show or not.
		if(hideCursorOutsideChart(container, xCanvas, chartWidth)){
			return;
		}
		
		container.style.left = (xCanvas - 1) +"px";
		container.style.display = "inline-block";
	};
	
	hideCursorOutsideChart = function(container, xCanvas, chartWidth ){
		// Decide whether to show or not.
		if(xCanvas < 0 || xCanvas > chartWidth){
			container.style.display = "none";
			return true;
		}
		return false;
	};
	
	/**
	 * @private Generates HTML for the legend which is displayed when hovering
	 *          over the chart. If no selected points are specified, a default
	 *          legend is returned (this may just be the empty string).
	 * @param {
	 *            Number } [x] The x-value of the selected points.
	 * @param {
	 *            [Object] } [sel_points] List of selected points for the given
	 *            x-value. Should have properties like 'name', 'yval' and
	 *            'canvasy'.
	 * @param {
	 *            Number } [oneEmWidth] The pixel width for 1em in the legend.
	 *            Only relevant when displaying a legend with no selection (i.e.
	 *            {legend: 'always'}) and with dashed lines.
	 */
	generateBubbleHTML = function(g, x, sel_points) {

		// If no points are selected, we display a default legend.
		// Traditionally,
		// this has been blank. But a better default would be a conventional
		// legend,
		// which provides essential information for a non-interactive chart.
		var html = "";
		var i;

		if (typeof (x) === 'undefined') {
			return '';
		}

		var yOptViews = [];
		var num_axes = g.numAxes();
		for (i = 0; i < num_axes; i++) {
			// TODO(danvk): remove this use of a private API
			yOptViews[i] = g.optionsViewForAxis_('y' + (i ? 1 + i : ''));
		}
		var showZeros = g.getOption("labelsShowZeroValues");
		for (i = 0; i < sel_points.length; i++) {
			var pt = sel_points[i];
			if (pt.yval === 0 && !showZeros)
				continue;
			if (!Dygraph.isOK(pt.canvasy))
				continue;

			var series = g.getPropertiesForSeries(pt.name);
			var yOptView = yOptViews[series.axis - 1];
			var fmtFunc = yOptView('valueFormatter');
			var yval = fmtFunc(pt.yval, yOptView, pt.name, g);

			// TODO(danvk): use a template string here and make it an attribute.
			html += "<div class='dygraph-sauter-bubble-value'>"
					+ " <span class='dygraph-sauter-bubble-value-color' style='background-color: "
					+ series.color
					+ ";'></span><span class='dygraph-sauter-bubble-value-text'>"
					+ yval + "</span></div>";
		}
		return html;
	};

	/**
	 * @private Generates HTML for the legend which is displayed when hovering
	 *          over the chart. If no selected points are specified, a default
	 *          legend is returned (this may just be the empty string).
	 * @param {
	 *            Number } [x] The x-value of the selected points.
	 * @param {
	 *            [Object] } [sel_points] List of selected points for the given
	 *            x-value. Should have properties like 'name', 'yval' and
	 *            'canvasy'.
	 * @param {
	 *            Number } [oneEmWidth] The pixel width for 1em in the legend.
	 *            Only relevant when displaying a legend with no selection (i.e.
	 *            {legend: 'always'}) and with dashed lines.
	 */
	generateDateHTML = function(g, x, sel_points) {
		// TODO(danvk): deprecate this option in place of {legend: 'never'}
		if (g.getOption('showLabelsOnHighlight') !== true)
			return '';

		// If no points are selected, we display a default legend.
		// Traditionally,
		// this has been blank. But a better default would be a conventional
		// legend,
		// which provides essential information for a non-interactive chart.
		var html = "";
		var labels = g.getLabels();

		if (typeof (x) === 'undefined') {
			return '';
		}

		// TODO(danvk): remove this use of a private API
		var xOptView = g.optionsViewForAxis_('x');
		var xvf = xOptView('valueFormatter');

		html += "<span class='dygraph-sauter-date-text'>"
			+ xvf(x, xOptView, labels[0], g)
			+ "</span>";
		
		return html;
	};

	return legend;
})();
