"""Slide 4:5 con el estilo predeterminado de Gitana Jeans (ver ESTILO.md).

Uso: python3 texto_marca.py foto.jpg "Línea 1|Línea 2" salida.jpg [--firma] [--sub "texto chico"]
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

FONTS = Path(__file__).parent / 'fonts'
TITULAR = FONTS / 'PlayfairDisplay-BlackItalic.ttf'
FIRMA = FONTS / 'PlayfairDisplay-BoldItalic.ttf'
BLANCO, MAGENTA, MAGENTA_LINEA, ROSA = (255, 255, 255), (204, 46, 133), (196, 30, 106), (246, 184, 212)
S = 2
W, H = 1080 * S, 1350 * S


def cover(img, w, h):
    if img.width / img.height > w / h:
        nw = int(img.height * w / h); x = (img.width - nw) // 2; img = img.crop((x, 0, x + nw, img.height))
    else:
        nh = int(img.width * h / w); y = (img.height - nh) // 2; img = img.crop((0, y, img.width, y + nh))
    return img.resize((w, h), Image.LANCZOS)


def texto(base, lineas, fuente, y, relleno, borde=MAGENTA, grosor=3 * S, gap=6 * S):
    """Texto centrado con borde y sombra suave. Devuelve la y final."""
    sombra = Image.new('RGBA', base.size, (0, 0, 0, 0)); ds = ImageDraw.Draw(sombra)
    pos = []
    for ln in lineas:
        b = ds.textbbox((0, 0), ln, font=fuente, stroke_width=grosor)
        pos.append(((W - (b[2] - b[0])) / 2 - b[0], y - b[1], ln)); y += b[3] - b[1] + gap
    for x, yy, ln in pos:
        ds.text((x + 3 * S, yy + 5 * S), ln, font=fuente, fill=(0, 0, 0, 150), stroke_width=grosor, stroke_fill=(0, 0, 0, 150))
    base.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(6 * S)))
    d = ImageDraw.Draw(base)
    for x, yy, ln in pos:
        d.text((x, yy), ln, font=fuente, fill=relleno, stroke_width=grosor, stroke_fill=borde)
    return y


def slide(foto, lineas, firma=False, sub=None):
    src = Image.open(foto).convert('RGB')
    fondo = ImageEnhance.Brightness(cover(src, W, H).filter(ImageFilter.GaussianBlur(28 * S))).enhance(0.62)
    top = (395 if (firma or sub) else 235) * S
    pad = 24 * S
    ph = H - top - pad; pw = min(W - 2 * pad, int(ph * src.width / src.height)); x = (W - pw) // 2
    img = cover(src, pw, ph).filter(ImageFilter.UnsharpMask(radius=2 * S, percent=100, threshold=2))
    img = ImageEnhance.Contrast(img).enhance(1.04)
    sh = Image.new('L', (W, H), 0)
    ImageDraw.Draw(sh).rounded_rectangle((x + 8 * S, top + 10 * S, x + pw + 8 * S, top + ph + 10 * S), radius=18 * S, fill=140)
    fondo = Image.composite(Image.new('RGB', (W, H), 'black'), fondo, sh.filter(ImageFilter.GaussianBlur(14 * S)))
    m = Image.new('L', (pw, ph), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, pw - 1, ph - 1), radius=18 * S, fill=255)
    fondo.paste(img, (x, top), m)
    base = fondo.convert('RGBA')
    y = texto(base, lineas, ImageFont.truetype(str(TITULAR), 66 * S), 40 * S, BLANCO)
    if firma:
        ImageDraw.Draw(base).rounded_rectangle((W / 2 - 55 * S, y + 14 * S, W / 2 + 55 * S, y + 19 * S), radius=3 * S, fill=MAGENTA_LINEA)
        y = texto(base, ['Gitana Jeans'], ImageFont.truetype(str(FIRMA), 46 * S), y + 36 * S, ROSA, grosor=2 * S)
    if sub:
        texto(base, [sub], ImageFont.truetype(str(FIRMA), 28 * S), y + 10 * S, BLANCO, grosor=2 * S)
    return base.convert('RGB')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('foto'); ap.add_argument('texto', help='líneas separadas por |'); ap.add_argument('salida')
    ap.add_argument('--firma', action='store_true', help='línea magenta + "Gitana Jeans" (última slide)')
    ap.add_argument('--sub', help='texto chico debajo (talles, link)')
    a = ap.parse_args()
    slide(a.foto, a.texto.split('|'), a.firma, a.sub).save(a.salida, quality=95)
    print('listo:', a.salida)
