#!/usr/bin/env python3
"""
Arma el archivo listo para subir a Dux por la pantalla de "Ajuste de Stock",
a partir del resultado de conciliar_stock.py (conciliacion_completa.xlsx).

Uso:
    python armar_ajuste_stock.py --conciliacion conciliacion_completa.xlsx --salida ajuste_stock_dux.xlsx

Solo incluye las filas marcadas "Se Aplico" = True (es decir, las que
conciliar_stock.py realmente decidio corregir, respetando --excluir-rubro,
--piso-cero, y dejando afuera lo que falta en Dux).

Columnas de salida (plantilla real de Dux, "Ajuste de Stock"):
    CODIGO, TALLE, COLOR, CANTIDAD DISPONIBLE, CANTIDAD MINIMA,
    TIPO MOVIMIENTO, NUMERO IDENTIFICACION TRAZABLE

- TALLE / COLOR: vacios (estos productos no usan el sistema de variantes de
  Dux, cada talle ya es un CODIGO distinto).
- CANTIDAD DISPONIBLE: el "Stock Aplicado" calculado por conciliar_stock.py.
- CANTIDAD MINIMA: vacia (no se toca el stock minimo configurado).
- TIPO MOVIMIENTO: "AJUSTE" (fijar el stock al numero indicado).
- NUMERO IDENTIFICACION TRAZABLE: vacia (no aplica, no son productos trazables).
"""

import argparse
from pathlib import Path

import pandas as pd

COLUMNAS_AJUSTE = [
    "CODIGO", "TALLE", "COLOR", "CANTIDAD DISPONIBLE",
    "CANTIDAD MÍNIMA", "TIPO MOVIMIENTO", "NUMERO IDENTIFICACION TRAZABLE",
]


def main():
    parser = argparse.ArgumentParser(description="Arma el archivo de Ajuste de Stock para Dux.")
    parser.add_argument("--conciliacion", required=True, type=Path, help="conciliacion_completa.xlsx generado por conciliar_stock.py")
    parser.add_argument("--salida", default="ajuste_stock_dux.xlsx", type=Path)
    parser.add_argument("--tipo-movimiento", default="AJUSTE", help="Valor a usar en la columna TIPO MOVIMIENTO")
    args = parser.parse_args()

    conc = pd.read_excel(args.conciliacion, dtype=str)
    conc["Se Aplico"] = conc["Se Aplico"].astype(str).str.strip().str.upper() == "TRUE"
    aplicados = conc[conc["Se Aplico"]].copy()

    salida = pd.DataFrame({
        "CODIGO": aplicados["Código"],
        "TALLE": "",
        "COLOR": "",
        "CANTIDAD DISPONIBLE": pd.to_numeric(aplicados["Stock Aplicado"], errors="coerce").astype("Int64").astype(str),
        "CANTIDAD MÍNIMA": "",
        "TIPO MOVIMIENTO": args.tipo_movimiento,
        "NUMERO IDENTIFICACION TRAZABLE": "",
    })[COLUMNAS_AJUSTE]

    salida.to_excel(args.salida, index=False)
    print(f"Listo. {len(salida)} filas para ajustar, guardadas en {args.salida}")


if __name__ == "__main__":
    main()
