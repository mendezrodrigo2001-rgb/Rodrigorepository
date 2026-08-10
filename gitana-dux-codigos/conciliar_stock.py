#!/usr/bin/env python3
"""
Concilia el stock de una sucursal entre el export de Dux ("Consulta de
Precios y Stock") y el stock real fisico/de tienda online (export tipo
"articulos_nube"), y arma los archivos para corregir Dux.

Uso:
    python conciliar_stock.py --dux ConsultaDePreciosYStock.xls --nube articulos_nube.xlsx --columna-stock-dux "JBJ DEPOSITO"

--columna-stock-dux: nombre exacto de la columna de stock de la sucursal a
conciliar dentro del export de Dux (ej. "JBJ DEPOSITO", "GENERAL", etc.)

Salidas (en la carpeta actual):
    conciliacion_completa.xlsx      -> todos los productos, con estado
    dux_stock_corregido.xlsx        -> mismo formato que el export de Dux,
                                        con la columna de stock corregida
                                        segun el stock real (solo productos
                                        que ya existen en Dux)
    faltantes_en_dux.xlsx           -> productos con stock real pero que no
                                        existen en Dux (para darlos de alta)
    faltantes_en_nube.xlsx          -> productos en Dux que no aparecen en
                                        el archivo de stock real (para revisar)
"""

import argparse
from pathlib import Path

import pandas as pd


def detectar_fila_encabezado_dux(path: Path) -> int:
    """El export de Dux trae una fila de titulo antes del encabezado real."""
    crudo = pd.read_excel(path, header=None, dtype=str, nrows=10)
    for i, fila in crudo.iterrows():
        valores = [str(v).strip() for v in fila.tolist()]
        if "Código" in valores and "Producto" in valores:
            return i
    raise ValueError("No pude encontrar la fila de encabezado (Código/Producto) en el export de Dux.")


def a_numero(serie: pd.Series) -> pd.Series:
    return pd.to_numeric(serie.astype(str).str.strip(), errors="coerce")


def clasificar(fila) -> str:
    en_dux = pd.notna(fila["_en_dux"])
    en_nube = pd.notna(fila["_en_nube"])
    if en_dux and en_nube:
        return "OK" if fila["Diferencia"] == 0 else "AJUSTAR"
    if en_nube and not en_dux:
        return "FALTA_EN_DUX"
    return "FALTA_EN_NUBE"


def main():
    parser = argparse.ArgumentParser(description="Concilia stock Dux vs stock real (nube/fisico).")
    parser.add_argument("--dux", required=True, type=Path, help="Export de Dux 'Consulta de Precios y Stock' (.xls/.xlsx)")
    parser.add_argument("--nube", required=True, type=Path, help="Export de stock real tipo 'articulos_nube' (.xlsx/.csv)")
    parser.add_argument("--columna-stock-dux", default="JBJ DEPOSITO", help="Columna de stock de la sucursal en el export de Dux")
    args = parser.parse_args()

    fila_header = detectar_fila_encabezado_dux(args.dux)
    dux = pd.read_excel(args.dux, header=fila_header, dtype=str)
    dux.columns = [str(c).strip() for c in dux.columns]
    dux["Código"] = dux["Código"].astype(str).str.strip()
    dux = dux[dux["Código"] != ""]

    if args.columna_stock_dux not in dux.columns:
        raise SystemExit(
            f"La columna '{args.columna_stock_dux}' no existe en el export de Dux. "
            f"Columnas disponibles: {list(dux.columns)}"
        )

    if args.nube.suffix.lower() == ".csv":
        nube = pd.read_csv(args.nube, dtype=str)
    else:
        nube = pd.read_excel(args.nube, dtype=str)
    nube.columns = [str(c).strip() for c in nube.columns]
    nube["SKU"] = nube["SKU"].astype(str).str.strip()
    nube = nube[nube["SKU"] != ""]
    duplicados_exactos = nube.duplicated().sum()
    nube = nube.drop_duplicates()

    dux["_en_dux"] = 1
    nube["_en_nube"] = 1

    merge = pd.merge(
        dux[["Código", "Producto", "Talle", "Color", args.columna_stock_dux, "Código Barra", "_en_dux"]],
        nube[["SKU", "NOMBRE", "TALLE", "STOCK", "_en_nube"]],
        left_on="Código", right_on="SKU", how="outer",
    )

    merge["Código"] = merge["Código"].fillna(merge["SKU"])
    merge["Stock Dux"] = a_numero(merge[args.columna_stock_dux])
    merge["Stock Real"] = a_numero(merge["STOCK"])
    merge["Diferencia"] = merge["Stock Real"] - merge["Stock Dux"]
    merge["Estado"] = merge.apply(clasificar, axis=1)
    merge["Stock Negativo"] = merge["Stock Real"] < 0

    columnas_finales = [
        "Código", "Producto", "NOMBRE", "Talle", "TALLE", "Color", "Código Barra",
        "Stock Dux", "Stock Real", "Diferencia", "Estado", "Stock Negativo",
    ]
    conciliacion = merge[columnas_finales].sort_values(["Estado", "Código"])
    conciliacion.to_excel("conciliacion_completa.xlsx", index=False)

    # Dux corregido: mismo formato del export original, solo se pisa la
    # columna de stock de la sucursal para los codigos que existen en Dux.
    dux_corregido = dux.drop(columns=["_en_dux"]).copy()
    stock_real_por_codigo = merge.set_index("Código")["Stock Real"]
    mask_con_dato_real = dux_corregido["Código"].isin(stock_real_por_codigo.dropna().index)
    dux_corregido.loc[mask_con_dato_real, args.columna_stock_dux] = (
        dux_corregido.loc[mask_con_dato_real, "Código"].map(stock_real_por_codigo).astype("Int64").astype(str)
    )
    dux_corregido.to_excel("dux_stock_corregido.xlsx", index=False)

    faltantes_en_dux = conciliacion[conciliacion["Estado"] == "FALTA_EN_DUX"]
    faltantes_en_dux.to_excel("faltantes_en_dux.xlsx", index=False)

    faltantes_en_nube = conciliacion[conciliacion["Estado"] == "FALTA_EN_NUBE"]
    faltantes_en_nube.to_excel("faltantes_en_nube.xlsx", index=False)

    resumen = conciliacion["Estado"].value_counts()
    negativos = int(conciliacion["Stock Negativo"].sum())

    print("=== Resumen de conciliacion ===")
    for estado, cantidad in resumen.items():
        print(f"  {estado}: {cantidad}")
    print(f"  Con stock real NEGATIVO: {negativos}")
    if duplicados_exactos:
        print(f"  Aviso: se descartaron {duplicados_exactos} filas duplicadas exactas en el archivo de nube.")
    print()
    print("Archivos generados:")
    print("  conciliacion_completa.xlsx  (todo, con columna Estado)")
    print("  dux_stock_corregido.xlsx    (mismo formato del export de Dux, stock corregido)")
    print("  faltantes_en_dux.xlsx       (productos con stock real que no existen en Dux)")
    print("  faltantes_en_nube.xlsx      (productos en Dux que no aparecen en el stock real)")


if __name__ == "__main__":
    main()
