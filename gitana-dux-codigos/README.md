# Generador de SKU y código de barra para Dux (Gitana Jeans)

Genera automáticamente el **SKU (columna `CODIGO`)** y el **código de barra
(columna `COD BARRA`, formato EAN-13)** de productos nuevos, directamente
sobre la planilla de importación masiva de Dux:

- **SKU**: correlativo numérico simple que **continúa la numeración que ya usa
  Dux** (ej. si el último SKU cargado es `001002`, el próximo nuevo es
  `001003`, `001004`...). Sube de a uno por cada producto/variante nuevo.
- **Código de barra**: EAN-13 real (13 dígitos con dígito verificador), usando
  el prefijo `20` reservado internacionalmente para uso interno/in-store, así
  nunca choca con un código de barra de otra marca. Es 100% escaneable en
  cualquier lector estándar.

`plantilla_dux_original.xls` es la plantilla real de importación masiva de
Dux (solo encabezados, sin datos) — sirve de referencia de qué columnas
espera Dux.

## Instalación

```bash
cd gitana-dux-codigos
pip install -r requirements.txt
```

## Uso

### 1. Fijar desde qué número sigue el SKU (solo la primera vez, o cuando quieras resincronizar)

Exportá desde Dux el listado completo de productos actuales (con su columna
`CODIGO`) y corré:

```bash
python inicializar_correlativo.py export_productos_dux.xlsx
```

El script detecta sola la columna de SKU (busca nombres como `CODIGO`, `SKU`,
`Codigo Interno`...; si no la encuentra, pasala manual con `--columna "Nombre Exacto"`),
ignora códigos con un formato distinto al habitual (para no romper la
correlación por un caso suelto raro), calcula el máximo SKU numérico
actualmente en uso, y guarda en `correlativo_sku.json` desde qué número debe
seguir. Podés volver a correrlo más adelante con un export actualizado: el
contador solo avanza, nunca retrocede.

### 2. Generar SKU y código de barra para productos nuevos

Completá la planilla de productos nuevos usando el mismo formato que exporta/importa
Dux (columnas `CODIGO`, `COD BARRA`, `PRODUCTO`, `RUBRO`, `MARCA`, etc. — dejá
`CODIGO` y `COD BARRA` vacíos). Ver `ejemplo_entrada_dux.xlsx` como referencia,
y `ejemplo_entrada_dux_con_codigos.xlsx` para ver cómo queda después de
correr el script.

```bash
python generar_codigos.py mis_productos_nuevos.xlsx
```

Se genera `mis_productos_nuevos_con_codigos.xlsx` con las columnas `CODIGO` y
`COD BARRA` completadas, listo para importar a Dux por la función de
importación masiva — el resto de las columnas (rubro, marca, IVA, etc.)
quedan intactas tal como las cargaste.

También acepta un formato simplificado con columnas `Modelo`, `Producto`,
`Color`, `Talle` (ver `ejemplo_entrada.csv`), útil si preferís armar la
planilla de productos nuevos aparte y después pasar los datos a la plantilla
de Dux a mano.

## Cómo evita duplicados

Cada vez que corre, el script guarda las asignaciones en `registro_codigos.csv`
(en esta misma carpeta). Si volvés a correrlo con el mismo archivo, o si un
producto ya existente (mismo `PRODUCTO`, o mismo Modelo+Color+Talle) aparece
de nuevo, **reusa el mismo código** en vez de generar uno nuevo — así el SKU
y el código de barra de un producto no cambian nunca.

**Importante:** no borres `registro_codigos.csv` ni `correlativo_sku.json`,
son la única fuente de verdad de qué códigos ya están en uso. Conviene
commitearlos al repo o guardarlos en un lugar con backup.

## Columnas opcionales en el archivo de entrada

- `CODIGO`/`SKU` y `COD BARRA`/`CodigoBarra`: si una fila ya trae estos
  valores completos, el script los respeta y no los pisa (útil para
  reimportar productos existentes sin tocar sus códigos).

## Personalizar el esquema

Si Dux o el proceso de depósito necesita otro formato, todo está centralizado:

- `inicializar_correlativo.py`: detección de la columna de SKU y cálculo del
  ancho/próximo número.
- `generar_codigos.py` → `generar_ean13()` / `PREFIJO_INTERNO`: formato del
  código de barra.
