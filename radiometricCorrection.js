/**
 * Apply band-wise radiometric correction to remote sensing imagery using the
 * dark object subtraction (DOS) method.
 * @param {ee.Image} img The image to apply correction to.
 * @param {ee.Feature | ee.FeatureCollection} obj The location or extent of
 *  the dark object within the image.
 * @param {ee.Number} scale The scale to calculate dark object statistics at.
 * @return {ee.Image} The radiometrically corrected image.
 */
exports.darkObjectSubtraction = function (img, obj, scale) {
  var offset = img.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: obj,
    scale: scale,
  });

  var offsetImg = offset.toImage(img.bandNames());

  var imgAdj = img.subtract(offsetImg);

  return imgAdj;
};

/**
 * Rescale the mean and standard deviation of a target image to match a
 * reference image. This can be used to apply pseudo-invariant feature (PIF)
 * normalization if an appropriate feature is passed as geometry.
 *
 * See Volchok and Schott, 1986 for a detailed description of PIF normalization.
 *
 * @param {ee.Image} targetImage An image to rescale.
 * @param {ee.Image} referenceImage An image to rescale towards.
 * @param {ee.Geometry} geometry The region to generate image statistics over.
 * @param {ee.Number} scale The scale to generate image statistics at.
 * @return {ee.Image} A rescaled version of targetImage.
 */
exports.linearHistogramMatch = function (
  targetImage,
  referenceImage,
  geometry,
  scale
) {
  var offsetTarget = exports.reduceImage(
    targetImage,
    ee.Reducer.mean(),
    geometry,
    scale
  );
  var offset = exports.reduceImage(
    referenceImage,
    ee.Reducer.mean(),
    geometry,
    scale
  );
  var rescale = exports
    .reduceImage(referenceImage, ee.Reducer.stdDev(), geometry, scale)
    .divide(
      exports.reduceImage(targetImage, ee.Reducer.stdDev(), geometry, scale)
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
 * @return {ee.Image} An image with the same number of bands as the input
 *  image, where each band is a constant value of the reduced value of the
 *  corresponding band of the input image.
 */
exports.reduceImage = function (img, reducer, geometry, scale, maxPixels) {
  if (exports.isMissing(geometry)) {
    geometry = img.geometry();
  }

  if (exports.isMissing(scale)) {
    scale = img.projection().nominalScale();
  }

  if (exports.isMissing(maxPixels)) {
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
