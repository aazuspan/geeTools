/**
 * Calculate relative humidity percentage following Bolton 1980.
 * https://archive.eol.ucar.edu/projects/ceop/dm/documents/refdata_report/eqns.html
 * @param {ee.Image} q Specific humidity, unitless.
 * @param {ee.Image} p Pressure in Pa.
 * @param {ee.Image} t Temperature in C.
 * @returns {ee.Image} Relative humidity, values between 0 and 100.
 */
exports.relativeHumidity = function (q, p, t) {
  var es = t.multiply(17.67).divide(t.add(243.5)).exp().multiply(6.112);
  var e = q.multiply(p).divide(q.multiply(0.378).add(0.622));

  var RH = e.divide(es).rename("RH");

  // Clamp RH values between 0 and 100
  RH = RH.where(RH.lt(0), 0).where(RH.gt(100), 100);

  return RH;
};
