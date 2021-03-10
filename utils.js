/**
 * Convert degrees to radians.
 * @param {ee.Number or ee.Image} deg An angle in degrees
 * @return {ee.Number or ee.Image} The angle in radians
 */
exports.deg2rad = function (deg) {
  var coeff = 180 / Math.PI;

  return deg.divide(coeff);
};

/**
 * Check if an object has a value. Helpful for finding missing arguments.
 * @param {object} x Any object
 * @return {boolean} True if the object is missing, false if it is not.
 */
exports.isMissing = function (x) {
  if (x === undefined || x === null) {
    return true;
  }
  return false;
};

/**
 * Check if an argument matches a list of choices. Return the argument if so,
 * throw an error if not.
 * @param {Object} arg An argument or arguments to test against choices.
 * @param {array} choices An array of choices that arg is allowed to take.
 * @param {bool, default false} allowSeveral If true, all args will be checked
 * against choices and each must be valid. If false, arg must be a single
 * object that is in choices.
 * @return {Object} If arg was in choices, arg will be returned. If not, an
 * error will be thrown.
 */
exports.matchArg = function (arg, choices, allowSeveral) {
  allowSeveral = allowSeveral | false;

  if (!Array.isArray(arg)) {
    if (exports.itemInList(arg, choices)) {
      return arg;
    }
  } else if (allowSeveral === 1) {
    if (
      arg.every(function (item) {
        return exports.itemInList(item, choices);
      })
    ) {
      return arg;
    }
  }

  throw 'Argument "' + arg + '" must be in "' + choices + '"';
};

/**
 * Check if an item is in a list.
 * @param {Object} item
 * @param {array} list
 * @return {bool} True if item is in list. False if not.
 */
exports.itemInList = function (item, list) {
  if (list.indexOf(item) >= 0) {
    return true;
  }
  return false;
};

/**
 * Swap given parameters into a dictionary of default parameters. Given parameters can be null or false and will still
 * be swapped. Given parameters not included in the default set will be added, but I'm not sure why you'd want to do
 * that.
 * @param {Object} def A dictionary of default parameters.
 * @param {Object} given A dictionary of given parameters to substitue for defaults.
 * @return {Object} The default dictionary with values from the given dictionary.
 */
exports.updateParameters = function (def, given) {
  if (given) {
    for (var prop in given) {
      def[prop] = given[prop];
    }
  }
  return def;
};

/**
 * Combine a list of images into a single multi-band image. This is a convenience function over repeatedly calling
 * addBands for each image you want to combine.
 * @param {ee.List} imgList A list of images to combine. Images can be single or multiband.
 * @param {Object} [optionalParameters] A dictionary of optional parameters to override defaults.
 * @param {boolean, default true} [optionalParameters.prefix] If true, all band names will be prefixed with the list
 * index of the image it came from. This allows combining images with identical band names. If false, original band
 * names will be kept. If there are duplicate band names, an error will be thrown.
 * @param {ee.Dictionary, default null} [optionalParameters.props] Properties to store in the combined image. If null,
 * properties will be taken from the first image in imgList and the result will be identical to using addBands.
 * @return {ee.Image} An image with the bands of all images in imgList
 */
exports.combineImages = function (imgList, optionalParameters) {
  var first = ee.Image(ee.List(imgList).get(0));

  // Default parameters
  var params = {
    prefix: true,
    props: first.toDictionary(first.propertyNames()),
  };

  params = exports.updateParameters(params, optionalParameters);

  // Convert the list to a collection and collapse the collection into a multiband image.
  // Rename bands to match original band names.
  var combined = ee.ImageCollection
    // Convert the image list to a collection
    .fromImages(imgList)
    // Convert the collection to a multiband image
    .toBands()
    // Store properties
    .set(params.props);

  if (params.prefix === false) {
    // Grab a 1D list of original band names
    var bandNames = ee
      .List(
        imgList.map(function (img) {
          return img.bandNames();
        })
      )
      .flatten();
    combined = combined.rename(bandNames);
  }

  return combined;
};

/**
 * Perform band-wise normalization on an image to convert values to range 0 - 1.
 * @param {ee.Image} img An image.
 * @param {object} [optionalParameters] A dictionary of optional parameters to override defaults.
 * @param {number} [optionalParameters.scale] The scale, in image units, to calculate image statistics at.
 * @param {ee.Geometry} [optionalParameters.region] The area to calculate image statistics over.
 * @param {number, default 1e13} [optionalParameters.maxPixels] The maximum number of pixels to sample when calculating
 * image statistics.
 * @return {ee.Image} The input image with all bands rescaled between 0 and 1.
 */
exports.normalizeImage = function (img, optionalParameters) {
  var params = {
    region: null,
    scale: null,
    maxPixels: 1e13,
  };

  params = exports.updateParameters(params, optionalParameters);

  var min = img
    .reduceRegion({
      reducer: ee.Reducer.min(),
      geometry: params.region,
      scale: params.scale,
      maxPixels: params.maxPixels,
    })
    .toImage(img.bandNames());

  var max = img
    .reduceRegion({
      reducer: ee.Reducer.max(),
      geometry: params.region,
      scale: params.scale,
      maxPixels: params.maxPixels,
    })
    .toImage(img.bandNames());

  return img.subtract(min).divide(max.subtract(min));
};
