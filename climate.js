/**
 * Calculate relative humidity percentage following Bolton 1980.
 * @see {@link https://archive.eol.ucar.edu/projects/ceop/dm/documents/refdata_report/eqns.html}
 * @param {ee.Image} q - Specific humidity, unitless.
 * @param {ee.Image} p - Pressure in Pa.
 * @param {ee.Image} t - Temperature in C.
 * @returns {ee.Image} Relative humidity, values between 0 and 100.
 */
exports.relativeHumidity = function (q, p, t) {
  var es = t.multiply(17.67).divide(t.add(243.5)).exp().multiply(6.112);
  var e = q.multiply(p).divide(q.multiply(0.378).add(0.622));

  var RH = e.divide(es).rename("RH").clamp(0, 100);
  return RH;
};


/** Calculate vapor pressure deficit
 * @param {ee.Image} t - Air temperature.
 * @param {ee.Image} rh - Relative humidity.
 * @returns {ee.Image} Vapor pressure deficit.
 */
exports.vaporPressureDeficit = function(t, rh) {
  return t.multiply(17.27).divide(t.add(237.3)).exp()
    .multiply(0.6108)
    .multiply(rh.divide(-100).add(1));
}

/**
 * Calculate wind velocity from vector components.
 * @param {ee.Image} u - The U component of wind.
 * @param {ee.Image} v - The V component of wind.
 * @returns {ee.Image} The wind velocity.
 */
exports.windVelocity = function(u, v) {
  return u.pow(2).add(v.pow(2)).sqrt();
}


/**
 * Calculate hot-dry-windy index, Srock et al., 2018
 * @see {@link https://www.mdpi.com/2073-4433/9/7/279}
 * @param {ee.Image} vpd - Vapor-pressure deficit
 * @param {ee.Image} wind - Max wind speed.
 * @return {ee.Image} Hot-dry-windy index.
 */
exports.hotDryWindyIndex = function(vpd, wind) {
  return vpd.multiply(wind).rename("HDWI");
}