var utils = require("users/aazuspan/geeTools:utils.js");

/**
 * Apply band-wise radiometric correction to remote sensing imagery using the
 * dark object subtraction (DOS) method.
 * @param {ee.Image} img The image to apply correction to.
 * @param {ee.Feature | ee.FeatureCollection} obj The location or extent of
 *  the dark object within the image.
 * @param {ee.Number} scale The scale to calculate dark object statistics at.
 * @param {ee.Number} maxPixels Maximum number of pixels used to calculate
 *  statistics.
 * @return {ee.Image} The radiometrically corrected image.
 */
exports.darkObjectSubtraction = function (img, obj, scale, maxPixels) {
  var offset = exports.reduceImage(
    img,
    ee.Reducer.mean(),
    obj,
    scale,
    maxPixels
  );

  var imgAdj = img.subtract(offset);

  return imgAdj;
};

/**
 * Rescale the mean and standard deviation of a target image to match a
 * reference image. This can be used to implement pseudo-invariant feature
 * (PIF) normalization if an appropriate geometry is passed.
 * @param {ee.Image} targetImage An image to rescale.
 * @param {ee.Image} referenceImage An image to rescale towards.
 * @param {ee.Geometry} geometry The region to generate image statistics over.
 * @param {ee.Number} scale The scale to generate image statistics at.
 * @param {ee.Number} maxPixels Maximum number of pixels used to calculate
 *  statistics.
 * @return {ee.Image} A rescaled version of targetImage.
 */
exports.linearHistogramMatch = function (
  targetImage,
  referenceImage,
  geometry,
  scale,
  maxPixels
) {
  var offsetTarget = exports.reduceImage(
    targetImage,
    ee.Reducer.mean(),
    geometry,
    scale,
    maxPixels
  );
  var offset = exports.reduceImage(
    referenceImage,
    ee.Reducer.mean(),
    geometry,
    scale,
    maxPixels
  );
  var rescale = exports
    .reduceImage(
      referenceImage,
      ee.Reducer.stdDev(),
      geometry,
      scale,
      maxPixels
    )
    .divide(
      exports.reduceImage(
        targetImage,
        ee.Reducer.stdDev(),
        geometry,
        scale,
        maxPixels
      )
    );

  var rescaledTarget = targetImage
    .subtract(offsetTarget)
    .multiply(rescale)
    .add(offset);
  return rescaledTarget;
};

/**
 * Create a constant image where each band represents the reduced value of the
 * corresponding band of the input image.
 * @param {ee.Image} img The input image to calculate reduced values for.
 * @param {ee.Reducer} reducer The reducer to apply to the image, such as
 *  ee.Reducer.min()
 * @param {ee.Geometry} geometry The region to generate image statistics over.
 *  Defaults to the geometry of the input image.
 * @param {ee.Number} scale The scale to generate image statistics at. Defaults
 *  to the nominal scale of the input image.
 * @param {ee.Number} maxPixels Maximum number of pixels used to calculate
 *  statistics.
 * @return {ee.Image} An image with the same number of bands as the input
 *  image, where each band is a constant value of the reduced value of the
 *  corresponding band of the input image.
 */
exports.reduceImage = function (img, reducer, geometry, scale, maxPixels) {
  if (utils.isMissing(geometry)) {
    geometry = img.geometry();
  }

  if (utils.isMissing(scale)) {
    scale = img.projection().nominalScale();
  }

  if (utils.isMissing(maxPixels)) {
    maxPixels = 1e12;
  }

  // Calculate the reduced image value(s)
  var imgReducedVal = img.reduceRegion({
    reducer: reducer,
    geometry: geometry,
    scale: scale,
    maxPixels: maxPixels,
  });

  var imgReduced = imgReducedVal.toImage(img.bandNames());
  return imgReduced;
};
