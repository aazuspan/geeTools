/*
Example: Calculating burn severity metrics for the 2017 Oak Fire
*/

var burnSeverity = require("users/aazuspan/geeScripts:burnSeverity.js");

// L8 imagery prior to the fire
var prefire = ee.Image("LANDSAT/LC08/C01/T1_TOA/LC08_046031_20170628");
// L8 imagery one year after the fire
var postfire = ee.Image("LANDSAT/LC08/C01/T1_TOA/LC08_046031_20180701");

var severity = burnSeverity.calculateBurnSeverity(
  prefire,
  postfire,
  "B5",
  "B6"
);

Map.addLayer(
  severity,
  { min: -250, max: 600, bands: ["preNBR", "postNBR", "postNBR"] },
  "severity"
);

/*
Example: Calculating HLI from SRTM data.
*/
var hli = require("users/aazuspan/geeScripts:HLI.js");
var srtm = ee.Image("CGIAR/SRTM90_V4");
var h = hli.hli(srtm);

Map.addLayer(h, { min: 0.5, max: 1 }, "HLI");

/*
Example calculating TPI and slope position
*/

var tpi = require("users/aazuspan/geeScripts:TPI.js");

var aoi = ee.Geometry.Polygon(
  [
    [
      [-123.92382561385939, 42.39507820959633],
      [-123.92382561385939, 41.57642883612384],
      [-122.83343254745314, 41.57642883612384],
      [-122.83343254745314, 42.39507820959633],
    ],
  ],
  null,
  false
);

// Calculate slope in degrees
var slope = ee.Terrain.slope(srtm);

// Calculate a TPI image using a 300m kernel
var tpi300 = tpi.tpi(srtm, 300, "square", "meters");

// Reclassify TPI to discrete slope positions
var slopePosition300 = tpi.slopePosition(tpi300, slope, null, aoi, 100, 1e12);

Map.addLayer(slopePosition300, { min: 1, max: 6 }, "Slope Position");
