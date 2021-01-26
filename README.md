# geeScripts
![Burn Severity example](https://i.imgur.com/wEaOgaQ.png)
A collection of remote sensing, spatial analysis, and helper tools for Google Earth Engine.

## Usage
To import a script, include the following code in your GEE script:
```javascript
var foo = require("users/aazuspan/geeScripts:{script name}")
foo.bar();
```

For example:
```javascript
var burnSeverity = require("users/aazuspan/geeScripts:burnSeverity.js")
burnSeverity.calculateBurnSeverity( ... );
```

## Examples
### Burn Severity
Calculate pre- and post-fire NBR, dNBR, RdNBR (Miller & Thode, 2007), and basal area mortality (Reilly et. al., 2017) using prefire and postfire imagery.

```javascript
var burnSeverity = require("users/aazuspan/geeScripts:burnSeverity.js");

// L8 imagery prior to the fire
var prefire = ee.Image("LANDSAT/LC08/C01/T1_TOA/LC08_046031_20170628");
// L8 imagery one year after the fire
var postfire = ee.Image("LANDSAT/LC08/C01/T1_TOA/LC08_046031_20180701");

// Calculate various burn severity metrics
var severity = burnSeverity.calculateBurnSeverity(prefire, postfire, "B5", "B6");
```
![Burn Severity example](https://i.imgur.com/wEaOgaQ.png)

### Cloud Probability Masking
Use cloud probability data to mask clouds in imagery.

```javascript
var cloudMasking = require("users/aazuspan/geeScripts:cloudMasking.js");

// Load a Sentinel-2 image (1C or 2A)
var s2 = ee.Image("COPERNICUS/S2/20190113T190741_20190113T190736_T10TEK");
// Load the corresponding cloud probability image
var prob = ee.Image("COPERNICUS/S2_CLOUD_PROBABILITY/20190113T190741_20190113T190736_T10TEK");

// Mask clouds in the original image
var cloudMasked = cloudMasking.probabilityCloudMask(s2, prob);
```

![Cloud masking example](https://i.imgur.com/P4oyNTH.png)

### Heat Load Index
Calculate Heat Load Index (HLI) from elevation (McCune, 2007).

```javascript
var hli = require("users/aazuspan/geeScripts:HLI.js");

// Load elevation data
var srtm = ee.Image("CGIAR/SRTM90_V4");

// Generate HLI data
var h = hli.hli(srtm);
```

![Heat Load Index example](https://i.imgur.com/nIe6Jcb.png)

### Slope Position
Calculate TPI and slope position from elevation (Weiss, 2001).

```javascript
var tpi = require("users/aazuspan/geeScripts:TPI.js");

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

// Calculate a TPI image using a 300m kernel
var tpi300 = tpi.tpi(srtm, 300, "square", "meters");

// Reclassify TPI to discrete slope positions
var slopePosition300 = tpi.slopePosition(tpi300, slope, null, aoi, 100, 1e12);
```

![Slope Position example](https://i.imgur.com/v7ZqBfR.png)

### Dark Object Subtraction
Use dark object subtraction (DOS) to perform radiometric normalization and atmospheric correction.
```javascript
var radCor = require("users/aazuspan/geeScripts:radiometricCorrection.js");

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
// Use Dark Object Subtraction to correct for atmospheric distortion
var imgDOS = radCor.darkObjectSubtraction(img, darkObject, 30, 1e13);
```
![Dark Object Subtraction example](https://i.imgur.com/lVY156s.png)
