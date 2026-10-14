# ACTUALIZACIÓN 14/10/2026 (reemplaza lo que contradiga abajo)
- **Texto sobre fotos:** relleno **magenta `#EA2C85`** con **borde blanco fino** (2 a 3 px sobre 1080 de ancho), sin sombra. Ya no es blanco con borde magenta.
- **Decisión 14/10: la fuente se queda en Playfair Display** (se probó Abril Fatface y se descartó).
- Se mantiene Playfair Display Black Italic (títulos) y Bold Italic (firma y datos), en minúscula normal, alineado derecho, sin texto torcido. Constante `MAGENTA_NUEVO` en `texto_marca.py`.
- Títulos pequeños: no tapar cara ni producto; ubicarlos sobre pared o piso lisos.
- Fondo crema `#F6EEE3` con texto tinta `#2A211C`; piezas de fondo negro con magenta vivo `#F20278` y gris `#CDCDCD`.

# Estilo predeterminado de posts — Gitana Jeans

Aplicar por defecto en todo post, carrusel o portada de Instagram, salvo que se pida otra cosa.
Referencia: post "Hecho para moverse, pensado para durar" (septiembre 2026).

## Tipografía
| Uso | Fuente | Archivo |
|---|---|---|
| Titulares | Playfair Display **Black Italic** | `fonts/PlayfairDisplay-BlackItalic.ttf` |
| Firma "Gitana Jeans", subtítulos, talles/link | Playfair Display **Bold Italic** | `fonts/PlayfairDisplay-BoldItalic.ttf` |

- Texto en minúscula normal (tipo oración), nunca todo en mayúsculas.
- Titulares de 1 a 2 líneas, centrados.

## Colores
| Elemento | Color |
|---|---|
| Relleno del titular | Blanco `#FFFFFF` |
| Borde del titular y de los textos chicos | Magenta `#CC2E85` |
| Línea divisoria | Magenta Gitana `#C41E6A` |
| Relleno de la firma "Gitana Jeans" | Rosa claro `#F6B8D4` (con borde magenta `#CC2E85`) |
| Sombra de todos los textos | Negro al ~60 %, suave (desenfocada) |

## Composición
- Firma: línea magenta corta y, debajo, "Gitana Jeans" en rosa. En carruseles, solo en la última slide.
- El texto nunca tapa caras ni el producto (jean completo, zapatillas incluidas).
- Carrusel 4:5 con fotos verticales: foto completa centrada con esquinas redondeadas y fondo de la misma foto desenfocado; texto arriba.
- Portadas de reels (9:16): todo el texto dentro del centro 3:4 (Instagram recorta ~240 px arriba y abajo en la grilla).

## Datos fijos de la marca
- Tienda: gitanajeans.mitiendanube.com
- Talles: 34 al 44 · envíos a todo el país
- No hablar de cuerpos; sin hashtags salvo pedido; testimonios solo reales.

## Script
`texto_marca.py` aplica este estilo automáticamente:
```bash
python3 gitana-marca/texto_marca.py foto.jpg "POV: saliste de Gitana|con tu jean nuevo…" salida.jpg
python3 gitana-marca/texto_marca.py foto.jpg "All you need|is Gitana" salida.jpg --firma --sub "Talles 34 al 44 · gitanajeans.mitiendanube.com"
```
`|` separa líneas. Sale en 2160×2700 (4:5). Requiere Pillow.
