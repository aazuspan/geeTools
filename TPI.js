var utils = require("users/aazuspan/geeTools:utils.js");

// Calculate topographic position index based on a DEM image, following Weiss 2001.
// Radius, window_shape, and units define the TPI kernel, and are passed to ee.Image.focal_mean
exports.tpi = function (dem, optionalParameters) {
  // Default parameters
  var params = {
    radius: 300,
    windowShape: "circle",
    units: "meters",
  };

  params = utils.updateParameters(params, optionalParameters);

  dem = dem.double();
  var r = dem
    .subtract(dem.focal_mean(params.radius, params.windowShape, params.units))
    .add(0.5)
    .int()
    .rename("TPI");
  return r;
};

// Reclassify a continuous TPI image into slope positions, following Weiss 2001
exports.slopePosition = function (tpi, slope, region, optionalParameters) {
  var params = {
    flatDegrees: 5,
    scale: null,
    maxPixels: 1e12,
  };

  params = utils.updateParameters(params, optionalParameters);

  // Calculate the TPI standard deviation
  var sd = tpi
    .reduceRegion({
      reducer: ee.Reducer.stdDev(),
      geometry: region,
      scale: params.scale,
      maxPixels: params.maxPixels,
    })
    .getNumber(tpi.bandNames().get(0));

  // Reclassify TPI to slope position
  var tpiReclass = ee
    .Image(0)
    // Ridge
    .where(tpi.gt(sd), 1)
    // Upper slope
    .where(tpi.gt(sd.multiply(0.5)).and(tpi.lte(sd)), 2)
    // Middle slope
    .where(
      tpi
        .gt(sd.multiply(-0.5))
        .and(tpi.lt(sd.multiply(0.5)).and(slope.gt(params.flatDegrees))),
      3
    )
    // Flat slope
    .where(
      tpi
        .gte(sd.multiply(-0.5))
        .and(tpi.lte(sd.multiply(0.5)).and(slope.lte(params.flatDegrees))),
      4
    )
    // Lower slope
    .where(tpi.gte(sd.multiply(-1)).and(tpi.lt(sd.multiply(-0.5))), 5)
    // Valley
    .where(tpi.lt(sd.multiply(-1)), 6)
    .rename("slopePosition");

  return tpiReclass;
};
