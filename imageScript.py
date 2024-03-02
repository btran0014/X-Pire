import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:/Program Files/Tesseract-OCR/tesseract.exe"
import cv2
img = cv2.imread("C:/Users/shara/Documents/uOttaHack/walmart.jpg")

print(pytesseract.image_to_string(img))
cv2.imshow('Result', img)
cv2.waitKey(0)