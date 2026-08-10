# Generador de SKU y código de barra para Dux (Gitana Jeans)

Genera automáticamente el **SKU** y el **código de barra (EAN-13)** de productos
nuevos antes de importarlos a Dux Software:

- **SKU**: correlativo numérico simple que **continúa la numeración que ya usa
  Dux** (ej. si el último SKU cargado es `001002`, el próximo nuevo es
  `001003`, `001004`...). No depende de modelo/color/talle, solo sube de a uno
  por cada variante nueva.
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

### 1. Fijar desde qué número sigue el SKU (solo la primera vez, o cuando quieras resincronizar)

Exportá desde Dux el listado completo de productos actuales (tiene que incluir
la columna de SKU) y corré:

```bash
python inicializar_correlativo.py export_productos_dux.xlsx
```

El script detecta sola la columna de SKU (busca nombres como `SKU`, `Codigo`,
`Codigo Interno`...; si no la encuentra, pasala manual con `--columna "Nombre Exacto"`),
ignora códigos con un formato distinto al habitual (para no romper la
correlación por un caso suelto raro), calcula el máximo SKU numérico
actualmente en uso, y guarda en `correlativo_sku.json` desde qué número debe
seguir. Podés volver a correrlo más adelante con un export actualizado: el
contador solo avanza, nunca retrocede.

### 2. Generar SKU y código de barra para productos nuevos

Preparar un Excel o CSV con los productos nuevos, con estas columnas:

| Modelo | Producto              | Color | Talle |
|--------|------------------------|-------|-------|
| 5137   | JEANS OXFORD MONTREAL  | AZUL  | 44    |
| 5137   | JEANS OXFORD MONTREAL  | AZUL  | 46    |

(ver `ejemplo_entrada.csv` como referencia)

```bash
python generar_codigos.py mis_productos_nuevos.xlsx
```

Se genera `mis_productos_nuevos_con_codigos.xlsx` con dos columnas nuevas,
**SKU** y **CodigoBarra**, listo para importar a Dux por la función de
importación masiva.

## Cómo evita duplicados

Cada vez que corre, el script guarda las asignaciones en `registro_codigos.csv`
(en esta misma carpeta). Si volvés a correrlo con el mismo archivo, o si un
producto ya existente (mismo Modelo + Color + Talle) aparece de nuevo, **reusa
el mismo código** en vez de generar uno nuevo — así el SKU y el código de
barra de un producto no cambian nunca.

**Importante:** no borres `registro_codigos.csv` ni `correlativo_sku.json`,
son la única fuente de verdad de qué códigos ya están en uso. Conviene
commitearlos al repo o guardarlos en un lugar con backup.

## Columnas opcionales en el archivo de entrada

- `SKU` / `CodigoBarra`: si una fila ya trae estos valores completos, el
  script los respeta y no los pisa (útil para reimportar productos existentes
  sin tocar sus códigos).

## Personalizar el esquema

Si Dux o el proceso de depósito necesita otro formato, todo está centralizado:

- `inicializar_correlativo.py`: detección de la columna de SKU y cálculo del
  ancho/próximo número.
- `generar_codigos.py` → `generar_ean13()` / `PREFIJO_INTERNO`: formato del
  código de barra.
