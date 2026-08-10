#!/usr/bin/env python3
"""
Generador de SKU y codigo de barra (EAN-13) para productos nuevos de Gitana Jeans,
listos para importar a Dux Software.

El SKU es un correlativo numerico simple que continua la numeracion que ya
usa Dux (ver inicializar_correlativo.py para fijar desde donde arrancar).

Uso:
    python inicializar_correlativo.py export_productos_dux.xlsx   # una sola vez / cuando quieras resincronizar
    python generar_codigos.py entrada.xlsx
    python generar_codigos.py entrada.csv

Archivo de entrada esperado (columnas, sin importar mayusculas/orden):
    Modelo    -> codigo de estilo, ej "5137"
    Producto  -> nombre del producto, ej "JEANS OXFORD MONTREAL"
    Color     -> ej "AZUL"
    Talle     -> ej "46"

Columnas opcionales:
    SKU / CodigoBarra -> si ya vienen completos en una fila, no se pisan

Salida:
    <entrada>_con_codigos.xlsx (o .csv, segun el formato de entrada)
    con las columnas SKU y CodigoBarra completadas.

Registro persistente:
    registro_codigos.csv (en esta misma carpeta) guarda la asignacion
    Modelo+Color+Talle -> SKU/CodigoBarra para que el mismo producto
    siempre reciba el mismo codigo, incluso corriendo el script varias veces.

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

REGISTRO_COLUMNAS = ["Modelo", "Color", "Talle", "SKU", "CodigoBarra"]


def normalizar_talle(talle) -> str:
    return str(talle).strip().upper()


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
                clave = (fila["Modelo"], fila["Color"], fila["Talle"])
                registro[clave] = (fila["SKU"], fila["CodigoBarra"])
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
        for (modelo, color, talle), (sku, barcode) in registro.items():
            writer.writerow([modelo, color, talle, sku, barcode])


def leer_entrada(path: Path) -> pd.DataFrame:
    if path.suffix.lower() == ".csv":
        return pd.read_csv(path, dtype=str).fillna("")
    return pd.read_excel(path, dtype=str).fillna("")


def escribir_salida(df: pd.DataFrame, path_entrada: Path):
    salida = path_entrada.with_name(path_entrada.stem + "_con_codigos" + path_entrada.suffix)
    if path_entrada.suffix.lower() == ".csv":
        df.to_csv(salida, index=False)
    else:
        df.to_excel(salida, index=False)
    return salida


def main():
    if len(sys.argv) != 2:
        print("Uso: python generar_codigos.py <archivo_entrada.xlsx|.csv>")
        sys.exit(1)

    path_entrada = Path(sys.argv[1])
    if not path_entrada.exists():
        print(f"No se encontro el archivo: {path_entrada}")
        sys.exit(1)

    df = leer_entrada(path_entrada)

    columnas_requeridas = {"Modelo", "Color", "Talle"}
    faltantes = columnas_requeridas - set(df.columns)
    if faltantes:
        print(f"Faltan columnas obligatorias en el archivo de entrada: {sorted(faltantes)}")
        sys.exit(1)

    if "SKU" not in df.columns:
        df["SKU"] = ""
    if "CodigoBarra" not in df.columns:
        df["CodigoBarra"] = ""

    registro, correlativo_barra = cargar_registro()
    estado_sku = cargar_correlativo_sku()
    siguiente_sku = estado_sku["siguiente"]
    ancho_sku = estado_sku["ancho"]
    generados = 0
    reutilizados = 0

    for idx, fila in df.iterrows():
        modelo = str(fila["Modelo"]).strip()
        color = str(fila["Color"]).strip()
        talle = normalizar_talle(fila["Talle"])
        clave = (modelo, color, talle)

        sku_actual = str(fila.get("SKU", "")).strip()
        barcode_actual = str(fila.get("CodigoBarra", "")).strip()

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

        df.at[idx, "SKU"] = sku
        df.at[idx, "CodigoBarra"] = barcode

    guardar_registro(registro)
    guardar_correlativo_sku({"siguiente": siguiente_sku, "ancho": ancho_sku})
    salida = escribir_salida(df, path_entrada)

    print(f"Listo. Codigos nuevos generados: {generados}. Reutilizados de productos existentes: {reutilizados}.")
    print(f"Archivo listo para importar a Dux: {salida}")
    print(f"Registro actualizado en: {REGISTRO_PATH}")


if __name__ == "__main__":
    main()
