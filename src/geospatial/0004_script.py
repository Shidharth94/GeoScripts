from sentinelsat import SentinelAPI, read_geojson, geojson_to_wkt
from datetime import date
import contextily as cx

def get_download_urls(product_df, index_):
    '''
    function to fetch download urls
    from the product dataframe based
    on common dates.
    '''
    urls = [(api.get_product_odata(product_df
                                   ["index"][x])
             ["url"]) for x in index_]
    return urls

#Log-in to Copernicus Hub with your credentials
user_name = 'Your Copernicus Hub User Name'
password = 'Your Copernicus Hub Password'
api = SentinelAPI(user_name, 
                  password, 
                  'https://scihub.copernicus.eu/dhus')

# Create a region(footprint) over which you want the satellite data
geo_json = {
    "type":"Polygon", 
    "coordinates": [[[79.07284822678771,16.442942045656558], 
                     [79.24656954026428,16.442942045656558], 
                     [79.24656954026428,16.628567727262556], 
                     [79.07284822678771,16.628567727262556], 
                     [79.07284822678771,16.442942045656558]]]
}
footprint = geojson_to_wkt(geo_json)

# Specify the date range over which you want the data
date_range = ('20220601', date(2022, 9, 30))

# get overlapping tile information as a dataframe
# for Sentinel-1
productss1 = api.query(footprint,
                     date=date_range,
                     platformname='Sentinel-1',)
products_dfs1 = api.to_dataframe(productss1)
products_dfs1 = (products_dfs1
                 .loc[products_dfs1["producttype"] == "GRD"]
                 .reset_index())
gdfs1 = api.to_geodataframe(productss1).reset_index() # converting to GeoDataFrame

# for Sentinel-2
productss2 = api.query(footprint,
                     date=date_range,
                     platformname='Sentinel-2', 
                     cloudcoverpercentage=(0, 20))
products_dfs2 = api.to_dataframe(productss2).reset_index()
gdfs2 = api.to_geodataframe(productss2).reset_index() # converting to GeoDataFrame

# plot the tiles
ax = gdfs1.plot(figsize=(10, 10), facecolor = "none", 
                edgecolor='k', column='index', 
                cmap = "viridis")
cx.add_basemap(ax, crs=gdfs1.crs)

''' example to download only overlapping date tiles for
Sentinel-1 and Sentinel-2'''

# get common dates for Sentinel-1 and Sentinel-2
dates2 = [x.split("_")[2][:8] for x in products_dfs2["title"]]
dates1 = [x.split("_")[4][:8] for x in products_dfs1["title"]]
common = list(set([x for x in dates1 if x in dates2]))

# get product indices for selected common date
indices_s1 = (products_dfs1
              .loc[products_dfs1['title']
                   .str
                   .contains(common[0])]
              .index.to_list())

indices_s2 = (products_dfs2
              .loc[products_dfs2['title']
                   .str
                   .contains(common[0])]
              .index.to_list())
print(f"Senitnel-1 indices -> {indices_s1},\
 Senitnel-2 indices -> {indices_s2} for date {common[0]}")

# print data download urls for selected common date
print(*get_download_urls(products_dfs1, indices_s1), sep='\n')
print(*get_download_urls(products_dfs2, indices_s2), sep='\n')