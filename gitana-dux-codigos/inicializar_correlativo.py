#!/usr/bin/env python3
"""
Lee un export de productos ya existentes en Dux y calcula desde donde debe
seguir la correlacion de SKU para los productos nuevos.

Uso:
    python inicializar_correlativo.py export_productos_dux.xlsx
    python inicializar_correlativo.py export_productos_dux.csv --columna "Codigo Interno"

Busca en el archivo una columna de SKU (por defecto intenta detectarla sola
entre nombres comunes: SKU, Codigo, Codigo Interno, etc.), toma todos los
valores que son puramente numericos (ignora codigos viejos con letras u
otros formatos), y guarda en correlativo_sku.json:
    - "siguiente": el proximo numero a usar (maximo encontrado + 1)
    - "ancho": la cantidad de digitos con la que rellenar con ceros a la
      izquierda (tomada del SKU numerico mas largo encontrado)

Se puede correr de nuevo mas adelante (ej. tras exportar un listado
actualizado): el "siguiente" solo avanza, nunca retrocede.
"""

import argparse
import json
import re
from collections import Counter
from pathlib import Path

import pandas as pd

CARPETA = Path(__file__).parent
CORRELATIVO_PATH = CARPETA / "correlativo_sku.json"

NOMBRES_COLUMNA_SKU = [
    "sku", "codigo", "código", "codigo interno", "código interno",
    "cod. interno", "cod interno", "codigo de articulo", "código de artículo",
]


def detectar_columna_sku(df: pd.DataFrame, columna_manual: str | None) -> str:
    if columna_manual:
        if columna_manual not in df.columns:
            raise ValueError(f"La columna '{columna_manual}' no existe en el archivo. Columnas disponibles: {list(df.columns)}")
        return columna_manual

    for col in df.columns:
        if col.strip().lower() in NOMBRES_COLUMNA_SKU:
            return col

    raise ValueError(
        "No pude detectar automaticamente la columna de SKU. "
        f"Columnas disponibles: {list(df.columns)}. "
        "Volve a correr pasando --columna \"Nombre Exacto De La Columna\"."
    )


def leer_archivo(path: Path) -> pd.DataFrame:
    if path.suffix.lower() == ".csv":
        return pd.read_csv(path, dtype=str).fillna("")
    return pd.read_excel(path, dtype=str).fillna("")


def cargar_estado() -> dict:
    if CORRELATIVO_PATH.exists():
        with open(CORRELATIVO_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {"siguiente": 1, "ancho": 6}


def guardar_estado(estado: dict):
    with open(CORRELATIVO_PATH, "w", encoding="utf-8") as f:
        json.dump(estado, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Inicializa/actualiza la correlacion de SKU a partir de un export de Dux.")
    parser.add_argument("archivo", type=Path, help="Export de productos existentes (xlsx o csv)")
    parser.add_argument("--columna", default=None, help="Nombre exacto de la columna de SKU, si no se detecta sola")
    args = parser.parse_args()

    if not args.archivo.exists():
        print(f"No se encontro el archivo: {args.archivo}")
        raise SystemExit(1)

    df = leer_archivo(args.archivo)
    columna = detectar_columna_sku(df, args.columna)

    valores_numericos = [v.strip() for v in df[columna] if re.fullmatch(r"\d+", v.strip())]

    if not valores_numericos:
        print(f"No encontre ningun SKU puramente numerico en la columna '{columna}'.")
        print("Si los SKU actuales tienen letras u otro formato, contame el patron para ajustar el script.")
        raise SystemExit(1)

    # Uso el ancho de digitos MAS FRECUENTE (no el maximo) para no dejar que un
    # codigo suelto con otro formato (ej. un codigo de barra viejo cargado por
    # error en el campo SKU) distorsione la correlacion real.
    anchos = Counter(len(v) for v in valores_numericos)
    ancho_dominante, cantidad_dominante = anchos.most_common(1)[0]

    valores_del_ancho_dominante = [v for v in valores_numericos if len(v) == ancho_dominante]
    max_valor = max(int(v) for v in valores_del_ancho_dominante)

    descartados = len(valores_numericos) - len(valores_del_ancho_dominante)
    if descartados:
        otros_anchos = sorted(a for a in anchos if a != ancho_dominante)
        print(
            f"Aviso: ignore {descartados} SKU con otra cantidad de digitos "
            f"({otros_anchos}) por no ser el formato mas comun ({ancho_dominante} digitos, "
            f"{cantidad_dominante} SKU). Si eso esta mal, revisa la columna '{columna}' "
            "o pasa --columna con la columna correcta."
        )

    estado = cargar_estado()
    nuevo_siguiente = max(estado.get("siguiente", 1), max_valor + 1)
    nuevo_ancho = max(estado.get("ancho", ancho_dominante), ancho_dominante)

    estado = {"siguiente": nuevo_siguiente, "ancho": nuevo_ancho}
    guardar_estado(estado)

    print(f"Columna de SKU detectada: '{columna}'")
    print(f"SKU numerico mas alto encontrado: {max_valor} (ancho {ancho_dominante} digitos)")
    print(f"Proximo SKU a asignar: {str(nuevo_siguiente).zfill(nuevo_ancho)}")
    print(f"Guardado en: {CORRELATIVO_PATH}")


if __name__ == "__main__":
    main()
