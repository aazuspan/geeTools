/*
This script uses Google Earth Engine to generate a delta normalized burn ratio (dNBR) for a given area.
dNBRs represent the change in the ratio of NIR and SWIR before and after a fire, and are reliable indicators
of forest mortality. To use this tool, set lat and lng to the coordinates of a fire centroid, set the prefire
and postfire dates, and adjust the maxCloudCoverPercent if desired. Decreasing the max cloud cover will yield 
data with less atmospheric distortion, but may limit available imagery dates.

If a fire boundary is available, the lat and lng can be replaced with a shapefile. To do so, replace studyArea with
an ee.Feature().geometry(). This will ensure that the entire fire boundary is included in the dNBR.

Imagery will be collected automatically from Landsat 8 as close as possible to the selected dates, with cloud cover
lower than the specified threshold. That imagery will be used to generate pre- and post-fire normalized burn ratios,
which will be subtracted to generate a dNBR. 

NOTE: This script must be run in the Google Earth Engine interactive code editor (https://code.earthengine.google.com). 
*/


// User parameters
var lat = -119.7343;
var lng = 37.8958;
var prefireDate = ee.Date("2013-05-01");
var postfireDate = ee.Date("2014-05-01");
var maxCloudCoverPercent = 10;

var studyArea = ee.Geometry.Point(lat, lng);
var dNBR = generateDNBR(prefireDate, postfireDate, studyArea, maxCloudCoverPercent);

Map.addLayer(dNBR, { min: -0.2, max: 1.2 }, "dNBR");


// Generate a dNBR from prefire and postfire images
function generateDNBR(prefireDate, postfireDate, studyArea, maxCloudCoverPercent) {
  var imgs = ee.ImageCollection('LANDSAT/LC08/C01/T1')
    .filterBounds(studyArea)
    .filterMetadata("CLOUD_COVER_LAND", "not_greater_than", maxCloudCoverPercent)
    .sort("CLOUD_COVER_LAND", true);

  var prefireImage = getNearestImage(imgs, prefireDate);
  print(ee.String('Prefire Imagery: ').cat(prefireImage.date().format('y-M-d')));
  var postfireImage = getNearestImage(imgs, postfireDate);
  print(ee.String('Postfire Imagery: ').cat(postfireImage.date().format('y-M-d')));

  var prefireNBR = generateNBR(prefireImage);
  var postfireNBR = generateNBR(postfireImage);

  return prefireNBR.subtract(postfireNBR);
}

// Generate a normalized burn ratio of a given image
function generateNBR(image) {
  return image.normalizedDifference(["B5", "B6"]);
}

// Chooose the nearest image from a collection to a given date. 
function getNearestImage(imageCollection, targetDate) {
  var beforeImage = getNearestBeforeImage(imageCollection, targetDate);
  var afterImage = getNearestAfterImage(imageCollection, targetDate);

  // Creating a new collection and sorting allows for async operations that are MUCH faster than comparing time deltas synchronously
  var nearImages = ee.ImageCollection([beforeImage, afterImage]);
  nearImages = nearImages.sort("DATE_ACQUIRED");
  return nearImages.first();
}

// Choose the nearest image from a collection after a given date
function getNearestAfterImage(imageCollection, targetDate) {
  var filteredCollection = imageCollection
    .filterDate(targetDate, targetDate.advance(999, 'year'))
    .sort("DATE_ACQUIRED");
  return filteredCollection.first();
}

// Choose the nearest image from a collection before a given date
function getNearestBeforeImage(imageCollection, targetDate) {
  var filteredCollection = imageCollection
    .filterDate(targetDate.advance(-999, 'year'), targetDate)
    .sort("DATE_ACQUIRED", false);
  return filteredCollection.first();
}
