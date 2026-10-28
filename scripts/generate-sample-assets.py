import os
import shutil
from PIL import Image, ImageDraw, ImageFilter, ExifTags

os.makedirs('public/samples', exist_ok=True)

# 1. c2pa-valid.jpg
shutil.copyfile('tests/fixtures/c2pa/adobe-20220124-C.jpg', 'public/samples/c2pa-valid.jpg')
print("Copied c2pa-valid.jpg")

# 2. c2pa-tampered.jpg
shutil.copyfile('tests/fixtures/c2pa/adobe-20220124-C-tampered.jpg', 'public/samples/c2pa-tampered.jpg')
print("Copied c2pa-tampered.jpg")

# 3. unsigned-real.jpg: A rich 1200x800 photographic landscape with camera EXIF tags
width, height = 1200, 800
img = Image.new('RGB', (width, height))
draw = ImageDraw.Draw(img)

# Sky gradient (dawn / golden hour)
for y in range(450):
    r = int(245 - (y / 450) * 110)
    g = int(180 - (y / 450) * 60)
    b = int(140 + (y / 450) * 80)
    draw.line([(0, y), (width, y)], fill=(r, g, b))

# Sun
draw.ellipse([850, 150, 970, 270], fill=(255, 235, 170))

# Distant Mountains
mountain_points = [
    (0, 480), (180, 320), (350, 420), (520, 280), (700, 390),
    (880, 290), (1050, 370), (1200, 310), (1200, 800), (0, 800)
]
draw.polygon(mountain_points, fill=(70, 85, 120))

# Closer Hills
hill_points = [
    (0, 560), (220, 470), (450, 540), (680, 460), (920, 520),
    (1150, 480), (1200, 500), (1200, 800), (0, 800)
]
draw.polygon(hill_points, fill=(45, 60, 80))

# Foreground valley
draw.rectangle([(0, 620), (width, height)], fill=(30, 45, 40))

# Add standard EXIF metadata
exif = img.getexif()
# Make = 271, Model = 272, Software = 305, DateTime = 306
exif[271] = "Sony"
exif[272] = "ILCE-7RM5"
exif[305] = "OriginLens Real Capture v1.0"
exif[306] = "2026:10:27 07:15:32"

img.save('public/samples/unsigned-real.jpg', 'JPEG', quality=92, exif=exif)
print("Generated unsigned-real.jpg")

# 4. compare-original.jpg & compare-edited.jpg
# Base landscape for comparison
base_img = Image.new('RGB', (width, height))
base_draw = ImageDraw.Draw(base_img)

# Ocean and sky horizon
for y in range(400):
    r = int(100 + (y / 400) * 80)
    g = int(160 + (y / 400) * 60)
    b = int(230 - (y / 400) * 30)
    base_draw.line([(0, y), (width, y)], fill=(r, g, b))

# Ocean gradient
for y in range(400, height):
    progress = (y - 400) / 400
    r = int(20 + progress * 20)
    g = int(70 + progress * 50)
    b = int(140 + progress * 40)
    base_draw.line([(0, y), (width, y)], fill=(r, g, b))

# Island
base_draw.ellipse([300, 360, 600, 440], fill=(40, 70, 45))
base_draw.ellipse([450, 340, 750, 430], fill=(50, 85, 55))

# Save original
base_img.save('public/samples/compare-original.jpg', 'JPEG', quality=95)
print("Generated compare-original.jpg")

# Edited version: warm color grade + added sailboat element on the water
edited_img = base_img.copy()
# Warm filter shift
r_ch, g_ch, b_ch = edited_img.split()
r_ch = r_ch.point(lambda i: min(255, int(i * 1.15)))
b_ch = b_ch.point(lambda i: int(i * 0.88))
edited_img = Image.merge('RGB', (r_ch, g_ch, b_ch))
edited_draw = ImageDraw.Draw(edited_img)

# Draw sailboat on water (x: 820..870, y: 460..540)
# Sail
edited_draw.polygon([(840, 460), (840, 520), (875, 520)], fill=(245, 245, 250))
# Mast
edited_draw.line([(840, 455), (840, 525)], fill=(60, 40, 30), width=3)
# Hull
edited_draw.polygon([(820, 525), (865, 525), (855, 540), (830, 540)], fill=(180, 50, 40))

edited_img.save('public/samples/compare-edited.jpg', 'JPEG', quality=95)
print("Generated compare-edited.jpg")

# 5. ai-generated-sd.png: PNG with Stable Diffusion parameters chunk
ai_img = Image.new('RGB', (512, 512), color=(40, 30, 60))
ai_draw = ImageDraw.Draw(ai_img)
for i in range(10):
    ai_draw.rectangle([50 + i * 20, 50 + i * 20, 460 - i * 20, 460 - i * 20], outline=(100 + i * 15, 80 + i * 10, 200 - i * 10), width=2)

from PIL.PngImagePlugin import PngInfo
target_info = PngInfo()
target_info.add_text("parameters", "cyberpunk neon street at midnight, ultra detailed 8k octane render\nNegative prompt: blurry, bad anatomy\nSteps: 30, Sampler: DPM++ 2M Karras, CFG scale: 7, Seed: 123456789, Model: stable-diffusion-v1-5")
target_info.add_text("Software", "Stable Diffusion WebUI AUTOMATIC1111")

ai_img.save('public/samples/ai-generated-sd.png', 'PNG', pnginfo=target_info)
print("Generated ai-generated-sd.png")
