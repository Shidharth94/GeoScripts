import struct
import rasterio
import numpy as np
from rasterio.transform import from_origin

'''
input: Gridded data file from IMD in .GRD format
output: GeoTiff file in .tif format
'''

IN_FILE = "path_to_some_file.GRD"
OUT_FILE = "path_to_some_file.tif"

'''
The below snippet is taken from the attached sample .ctl file 
for a 0.5 X 0.5 degree IMD Temperature binary(.GRD) file.

url: https://www.imdpune.gov.in/

DSET  P:\TEMP.GRD
TITLE 0.5 DEGREE ANALYZED GRIDS
UNDEF  99.9
XDEF  61  LINEAR 67.5 0.5
YDEF  61  LINEAR 7.5 0.5
ZDEF   1  LINEAR 1 1 
TDEF   1  LINEAR 1JAN1994 1DY
VARS   1
T    0 99 TEMPERATURE
ENDVARS

The below variables are populated based on the above snippet.
'''
LONGITUDES = 61
LATITUDES = 61
RESOLUTION = 0.5 # in degrees
MINX = 67.5      # min longitude
MINY = 7.5       # min latitude
NODATA = 99.9

TOTAL_GRIDS = LONGITUDES * LATITUDES

'''
Variables required for georeferencing the resultant raster 
corresponding to Geographic Coordinate System (EPSG:4326) are 
defined below.
'''
TRANSFORM = from_origin((MINX-RESOLUTION/2), (MINY-RESOLUTION/2) + 
                        (LATITUDES*RESOLUTION), 
                        RESOLUTION, RESOLUTION)
PROJECTION = "+proj=longlat +datum=WGS84 +no_defs +type=crs"
KWARGS = {
    'driver': 'GTiff',
    'height': LATITUDES,
    'width': LONGITUDES,
    'count': 1,
    'dtype': "float32",
    'crs': PROJECTION,
    'transform': TRANSFORM
}

'''
.GRD file strores data in binary format and is read here in 'rb' mode.
The data stored inside is an encoded raster which is unpacked into a 
readable format (floating-point raster) using struct module and then 
written as a geotiff using the rasterio module. 
'''
with open(IN_FILE, 'rb') as src:
    data = src.read()

data_length = len(data)
bytes_per_grid = data_length // TOTAL_GRIDS
data_value_per_grid = [struct.unpack("<f", data[x:x+bytes_per_grid])[0] 
                       for x in range(0, data_length, bytes_per_grid)]

raster_array = np.array(data_value_per_grid).reshape(LONGITUDES, LATITUDES)
raster_array[raster_array > NODATA] = np.nan 

with rasterio.open(OUT_FILE, 'w', **KWARGS) as dst:
    dst.write(np.flip(raster_array, 0), 1)