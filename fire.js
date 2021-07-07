var utils = require("users/aazuspan/geeTools:utils.js");

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

/**
 * Generate a single image mask of active fire between a start and end time using GOES16 and GOES17 data.
 * @param {ee.Date} start The starting time.
 * @param {ee.Date} end The ending time.
 * @param {ee.Geometry} region The area to search for fire perimeters.
 * @param {boolean} smooth If true, a majority filter will be used to smooth the low-resolution pixels.
 * @param {ee.Kernel} smoothKernel If smoothing, the kernel used to perform the majority filter. If null, a 2000 meter
 * normalized circular kernel will be used.
 * @return {ee.Image} A binary mask where 1 is active fire within the time period.
 */
exports.periodFireBoundary = function (
  start,
  end,
  region,
  smooth,
  smoothKernel
) {
  smoothKernel = smoothKernel
    ? smoothKernel
    : ee.Kernel.circle(2000, "meters", true);

  start = ee.Date(start);
  end = ee.Date(end);

  var goes16 = ee.ImageCollection("NOAA/GOES/16/FDCF");
  var goes17 = ee.ImageCollection("NOAA/GOES/17/FDCF");

  // Generate boundaries from GOES16 and GOES17 separately
  var boundaries = ee.List([goes16, goes17]).map(function (collection) {
    var filtered = ee
      .ImageCollection(collection)
      .filterDate(start, end)
      .filterBounds(region);

    // Remap mask to binary fire by selecting good quality fire pixels
    var fireQuality = filtered.select("DQF");
    // Take the minimum DQF value where the minimum (0) represents good quality fire signal. This will cause false
    // positives for each data source, but these will be removed when data sources are combined. Other reducers have
    // unacceptably high false negative rates (eg. max) and/or are very sensitive to the timeDelta (eg. median or mode).
    var fireMask = fireQuality.reduce(ee.Reducer.min()).eq(0);

    return fireMask;
  });
  // Combine GOES16 and GOES17 into one image. Take the min to require
  // agreement between the data sources and minimize false positives.
  var combined = ee.ImageCollection(boundaries).reduce(ee.Reducer.min());

  if (smooth === true) {
    combined = combined.reduceNeighborhood({
      reducer: ee.Reducer.mode(),
      kernel: smoothKernel,
    });
  }

  // Mask and store the date as a property
  combined = combined.selfMask().rename("fire_mask");

  combined = setImageMetadata(combined, start, end);

  return combined;
};

/**
 * Add a binary mask to the last image in a list of binary masks. Used for iterating over an image collection.
 * @param {ee.Image} next A binary mask to accumulate with past masks.
 * @param {ee.List of ee.Image} list A list of past masks.
 * @return {ee.List of ee.Image} The input list with the next accumulated mask added.
 */
var accumulateMask = function (next, list) {
  // Select the last image of the current collection
  var previous = ee.Image(ee.List(list).get(-1)).unmask();
  next = next.unmask();

  // Add the previous presence to the current presence
  var accumulated = next.add(previous).gt(0);
  accumulated = accumulated.selfMask();

  // Because images are accumulated over the time series, they will all have the
  // same start date.
  var start = ee.Image(ee.List(list).get(0)).get("start_date");
  var end = next.get("end_date");

  accumulated = setImageMetadata(accumulated, start, end);

  return ee.List(list).add(accumulated);
};

/**
 * Set the title and date metadata for a fire mask image. Image titles use the
 * end date so that accumulated images have unique titles.
 * @param {ee.Image} img A binary fire mask.
 * @param {ee.Date} startDate The starting date for the fire mask.
 * @return {ee.Image} The binary fire mask with an ID and dates set.
 */
var setImageMetadata = function (img, startDate, endDate) {
  var dateString = ee.Date(endDate).format("yyyy_MM_dd_HH:mm:ss");
  var imgName = ee.String("FireMask/").cat(dateString);

  return img.set(
    "system:id",
    imgName,
    "start_date",
    startDate,
    "end_date",
    endDate
  );
};

/**
 * Generate a collection of image masks of active fire at a regular interval between a start and end time using GOES16
 * and GOES17 data. Masks can represent either instantaneous fire area within each interval or cumulative fire area
 * between the start time and the current interval.
 * @param {ee.Date} start The starting time.
 * @param {ee.Date} end The ending time.
 * @param {ee.Geometry} region The area to search for fire perimeters.
 * @param {boolean} smooth If true, a majority filter will be used to smooth the low-resolution pixels.
 * @param {ee.Kernel} smoothKernel If smoothing, the kernel used to perform the majority filter. If null, a 2000 meter
 * normalized circular kernel will be used.
 * @param {boolean} cumulative If true, each mask in the collection will represent cumulative area burned since the
 * start time. If false, each mask in the collection will represent only the area burned within that time period.
 * @param {number} timeDelta The length of each interval, in hours, to generate fire boundaries for.
 * @return {ee.ImageCollection} A collection of binary masks where 1 is active fire or cumulative area burned within
 * each time period.
 */
exports.periodicFireBoundaries = function (
  start,
  end,
  region,
  optionalParameters
) {
  // Default parameters
  var params = {
    smooth: false,
    smoothKernel: ee.Kernel.circle(2000, "meters", true),
    timeDelta: 24,
    cumulative: false,
  };

  // Swap default parameters for user-defined parameters
  params = utils.updateParameters(params, optionalParameters);

  // Convert time delta in hours to milliseconds
  var msDelta = params.timeDelta * 3.6e6;

  // Millisecond epoch time of each day in the time series
  var periodList = ee.List.sequence(
    ee.Date(start).millis(),
    ee.Date(end).millis(),
    msDelta
  );

  var periodCollection = ee.ImageCollection.fromImages(
    periodList.map(function (time) {
      var start = time;
      var end = ee.Date(time).advance(params.timeDelta, "hours");

      return exports.periodFireBoundary(
        start,
        end,
        region,
        params.smooth,
        params.smoothKernel,
        params.timeDelta
      );
    })
  );

  if (params.cumulative === true) {
    // Create a placeholder element
    var first = ee.List([
      ee
        .Image(0)
        .rename("fire_mask")
        .int()
        // Store the start date since it will be used for all accumulated images.
        .set("start_date", ee.Date(start)),
    ]);

    // Iteratively add all previous boundaries to each boundary to get cumulative area burned for each time period
    var cumulativeBoundary = ee.List(
      periodCollection.iterate(accumulateMask, first)
    );
    // Remove the first placeholder element
    cumulativeBoundary = ee.ImageCollection(cumulativeBoundary.slice(1));
    periodCollection = cumulativeBoundary;
  }

  var dateString = ee.Date(end).format("yyyy_MM_dd_HH:mm:ss");
  var collectionName = ee.String("FireMaskCollection/").cat(dateString);

  periodCollection = periodCollection.set(
    "system:id",
    collectionName,
    "start_date",
    start,
    "end_date",
    end,
    "cumulative",
    params.cumulative,
    "smoothed",
    params.smooth,
    "region",
    region,
    "time_delta",
    params.timeDelta
  );

  return periodCollection;
};

/**
 * Convert a binary mask image into a Feature Collection. The date field from the image will be transferred to the
 * features.
 * @param {ee.Image} img A binary mask to convert into polygons.
 * @param {number} scale The desired pixel size, in meters, of the input image.
 * @param {ee.Geometry} region The area to containing the image to generate polygons from.
 * @param {number, default 1e13} maxPixels The maximum number of pixels to sample when converting the image to vector.
 * @param {boolean, default false} simplify If true, ee.Geometry.simplify() will be run on the vectorized boundary to
 * remove stairstepping.
 * @param {number} maxError If simplifying, the maximum error introduced by simplification, in meters. Higher values
 * will lead to greater simplification.
 * @return {ee.FeatureCollection} A collection of polygons representing the binary mask.
 */
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
  poly = poly.set({ start_date: img.get("start_date"), end_date: img.get("end_date") });
  return poly;
};

/**
 * Convert a collection of binary mask images into a Feature Collection. The date field from the image will be
 * transferred from each image to each corresponding feature.
 * @param {ee.ImageCollection} collection A collection of binary masks to convert into polygons.
 * @param {number} scale The desired pixel size, in meters, of the input image.
 * @param {ee.Geometry} region The area to containing the images to generate polygons from.
 * @param {number, default 1e13} maxPixels The maximum number of pixels to sample when converting the images to vectors.
 * @param {boolean, default false} simplify If true, ee.Geometry.simplify() will be run on the vectorized boundaries to
 * remove stairstepping.
 * @param {number} maxError If simplifying, the maximum error introduced by simplification, in meters. Higher values
 * will lead to greater simplification.
 * @return {ee.FeatureCollection} A collection of polygons representing the binary masks.
 */
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
