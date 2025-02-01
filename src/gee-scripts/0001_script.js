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

/* 
Satellite Image collection (Harmonized Sentinel 2 for this example) is defined 
and filtered based on the geometry and the time-frame chosen for the analysis.
*/

var dataset = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(geometry)
                .filterDate(startDate, endDate);
                
print(dataset);

// Get the first image from the collection and clip it to the geometry defined.

var firstImage = dataset.mosaic().clip(geometry);

// Calculate Indices using respective bands and formula.

// Method 1: Calculating NDVI using the ee.Image.normalizedDifference([NIR, R]) function.

var ndviImage = firstImage.normalizedDifference(['B8', 'B4']).rename('NDVI');

// Method 2: Calculating NDMI using the ee.Image.expression(ndmi expression) function.

var bandNameExp = '(b("B8") - b("B11")) / (b("B8") + b("B11"))';
var ndmiImage = firstImage.expression(bandNameExp).rename('NDMI');

// Method 3: Calculating NBR using the basic maths functions i.e., subtract, add and divide.

var nbrImage = ((firstImage.select('B8')).subtract(firstImage.select('B12')))
                .divide((firstImage.select('B8')).add(firstImage.select('B12'))).rename('NBR');

// Define visualisation parameters for all the indices.

var ndviPalette = {min:-1, max:1, palette: ['blue', 'red', 'yellow', 'green']};
var ndmiPalette = {min:-1, max:1, palette: ['red', 'yellow', 'green', 'blue']};
var nbrPalette = {min:-1, max:1, palette: ['black', 'red', 'yellow', 'green']};
                
// Add the images onto the map with their respective palettes.

Map.centerObject(geometry);
Map.addLayer(ndviImage, ndviPalette, 'NDVI Image');
Map.addLayer(ndmiImage, ndmiPalette, 'NDMI Image');
Map.addLayer(nbrImage, nbrPalette, 'NBR Image');