import ee
import numpy as np
from rasterio.transform import from_origin
import rasterio

BASE_OUT = "your output GeoTiffs folder location"

# Authenticate and Initialize earth engine on your system
ee.Authenticate()
ee.Initialize()

# create earth engine Polygon with coordinates
coords = [[76.883388, 20.627474],
	 [76.885212, 20.627468],
	 [76.885244, 20.626607],
	 [76.883338, 20.626866],
	 [76.883388, 20.627474]]

minx, miny = np.array(coords).min(axis = 0)
maxx, maxy = np.array(coords).max(axis = 0)
AOI = ee.Geometry.Polygon(coords)

# user-defined function section
def index_func(image):
	'''
	calculate index with bands
	can be extended or modified to any index 
	'''
	index_ = image.normalizedDifference(['B1', 'B2'])
	return image.addBands(index_.rename('DEMO_INDEX'))

def get_rectangle(image):
	'''
	clips images with bounding box of AOI
	'''
	return image.sampleRectangle(AOI, defaultValue = -999)

# function for getting image ID
get_id = np.vectorize(lambda x : x['id'][:8])

# function for getting image properties
get_properties = np.vectorize(lambda x : x['properties'])
	
def create_tiffs(minx, maxy, dates, index_array):
	'''
	create tiffs and save on your local system
	'''
	res = 0.00009 # (in degrees)for 10m resolution
	transform = from_origin(minx, maxy, res, res)
	proj = "+proj=longlat +datum=WGS84 +no_defs +type=crs"

	for i in range(len(dates)):
		arr = index_array[i]
		out_tiff = f"{BASE_OUT}{dates[i]}.tif"
		print('creating...\n', out_tiff)
		new_dataset = rasterio.open(out_tiff, 'w', 
						driver = 'GTiff',
						height = arr.shape[0], 
						width = arr.shape[1],
						count = 1, 
						dtype = str(arr.dtype),
						crs = proj,
						transform = transform)

		new_dataset.write(arr, 1)
		new_dataset.close()

'''
calculate DEMO_INDEX for defined time-series images and 
extract calculated images as arrays with ".getInfo()"
max pixel limit = 262144
'''		
date_start = "2022-07-01"
date_end = "2023-01-01"
dataset = (ee.ImageCollection('COPERNICUS/S2_SR')
           .filterBounds(AOI)
           .filterDate(date_start, date_end)
           .map(index_func)
           .select('DEMO_INDEX')
           .map(get_rectangle))
dataset_list = dataset.toList(dataset.size()).getInfo()

# creating and saving GeoTiffs
dates = get_id(dataset_list)
properties = get_properties(dataset_list)
index_array = np.array([np.array(x['DEMO_INDEX']) for x in properties])
index_array[index_array == -999] = np.nan
create_tiffs(minx, maxy, dates, index_array)