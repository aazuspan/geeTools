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
