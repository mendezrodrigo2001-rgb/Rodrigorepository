# Generador de SKU y código de barra para Dux (Gitana Jeans)

Genera automáticamente el **SKU** y el **código de barra (EAN-13)** de productos
nuevos antes de importarlos a Dux Software, siguiendo un esquema consistente:

- **SKU**: `MODELO-COLOR-TALLE` → ej. `5137-AZU-46`
- **Código de barra**: EAN-13 real (13 dígitos con dígito verificador), usando
  el prefijo `20` reservado internacionalmente para uso interno/in-store, así
  nunca choca con un código de barra de otra marca. Es 100% escaneable en
  cualquier lector estándar.

## Instalación

```bash
cd gitana-dux-codigos
pip install -r requirements.txt
```

## Uso

1. Preparar un Excel o CSV con los productos nuevos, con estas columnas:

   | Modelo | Producto              | Color | Talle |
   |--------|------------------------|-------|-------|
   | 5137   | JEANS OXFORD MONTREAL  | AZUL  | 44    |
   | 5137   | JEANS OXFORD MONTREAL  | AZUL  | 46    |

   (ver `ejemplo_entrada.csv` como referencia)

2. Correr el script:

   ```bash
   python generar_codigos.py mis_productos_nuevos.xlsx
   ```

3. Se genera `mis_productos_nuevos_con_codigos.xlsx` con dos columnas nuevas,
   **SKU** y **CodigoBarra**, listo para importar a Dux por la función de
   importación masiva.

## Cómo evita duplicados

Cada vez que corre, el script guarda las asignaciones en `registro_codigos.csv`
(en esta misma carpeta). Si volvés a correrlo con el mismo archivo, o si un
producto ya existente (mismo Modelo + Color + Talle) aparece de nuevo, **reusa
el mismo código** en vez de generar uno nuevo — así el SKU y el código de
barra de un producto no cambian nunca.

**Importante:** no borres `registro_codigos.csv`, es la única fuente de
verdad de qué códigos ya están en uso. Conviene commitearlo al repo o
guardarlo en un lugar con backup.

## Columnas opcionales

- `ColorCodigo`: si querés forzar una abreviatura de color específica en el
  SKU en vez de que se autogenere (ej. `ColorCodigo=CL` para "Celeste Lavado").
- `SKU` / `CodigoBarra`: si una fila ya trae estos valores completos, el
  script los respeta y no los pisa (útil para reimportar productos existentes
  sin tocar sus códigos).

## Personalizar el esquema

Si Dux o el proceso de depósito necesita otro formato de SKU o de código de
barra, todo está centralizado en `generar_codigos.py`:

- `abreviar_color()`: lógica de abreviación de color.
- `generar_ean13()` / `PREFIJO_INTERNO`: formato del código de barra.
