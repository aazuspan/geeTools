// Chooose the nearest image from a collection to a given date.
exports.getNearestImage = function (imageCollection, targetDate) {
  var beforeImage = getNearestBeforeImage(imageCollection, targetDate);
  var afterImage = getNearestAfterImage(imageCollection, targetDate);

  // Creating a new collection and sorting allows for async operations that are MUCH faster than comparing time deltas synchronously
  var nearImages = ee.ImageCollection([beforeImage, afterImage]);
  nearImages = nearImages.sort("DATE_ACQUIRED");
  return nearImages.first();
};

// Choose the nearest image from a collection after a given date
function getNearestAfterImage(imageCollection, targetDate) {
  var filteredCollection = imageCollection
    .filterDate(targetDate, targetDate.advance(999, "year"))
    .sort("DATE_ACQUIRED");
  return filteredCollection.first();
}

// Choose the nearest image from a collection before a given date
function getNearestBeforeImage(imageCollection, targetDate) {
  var filteredCollection = imageCollection
    .filterDate(targetDate.advance(-999, "year"), targetDate)
    .sort("DATE_ACQUIRED", false);
  return filteredCollection.first();
}
