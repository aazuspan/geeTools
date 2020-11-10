/**
 * Calculate various burn severity metrics between pre- and post-fire imagery.
 * @param {ee.Image} pre A multispectral prefire image.
 * @param {ee.Image} post A multispectral postfire image.
 * @param {string} NIR The name of the NIR band in both images.
 * @param {string} SWIR The name of the SWIR band in both images.
 * @return {ee.Image} A multiband image containing pre- and post-fire NBR,
 *  dNBR, RdNBR, estimated basal area mortality, and refugia status as bands.
 */
exports.calculateBurnSeverity = function (pre, post, NIR, SWIR) {
  // Normalized burn ratio
  var preNBR = pre
    .normalizedDifference([NIR, SWIR])
    .multiply(1000)
    .rename("preNBR");
  var postNBR = post
    .normalizedDifference([NIR, SWIR])
    .multiply(1000)
    .rename("postNBR");

  // Delta normalized burn ratio
  var dNBR = preNBR.subtract(postNBR).rename("dNBR");

  // Relativized dNBR, Miller & Thode 2007
  var RdNBR = dNBR.divide(preNBR.divide(1000).abs().sqrt()).rename("RdNBR");

  // Basal area mortality regression equation, Reilly et. al. 2017
  var basalMortality = RdNBR.multiply(1135360)
    .add(-119487011)
    .sqrt()
    .multiply(0.00003938)
    .add(-0.22845617)
    .rename("percentMortality");

  // Refugia are areas with < 10% basal area mortality, Meigs & Krawchuck 2018
  var refugia = ee.Image(1).where(basalMortality.gt(0.1), 0).rename("refugia");

  var severityMetrics = preNBR
    .addBands(postNBR)
    .addBands(dNBR)
    .addBands(RdNBR)
    .addBands(basalMortality)
    .addBands(refugia);

  return severityMetrics;
};

/*
Example: Calculating burn severity metrics for the 2017 Oak Fire
*/

// L8 imagery prior to the fire
var prefire = ee.Image("LANDSAT/LC08/C01/T1_TOA/LC08_046031_20170628");
// L8 imagery one year after the fire
var postfire = ee.Image("LANDSAT/LC08/C01/T1_TOA/LC08_046031_20180701");

var severity = exports.calculateBurnSeverity(prefire, postfire, "B5", "B6");

Map.addLayer(
  severity,
  { min: -250, max: 600, bands: ["preNBR", "postNBR", "postNBR"] },
  "severity"
);
