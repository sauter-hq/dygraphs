var ErrorBarsHandler = Dygraph.DataHandler();
ErrorBarsHandler.prototype = Dygraph.DataHandlers.createHandler("bars");
Dygraph.DataHandlers.registerHandler("bars-error", ErrorBarsHandler);
// errorBars
ErrorBarsHandler.prototype.extractSeries = function(rawData, i, logScale,
    dygraphs) {
  // TODO(danvk): pre-allocate series here.
  var series = [];
  var x, y, variance, point;
  var sigma = dygraphs.attr_("sigma");
  for ( var j = 0; j < rawData.length; j++) {
    x = rawData[j][0];
    point = rawData[j][i];
    if (logScale) {
      // On the log scale, points less than zero do not exist.
      // This will create a gap in the chart.
      if (point <= 0) {
        point = null;
      }
    }
    // Extract to the unified data format.
    if (point !== null) {
      y = point[0];
      if (y !== null && !isNaN(y)) {
        variance = sigma * point[1];
        // preserve original error value in extras for further
        // filtering
        series.push([ x, y, [ y - variance, y + variance, point[1] ] ]);
      } else {
        series.push([ x, y, [ y, y, y ] ]);
      }
    } else {
      series.push([ x, null, [ null, null, null ] ]);
    }
  }
  return series;
};

ErrorBarsHandler.prototype.rollingAverage = function(originalData, rollPeriod,
    dygraphs) {
  rollPeriod = Math.min(rollPeriod, originalData.length);
  var rollingData = [];
  var sigma = dygraphs.attr_("sigma");

  var i, j, y, v, sum, num_ok, stddev, variance, value;

  // Calculate the rolling average for the first rollPeriod - 1 points
  // where there is not enough data to roll over the full number of points
  for (i = 0; i < originalData.length; i++) {
    sum = 0;
    variance = 0;
    num_ok = 0;
    for (j = Math.max(0, i - rollPeriod + 1); j < i + 1; j++) {
      y = originalData[j][1];
      if (y === null || isNaN(y))
        continue;
      num_ok++;
      sum += y;
      variance += Math.pow(originalData[j][2][2], 2);
    }
    if (num_ok) {
      stddev = Math.sqrt(variance) / num_ok;
      value = sum / num_ok;
      rollingData[i] = [ originalData[i][0], value,
          [value - sigma * stddev, value + sigma * stddev] ];
    } else {
      // This explicitly preserves NaNs to aid with "independent
      // series".
      // See testRollingAveragePreservesNaNs.
      v = (rollPeriod == 1) ? originalData[i][1] : null;
      rollingData[i] = [ originalData[i][0], v, [ v, v ] ];
    }
  }

  return rollingData;
};