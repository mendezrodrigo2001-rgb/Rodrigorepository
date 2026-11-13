#!/usr/bin/env python3
"""
vuelos.py — motor de estrategia para encontrar vuelos baratos "no obvios".

No reemplaza a un buscador: genera la MATRIZ de búsqueda que una persona normal
no arma (aeropuertos alternativos, hubs para split-ticket, candidatos hidden-city,
open-jaw, grilla de fechas, links listos para varios buscadores y países de venta)
y calcula el COSTO REAL de cada opción para rankearlas.

Solo usa la librería estándar. Subcomandos:

  plan     ORIG DEST --ida AAAA-MM-DD [--vuelta AAAA-MM-DD] [--flex N] [--radio KM]
  cerca    IATA [--radio KM]
  split    ORIG DEST [--max-desvio 1.25]
  hidden   ORIG DEST
  links    ORIG DEST --ida AAAA-MM-DD [--vuelta AAAA-MM-DD]
  costo    opciones.json
  escaneo  ORIG DEST --mes AAAA-MM      (opcional, requiere TRAVELPAYOUTS_TOKEN y red)

ORIG/DEST aceptan código IATA de aeropuerto (EZE) o de ciudad/metro (BUE, LON, NYC).
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import math
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
AIRPORTS_CSV = BASE / "data" / "airports.csv"

REGION_NOMBRE = {
    "SA": "Sudamérica", "CA": "Centroamérica/Caribe/México", "NA": "Norteamérica",
    "EU": "Europa", "ME": "Medio Oriente", "AF": "África", "AS": "Asia", "OC": "Oceanía",
}

# Low-costs relevantes por región (para sugerir tramos "pegados" a mano).
LCC = {
    "SA": "Flybondi, JetSMART, Sky Airline, Gol, Azul, Arajet, Wingo, Paranair",
    "CA": "Viva Aerobus, Volaris, Arajet, Wingo, JetBlue (Caribe)",
    "NA": "Spirit, Frontier, Southwest, JetBlue, Breeze, Avelo, Allegiant, Flair, Porter",
    "EU": "Ryanair, easyJet, Wizz Air, Vueling, Volotea, Transavia, Norwegian, Eurowings, "
          "Pegasus, LEVEL (largo radio BCN↔EZE/SCL), French bee, Norse Atlantic",
    "ME": "flydubai, Air Arabia, flynas, Jazeera, SalamAir",
    "AF": "Air Arabia Maroc, FlySafair, Lift, Jambojet",
    "AS": "AirAsia, Scoot, VietJet, Cebu Pacific, Peach, Zipair, Jeju Air, IndiGo, Spring",
    "OC": "Jetstar, Virgin Australia (tarifas Lite)",
}

SUPERCONECTORES = ["IST", "DOH", "DXB", "AUH", "ADD", "MAD", "LIS", "PTY", "BOG", "MIA", "GRU", "SCL"]

# Rutas de 5ª libertad conocidas (aerolínea "premium" volando un tramo corto/medio
# entre dos países que no son el suyo). Suelen ser más baratas o mejores que la
# competencia directa. VERIFICAR VIGENCIA: cambian por temporada.
QUINTA_LIBERTAD = [
    ("GIG", "EZE", "Emirates (DXB-GIG-EZE)"),
    ("GRU", "EZE", "Ethiopian / Turkish (operaciones vía GRU, según temporada)"),
    ("JFK", "MXP", "Emirates"),
    ("EWR", "ATH", "Emirates"),
    ("JFK", "FRA", "Singapore Airlines"),
    ("IAH", "MAN", "Singapore Airlines"),
    ("MIA", "BOG", "Emirates (vía BOG, según temporada)"),
    ("BKK", "HKG", "Emirates"),
    ("SIN", "MEL", "Emirates"),
    ("SYD", "AKL", "Emirates / LATAM (tramo de SCL-SYD-AKL según temporada)"),
    ("LIS", "GRU", "TAP/otros: chequear tramos intermedios en rutas a África"),
    ("NBO", "LOS", "Ethiopian/Kenya: tramos regionales con equipos de largo radio"),
]


# ----------------------------------------------------------------------------- datos

def cargar_aeropuertos() -> dict[str, dict]:
    aps = {}
    with open(AIRPORTS_CSV, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            r["lat"] = float(r["lat"])
            r["lon"] = float(r["lon"])
            aps[r["iata"]] = r
    return aps


AP = cargar_aeropuertos()
METROS: dict[str, list[str]] = {}
for _c, _a in AP.items():
    if _a["metro"]:
        METROS.setdefault(_a["metro"], []).append(_c)


def resolver(codigo: str) -> list[str]:
    c = codigo.upper()
    if c in METROS:
        return METROS[c]
    if c in AP:
        return [c]
    sys.exit(f"Código desconocido: {codigo}. Agregalo a data/airports.csv "
             f"(iata,ciudad,pais,region,lat,lon,tipo,metro).")


def principal(codigo: str) -> dict:
    """Aeropuerto representativo (el primer hub del metro)."""
    cods = resolver(codigo)
    hubs = [c for c in cods if AP[c]["tipo"] == "H"]
    return AP[(hubs or cods)[0]]


def km(a: dict, b: dict) -> float:
    R = 6371.0
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dp = p2 - p1
    dl = math.radians(b["lon"] - a["lon"])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def fecha(s: str) -> dt.date:
    return dt.date.fromisoformat(s)


# ----------------------------------------------------------------------------- análisis

def cercanos(codigo: str, radio: float) -> list[tuple[dict, float]]:
    base = principal(codigo)
    propios = set(resolver(codigo))
    out = []
    for c, a in AP.items():
        if c in propios:
            continue
        d = km(base, a)
        if d <= radio:
            out.append((a, d))
    return sorted(out, key=lambda x: x[1])


def candidatos_split(orig: str, dest: str, max_desvio: float) -> list[tuple[dict, float, float]]:
    """Hubs donde cortar el viaje en 2 tickets separados sin desviarse demasiado."""
    o, d = principal(orig), principal(dest)
    directo = km(o, d)
    excl = set(resolver(orig)) | set(resolver(dest))
    out = []
    for c, h in AP.items():
        if c in excl or h["tipo"] not in ("H", "L"):
            continue
        tramo1, tramo2 = km(o, h), km(h, d)
        if tramo1 < 400 or tramo2 < 400:  # lo cercano ya lo cubre "posicionamiento"
            continue
        desvio = (tramo1 + tramo2) / directo
        if desvio <= max_desvio:
            out.append((h, desvio, tramo1 / (tramo1 + tramo2)))
    # preferimos hubs y desvío bajo
    out.sort(key=lambda x: (round(x[1], 2) + (0 if x[0]["tipo"] == "H" else 0.03)))
    return out


def superconectores(orig: str, dest: str) -> list[tuple[dict, float, float]]:
    """En largo radio, Golfo/Estambul/Adís y hubs ibéricos suelen ganar en precio
    aunque el desvío geométrico sea mayor. Se muestran aparte (desvío ≤1.45)."""
    o, d = principal(orig), principal(dest)
    directo = km(o, d)
    if directo < 6000:
        return []
    excl = set(resolver(orig)) | set(resolver(dest))
    out = []
    for c in SUPERCONECTORES:
        if c in excl:
            continue
        t1, t2 = km(o, AP[c]), km(AP[c], d)
        desv = (t1 + t2) / directo
        if desv <= 1.45 and min(t1, t2) > 400:
            out.append((AP[c], desv, t1 / (t1 + t2)))
    return sorted(out, key=lambda x: x[1])


def linea_superconectores(orig: str, dest: str) -> str:
    sc = superconectores(orig, dest)
    if not sc:
        return ""
    return ("\n**Super-conectores (largo radio, tarifas agresivas aunque desvíen):** " +
            ", ".join(f"{x['iata']} ({x['ciudad']}, desvío {dv:.2f})" for x, dv, _ in sc))


def candidatos_hidden(orig: str, dest: str, max_desvio: float = 1.30) -> list[tuple[dict, float]]:
    """Destinos 'más allá' de DEST cuya ruta lógica conecta en DEST.
    Comprar ORIG→X y bajarse en DEST (skiplagging)."""
    o, d = principal(orig), principal(dest)
    od = km(o, d)
    excl = set(resolver(orig)) | set(resolver(dest))
    out = []
    for c, x in AP.items():
        if c in excl:
            continue
        ox, dx = km(o, x), km(d, x)
        if dx < 150 or ox <= od or dx > max(0.6 * od, 3000):
            continue
        ratio = (od + dx) / ox
        if ratio <= max_desvio:
            out.append((x, ratio))
    return sorted(out, key=lambda t: t[1])[:20]


def grilla_fechas(ida: dt.date, flex: int) -> list[tuple[dt.date, str]]:
    dias = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]
    out = []
    for k in range(-flex, flex + 1):
        f = ida + dt.timedelta(days=k)
        tag = dias[f.weekday()]
        if f.weekday() in (1, 2, 5):
            tag += " ★"  # mar/mié/sáb suelen ser algo más baratos (heurística débil)
        out.append((f, tag))
    return out


# ----------------------------------------------------------------------------- links

def links(orig: str, dest: str, ida: dt.date, vuelta: dt.date | None) -> dict[str, str]:
    o, d = orig.upper(), dest.upper()
    L = {}
    q = f"Flights from {o} to {d} on {ida.isoformat()}"
    if vuelta:
        q += f" through {vuelta.isoformat()}"
    L["Google Flights"] = "https://www.google.com/travel/flights?q=" + urllib.parse.quote(q) + "&curr=USD"
    sk_i = ida.strftime("%y%m%d")
    sk = f"{o.lower()}/{d.lower()}/{sk_i}/"
    if vuelta:
        sk += vuelta.strftime("%y%m%d") + "/"
    for pos, dom in [("AR", "www.skyscanner.com.ar"), ("BR", "www.skyscanner.com.br"),
                     ("CL", "www.skyscanner.cl"), ("ES", "www.skyscanner.es"),
                     ("US", "www.skyscanner.com")]:
        L[f"Skyscanner ({pos})"] = f"https://{dom}/transport/flights/{sk}?currency=USD"
    ky = f"{o}-{d}/{ida.isoformat()}-flexible-3days"
    if vuelta:
        ky += f"/{vuelta.isoformat()}-flexible-3days"
    for pos, dom in [("AR", "www.kayak.com.ar"), ("US", "www.kayak.com"), ("BR", "www.kayak.com.br")]:
        L[f"Kayak ({pos}, ±3 días)"] = f"https://{dom}/flights/{ky}?sort=price_a"
    mo = f"{o}-{d}/{ida.isoformat()}" + (f"/{vuelta.isoformat()}" if vuelta else "")
    L["Momondo"] = f"https://www.momondo.com/flight-search/{mo}?sort=price_a"
    L["Skyscanner 'a todas partes' desde origen"] = f"https://www.skyscanner.com.ar/transport/flights-from/{o.lower()}/"
    L["Google Flights Explore (mapa)"] = "https://www.google.com/travel/explore"
    return L


# ----------------------------------------------------------------------------- costo real

def costo_real(op: dict, defaults: dict) -> dict:
    """Suma todo lo que el precio publicado NO muestra."""
    g = lambda k, dflt=0: op.get(k, defaults.get(k, dflt))
    precio = g("precio")
    extras = g("equipaje") + g("asiento") + g("traslado") + g("visa") + g("comida_escala")
    # millas: costo de oportunidad (lo que valen/costarían). Default 1.2 ¢/milla.
    millas_usd = g("millas") * g("valor_milla", 0.012)
    noches = g("noches_extra") * g("hotel_noche")
    impuesto = 0.0
    if g("pago") == "tarjeta_ars":
        impuesto = (precio + g("equipaje") + g("asiento")) * g("percepcion_pct", 30) / 100
    tiempo = g("horas_extra") * g("valor_hora", 5)
    # colchón de riesgo: split/hidden/conexión corta pueden salir mal
    riesgo_pct = {"bajo": 0, "medio": 5, "alto": 15}.get(g("riesgo", "bajo"), 0)
    colchon = (precio + extras) * riesgo_pct / 100
    total_cash = precio + extras + noches + impuesto
    total_ajustado = total_cash + millas_usd + tiempo + colchon
    return {
        "nombre": op.get("nombre", "?"), "precio": precio, "extras": extras, "noches": noches,
        "impuesto": impuesto, "cash": total_cash, "millas_usd": millas_usd, "tiempo": tiempo, "colchon": colchon,
        "ajustado": total_ajustado, "riesgo": g("riesgo", "bajo"),
        "reembolso_tc": g("devolucion_percepcion", False),
    }


# ----------------------------------------------------------------------------- comandos

def h(t: str):
    print(f"\n## {t}\n")


def cmd_cerca(a):
    base = principal(a.iata)
    h(f"Aeropuertos a ≤{a.radio:.0f} km de {base['iata']} ({base['ciudad']})")
    print("| IATA | Ciudad | País | km | tipo |")
    print("|---|---|---|---|---|")
    for c in resolver(a.iata):
        if c != base["iata"]:
            ap = AP[c]
            print(f"| {ap['iata']} | {ap['ciudad']} (mismo metro) | {ap['pais']} | {km(base, ap):.0f} | {ap['tipo']} |")
    for ap, d in cercanos(a.iata, a.radio):
        print(f"| {ap['iata']} | {ap['ciudad']} | {ap['pais']} | {d:.0f} | {ap['tipo']} |")


def cmd_split(a):
    o, d = principal(a.orig), principal(a.dest)
    h(f"Split-ticket: hubs entre {o['iata']} y {d['iata']} (directo ≈ {km(o, d):.0f} km)")
    print("Comprá ORIG→HUB y HUB→DEST como tickets separados (o HUB como 'escala larga').")
    print("Desvío = distancia total / directa. ≤1.10 excelente · ≤1.25 aceptable.\n")
    print("| Hub | Ciudad | Región | Desvío | Punto del viaje |")
    print("|---|---|---|---|---|")
    for hub, desv, frac in candidatos_split(a.orig, a.dest, a.max_desvio)[:25]:
        print(f"| {hub['iata']} | {hub['ciudad']} | {hub['region']} | {desv:.2f} | {frac*100:.0f}% |")
    print(linea_superconectores(a.orig, a.dest))
    regs = {o["region"], d["region"]}
    h("Low-costs para armar tramos a mano")
    for r in regs:
        print(f"- **{REGION_NOMBRE[r]}**: {LCC[r]}")


def cmd_hidden(a):
    o, d = principal(a.orig), principal(a.dest)
    h(f"Hidden-city: destinos 'más allá' de {d['iata']} saliendo de {o['iata']}")
    if d["tipo"] != "H":
        print(f"> ⚠️ {d['iata']} no es hub: es poco probable que haya conexiones 'más allá'. Igual se listan.\n")
    print("Buscá ORIG→X. Si el itinerario conecta en DEST y es más barato que ORIG→DEST, "
          "te bajás en DEST.\n**Solo ida, sin equipaje despachado, sin número de viajero frecuente.**\n")
    print("| X (destino final del ticket) | Ciudad | Región | Desvío vía DEST |")
    print("|---|---|---|---|")
    for x, r in candidatos_hidden(a.orig, a.dest):
        print(f"| {x['iata']} | {x['ciudad']} | {x['region']} | {r:.2f} |")
    print("\n> Riesgos: la aerolínea puede cancelar el resto del ticket, cobrar la diferencia o "
          "cerrar tu cuenta de millas; si hay cambio de ruta/irregularidad te pueden reprogramar vía otro hub. "
          "Nunca en tickets de ida y vuelta (se cae la vuelta).")


def cmd_links(a):
    ida = fecha(a.ida)
    vuelta = fecha(a.vuelta) if a.vuelta else None
    h(f"Links de búsqueda {a.orig.upper()} → {a.dest.upper()}")
    for k, v in links(a.orig, a.dest, ida, vuelta).items():
        print(f"- [{k}]({v})")


def cmd_plan(a):
    ida = fecha(a.ida)
    vuelta = fecha(a.vuelta) if a.vuelta else None
    o, d = principal(a.orig), principal(a.dest)
    dist = km(o, d)
    print(f"# Plan de caza: {a.orig.upper()} → {a.dest.upper()}")
    print(f"\n{o['ciudad']} ({REGION_NOMBRE[o['region']]}) → {d['ciudad']} ({REGION_NOMBRE[d['region']]}) "
          f"· ≈ {dist:,.0f} km · ida {ida}" + (f" · vuelta {vuelta}" if vuelta else " · solo ida"))

    h("1. Orígenes alternativos (posicionamiento)")
    print("Salir de otro aeropuerto / otro país puede cambiar el precio radicalmente "
          "(otra competencia, otros impuestos, otra moneda).\n")
    alt_o = cercanos(a.orig, a.radio)
    for ap, dd in alt_o[:12]:
        cruza = " · 🌎 otro país" if ap["pais"] != o["pais"] else ""
        print(f"- **{ap['iata']}** {ap['ciudad']} — {dd:.0f} km{cruza}")
    if not alt_o:
        print("- (ninguno en el radio; probá --radio mayor)")

    h("2. Destinos alternativos / open-jaw")
    print("Volar a uno y volver desde otro (open-jaw) o aterrizar en un aeropuerto de low-cost y "
          "moverte por tierra/tren.\n")
    for ap, dd in cercanos(a.dest, a.radio)[:12]:
        print(f"- **{ap['iata']}** {ap['ciudad']} — {dd:.0f} km")

    h("3. Split-ticket por hubs")
    print("| Hub | Ciudad | Desvío | % del viaje |")
    print("|---|---|---|---|")
    for hub, desv, frac in candidatos_split(a.orig, a.dest, a.max_desvio)[:14]:
        print(f"| {hub['iata']} | {hub['ciudad']} | {desv:.2f} | {frac*100:.0f}% |")
    print(linea_superconectores(a.orig, a.dest))
    print("\nLow-costs útiles: " + " · ".join(
        f"**{REGION_NOMBRE[r]}**: {LCC[r]}" for r in sorted({o['region'], d['region']})))
    print("\n> Dejá ≥4 h de conexión en split (≥1 noche si es intercontinental) y "
          "comprá seguro que cubra conexiones perdidas o tarifa flexible en el 2º tramo.")

    h("4. Hidden-city (solo ida, riesgo alto)")
    hid = candidatos_hidden(a.orig, a.dest)[:8]
    if hid:
        print("Tickets ORIG→X que probablemente conecten en DEST: " +
              ", ".join(f"{x['iata']} ({x['ciudad']})" for x, _ in hid))
    else:
        print("Sin candidatos geométricos claros.")

    h("5. Quinta libertad que tocan origen/destino/hubs")
    rel = set(resolver(a.orig)) | set(resolver(a.dest)) | {ap['iata'] for ap, _ in alt_o} | \
        {x["iata"] for x, *_ in candidatos_split(a.orig, a.dest, a.max_desvio)[:10]}
    hits = [q for q in QUINTA_LIBERTAD if q[0] in rel or q[1] in rel]
    for x, y, aer in hits or []:
        print(f"- {x}↔{y}: {aer} (verificar vigencia)")
    if not hits:
        print("- Ninguna conocida en esta zona (lista en el script, ampliable).")

    h("6. Grilla de fechas (ida)")
    print("★ = mar/mié/sáb (heurística débil; lo que manda es la grilla real del buscador)\n")
    print(" · ".join(f"{f.strftime('%d/%m')} {t}" for f, t in grilla_fechas(ida, a.flex)))
    dias_ant = (ida - dt.date.today()).days
    if dias_ant >= 0:
        consejo = ("muy temprano: activá alertas y esperá" if dias_ant > 300 else
                   "zona buena para internacional (2–8 meses)" if dias_ant >= 60 else
                   "zona buena para regional (3–8 semanas)" if dias_ant >= 21 else
                   "último momento: priorizá split, hidden-city y millas (suelen liberar asientos)")
        print(f"\nAnticipación: {dias_ant} días → {consejo}.")

    h("7. Links listos")
    for k, v in links(a.orig, a.dest, ida, vuelta).items():
        print(f"- [{k}]({v})")
    for ap, _ in alt_o[:3]:
        gl = links(ap["iata"], a.dest, ida, vuelta)["Google Flights"]
        print(f"- [Google Flights desde {ap['iata']}]({gl})")

    h("8. Próximos pasos (checklist)")
    print("""- [ ] Correr la grilla de fechas ±flex en Google Flights / Kayak flexible y anotar el piso.
- [ ] Repetir desde 2–3 orígenes alternativos y con 2 países de venta (AR vs. BR/CL/US).
- [ ] Probar 2–3 hubs de split y sumar low-cost + conexión.
- [ ] Cotizar en millas (ver references/millas.md) y comparar valor por milla.
- [ ] Buscar error fares / promos activas (references/fuentes.md).
- [ ] Meter las finalistas en un JSON y correr `vuelos.py costo` para rankear por costo REAL.""")


def cmd_costo(a):
    data = json.loads(Path(a.archivo).read_text(encoding="utf-8"))
    defaults = data.get("defaults", {}) if isinstance(data, dict) else {}
    ops = data["opciones"] if isinstance(data, dict) else data
    res = sorted((costo_real(op, defaults) for op in ops), key=lambda r: r["ajustado"])
    print("# Ranking por costo real (USD)\n")
    print("| # | Opción | Tarifa | Extras | Noches | Percepción | **Cash total** | Millas (USD) | Tiempo | Riesgo | **Ajustado** |")
    print("|---|---|---|---|---|---|---|---|---|---|---|")
    for i, r in enumerate(res, 1):
        print(f"| {i} | {r['nombre']} | {r['precio']:.0f} | {r['extras']:.0f} | {r['noches']:.0f} | "
              f"{r['impuesto']:.0f} | **{r['cash']:.0f}** | {r['millas_usd']:.0f} | {r['tiempo']:.0f} | {r['riesgo']} "
              f"(+{r['colchon']:.0f}) | **{r['ajustado']:.0f}** |")
    best = res[0]
    print(f"\nGanadora: **{best['nombre']}** — {best['cash']:.0f} USD de bolsillo, "
          f"{best['ajustado']:.0f} ajustado por millas, tiempo y riesgo.")
    if any(r["impuesto"] for r in res):
        print("\n> La percepción se calcula sobre tarifa+extras pagados en pesos con tarjeta. "
              "Pagando con dólares propios (débito de cuenta en USD) normalmente no aplica; "
              "si aplica, es a cuenta de Ganancias/Bienes Personales (recuperable en algunos casos). "
              "Verificá la normativa vigente.")


def cmd_escaneo(a):
    tok = os.environ.get("TRAVELPAYOUTS_TOKEN")
    if not tok:
        sys.exit("Falta TRAVELPAYOUTS_TOKEN (gratis en travelpayouts.com → Aviasales Data API). "
                 "Sin token, usá `plan` + búsqueda web.")
    origenes = [a.orig.upper()] + [ap["iata"] for ap, _ in cercanos(a.orig, a.radio)[:a.max_origenes]]
    filas = []
    for org in origenes:
        params = {"origin": org, "destination": a.dest.upper(), "departure_at": a.mes,
                  "currency": "usd", "sorting": "price", "limit": 10, "token": tok}
        if a.vuelta_mes:
            params["return_at"] = a.vuelta_mes
        else:
            params["one_way"] = "true"
        url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates?" + urllib.parse.urlencode(params)
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                js = json.load(r)
        except Exception as e:  # noqa: BLE001
            print(f"- {org}: error {e}", file=sys.stderr)
            continue
        for it in js.get("data", []):
            filas.append((it.get("price"), org, it.get("destination"), it.get("departure_at", "")[:10],
                          it.get("return_at", "")[:10] if it.get("return_at") else "-",
                          it.get("airline"), it.get("transfers")))
    filas.sort(key=lambda t: t[0] or 1e9)
    print(f"# Escaneo de precios cacheados (Aviasales) → {a.dest.upper()} en {a.mes}\n")
    print("> Son precios vistos recientemente por otros usuarios, no garantizados. Usalos para "
          "detectar fechas/orígenes baratos y después confirmá en el buscador.\n")
    print("| USD | Origen | Destino | Ida | Vuelta | Aerolínea | Escalas |")
    print("|---|---|---|---|---|---|---|")
    for f in filas[:30]:
        print("| " + " | ".join(str(x) for x in f) + " |")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = p.add_subparsers(dest="cmd", required=True)

    s = sp.add_parser("plan")
    s.add_argument("orig"); s.add_argument("dest")
    s.add_argument("--ida", required=True); s.add_argument("--vuelta")
    s.add_argument("--flex", type=int, default=3)
    s.add_argument("--radio", type=float, default=450)
    s.add_argument("--max-desvio", type=float, default=1.25)
    s.set_defaults(f=cmd_plan)

    s = sp.add_parser("cerca"); s.add_argument("iata"); s.add_argument("--radio", type=float, default=450)
    s.set_defaults(f=cmd_cerca)

    s = sp.add_parser("split"); s.add_argument("orig"); s.add_argument("dest")
    s.add_argument("--max-desvio", type=float, default=1.25); s.set_defaults(f=cmd_split)

    s = sp.add_parser("hidden"); s.add_argument("orig"); s.add_argument("dest"); s.set_defaults(f=cmd_hidden)

    s = sp.add_parser("links"); s.add_argument("orig"); s.add_argument("dest")
    s.add_argument("--ida", required=True); s.add_argument("--vuelta"); s.set_defaults(f=cmd_links)

    s = sp.add_parser("costo"); s.add_argument("archivo"); s.set_defaults(f=cmd_costo)

    s = sp.add_parser("escaneo"); s.add_argument("orig"); s.add_argument("dest")
    s.add_argument("--mes", required=True, help="AAAA-MM o AAAA-MM-DD")
    s.add_argument("--vuelta-mes")
    s.add_argument("--radio", type=float, default=450)
    s.add_argument("--max-origenes", type=int, default=4)
    s.set_defaults(f=cmd_escaneo)

    a = p.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
