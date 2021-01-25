// Generate a binary cloud mask from a cloud probability image
exports.generateCloudMask = function (probability, probabilityThreshold) {
  return probability.gt(probabilityThreshold);
};

// Generate a binary shadow mask from a cloud mask of an image by looking for dark pixels near clouds.
exports.generateShadowMask = function (
  img,
  cloudMask,
  shadowNIR,
  shadowDist,
  solarAzimuth,
  scale
) {
  // Identify potential shadows
  var darkMask = img.select("B8").lt(shadowNIR);

  // If no azimuth is provided, try to pull it from the image properties
  solarAzimuth = solarAzimuth
    ? solarAzimuth
    : ee.Number(img.get("MEAN_SOLAR_AZIMUTH_ANGLE"));

  var shadowAz = ee.Number(90).subtract(solarAzimuth);

  // Get the potential location of shadows based on cloud location
  var shadowProj = cloudMask
    .directionalDistanceTransform(shadowAz, shadowDist * 10)
    .reproject({ crs: img.select(0).projection(), scale: scale })
    .select("distance")
    .mask();

  return shadowProj.multiply(darkMask);
};

// Apply morphological closing to remove small groups of pixels in a binary mask
exports.cleanMask = function (mask, bufferDist, scale) {
  var cleaned = mask.focal_max((2 * bufferDist) / scale).focal_min(2);

  return cleaned;
};

// Mask clouds and shadows in Sentinel-2 imagery using a cloud probability image.
exports.probabilityCloudMask = function (
  img,
  probability,
  probabilityThreshold,
  bufferDist,
  scale,
  maskShadow,
  shadowNIR,
  shadowDist
) {
  probabilityThreshold = probabilityThreshold ? probabilityThreshold : 30;
  bufferDist = bufferDist ? bufferDist : 15;
  scale = scale ? scale : img.select(0).projection().nominalScale();
  maskShadow = maskShadow ? maskShadow : false;
  shadowNIR = shadowNIR ? shadowNIR : 1000;
  shadowDist = shadowDist ? shadowDist : 10;

  var cloudMask = exports.generateCloudMask(probability, probabilityThreshold);

  var shadowMask = exports.generateShadowMask(
    img,
    cloudMask,
    shadowNIR,
    shadowDist,
    scale
  );

  var cloudAndShadowMask = cloudMask.add(shadowMask).gt(0);

  if (maskShadow) {
    var mask = cloudAndShadowMask.eq(0);
  } else {
    mask = cloudMask.eq(0);
  }

  mask = exports.cleanMask(mask, bufferDist, scale);

  return img.mask(mask);
};

// A fast implementation of cloud masking that uses a simple binary cloud mask, such as the
// QA60 band in Sentinel-2 imagery to mask clouds.
exports.simpleCloudMask = function (img, maskBand) {
  maskBand = maskBand ? maskBand : "QA60";

  if (!img.bandNames().contains(maskBand).getInfo()) {
    throw 'Image does not contain a band called "' + maskBand + '".';
  }

  var cloudMask = img.select(maskBand).eq(0);

  return img.mask(cloudMask);
};
