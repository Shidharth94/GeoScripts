import warnings
warnings.filterwarnings("ignore")

import geopandas as gpd
import rasterio
import numpy as np
from numpy import vectorize
import pandas as pd
from rasterstats import zonal_stats
import matplotlib.pyplot as plt
from matplotlib import colors
from matplotlib.patches import Patch
from sklearn.ensemble import RandomForestClassifier
import itertools
from multiprocessing.pool import Pool

# user-defined function section
def classify_mlp(raster):
	'''
	Using Multiprocessing to classify multiple
	rasters at once
	'''
	global regr
	raster_re = np.moveaxis(raster, 0, -1).tolist()
	raster_arr = list(itertools
			  .chain
			  .from_iterable(raster_re))
	output = (regr
		  .predict(raster_arr)
		  .reshape(raster.shape[1], 
			   raster.shape[2]))
	output[output < 1] = np.nan
	return output
    
def read_raster(PATH):
	'''
	read rasters with rasterio
	'''
	with rasterio.open(PATH) as src:
		raster = src.read()
		raster = raster.round(4)
	return raster

def quadrant_analysis(quadrant):
	'''
	calculating sprawl in acres along
	all the quadrants
	'''
	quadrant[quadrant != 1] = np.nan
	h = len(quadrant)
	w = len(quadrant[1])
	top_left =  np.array([quadrant[i][:w // 2] 
				for i in range(h // 2)])
	top_right = np.array([quadrant[i][w // 2:] 
				for i in range(h // 2)])
	bot_left =  np.array([quadrant[i][:w // 2] 
				for i in range(h // 2, h)])
	bot_right = np.array([quadrant[i][w // 2:] 
				for i in range(h // 2, h)])
	increase = [[np.nansum(top_left), np.nansum(top_right)], 
		    [np.nansum(bot_left), np.nansum(bot_right)]]
	increase = np.array(increase)*0.27
	return increase

def class_prob_at_timestep(ts, trans_mat, k = 2):
	'''
	gives transition probability matrix
	for a certain timestep in future using
	Markov Chain analysis
	'''
	if k == 0:
		return ts.round(3)
	ts = np.dot(ts, trans_mat)
	return class_prob_at_timestep(ts, trans_mat, k-1)

@vectorize
def state_change(x, year = 5):
	'''
	changes state of a certain class
	based on transition probability matrix
	
	p.s. needs neighborhood rules to improve
	'''
	global trans_mat

	classes = [1.0, 2.0, 3.0]        
	initial_prob_dict = {
		1 : np.array([1, 0, 0]),
		2 : np.array([0, 1, 0])
	}
	initial_prob = initial_prob_dict.get(x, 
					     np.array([0, 0, 1]))
	prob_at_t = class_prob_at_timestep(initial_prob, 
					   trans_mat, 
					   year)
	return (np.random.choice(classes, 1, p = prob_at_t)[0])

# files used
SOURCE = "base path"
PATH_SIG = f"{SOURCE}shape_files/signature.gpkg"
PATH_TIF_2000 = f"{SOURCE}tiffs/L7_2000.tif"
PATH_TIF_2022 = f"{SOURCE}tiffs/L8_2022.tif"

# extract spectral responses over class points
gdf = gpd.read_file(PATH_SIG)
rows = []
with rasterio.open(PATH_TIF_2022) as src:
	raster = src.read()
	raster = raster.round(4)
	for point in gdf.geometry:
		try:
			x = point.xy[0][0]
			y = point.xy[1][0]
			lon, lat = src.index(x, y)
			values = raster[:, lon, lat]
		except:
			values = np.array([np.nan, 
					   np.nan, 
					   np.nan])
		rows.append(values)
extracted_values = pd.DataFrame(rows, columns = ['nir', 
                                                 'red', 
                                                 'green'])
gdf_ex = pd.concat([extracted_values, gdf], axis = 1)
gdf_ex = gdf_ex.dropna().reset_index(drop = True)
gdf_ex['CLASS_NUM'] = (gdf_ex['CLASS']
                       .apply(lambda x : 1.0 
                              if x == 'BUILTUP' 
                              else (2.0 
                                    if x == 'GREENS' 
                                    else 3.0)))

# plotting spatial distribution of signatures
v = np.moveaxis(raster, 0, -1)
v_min = v.min(axis=(0, 1), keepdims=True)
v_max = v.max(axis=(0, 1), keepdims=True)
v = np.uint8(((v - v_min)/(0.14))*256)
minx, miny, maxx, maxy = gdf.total_bounds
fig, ax = plt.subplots(figsize = (7, 7))
ax.imshow(v, extent = [minx, maxx, miny, maxy])
gdf.plot(ax = ax, column = 'CLASS', cmap = 'gist_rainbow')
ax.set_title('Spatial Distribution of Signatures')
plt.show()

# training base random forest classifier model
regr = RandomForestClassifier(random_state=0)
regr.fit(gdf_ex[['nir', 'red', 'green']], 
         gdf_ex[['CLASS_NUM']])

# classifying the rasters used 
in_arrays = list(map(read_raster, 
                 [PATH_TIF_2000,
                  PATH_TIF_2022]))

with Pool(processes=5) as pool:
    pooled_vals = list(pool.map(classify_mlp, in_arrays))
    
predicted_2000 = pooled_vals[0]
predicted_2022 = pooled_vals[1]
predicted_2022[predicted_2000 == 1] = 1
predicted_2000[predicted_2022 == 3] = 3

# calculating initial transition probability matrix
cat = np.unique(predicted_2000)
pixels = [len(predicted_2000[predicted_2000 == x]) for x in cat]

trans_mat = []

for i in range(len(cat)):
	sep = predicted_2022[predicted_2000 == cat[i]]
	cat_1 = len(sep[sep == cat[0]])/pixels[i]
	cat_2 = len(sep[sep == cat[1]])/pixels[i]
	cat_3 = len(sep[sep == cat[2]])/pixels[i]
	trans_mat.append([cat_1, cat_2, cat_3])
trans_mat = np.array(trans_mat).round(3)

# calculating class change between time-series images
index = np.array([0, 1, 2])
classes = ['BUILTUP', 'GREENS', 'WATER']
area_00 = [len(predicted_2000[predicted_2000 == 1])*0.27, 
           len(predicted_2000[predicted_2000 == 2])*0.27, 
           len(predicted_2000[predicted_2000 == 3])*0.27]
area_22 = [len(predicted_2022[predicted_2022 == 1])*0.27, 
           len(predicted_2022[predicted_2022 == 2])*0.27, 
           len(predicted_2022[predicted_2022 == 3])*0.27]
df_comp = pd.DataFrame(list(zip(classes, area_00, area_22)), 
                       columns = ['CLASS', '2000', '2022'])
width = 0.2

# calculating sprawl increase between years
predicted_2000_built = predicted_2000.copy()
predicted_2022_built = predicted_2022.copy()

predicted_2000_built[predicted_2000_built != 1] = np.nan
predicted_2022_built[predicted_2022_built != 1] = np.nan

a, b = (np.nansum(predicted_2000_built),
        np.nansum(predicted_2022_built))

sprawl_00_22 = np.nansum(np.dstack((predicted_2000_built, 
                                    predicted_2022_built)), 2)
sprawl_00_22[sprawl_00_22 < 1] = np.nan
increase_00_22 = quadrant_analysis(sprawl_00_22.copy())

predicted_year = state_change(predicted_2022, 1)
predicted_year_built = predicted_year.copy()
predicted_year_built[predicted_year_built != 1] = np.nan

d, e = (np.nansum(predicted_2022_built),
        np.nansum(predicted_year_built))

# plotting the results
extent = [minx, maxx, miny, maxy]
font_size = 15

clrs = [(0.0, '#750000'), (0.5, '#81B622'), (1.0, "#000075")]
cmap_new = colors.LinearSegmentedColormap.from_list('rsm', 
                                                    clrs, 
                                                    N=3)

clrs_sprawl = [(0.0, 'red'), (1.0, "#000075")]
cmap_sprawl = colors.LinearSegmentedColormap.from_list('rsm', 
                                                       clrs_sprawl, 
                                                       N=2)
legend_elements = [Patch(facecolor="red", 
                         edgecolor='black', label='New'), 
                   Patch(facecolor="#000075", 
                         edgecolor='black', label='Existing')]

fig, ax = plt.subplots(4, 2, figsize = (10, 20))
ax[0, 0].imshow(predicted_2000, extent = extent, cmap = cmap_new)
ax[0, 1].imshow(predicted_2022, extent = extent, cmap = cmap_new)
im_00_22 = ax[1, 0].imshow(increase_00_22, cmap = 'Reds')
ax[1, 1].imshow(sprawl_00_22, extent = extent, cmap = cmap_sprawl)
ax[2, 0].bar(index, df_comp['2000'], width, label = '2000')
ax[2, 0].bar(index+width, df_comp['2022'], width, label = '2022')
ax[2, 1].matshow(trans_mat, cmap = 'Reds')
ax[3, 0].imshow(predicted_year, extent = extent, cmap = cmap_new)

ax[0, 0].set_title('Builtup Year 2000', fontsize = font_size)
ax[0, 1].set_title(f'Builtup Year 2022\n({round(((b-a)/a)*100, 2)}%↑ from 2000)', 
                   fontsize = font_size)
ax[1, 0].set_title(f'Sprawl Direction (Acres)\n2000->2022', 
                   fontsize = font_size)
ax[1, 1].set_title('Builtup Increase\n2000->2022', fontsize = font_size)
ax[2, 0].set_title('Acreage Comparision\n2000->2022', fontsize = font_size)
ax[1, 1].legend(handles = legend_elements)
ax[2, 0].set_xlabel('LULC CLASSES', fontsize = font_size)
ax[2, 0].set_ylabel('AREA (ACRES)', fontsize = font_size)
ax[2, 0].legend()
ax[2, 0].set_xticks(index + (width / 2), classes, fontsize = font_size)
ax[2, 1].set_xticks(index, classes, fontsize = font_size-3)
ax[2, 1].set_yticks(index, classes, fontsize = font_size-3)
ax[2, 1].set_title('Class Transition Matrix\n2000->2022', 
                   fontsize = font_size)
for i in range(len(classes)):
    for j in range(len(classes)):
        c = trans_mat[i, j]
        ax[2, 1].text(j, i, str(c), va='center', ha='center', fontsize = font_size)
ax[3, 0].set_title(f'Builtup Year 2023\n({round(((e-d)/d)*100, 2)}%↑ from 2022)', 
                   fontsize = font_size)

plt.colorbar(mappable=im_00_22, ax = ax[1, 0], 
             fraction = 0.04, location="bottom")

ax[1, 0].axis('off')
ax[3, 1].axis('off')

fig.tight_layout()
plt.show()