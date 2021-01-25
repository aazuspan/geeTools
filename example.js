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
  "severity",
  false
);

/*
Example: Calculating HLI from SRTM data.
*/
var hli = require("users/aazuspan/geeScripts:HLI.js");
var srtm = ee.Image("CGIAR/SRTM90_V4");
var h = hli.hli(srtm);

Map.addLayer(h, { min: 0.5, max: 1 }, "HLI", false);

/*
Example: Calculating TPI and slope position
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

Map.addLayer(slopePosition300, { min: 1, max: 6 }, "Slope Position", false);

/*
Example: Applying radiometric correction
*/

var radCor = require("users/aazuspan/geeScripts:radiometricCorrection.js");

// Identify a reference dark object, such as deep water
var darkObject = ee.Geometry.Polygon(
  [
    [
      [-124.74266276966597, 42.12268590007055],
      [-124.74266276966597, 41.93396768286303],
      [-124.52705608021284, 41.93396768286303],
      [-124.52705608021284, 42.12268590007055],
    ],
  ],
  null,
  false
);

// Use Dark Object Subtraction to correct for atmospheric distortion
var prefireDOS = radCor.darkObjectSubtraction(prefire, darkObject, 30, 1e13);
var postfireDOS = radCor.darkObjectSubtraction(postfire, darkObject, 30, 1e13);

Map.addLayer(
  prefireDOS,
  { min: 0, max: 0.4, bands: ["B5", "B4", "B3"] },
  "Prefire DOS",
  false
);
Map.addLayer(
  postfireDOS,
  { min: 0, max: 0.4, bands: ["B5", "B4", "B3"] },
  "Postfire DOS",
  false
);

// Identify pseudo-invariant features between prefire and postfire images; in
// this case, ocean and a building.
var PIF = ee.Geometry.MultiPolygon([
  [
    [
      [-124.73859734350975, 41.90979183965181],
      [-124.73688072974022, 41.88551473447749],
      [-124.71834130102928, 41.88628152101927],
      [-124.7216028671914, 41.91426293134146],
    ],
  ],
  [
    [
      [-122.87238706850988, 42.428688503225544],
      [-122.87242998385412, 42.4279599378424],
      [-122.8702842166422, 42.4279124224146],
      [-122.87024130129797, 42.42865682664584],
    ],
  ],
]);

// Use pseudo-invariant features to match the histogram of postfire imagery to
// prefire imagery. All bands within each image must have the same projection,
// so a subset of bands are selected.
var postfireMatch = radCor.linearHistogramMatch(
  postfire.select(["B5", "B4", "B3", "B2"]),
  prefire.select(["B5", "B4", "B3", "B2"]),
  PIF
);

Map.addLayer(
  postfireMatch,
  { min: 0, max: 0.4, bands: ["B5", "B4", "B3"] },
  "Postfire Matched",
  false
);

/*
Example: Cloud masking Sentinel-2 imagery
*/

var cloudMasking = require("users/aazuspan/geeScripts:cloudMasking.js");

// Load a Sentinel-2 image (1C or 2A)
var s2 = ee.Image("COPERNICUS/S2/20190113T190741_20190113T190736_T10TEK");
// Load the corresponding cloud probability image
var prob = ee.Image(
  "COPERNICUS/S2_CLOUD_PROBABILITY/20190113T190741_20190113T190736_T10TEK"
);

var cloudMasked = cloudMasking.probabilityCloudMask(s2, prob);

Map.addLayer(s2, { bands: ["B4", "B3", "B2"], min: 0, max: 2000 }, "S2", false);
Map.addLayer(
  cloudMasked,
  { bands: ["B4", "B3", "B2"], min: 0, max: 2000 },
  "S2 masked",
  false
);
