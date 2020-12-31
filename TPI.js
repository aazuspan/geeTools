var utils = require("users/aazuspan/geeScripts:utils.js");

// Calculate topographic position index based on a DEM image, following Weiss 2001.
// Radius, window_shape, and units define the TPI kernel, and are passed to ee.Image.focal_mean
exports.tpi = function (dem, radius, window_shape, units) {
  dem = dem.double();
  var r = dem
    .subtract(dem.focal_mean(radius, window_shape, units))
    .add(0.5)
    .int();
  return r;
};

// Reclassify a continuous TPI image into slope positions, following Weiss 2001
exports.slopePosition = function (
  tpi,
  slope,
  flat_degrees,
  region,
  scale,
  maxPixels
) {
  // Default "flat" is 5 degrees
  flat_degrees = flat_degrees || 5;

  if (utils.isMissing(maxPixels)) {
    maxPixels = 1e12;
  }

  // Calculate the TPI standard deviation
  var sd = tpi
    .reduceRegion({
      reducer: ee.Reducer.stdDev(),
      geometry: region,
      scale: scale,
      maxPixels: maxPixels,
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
        .and(tpi.lt(sd.multiply(0.5)).and(slope.gt(flat_degrees))),
      3
    )
    // Flat slope
    .where(
      tpi
        .gte(sd.multiply(-0.5))
        .and(tpi.lte(sd.multiply(0.5)).and(slope.lte(flat_degrees))),
      4
    )
    // Lower slope
    .where(tpi.gte(sd.multiply(-1)).and(tpi.lt(sd.multiply(-0.5))), 5)
    // Valley
    .where(tpi.lt(sd.multiply(-1)), 6);

  return tpiReclass;
};
