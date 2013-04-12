/**
 * @fileoverview Test cases for the per-axis grid options, including the new
 *               option "gridLinePattern".
 * 
 * @author david.eberlein@ch.sauter-bc.com (Fr. Sauter AG)
 */
var GridPerAxisTestCase = TestCase("grid-per-axis");

GridPerAxisTestCase.prototype.setUp = function() {
  document.body.innerHTML = "<div id='graph'></div>";
};

GridPerAxisTestCase.origFunc = Dygraph.getContext;

GridPerAxisTestCase.prototype.setUp = function() {
  document.body.innerHTML = "<div id='graph'></div>";
  Dygraph.getContext = function(canvas) {
    return new Proxy(GridPerAxisTestCase.origFunc(canvas));
  };
};

GridPerAxisTestCase.prototype.tearDown = function() {
  Dygraph.getContext = GridPerAxisTestCase.origFunc;
};

GridPerAxisTestCase.prototype.testIndependentGrids = function() {
  var opts = {
    width : 480,
    height : 320,
    errorBars : false,
    labels : [ "X", "Left", "Right" ],
    series : {
      Left : {
        axis : "y"
      },
      Right : {
        axis : "y2"
      }
    },
    axes : {
      y2 : {
        drawGrid : true,
        independentTicks : true
      }
    }
  };

  var data = [ [ 1, 0, 0 ], [ 2, 12, 88 ], [ 3, 88, 122 ], [ 4, 63, 273 ],
      [ 5, 110, 333 ] ];
  var graph = document.getElementById("graph");
  var g = new Dygraph(graph, data, opts);

  htx = g.hidden_ctx_;

  // The expected gridlines
  var yGridlines = [ 0, 20, 40, 60, 80, 100, 120 ];
  var y2Gridlines = [ 0, 50, 100, 150, 200, 250, 300, 350 ];
  var gridlines = [ yGridlines, y2Gridlines ];

  function halfUp(x) {
    return Math.round(x) + 0.5;
  }
  function halfDown(y) {
    return Math.round(y) - 0.5;
  }

  var attrs = {}, x, y;
  x = halfUp(g.plotter_.area.x);
  // Step through y(0) and y2(1) axis
  for ( var axis = 0; axis < 2; axis++) {
    // Step through all gridlines of the axis
    for ( var i = 0; i < gridlines[axis].length; i++) {
      // Check the labels:
      var labels = Util.getYLabels(axis + 1);
      assertEquals("Expected label not found.", gridlines[axis][i], labels[i]);

      // Check that the grid was drawn.
      y = halfDown(g.toDomYCoord(gridlines[axis][i], axis));
      var p1 = [ x, y ];
      var p2 = [ x + g.plotter_.area.w, y ];
      CanvasAssertions.assertLineDrawn(htx, p1, p2, attrs);
    }
  }
};

GridPerAxisTestCase.prototype.testPerAxisGridColors = function() {
  var opts = {
    width : 480,
    height : 320,
    errorBars : false,
    labels : [ "X", "Left", "Right" ],
    series : {
      Left : {
        axis : "y"
      },
      Right : {
        axis : "y2"
      }
    },
    axes : {
      y : {
        gridLineColor : "#0000ff",
        gridLineWidth : 2
      },
      y2 : {
        drawGrid : true,
        independentTicks : true,
        gridLineColor : "#ff0000",
        gridLineWidth : 2,
      }
    }
  };
  var data = [ [ 1, 0, 0 ], [ 2, 12, 88 ], [ 3, 88, 122 ], [ 4, 63, 273 ],
      [ 5, 110, 333 ] ];
  var graph = document.getElementById("graph");
  var g = new Dygraph(graph, data, opts);
  htx = g.hidden_ctx_;

  // The expected gridlines
  var yGridlines = [ 20, 40, 60, 80, 100, 120 ];
  var y2Gridlines = [ 50, 100, 150, 200, 250, 300, 350 ];
  var gridlines = [ yGridlines, y2Gridlines ];
  var gridColors = [ [ 0, 0, 255, 255 ], [ 255, 0, 0, 255 ] ];

  function halfUp(x) {
    return Math.round(x) + 1;
  }
  function halfDown(y) {
    return Math.round(y) - 1;
  }
  var x, y;
  x = halfUp(g.plotter_.area.x);
  // Step through y(0) and y2(1) axis
  for ( var axis = 0; axis < 2; axis++) {
    // Step through all gridlines of the axis
    for ( var i = 0; i < gridlines[axis].length; i++) {
      y = halfDown(g.toDomYCoord(gridlines[axis][i], axis));
      // Check the grid colors.
      assertEquals("Unexpected grid color found at pixel: x: " + x + "y: " + y,
          gridColors[axis], Util.samplePixel(g.hidden_, x, y));
    }
  }
};
GridPerAxisTestCase.prototype.testPerAxisGridWidth = function() {
  var opts = {
    width : 480,
    height : 320,
    errorBars : false,
    gridLineColor : "#ff0000",
    labels : [ "X", "Left", "Right" ],
    series : {
      Left : {
        axis : "y"
      },
      Right : {
        axis : "y2"
      }
    },
    axes : {
      x : {
        gridLineWidth : 4
      },
      y : {
        gridLineWidth : 2
      },
      y2 : {
        drawGrid : true,
        independentTicks : true,
        gridLineWidth : 1
      }
    }
  };
  var data = [ [ 1, 0, 0 ], [ 2, 12, 88 ], [ 3, 88, 122 ], [ 4, 63, 273 ],
      [ 5, 110, 333 ] ];
  var graph = document.getElementById("graph");
  var g = new Dygraph(graph, data, opts);
  htx = g.hidden_ctx_;

  // The expected gridlines
  var yGridlines = [ 20, 40, 60, 80 ];
  var y2Gridlines = [ 50, 100, 150, 200, 250, 350 ];
  var gridlines = [ yGridlines, y2Gridlines ];
  var xGridlines = [ 2, 3, 4 ];

  function halfUp(x) {
    return Math.round(x) + 1;
  }
  function halfDown(y) {
    return Math.round(y) - 1;
  }
  var x, y;
  x = halfUp(g.plotter_.area.x + 10);
  // Step through y(0) and y2(1) axis
  for ( var axis = 0; axis < 2; axis++) {
    // Step through all gridlines of the axis
    for ( var i = 0; i < gridlines[axis].length; i++) {
      y = halfDown(g.toDomYCoord(gridlines[axis][i], axis));
      var drawnPixeldown2 = Util.samplePixel(g.hidden_, x, y - 2);
      var drawnPixeldown1 = Util.samplePixel(g.hidden_, x, y - 1);
      var drawnPixel = Util.samplePixel(g.hidden_, x, y);
      var drawnPixelup1 = Util.samplePixel(g.hidden_, x, y + 1);
      var drawnPixelup2 = Util.samplePixel(g.hidden_, x, y + 2);
      // Check the grid width.
      switch (axis) {
      case 0: // y with 2 pixels width
        assertEquals("Unexpected grid color found at pixel: x: " + x + "y: "
            + y, [ 0, 0, 0, 0 ], drawnPixeldown2);
        assertEquals("Unexpected grid color found at pixel: x: " + x + "y: "
            + y, [ 255, 0, 0, 127 ], drawnPixeldown1);
        assertEquals("Unexpected grid color found at pixel: x: " + x + "y: "
            + y, [ 255, 0, 0, 255 ], drawnPixel);
        assertEquals("Unexpected grid color found at pixel: x: " + x + "y: "
            + y, [ 255, 0, 0, 128 ], drawnPixelup1);
        assertEquals("Unexpected grid color found at pixel: x: " + x + "y: "
            + y, [ 0, 0, 0, 0 ], drawnPixelup2);
        break;
      case 1: // y2 with 1 pixel width
        assertEquals("Unexpected grid color found at pixel: x: " + x + "y: "
            + y, [ 0, 0, 0, 0 ], drawnPixeldown1);
        assertEquals("Unexpected grid color found at pixel: x: " + x + "y: "
            + y, [ 255, 0, 0, 255 ], drawnPixel);
        assertEquals("Unexpected grid color found at pixel: x: " + x + "y: "
            + y, [ 0, 0, 0, 0 ], drawnPixelup1);
        break;
      }
    }
  }

  // Check the x axis grid
  y = halfDown(g.plotter_.area.y) + 10;
  for ( var i = 0; i < xGridlines.length; i++) {
    x = halfUp(g.toDomXCoord(xGridlines[i]));
    assertEquals("Unexpected grid color found at pixel: x: " + x + "y: " + y, [
        0, 0, 0, 0 ], Util.samplePixel(g.hidden_, x - 4, y));
    assertEquals("Unexpected grid color found at pixel: x: " + x + "y: " + y, [
        255, 0, 0, 128 ], Util.samplePixel(g.hidden_, x - 3, y));
    assertEquals("Unexpected grid color found at pixel: x: " + x + "y: " + y, [
        255, 0, 0, 255 ], Util.samplePixel(g.hidden_, x - 2, y));
    assertEquals("Unexpected grid color found at pixel: x: " + x + "y: " + y, [
        255, 0, 0, 255 ], Util.samplePixel(g.hidden_, x - 1, y));
    assertEquals("Unexpected grid color found at pixel: x: " + x + "y: " + y, [
        255, 0, 0, 255 ], Util.samplePixel(g.hidden_, x, y));
    assertEquals("Unexpected grid color found at pixel: x: " + x + "y: " + y, [
        255, 0, 0, 128 ], Util.samplePixel(g.hidden_, x + 1, y));
    assertEquals("Unexpected grid color found at pixel: x: " + x + "y: " + y, [
        0, 0, 0, 0 ], Util.samplePixel(g.hidden_, x + 2, y));
  }
};
GridPerAxisTestCase.prototype.testGridLinePattern = function() {
  var opts = {
    width : 480,
    height : 320,
    errorBars : false,
    drawXGrid : false,
    drawXAxis : false,
    drawYAxis : false,
    labels : [ "X", "Left", "Right" ],
    colors : [ "rgba(0,0,0,0)", "rgba(0,0,0,0)" ],
    series : {
      Left : {
        axis : "y"
      },
      Right : {
        axis : "y2"
      }
    },
    axes : {
      y : {
        gridLineColor : "#0000ff",
        gridLinePattern : [ 4, 4 ]
      }
    }
  };
  var data = [ [ 1, 0, 0 ], [ 2, 12, 88 ], [ 3, 88, 122 ], [ 4, 63, 273 ],
      [ 5, 110, 333 ] ];
  var graph = document.getElementById("graph");
  var g = new Dygraph(graph, data, opts);
  htx = g.hidden_ctx_;

  // The expected gridlines
  var yGridlines = [ 0, 20, 40, 60, 80, 100, 120 ];

  function halfUp(x) {
    return Math.round(x) + 1;
  }
  function halfDown(y) {
    return Math.round(y) - 1;
  }
  var x, y;
  x = halfUp(g.plotter_.area.x);
  // Step through all gridlines of the axis
  for ( var i = 0; i < yGridlines.length; i++) {
    y = halfDown(g.toDomYCoord(yGridlines[i], 0));
    // Step through the pixels of the line and test the pattern.
    for (x; x < g.plotter_.area.w; x++) {
      var drawnPixel = Util.samplePixel(g.hidden_, x, y);
      var pattern = (Math.floor((x) / 4)) % 2;
      switch (pattern) {
      case 0: // fill
        assertEquals("Unexpected grid color found at pixel: x: " + x + "y: "
            + y, [ 0, 0, 255, 77 ], drawnPixel);
        break;
      case 1: // no fill
        assertEquals("Unexpected grid color found at pixel: x: " + x + "y: "
            + y, [ 0, 0, 0, 0 ], drawnPixel);
        break;
      }
    }
  }
};