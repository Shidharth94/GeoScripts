/* 
Coordinates of a polygon for the study area is defined in the form of nested list.
Each list element has longitude and latitude information of one of the corners
of the polygon it represents.
The last coordinates are same as the first one in order to create a closed polygon.
*/

var coords = [
    [66.54970735145461,7.583347221913892],
    [97.66298860145461,7.583347221913892],
    [97.66298860145461,37.05760799372107],
    [66.54970735145461,37.05760799372107],
    [66.54970735145461,7.583347221913892]
];

// Polygon is created with the list of coordinates usimg ee.Geometry.Polygon(coordinates)

var geometry = ee.Geometry.Polygon(coords);

// Time-frame for the analysis is defined.

var startDate = "2025-01-01";
var endDate = "2025-01-05";

// User-defined functions

function ndviFunc(image){
    /*
    about:
    function to calculate NDVI using ee.Image.normalizedDifference([NIR, R]) function.

    input: image (Bands B8 and B4 selected for calculation).
    output: adds the calculated ndvi image as a band to the existing image.
    */
    var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
    return image.addBands(ndvi);
}

function getDateCompositeRanges(date){
    /*
    about:
    function to get date ranges to compute same day composite.

    input: start date
    output: list containing the start date and next date as end date.
    */
    date = ee.Date(date);
    var endDate = date.advance(1, 'day');
    return [date, endDate];
}

function getSameDayComposite(dateRangeList, imgCol, qBand){
    /*
    about:
    function to compute mosaics based on a qualioty band and return
    a same date composite image collection.

    input:
    dateRangeList -> list of start date and end date
    imgCol -> image collection with multiple tiles on the same date
    qBand -> quality band for creating same date mosaic
    
    output: image collection with same date mosaiced image.
    */
    var sameDateImage = dateRangeList.map(function (d){
        d = ee.List(d);
        var sDate = ee.Date(d.get(0));
        var eDate = ee.Date(d.get(1));
        var image = imgCol.filterDate(sDate, eDate).qualityMosaic(qBand);
        image = ee.Image(image.set({"system:id":sDate.format('YYYY-MM-dd'),
                                    "system:time_start":sDate
        }));
        return image;
    });
    return ee.ImageCollection(sameDateImage);
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
print(dataset, 'image collection');

// Get distinct dates from the image collection.

var getImageDates = dataset.aggregate_array('system:time_start')
                            .map(function (d){
                            return ee.Date(d).format('YYYY-MM-dd');
                            }).distinct();
print(getImageDates, 'unique dates in collection');

// Get date ranges for computing the final composite image collection.

var dateRange = getImageDates.map(getDateCompositeRanges);
print(dateRange, 'date ranges for composites');

var sameDayCol = getSameDayComposite(dateRange, dataset, 'NDVI');
print(sameDayCol, 'same date mosaic image collection');