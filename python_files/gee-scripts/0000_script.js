/* 
Coordinates of a polygon for the study area is defined in the form of nested list.
Each list element has longitude and latitude information of one of the corners
of the polygon it represents.
The last coordinates are same as the first one in order to create a closed polygon.
*/

var coords =[
    [88.31436534840576,22.717036472566583], 
    [88.33947082478515,22.717036472566583], 
    [88.33947082478515,22.737580122985047], 
    [88.31436534840576,22.737580122985047], 
    [88.31436534840576,22.717036472566583]
];

// Polygon is created with the list of coordinates usimg ee.Geometry.Polygon(coordinates)

var geometry = ee.Geometry.Polygon(coords);

// Time-frame for the analysis is defined.

var startDate = "2024-01-01";
var endDate = "2024-02-01";

/* 
Satellite Image collection (Harmonized Sentinel 2 for this example) is defined 
and filtered based on the geometry and the time-frame chosen for the analysis.
*/

var dataset = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(geometry)
                .filterDate(startDate, endDate);

print(dataset); // Print to check the metadata of the images in the collection.

// Get the first image from the collection and clip it to the geometry defined.
                
var firstImage = dataset.first().clip(geometry);

// Define visualisation parameters for RGB and FCC images.
                
var rgbPalette = {min:0, max:3000, bands: ['B4', 'B3', 'B2']};
var fccPalette = {min:0, max:3000, bands: ['B8', 'B4', 'B3']};
                
// Add the images onto the map with their respective palettes.

Map.centerObject(geometry); // To center the map on the gemetry defined.
Map.addLayer(firstImage, rgbPalette, 'RGB Image');
Map.addLayer(firstImage, fccPalette, 'FCC Image');