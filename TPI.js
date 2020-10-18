// Calculate topographic position index based on a DEM image, following Weiss 2001.
// Radius, window_shape, and units define the TPI kernel, and are passed to ee.Image.focal_mean
function tpi(dem, radius, window_shape, units) {
    dem = dem.double()
    var r = dem.subtract(dem.focal_mean(radius, window_shape, units)).add(0.5).int();
    return (r);
}

// Reclassify a continuous TPI image into slope positions, following Weiss 2001
function slopePosition(tpi, slope, flat_degrees) {
    // Default "flat" is 5 degrees
    flat_degrees = flat_degrees || 5

    // Calculate the TPI standard deviation
    var sd = tpi.reduceRegion({
        reducer: ee.Reducer.stdDev(),
        geometry: westCascades,
        maxPixels: 1e9
    }).getNumber('elevation');

    // Reclassify TPI to slope position
    var tpiReclass = ee.Image(0)
        // Ridge
        .where(tpi.gt(sd), 1)
        // Upper slope
        .where(tpi.gt(sd.multiply(0.5)).and(tpi.lte(sd)), 2)
        // Middle slope
        .where(tpi.gt(sd.multiply(-0.5)).and(tpi.lt(sd.multiply(0.5)).and(slope.gt(flat_degrees))), 3)
        // Flat slope
        .where(tpi.gte(sd.multiply(-0.5)).and(tpi.lte(sd.multiply(0.5)).and(slope.lte(flat_degrees))), 4)
        // Lower slope
        .where(tpi.gte(sd.multiply(-1)).and(tpi.lt(sd.multiply(-0.5))), 5)
        // Valley
        .where(tpi.lt(sd.multiply(-1)), 6);

    return (tpiReclass);
}


/*
Example usage
*/

// Load elevation data
var srtm = ee.Image("USGS/SRTMGL1_003");

// Calculate slope in degrees
var slope = ee.Terrain.slope(srtm);

// Calculate a TPI image using a 300m kernel
var tpi300 = tpi(srtm, 300, "square", "meters");

// Reclassify TPI to discrete slope positions
var slopePosition300 = slopePosition(tpi300, slope);

Map.addLayer(srtm, { min: 0, max: 4000 }, "Elevation");
Map.addLayer(slopePosition300, { min: 1, max: 6 }, "Slope Position");
