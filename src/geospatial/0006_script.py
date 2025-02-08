import rasterio
import numpy as np
import geopandas as gpd
import rasterio.mask as mask
import matplotlib.pyplot as plt

'''
input:
1. path to raster file in geotiff format
2. path to vector file in .shp format
'''
path_tiff = "path_to_some_raster.tif"
path_shp = "path_to_some_vector.shp"

'''
reading a vector file using the geopandas module and selecting the first geometry
of the shaepfile for cropping the raster and computing the zonal statistics.
'''

gdf = gpd.read_file(path_shp)
geom = [gdf.geometry[0]]

def plot_raster(axis, raster, transform, vect, title):
    '''
    function to plot overlayed raster and vector.

    input:
    axis = axis of the subplot
    raster = raster data to plot
    transform = transform variable of the raster.
                The variable contains the following values:
                0: resolution along longitude
                1: starting of cartesian coordinate x
                2: starting of longitude i.e., geo-coordinate x
                3: resolution along latitude (-ve)
                4: starting of cartesian coordinate y
                5: ending of latitude i.e., geo-coordinate y
    vect = vector data to plot
    title = title of the plot

    output:
    None
    '''
    r, c = raster[0].shape
    minx = transform[2]
    maxy = transform[5]
    maxx = minx + (transform[0]*c)
    miny = maxy + (transform[4]*r)
    axis.imshow(raster[0], extent=[minx, maxx, miny, maxy], 
                vmin = 20, vmax = 35, aspect="auto")
    vect.plot(ax=axis, facecolor = "none")
    axis.set_aspect(abs(transform[0] / transform[4]))
    axis.set_xticks(np.arange(minx, maxx+transform[0], transform[0]))
    axis.set_yticks(np.arange(miny, maxy+transform[0], transform[0]))
    axis.set_title(title)

'''
cropping raster using the geometry of a shapefle using the mask function 
from rasterio module.
It is to be noted that the raster and the shapefile are following the same
coordinate system.

The pixels in the cropped raster are selected in two ways:
1. all_touched=True, signifies that a pixel is selected if any part
   of the vector file is touching that particular pixel.
2. all_touched=False, signifies that a pixel is only selected if
   the centroid of the pixel is within the bounds of the vector file.

np.nanmean() from the numpy module is used to compute the mean of the 
croppped raster, it ignores nan (No Data) values from the computation.
'''

with rasterio.open(path_tiff) as src:
    out_raster_all, out_transform_all = mask.mask(src, geom, crop=True, 
                                                  all_touched=True)
    out_raster_all[out_raster_all==0] = np.nan
    zonal_all = np.nanmean(out_raster_all)

with rasterio.open(path_tiff) as src:
    out_raster, out_transform = mask.mask(src, geom, crop=True, 
                                          all_touched=False)
    out_raster[out_raster==0] = np.nan
    zonal = np.nanmean(out_raster)

# plotting the cropped results with the matplotlib module

fig, (ax, bx) = plt.subplots(1, 2, figsize = (10, 5))
plot_raster(ax, out_raster_all, out_transform_all, gdf, 
            f"all_touched = True\n\n mean = {round(zonal_all)}")
plot_raster(bx, out_raster, out_transform, gdf, 
            f"all_touched = False\n\n mean = {round(zonal)}")
plt.show()
plt.close(fig)