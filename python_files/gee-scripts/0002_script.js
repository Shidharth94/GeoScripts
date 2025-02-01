/* 
Coordinates of a polygon for the study area is defined in the form of nested list.
Each list element has longitude and latitude information of one of the corners
of the polygon it represents.
The last coordinates are same as the first one in order to create a closed polygon.
*/

var coords =[
    [-118.58017535535382,33.8544067161014],
    [-117.98279376355694,33.8544067161014],
    [-117.98279376355694,34.19926518402278],
    [-118.58017535535382,34.19926518402278],
    [-118.58017535535382,33.8544067161014]
];

// Polygon is created with the list of coordinates usimg ee.Geometry.Polygon(coordinates)

var geometry = ee.Geometry.Polygon(coords);

// Time-frame for the analysis is defined.

var startDate = "2024-11-01";
var endDate = "2024-12-01";

// Function to calculate NDVI using ee.Image.normalizedDifference([NIR, R]) function.

function ndviFunc(image){
    /*
    input: image (Bands B8 and B4 selected for calculation).
    output: adds the calculated ndvi image as a band to the existing image.
    */
    var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
    return image.addBands(ndvi);
}

/* 
Satellite Image collection (Harmonized Sentinel 2 for this example) is defined 
and filtered based on the geometry and the time-frame chosen for the analysis.
"ndviFunc" function is mapped over the image collection and NDVI is computed for
every image in the collection.
*/

var dataset = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(geometry)
                .filterDate(startDate, endDate)
                .map(ndviFunc);
                
print(dataset);

// An image mosaic of the collection is created using the best pixels based on NDVI band.

var qMosaic = dataset.qualityMosaic('NDVI').clip(geometry);

// Define visualisation parameters.

var ndviPalette = {min:0, max:1, bands: ['NDVI'], palette: ['blue', 'red', 'yellow', 'green']};
var rgbPalette = {min:0, max:3000, bands: ['B4', 'B3', 'B2']};
var fccPalette = {min:0, max:3000, bands: ['B8', 'B4', 'B3']};
                
// Add the images onto the map with their respective palettes.

Map.centerObject(geometry);
Map.addLayer(qMosaic, ndviPalette, 'NDVI Image');
Map.addLayer(qMosaic, rgbPalette, 'RGB Image');
Map.addLayer(qMosaic, fccPalette, 'FCC Image');