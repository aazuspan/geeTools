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
