/*
Polygon geometries over which the zonal statistics are to be calculated.
*/

var poly1 = ee.Geometry.Polygon([
    [76.33560264348547,28.978994902225498],
    [76.33684182405035,28.978994902225498],
    [76.33684182405035,28.980074235732044],
    [76.33560264348547,28.980074235732044],
    [76.33560264348547,28.978994902225498]
]);

var poly2 = ee.Geometry.Polygon([
    [76.33688473939459,28.978976131108393],
    [76.3382902169184,28.978976131108393],
    [76.3382902169184,28.980055464810757],
    [76.33688473939459,28.980055464810757],
    [76.33688473939459,28.978976131108393]
]);

var poly3 = ee.Geometry.Polygon([
    [76.33414352178137,28.97899020944655],
    [76.33554899930517,28.97899020944655],
    [76.33554899930517,28.980074235732044],
    [76.33414352178137,28.980074235732044],
    [76.33414352178137,28.97899020944655]
]);

var poly4 = ee.Geometry.Polygon([
    [76.33621955702625,28.97791065896687],
    [76.3375606615337,28.97791065896687],
    [76.3375606615337,28.978924304857358],
    [76.33621955702625,28.978924304857358],
    [76.33621955702625,28.97791065896687]
]);

var poly5 = ee.Geometry.Polygon([
    [76.33480335066639,28.977901273310355],
    [76.3361551840099,28.977901273310355],
    [76.3361551840099,28.978943075983906],
    [76.33480335066639,28.978943075983906],
    [76.33480335066639,28.977901273310355]
]);

/*
Creating a feature collection which is equivalent to a shapefile asset 
using the polygon geometries defined previously. 
*/

var gcol = [poly1, poly2, poly3, poly4, poly5];

var table = ee.FeatureCollection(gcol.map(function (f){
    return ee.Feature(f);
}));

print(table, "table");

// Calculating NDVI over a defined time period and adding the resultant as a band.

var startDate = "2024-11-01";
var endDate = "2024-12-01";

function ndviFunc(image){
    var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
    return image.addBands(ndvi);
}


var dataset = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(table)
                .filterDate(startDate, endDate)
                .map(ndviFunc);
                
print(dataset, "dataset");

// Creating a multiband image using the NDVI bands.

var multiBand = dataset.select('NDVI').toBands();

print(multiBand, "multi band image");

/*
Zonal statistics are calculated using 2 earth engine functions.
1. reduceRdgion  -> if a single geometry is used
2. reduceRegions -> if a feature collection is used

"reducer" is the type of aggregation used for calculation of the statistics.
For example ee.Reducer.mean() calculates mean over the area of the 
geometry or collection used here.

"scale" is the spatial resolution used to calculate the statistics. It is important 
to note that the finer the resolution the more computation power is required for 
the calculation. It can be adjusted as per the need of the analysis and has nothing to
do with the spatial resolution of the the image collection used for the analysis. 
*/

var zonal = multiBand.reduceRegion({
    geometry: poly1,
    reducer: ee.Reducer.mean(),
    scale: 10
});

print(zonal, "zonal stats over a geometry");

var zonalstats = multiBand.reduceRegions({
    collection: table,
    reducer: ee.Reducer.mean(),
    scale: 10
});
  
print(zonalstats, "zonal stats over a feature collection");

// Add the table onto the map to visualise the study area.

Map.centerObject(table);
Map.setOptions("SATELLITE");
Map.addLayer(table, {color: 'red'});