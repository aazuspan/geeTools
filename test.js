var should = require("users/aazuspan/should:test");
var climateTools = require("users/aazuspan/geeTools:climate.js");


should.equal(climateTools.hotDryWindyIndex(ee.Number(10), ee.Number(10)), 100, "Calculate HDWI");
should.equal(climateTools.windVelocity(ee.Number(-3), ee.Number(4)), 5, "Calculate wind velocity");

// should-test needs an almost equal test. Until then, we'll just round the result to the nearest int.
should.equal(climateTools.vaporPressureDeficit(ee.Number(27), ee.Number(18)).round(), 3, "Calculate VPD");
should.equal(climateTools.relativeHumidity(ee.Number(0.0127), ee.Number(90000), ee.Number(25)).round(), 58, "Calculate RH");