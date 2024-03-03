import pytesseract
pytesseract.pytesseract.tesseract_cmd = "tesseract.exe"
import csv
import re
from os.path import dirname, join
from PIL import Image
import io


class Food:
    def __init__(self, name, expiry_date):
        self.name = name
        self.expiry_date = expiry_date

#gets rid of special characters and nums
def wordify(input_string):
    return ''.join(filter(lambda c: c.isalpha() or c.isspace(), input_string))

def main(arg1):
    image = Image.open(io.BytesIO(arg1))
    ingredient_path = 'ingredients_dataset.csv'
    fruitveg_path = 'fruitveg.csv'
    meat_path = 'meats.csv'
    dairy_path = 'dairy.csv'
    bread_path = 'bread.csv'
    
    img = image
    # imgToText = pytesseract.image_to_string(img).lower()
    # imgToText = wordify(imgToText)
    # words_list = imgToText.split()

    # ingreds = []

    # with open(ingredient_path, mode='r') as ingredient_file, \
    #     open(fruitveg_path, mode='r') as fruitveg_file, \
    #     open(meat_path, mode = 'r') as meat_file, \
    #     open(dairy_path, mode = 'r') as dairy_file, \
    #     open(bread_path, mode = 'r') as bread_file:

    #     # Read data from the ingredient CSV file
    #     csv_reader = csv.reader(ingredient_file)
    #     ingredient_rows = list(csv_reader)
    #     items_in_ingredient_csv = [item for sublist in ingredient_rows for item in sublist]

    #     # Read data from the fruit and veg CSV file
    #     csv_reader = csv.reader(fruitveg_file)
    #     fruitveg_rows = list(csv_reader)
    #     items_in_fruit_csv = [item for sublist in fruitveg_rows for item in sublist]

    #     # Read data from the dairy CSV file
    #     csv_reader = csv.reader(dairy_file)
    #     dairy_rows = list(csv_reader)
    #     items_in_dairy_csv = [item for sublist in dairy_rows for item in sublist]

    #     # Read data from the meat CSV file
    #     csv_reader = csv.reader(meat_file)
    #     meat_rows = list(csv_reader)
    #     items_in_meat_csv = [item for sublist in meat_rows for item in sublist]

    #     # Read data from the bread CSV file
    #     csv_reader = csv.reader(bread_file)
    #     bread_rows = list(csv_reader)
    #     items_in_bread_csv = [item for sublist in bread_rows for item in sublist]
        
    #     for word in words_list:
    #         if word in items_in_ingredient_csv and bool(re.search(r'\d', word)) == False and word not in ingreds:
    #             if word in items_in_fruit_csv:
    #                 ingreds.append(Food(name = word, expiry_date = "7 days"))
    #             elif word in items_in_meat_csv:
    #                 ingreds.append(Food(name = word, expiry_date = "5 days"))
    #             elif word in items_in_dairy_csv:
    #                 ingreds.append(Food(name = word, expiry_date = "14 days"))
    #             elif word in items_in_bread_csv:
    #                 ingreds.append(Food(name = word, expiry_date = "7 days"))
    #             else:
    #                 ingreds.append(Food(name = word, expiry_date = "60 days"))
                
    #     for food in ingreds:
    #         #print(food.name, food.expiry_date)