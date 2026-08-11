#!/usr/bin/env python3
"""
Generador de SKU (CODIGO) y codigo de barra (COD BARRA, formato EAN-13) para
productos nuevos de Gitana Jeans, sobre la plantilla real de importacion
masiva de Dux Software.

El SKU es un correlativo numerico simple que continua la numeracion que ya
usa Dux (ver inicializar_correlativo.py para fijar desde donde arrancar).

Uso:
    python inicializar_correlativo.py export_productos_dux.xlsx   # una sola vez / cuando quieras resincronizar
    python generar_codigos.py entrada.xlsx
    python generar_codigos.py entrada.csv

Funciona con dos formatos de entrada:

1. Plantilla real de Dux (recomendado): cualquier archivo con las columnas
   de la plantilla de importacion masiva de Dux. Solo hacen falta las
   columnas CODIGO, COD BARRA y PRODUCTO (el resto de las columnas de la
   plantilla se dejan como esten). Cada fila con PRODUCTO distinto se toma
   como un producto/variante distinto.

2. Formato simplificado (compatibilidad hacia atras): columnas Modelo,
   Producto, Color, Talle, con columnas de salida SKU / CodigoBarra.

Columnas opcionales:
    CODIGO/SKU y COD BARRA/CodigoBarra -> si una fila ya los trae
    completos, no se pisan.

Salida:
    <entrada>_con_codigos.xlsx (o .csv, segun el formato de entrada)
    con las columnas de codigo completadas.

Registro persistente:
    registro_codigos.csv (en esta misma carpeta) guarda la asignacion
    de cada producto/variante -> SKU/CodigoBarra para que el mismo
    producto siempre reciba el mismo codigo, incluso corriendo el
    script varias veces.

    correlativo_sku.json guarda el proximo numero de SKU a asignar (lo
    genera/actualiza inicializar_correlativo.py a partir de un export de Dux).
"""

import csv
import json
import sys
from pathlib import Path

import pandas as pd

CARPETA = Path(__file__).parent
REGISTRO_PATH = CARPETA / "registro_codigos.csv"
CORRELATIVO_PATH = CARPETA / "correlativo_sku.json"

PREFIJO_INTERNO = "20"  # rango 20-29 de EAN-13 reservado para uso interno/in-store
LARGO_CUERPO = 10  # digitos entre el prefijo y el digito verificador (12 - len(prefijo))

REGISTRO_COLUMNAS = ["Clave", "SKU", "CodigoBarra"]

# Distintos nombres posibles de columna, en orden de preferencia. El primero
# que exista en el archivo se usa; si ninguno existe, se crea el primero.
CANDIDATOS_COLUMNA_SKU = ["CODIGO", "SKU"]
CANDIDATOS_COLUMNA_BARRA = ["COD BARRA", "CODIGO DE BARRA", "CodigoBarra"]


def resolver_columna(df: pd.DataFrame, candidatos: list[str]) -> str:
    columnas_normalizadas = {c.strip().upper(): c for c in df.columns}
    for candidato in candidatos:
        if candidato.strip().upper() in columnas_normalizadas:
            return columnas_normalizadas[candidato.strip().upper()]
    nombre_nuevo = candidatos[0]
    df[nombre_nuevo] = ""
    return nombre_nuevo


def construir_clave(fila: pd.Series, columnas: list[str]) -> str:
    """Identidad unica de la fila: Modelo+Color+Talle si existen, si no PRODUCTO."""
    if {"Modelo", "Color", "Talle"}.issubset(columnas):
        return "|".join([
            str(fila["Modelo"]).strip(),
            str(fila["Color"]).strip(),
            str(fila["Talle"]).strip().upper(),
        ])
    if "PRODUCTO" in columnas:
        return str(fila["PRODUCTO"]).strip().upper()
    raise ValueError(
        "El archivo de entrada necesita columnas Modelo+Color+Talle, "
        "o una columna PRODUCTO (formato plantilla Dux), para poder "
        "identificar cada producto de forma unica."
    )


def cargar_correlativo_sku() -> dict:
    if CORRELATIVO_PATH.exists():
        with open(CORRELATIVO_PATH, encoding="utf-8") as f:
            return json.load(f)
    print(
        "No encontre correlativo_sku.json. Corre primero:\n"
        "    python inicializar_correlativo.py <export_de_productos_dux.xlsx>\n"
        "para fijar desde que numero debe seguir el SKU. "
        "Por ahora arranco desde 1 (ancho 6 digitos)."
    )
    return {"siguiente": 1, "ancho": 6}


def guardar_correlativo_sku(estado: dict):
    with open(CORRELATIVO_PATH, "w", encoding="utf-8") as f:
        json.dump(estado, f, indent=2)


def calcular_digito_verificador(cuerpo_12_digitos: str) -> str:
    total = 0
    for i, ch in enumerate(cuerpo_12_digitos):
        n = int(ch)
        # posiciones 1-based: impares peso 1, pares peso 3
        peso = 1 if (i % 2 == 0) else 3
        total += n * peso
    digito = (10 - (total % 10)) % 10
    return str(digito)


def generar_ean13(correlativo: int) -> str:
    cuerpo = str(correlativo).zfill(LARGO_CUERPO)
    if len(cuerpo) > LARGO_CUERPO:
        raise ValueError("Se agoto el rango de codigos de barra internos (20-XXXXXXXXXX-C).")
    doce_digitos = PREFIJO_INTERNO + cuerpo
    dv = calcular_digito_verificador(doce_digitos)
    return doce_digitos + dv


def cargar_registro():
    registro = {}
    siguiente_correlativo = 0
    if REGISTRO_PATH.exists():
        with open(REGISTRO_PATH, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for fila in reader:
                registro[fila["Clave"]] = (fila["SKU"], fila["CodigoBarra"])
                cuerpo = fila["CodigoBarra"][len(PREFIJO_INTERNO):-1]
                try:
                    siguiente_correlativo = max(siguiente_correlativo, int(cuerpo) + 1)
                except ValueError:
                    pass
    return registro, siguiente_correlativo


def guardar_registro(registro: dict):
    with open(REGISTRO_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(REGISTRO_COLUMNAS)
        for clave, (sku, barcode) in registro.items():
            writer.writerow([clave, sku, barcode])


def leer_entrada(path: Path) -> pd.DataFrame:
    if path.suffix.lower() == ".csv":
        return pd.read_csv(path, dtype=str).fillna("")
    return pd.read_excel(path, dtype=str).fillna("")


def escribir_salida(df: pd.DataFrame, path_entrada: Path):
    sufijo = path_entrada.suffix if path_entrada.suffix.lower() in (".csv", ".xlsx") else ".xlsx"
    salida = path_entrada.with_name(path_entrada.stem + "_con_codigos" + sufijo)
    if sufijo == ".csv":
        df.to_csv(salida, index=False)
    else:
        df.to_excel(salida, index=False)
    return salida


def main():
    if len(sys.argv) != 2:
        print("Uso: python generar_codigos.py <archivo_entrada.xlsx|.xls|.csv>")
        sys.exit(1)

    path_entrada = Path(sys.argv[1])
    if not path_entrada.exists():
        print(f"No se encontro el archivo: {path_entrada}")
        sys.exit(1)

    df = leer_entrada(path_entrada)

    col_sku = resolver_columna(df, CANDIDATOS_COLUMNA_SKU)
    col_barra = resolver_columna(df, CANDIDATOS_COLUMNA_BARRA)

    registro, correlativo_barra = cargar_registro()
    estado_sku = cargar_correlativo_sku()
    siguiente_sku = estado_sku["siguiente"]
    ancho_sku = estado_sku["ancho"]
    generados = 0
    reutilizados = 0

    for idx, fila in df.iterrows():
        clave = construir_clave(fila, list(df.columns))

        sku_actual = str(fila.get(col_sku, "")).strip()
        barcode_actual = str(fila.get(col_barra, "")).strip()

        if sku_actual and barcode_actual:
            registro[clave] = (sku_actual, barcode_actual)
            continue

        if clave in registro:
            sku, barcode = registro[clave]
            reutilizados += 1
        else:
            sku = str(siguiente_sku).zfill(ancho_sku)
            siguiente_sku += 1
            barcode = generar_ean13(correlativo_barra)
            correlativo_barra += 1
            registro[clave] = (sku, barcode)
            generados += 1

        df.at[idx, col_sku] = sku
        df.at[idx, col_barra] = barcode

    guardar_registro(registro)
    guardar_correlativo_sku({"siguiente": siguiente_sku, "ancho": ancho_sku})
    salida = escribir_salida(df, path_entrada)

    print(f"Listo. Codigos nuevos generados: {generados}. Reutilizados de productos existentes: {reutilizados}.")
    print(f"Archivo listo para importar a Dux: {salida}")
    print(f"Registro actualizado en: {REGISTRO_PATH}")


if __name__ == "__main__":
    main()
