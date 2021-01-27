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

// Generate a fire mask by combining fire masks from GOES16 and GOES17 over one time period.
// Optionally use a majority filter to smooth the boundary. Time delta in milliseconds. Note that different time deltas
// will affect the resulting fire perimeter as more observations will increase the likelihood of false positive pixels.
// If the time delta is smaller than the return interval for the imagery, redundant images with no change will be
// included.
exports.periodFireBoundary = function (
  time,
  region,
  smooth,
  smoothKernel,
  timeDelta
) {
  var goes16 = ee.ImageCollection("NOAA/GOES/16/FDCF");
  var goes17 = ee.ImageCollection("NOAA/GOES/17/FDCF");

  var date = ee.Date(time);

  // Generate boundaries from GOES16 and GOES17 separately
  var boundaries = ee.List([goes16, goes17]).map(function (collection) {
    var filtered = ee
      .ImageCollection(collection)
      .filterDate(date, date.advance(timeDelta / 1000, "seconds"))
      .filterBounds(region);

    // Remap mask to binary fire by selecting good quality fire pixels
    var fireQuality = filtered.select("DQF");
    // Select the median DQF value for each pixel over the day
    var medianQuality = fireQuality.reduce(ee.Reducer.median());
    // Select only high-quality fire pixels
    var fireMask = medianQuality.eq(0);

    return fireMask;
  });
  // Combine GOES16 and GOES17 into one image
  var combined = ee.ImageCollection(boundaries).reduce(ee.Reducer.max());

  if (smooth === true) {
    combined = combined.reduceNeighborhood({
      reducer: ee.Reducer.mode(),
      kernel: smoothKernel,
    });
  }

  // Mask and store the date as a property
  combined = combined
    .selfMask()
    .set({ date: ee.Date(time) })
    .rename("fire_mask");

  return combined;
};

// Add a binary mask to the last image in a collection of binary masks to get cumulative presence over a time series
var accumulateMask = function (next, list) {
  // Select the last image of the current collection
  var previous = ee.Image(ee.List(list).get(-1)).unmask();
  next = next.unmask();

  // Add the previous presence to the current presence
  var accumulated = next.add(previous).gt(0);
  accumulated = accumulated.selfMask();

  accumulated = accumulated.set({ date: next.get("date") });

  return ee.List(list).add(accumulated);
};

// Generate an ImageCollection of fire perimeters at a regular interval between a start and end date. If cumulative,
// images will be cumulative area burned between start date and current date. If not, images will be area burned in time
// period only.
exports.periodicFireBoundaries = function (
  start,
  end,
  region,
  smooth,
  smoothKernel,
  cumulative,
  timeDelta
) {
  smoothKernel = smoothKernel
    ? smoothKernel
    : ee.Kernel.circle(2000, "meters", true);

  // Default to using whole day intervals (milliseconds)
  var timeDelta = timeDelta ? timeDelta : 86400000;

  // Millisecond epoch time of each day in the time series
  var periodList = ee.List.sequence(
    ee.Date(start).millis(),
    ee.Date(end).millis(),
    timeDelta
  );

  var periodCollection = ee.ImageCollection.fromImages(
    periodList.map(function (time) {
      return exports.periodFireBoundary(
        time,
        region,
        smooth,
        smoothKernel,
        timeDelta
      );
    })
  );

  if (cumulative === true) {
    // Create a placeholder element
    var first = ee.List([ee.Image(0).rename("fire_mask").int()]);
    // Iteratively add all previous boundaries to each boundary to get cumulative area burned for each time period
    var cumulative = ee.List(periodCollection.iterate(accumulateMask, first));
    // Remove the first placeholder element
    cumulative = ee.ImageCollection(cumulative.slice(1));
    periodCollection = cumulative;
  }

  return periodCollection;
};

// Convert a binary fire boundary image to a polygon.
exports.vectorizeBoundary = function (
  img,
  scale,
  region,
  maxPixels,
  simplify,
  maxError
) {
  maxPixels = maxPixels ? maxPixels : 1e13;

  var poly = img.reduceToVectors({
    scale: scale,
    maxPixels: maxPixels,
    geometry: region,
  });

  if (simplify === true) {
    poly = ee.FeatureCollection(poly).map(function (feature) {
      return ee.Feature(feature).simplify(ee.Number(maxError));
    });
  }
  // Convert the FeatureCollection to a Feature
  poly = ee.Feature(poly.geometry());
  poly = poly.set({ date: img.get("date") });
  return poly;
};

// Convert an ImageCollection of binary Images to a FeatureCollection of polygons
exports.vectorizeBoundaryCollection = function (
  collection,
  scale,
  region,
  maxPixels,
  simplify,
  maxError
) {
  maxPixels = maxPixels ? maxPixels : 1e13;

  var collectionPoly = collection.map(function (img) {
    return exports.vectorizeBoundary(
      img,
      scale,
      region,
      maxPixels,
      simplify,
      maxError
    );
  });
  return ee.FeatureCollection(collectionPoly);
};
