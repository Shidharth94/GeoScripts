import random # python module to generate random numbers

'''
In Python, an if-else statement allows conditional execution of code blocks. The syntax is:

if condition:
    # Code if condition is True
else:
    # Code if condition is False

An example showing how if else works.
The following example prints a statment corresponding to a value based on the random number 
generated and assigned to the variable "ndvi_val".
'''

# random numbers are generated between [-1, 1] and rounded upto 2 decimal places

ndvi_val = round(random.uniform(-1, 1), 2) 

# If-else code block 

print("The NDVI value is: ", ndvi_val, "and corresponds to", end = " ")
if ndvi_val < 0.1:
  print("areas of sand, snow or water bodies")
elif (ndvi_val >= 0.1) and (ndvi_val < 0.2):
  print("areas of barren land")
elif (ndvi_val >= 0.2) and (ndvi_val < 0.3):
  print("areas of shrubs or grassland")
elif (ndvi_val >= 0.3) and (ndvi_val < 0.7):
  print("areas of crop land")
else:
  print("areas of dense vegetation or forest") 