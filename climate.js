/**
 * Calculate relative humidity percentage following Bolton 1980.
 * @see {@link https://archive.eol.ucar.edu/projects/ceop/dm/documents/refdata_report/eqns.html}
 * @param {ee.Image | ee.Number} q - Specific humidity, unitless.
 * @param {ee.Image | ee.Number} p - Pressure in Pa.
 * @param {ee.Image | ee.Number} t - Temperature in C.
 * @returns {ee.Image | ee.Number} Relative humidity, values between 0 and 100.
 */
exports.relativeHumidity = function (q, p, t) {
  var es = t.multiply(17.67).divide(t.add(243.5)).exp().multiply(6.112);
  var e = q.multiply(p).divide(q.multiply(0.378).add(0.622));

  var RH = e.divide(es).clamp(0, 100);
  
  if (RH instanceof ee.Image) {
    RH = RH.rename("RH");
  }
  
  return RH;
};


/** Calculate vapor pressure deficit
 * @param {ee.Image | ee.Number} t - Air temperature.
 * @param {ee.Image | ee.Number} rh - Relative humidity.
 * @returns {ee.Image | ee.Number} Vapor pressure deficit.
 */
exports.vaporPressureDeficit = function(t, rh) {
  var vpd = t.multiply(17.27).divide(t.add(237.3)).exp()
    .multiply(0.6108)
    .multiply(rh.divide(-100).add(1));
  
  if (vpd instanceof ee.Image) {
    vpd = vpd.rename("VPD");
  }
  
  return vpd;
}

/**
 * Calculate wind velocity from vector components.
 * @param {ee.Image | ee.Number} u - The U component of wind.
 * @param {ee.Image | ee.Number} v - The V component of wind.
 * @returns {ee.Image | ee.Number} The wind velocity.
 */
exports.windVelocity = function(u, v) {
  var wind = u.pow(2).add(v.pow(2)).sqrt();
  
  if (wind instanceof ee.Image) {
    wind = wind.rename("WIND");
  }
  
  return wind;
}


/**
 * Calculate hot-dry-windy index, Srock et al., 2018
 * @see {@link https://www.mdpi.com/2073-4433/9/7/279}
 * @param {ee.Image | ee.Number} vpd - Vapor-pressure deficit
 * @param {ee.Image | ee.Number} wind - Max wind speed.
 * @return {ee.Image | ee.Number} Hot-dry-windy index.
 */
exports.hotDryWindyIndex = function(vpd, wind) {
  var hdwi = vpd.multiply(wind);
  
  if (hdwi instanceof ee.Image) {
    hdwi = hdwi.rename("HDWI");
  }
  
  return hdwi;
}