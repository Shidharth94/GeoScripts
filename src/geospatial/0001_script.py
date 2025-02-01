import geopandas as gpd

'''
file path should include file name and extension
example input: /home/my_shps/in.shp
example output: /home/my_shps/out.shp
'''

PATH_SHP_IN = "your input Vector file path"
PATH_SHP_OUT = "your output Vector file path"

def vector_analysis(gdf):
	'''
	function to do analysis on the
	columns of the read vector file
	'''
	# do something with the vector file
	return gdf

# Read Vector file
gdf = gpd.read_file(PATH_SHP_IN)

analysed_gdf = vector_analysis(gdf)

# Write analysed Vector file
analysed_gdf.to_file(PATH_SHP_OUT)