var utils = require("users/aazuspan/geeTools:utils.js");

/**
 * Calculate McCune and Keon 2002 Heat Load Index (HLI) with corrected coefficients from McCune 2007. This
 * implementation follows the R spatialEco library with the addition of per-pixel latitude calculation.
 * @param {ee.Image} x An elevation image.
 * @param {object} optionalParamters A dictionary of parameters to use in place of default parameters.
 * @param {number} optionalParameters.forceLatitude A fixed latitude in degrees to use in HLI calculations. If missing,
 * latitudes will be calculated per-pixel.
 * @param {string} optionalParameters.forceHemisphere A fixed hemisphere to use in HLI calculations. One of "north" or
 * "south". If missing, the hemisphere will be calculated per-pixel based on latitude.
 * @return {ee.Image} The McCune and Keon 2002 Heat Load Index.
 */
exports.hli = function (x, optionalParameters) {
  var params = {
    forceLatitude: null,
    forceHemisphere: null,
  };

  params = utils.updateParameters(params, optionalParameters);

  // If a latitude is forced, use the fixed latitude
  if (params.forceLatitude) {
    try {
      var lat = ee.Image.constant(ee.Number(params.forceLatitude));
    } catch (err) {
      throw (
        'Invalid forceLatitude argument "' +
        params.forceLatitude +
        '". Argument must be a number or missing.'
      );
    }
  }
  // Otherwise, use per-pixel latitudes
  else {
    lat = ee.Image.pixelLonLat().select("latitude");
  }
  lat = utils.deg2rad(lat);

  // If a hemisphere is forced, set the aspect folding coefficient based on the hemisphere
  if (params.forceHemisphere) {
    var foldCoeffs = { north: 225, south: 315 };
    try {
      var foldCoeff = ee.Image.constant(
        foldCoeffs[params.forceHemisphere.toLowerCase()]
      );
    } catch (err) {
      throw (
        'Invalid forceHemisphere argument "' +
        params.forceHemisphere +
        '". Argument must be "north", "south", or missing.'
      );
    }
  }
  // Otherwise, set the aspect folding coefficient based on latitude (N = 225, S = 315)
  else {
    foldCoeff = ee.Image(225).where(lat.lt(0), 315);
  }

  var slope = utils.deg2rad(ee.Terrain.slope(x));
  // Folded aspect
  var aspect = utils.deg2rad(
    ee.Terrain.aspect(x).subtract(foldCoeff).abs().multiply(-1).add(180).abs()
  );

  // Equation from McCune 2002 with corrected coefficients from McCune 2007
  var x1 = slope.cos().multiply(lat.cos()).multiply(1.582);
  var x2 = slope
    .sin()
    .multiply(lat.sin())
    .multiply(aspect.cos())
    .multiply(-1.5);
  var x3 = slope.sin().multiply(lat.sin()).multiply(-0.262);
  var x4 = slope.sin().multiply(aspect.sin()).multiply(0.607);

  var h = x1.add(x2).add(x3).add(x4).add(-1.467).exp().rename("HLI");

  return h;
};
