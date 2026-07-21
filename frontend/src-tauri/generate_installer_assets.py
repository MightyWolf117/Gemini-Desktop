import os
from PIL import Image, ImageDraw, ImageFont

# Dimensiones requeridas por WiX
BANNER_WIDTH, BANNER_HEIGHT = 493, 58
DIALOG_WIDTH, DIALOG_HEIGHT = 493, 312

# Colores del tema de la app (Orbit)
BG_COLOR = (15, 15, 19)      # #0F0F13
PRIMARY_COLOR = (82, 113, 255) # #5271FF

def create_banner():
    # El banner de WiX es 493x58.
    # WiX dibuja texto negro en la parte izquierda.
    # Así que el fondo debe ser BLANCO o claro en la izquierda.
    img = Image.new('RGB', (BANNER_WIDTH, BANNER_HEIGHT), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Try to load a nice font, fallback to default
    try:
        font = ImageFont.truetype("arialbd.ttf", 24)
    except IOError:
        font = ImageFont.load_default()
        
    text = "Orbit"
    try:
        text_bbox = draw.textbbox((0, 0), text, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        text_h = text_bbox[3] - text_bbox[1]
    except AttributeError:
        text_w, text_h = draw.textsize(text, font=font)
        
    # Dibujar un bloque oscuro a la derecha para el logo
    right_box_width = text_w + 40
    draw.rectangle([(BANNER_WIDTH - right_box_width, 0), (BANNER_WIDTH, BANNER_HEIGHT)], fill=BG_COLOR)
    
    x = BANNER_WIDTH - text_w - 20
    y = (BANNER_HEIGHT - text_h) // 2
    
    # Texto a la derecha
    draw.text((x, y), text, fill=PRIMARY_COLOR, font=font)
    
    # Línea de acento azul en el borde inferior a lo largo de todo el banner
    draw.line([(0, BANNER_HEIGHT-2), (BANNER_WIDTH, BANNER_HEIGHT-2)], fill=PRIMARY_COLOR, width=2)
    
    img.save('installer_banner.bmp', format='BMP')
    print("Created installer_banner.bmp")

def create_dialog():
    # El dialog de WiX es 493x312.
    # WiX dibuja el texto de bienvenida en la parte derecha (aprox desde x=164 hasta 493).
    # Esa zona DEBE ser blanca para que se lea el texto negro de Windows.
    img = Image.new('RGB', (DIALOG_WIDTH, DIALOG_HEIGHT), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # El panel izquierdo de 164px de ancho será oscuro con el branding
    left_panel_width = 164
    draw.rectangle([(0, 0), (left_panel_width, DIALOG_HEIGHT)], fill=BG_COLOR)
    
    # Formas decorativas en el panel izquierdo
    for i in range(0, DIALOG_HEIGHT, 15):
        alpha = int(255 * (i / DIALOG_HEIGHT))
        draw.line([(0, i), (left_panel_width, i + 50)], fill=(82, 113, 255), width=1)
    
    try:
        font_large = ImageFont.truetype("arialbd.ttf", 36)
        font_small = ImageFont.truetype("arial.ttf", 14)
    except IOError:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Dibujar "Orbit" rotado o centrado en el panel izquierdo
    text = "ORBIT"
    try:
        text_bbox = draw.textbbox((0, 0), text, font=font_large)
        text_w = text_bbox[2] - text_bbox[0]
    except AttributeError:
        text_w, _ = draw.textsize(text, font=font_large)
        
    x_pos = (left_panel_width - text_w) // 2
    draw.text((x_pos, 100), text, fill=PRIMARY_COLOR, font=font_large)
    
    subtext = "Assistant"
    try:
        sub_bbox = draw.textbbox((0, 0), subtext, font=font_small)
        sub_w = sub_bbox[2] - sub_bbox[0]
    except AttributeError:
        sub_w, _ = draw.textsize(subtext, font=font_small)
        
    draw.text(((left_panel_width - sub_w) // 2, 145), subtext, fill=(160, 160, 171), font=font_small)
    
    # Línea divisoria entre panel oscuro y fondo blanco
    draw.line([(left_panel_width, 0), (left_panel_width, DIALOG_HEIGHT)], fill=PRIMARY_COLOR, width=2)
    
    img.save('installer_dialog.bmp', format='BMP')
    print("Created installer_dialog.bmp")

if __name__ == '__main__':
    create_banner()
    create_dialog()
