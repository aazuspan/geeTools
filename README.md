# geeTools

Remote sensing and spatial analysis tools for Google Earth Engine.

![Fire Perimeter example](https://i.imgur.com/yzDB6Ii.gif)

## Table of Contents

- [Usage](https://github.com/aazuspan/geeTools#Usage)
- [Examples](https://github.com/aazuspan/geeTools#Examples)
  - [Burn Severity](https://github.com/aazuspan/geeTools#Burn-Severity)
  - [Fire Perimeter Detection](https://github.com/aazuspan/geeTools#Fire-Perimeter-Detection)
  - [Cloud Probability Masking](https://github.com/aazuspan/geeTools#Cloud-Probability-Masking)
  - [Heat Load Index](https://github.com/aazuspan/geeTools#Heat-Load-Index)
  - [Slope Position](https://github.com/aazuspan/geeTools#Slope-Position)
  - [Dark Object Subtraction](https://github.com/aazuspan/geeTools#Dark-Object-Subtraction)
- [References](https://github.com/aazuspan/geeTools#References)

## Usage

To import a module, include the following code in your GEE script:

```javascript
var foo = require("users/aazuspan/geeTools:{module name}");
foo.bar();
```

For example:

```javascript
var fire = require("users/aazuspan/geeTools:fire.js")
fire.calculateBurnSeverity( ... );
```

## Examples

### Burn Severity

Calculate pre- and post-fire NBR, dNBR (Key & Benson, 2005), RdNBR (Miller & Thode, 2007), and basal area mortality (Reilly et. al., 2017) using prefire and postfire imagery.

```javascript
var fire = require("users/aazuspan/geeTools:fire.js");

// L8 imagery prior to the fire
var prefire = ee.Image("LANDSAT/LC08/C01/T1_TOA/LC08_046031_20170628");
// L8 imagery one year after the fire
var postfire = ee.Image("LANDSAT/LC08/C01/T1_TOA/LC08_046031_20180701");

// Specify relevant band labels for imagery
var nir = "B5";
var swir = "B6";

// Calculate various burn severity metrics
var severity = fire.calculateBurnSeverity(prefire, postfire, nir, swir);
```

![Burn Severity example](https://i.imgur.com/wEaOgaQ.png)

### Fire Perimeter Detection

Map active burning area or cumulative area burned at customizable time intervals over a time period, such as area burned every 6 hours over 10 days. This implementation uses GOES-16 and GOES-17 imagery, so fire dates are restricted based on availability of that data.

```javascript
var fire = require("users/aazuspan/geeTools:fire.js");

// Set the date range
var start = "2020-09-05";
var end = "2020-09-15";

// Apply a majority filter to smooth the GOES data
var smooth = true;
// Use the default kernel (or pass any ee.Kernel)
var smoothKernel = null;
// Generate cumulative area burned since start rather than instantaneous area burned.
var cumulative = true;
// Set the time interval in hours
var timeDelta = 6;

// Generate an image collection showing cumulative area burned since the start at each time interval
var burnedAreaImg = fire.periodicFireBoundaries(
  start,
  end,
  aoi,
  smooth,
  smoothKernel,
  cumulative,
  timeDelta
);

// Desired pixel size in meters
var scale = 500;
var maxPixels = 1e12;
// Simplify the polygon perimeter to remove stairstep effect and reduce size
var simplify = true;
// Max error, in meters, for simplifcation. Higher error will increase the level of simplification
var maxError = 500;

// Convert the image collection into vector fire perimeters
var burnedAreaPoly = fire.vectorizeBoundaryCollection(
  collection,
  scale,
  aoi,
  maxPixels,
  simplify,
  maxError
);
```

![Fire perimeter example](https://i.imgur.com/HtAJPle.gif)

### Cloud Probability Masking

Use cloud probability data to mask clouds in imagery.

```javascript
var cloudMasking = require("users/aazuspan/geeTools:cloudMasking.js");

// Load a Sentinel-2 image (1C or 2A)
var s2 = ee.Image("COPERNICUS/S2/20190113T190741_20190113T190736_T10TEK");
// Load the corresponding cloud probability image
var prob = ee.Image(
  "COPERNICUS/S2_CLOUD_PROBABILITY/20190113T190741_20190113T190736_T10TEK"
);

// Mask clouds in the original image
var cloudMasked = cloudMasking.probabilityCloudMask(s2, prob);
```

![Cloud masking example](https://i.imgur.com/P4oyNTH.png)

### Heat Load Index

Calculate Heat Load Index (HLI) from elevation (McCune, 2007).

```javascript
var hli = require("users/aazuspan/geeTools:HLI.js");

// Load elevation data
var srtm = ee.Image("CGIAR/SRTM90_V4");

// Generate HLI data
var h = hli.hli(srtm);
```

![Heat Load Index example](https://i.imgur.com/nIe6Jcb.png)

### Slope Position

Calculate TPI and slope position from elevation (Weiss, 2001).

```javascript
var tpi = require("users/aazuspan/geeTools:TPI.js");

// Load elevation data
var srtm = ee.Image("CGIAR/SRTM90_V4");

// Define an area of interest
var aoi = ee.Geometry.Polygon(
  [
    [
      [-123.92382561385939, 42.39507820959633],
      [-123.92382561385939, 41.57642883612384],
      [-122.83343254745314, 41.57642883612384],
      [-122.83343254745314, 42.39507820959633],
    ],
  ],
  null,
  false
);

// Calculate slope in degrees
var slope = ee.Terrain.slope(srtm);

// Set TPI window parameters. These have a significant impact on output results.
var radius = 300;
var shape = "square";
var units = "meters";

// Calculate a TPI image
var tpi300 = tpi.tpi(srtm, radius, shape, units);

// Use the default "flat" definition of 5 degrees
var flat = null;
// Set the output pixel size in meters
var scale = 100;

// Reclassify TPI to discrete slope positions
var slopePosition300 = tpi.slopePosition(tpi300, slope, flat, aoi, scale);
```

![Slope Position example](https://i.imgur.com/v7ZqBfR.png)

### Dark Object Subtraction

Use dark object subtraction (DOS) to perform radiometric normalization and atmospheric correction.

```javascript
var radCor = require("users/aazuspan/geeTools:radiometricCorrection.js");

// Identify a reference dark object, such as deep water
var darkObject = ee.Geometry.Polygon(
  [
    [
      [-124.74266276966597, 42.12268590007055],
      [-124.74266276966597, 41.93396768286303],
      [-124.52705608021284, 41.93396768286303],
      [-124.52705608021284, 42.12268590007055],
    ],
  ],
  null,
  false
);

// Load any image
var img = ee.Image("LANDSAT/LC08/C01/T1_TOA/LC08_046031_20170628");

// Pixel size in meters
var scale = 30;
var maxPixels = 1e13;

// Use Dark Object Subtraction to correct for atmospheric distortion
var imgDOS = radCor.darkObjectSubtraction(img, darkObject, scale, maxPixels);
```

![Dark Object Subtraction example](https://i.imgur.com/lVY156s.png)

## References

- Key, C. H., & Benson, N. C. (2005). Landscape assessment: Remote sensing ofseverity, the Normalized Burn Ratio. In D. C. Lutes (Ed.), FIREMON: Fireeffects monitoring and inventory system. General Technical Report, RMRS-GTR-164-CD:LA1-LA51. (pp.) Ogden, UT: USDA Forest Service, Rocky Mountain Research Station.
- McCune, B. (2007). Improved estimates of incident radiation and heat load using non- parametric regression against topographic variables. Journal of Vegetation Science, 18(5), 751–754. doi:10.1111/j.1654-1103.2007.tb02590.x
- Miller, J. D., & Thode, A. E. (2007). Quantifying burn severity in a heterogeneous landscape with a relative version of the delta Normalized Burn Ratio (dNBR). Remote Sensing of Environment, 109(1), 66–80. doi:10.1016/j.rse.2006.12.006
- Reilly, M. J., Dunn, C. J., Meigs, G. W., Spies, T. A., Kennedy, R. E., Bailey, J. D., & Briggs, K. (2017). Contemporary patterns of fire extent and severity in forests of the Pacific Northwest, USA (1985-2010). Ecosphere, 8(3), e01695. doi:10.1002/ecs2.1695
- Weiss, A.D., 2001. Topographic position and landforms analysis. Poster Presentation,
  ESRI Users Conference, San Diego, CA.

---

[Top](https://github.com/aazuspan/geeTools#geeTools)
