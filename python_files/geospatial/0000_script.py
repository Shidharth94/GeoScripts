import rasterio

'''
file path should include file name and extension
example input: /home/my_tiffs/in.tif
example output: /home/my_tiffs/out.tif
'''

PATH_RAS_IN = "your input GeoTiff file path"
PATH_RAS_OUT = "your output GeoTiff file path"

def raster_analysis(raster):
	'''
	function to do analysis on the read
	raster
	'''
	# do something with the raster
	return raster

# Read GeoTiff file
with rasterio.open(PATH_RAS_IN) as src:
	profile = src.profile
	raster = src.read()

analysed_ras = raster_analysis(raster)

# Write analysed GeoTiff file
with rasterio.open(PATH_RAS_OUT, 'w', **profile) as dst:
	dst.write(analysed_ras)