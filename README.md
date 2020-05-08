# dNBR
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
