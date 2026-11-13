---
name: vuelos-baratos
description: Cazador de vuelos baratos "no obvios". Usar SIEMPRE que el usuario pida encontrar vuelos, pasajes, tickets, ofertas aéreas, tarifas error, viajar barato, millas/Smiles/award, "¿cuánto sale volar a…?", escapadas, o comparar opciones de viaje en avión. Arma una matriz de búsqueda que una persona común no arma (aeropuertos alternativos y de otro país, split-ticket por hubs, hidden-city, open-jaw, quinta libertad, país de venta, millas, error fares), busca precios reales en la web y rankea por COSTO REAL (equipaje, traslados, noches, percepciones impositivas, millas, tiempo y riesgo).
---

# Vuelos baratos — modo cazador

Objetivo: no "buscar un vuelo", sino **atacar el precio desde 10 ángulos** y devolver
las 3–5 mejores jugadas con costo real, riesgo y cómo comprarlas.

Archivos de la skill (rutas relativas a esta carpeta):
- `scripts/vuelos.py` — motor de estrategia (solo stdlib). Correr con `python3`.
- `data/airports.csv` — ~193 aeropuertos con coordenadas, región, tipo (H hub / L low-cost / M menor) y metro. Si falta un aeropuerto, **agregalo** (una línea).
- `references/tacticas.md` — las 14 tácticas, cuándo sirven y sus riesgos. **Leer en cada búsqueda.**
- `references/millas.md` — sweet spots de millas y cómo valuarlas.
- `references/argentina.md` — trucos locales (impuestos, pago en USD, cuotas, salir por MVD/SCL/GRU, low-costs, temporadas de ofertas).
- `references/fuentes.md` — dónde se publican error fares y promos, y cómo buscarlas.

## Flujo

### 1. Intake (máx. 1 pregunta, el resto con defaults)
Necesitás: origen, destino (o "a cualquier lado"), fechas o ventana, flexibilidad, pasajeros,
equipaje, pasaporte/visas, medio de pago (pesos/dólares/tarjeta), millas que tenga.
Si falta algo, asumí y decilo: flex ±3 días, 1 adulto, equipaje de mano, pasaporte argentino,
origen MDQ/BUE si el usuario es de Argentina y no dice otra cosa.

### 2. Generar la matriz
```bash
python3 scripts/vuelos.py plan ORIG DEST --ida AAAA-MM-DD [--vuelta AAAA-MM-DD] --flex 3 --radio 450
```
Te da: orígenes alternativos (incl. otro país), destinos alternativos/open-jaw, hubs de
split-ticket con desvío, super-conectores de largo radio, candidatos hidden-city, quinta
libertad, grilla de fechas, anticipación y links listos (Google Flights, Skyscanner y Kayak
en varios países de venta, Momondo).
Sub-comandos sueltos: `cerca`, `split`, `hidden`, `links`, `costo`, `escaneo`
(`escaneo` usa la API gratuita de Travelpayouts si existe `TRAVELPAYOUTS_TOKEN` y hay red).

### 3. Buscar precios reales (no inventar NUNCA un precio)
- Con WebSearch: rutas + mes + "promo"/"oferta"/"error fare"/"tarifa", precio piso histórico
  de la ruta, promos vigentes de las aerolíneas que vuelan la ruta y de Smiles/Aerolíneas Plus/LATAM Pass.
- Con el agente `web-fetch` (o navegador si está disponible): abrir los links del paso 2.
  Si el sitio no carga por scraping, decilo y dejá el link para que el usuario lo abra.
- Buscar en las fuentes de `references/fuentes.md` (Secret Flying, Promociones Aéreas,
  Turismocity, etc.) con `site:` en WebSearch.
- Toda cifra va con fuente y fecha de consulta. Si no la pudiste verificar: "estimado" y por qué.

### 4. Aplicar las tácticas (references/tacticas.md)
Probá como mínimo: fechas ±flex · 2 orígenes alternativos · 1 país de venta distinto ·
2 hubs de split · millas · open-jaw · y, si es solo ida y sin valija, hidden-city.
Para cada táctica que no aplica, una línea de por qué.

### 5. Rankear por costo real
Armá un JSON (ver `data/ejemplo_opciones.json`) con las finalistas y corré:
```bash
python3 scripts/vuelos.py costo opciones.json
```
Campos: `precio, equipaje, asiento, traslado, visa, noches_extra, hotel_noche, horas_extra,
valor_hora, pago (usd|tarjeta_ars), percepcion_pct, millas, valor_milla, riesgo (bajo|medio|alto)`.

### 6. Entregar
Formato de respuesta:
1. **La jugada ganadora** en 2 líneas: qué comprar, dónde, cuánto de bolsillo, ahorro vs. la opción obvia.
2. **Tabla top 3–5** (salida de `costo`) + columna "cómo comprarlo".
3. **Riesgos y letra chica** de cada jugada (split/hidden/self-transfer/visas de tránsito).
4. **Plan B y alertas**: qué alertas dejar activadas, precio objetivo ("si baja de X, comprá").
5. Links.

Si el usuario lo pide o la búsqueda es grande, guardá el informe en un archivo `.md` en el repo
o publicá un artifact.

## Reglas
- La "opción obvia" (directo, buscador local, pago en pesos) SIEMPRE va como línea base para mostrar el ahorro.
- Hidden-city y split: explicá los riesgos SIN sermonear y dejá que el usuario decida. Nunca hidden-city con valija despachada ni en ida y vuelta.
- Revisá visas de tránsito y "self-transfer" (recoger valija y volver a despachar) en cada split.
- Las reglas impositivas argentinas y las rutas de quinta libertad cambian: verificá vigencia con WebSearch antes de afirmarlas.
- No uses VPN para "engañar" precios como recomendación central: mencioná el cambio de país de venta como táctica legítima (comprar en el sitio de otro país), con sus límites (tarjeta, moneda, reembolsos).
