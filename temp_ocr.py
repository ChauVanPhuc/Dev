from PIL import Image
import pytesseract
img = Image.open(r'C:\Users\Châu Văn Phúc\.gemini\antigravity-ide\brain\98847a48-aae9-4063-9870-297382234bb8\media__1784257010326.png')
print('size', img.size)
print(pytesseract.image_to_string(img, lang='vie+eng'))
