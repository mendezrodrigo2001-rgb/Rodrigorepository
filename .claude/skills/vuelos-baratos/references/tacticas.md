# Las 14 tácticas (de menor a mayor riesgo)

Cada una con: qué es · cuándo rinde · cómo ejecutarla · riesgo.

## 1. Flexibilidad de fechas real (no ±1 día)
- **Qué:** mirar la grilla/gráfico de precios de todo el mes, no una fecha.
- **Cuándo rinde:** siempre. En largo radio la diferencia entre días suele ser 20–40 %.
- **Cómo:** Google Flights → "Grilla de fechas" y "Gráfico de precios"; Kayak `-flexible-3days`; Skyscanner "mes entero".
- **Tip:** volver un martes/miércoles o salir un sábado suele ayudar, pero es heurística débil; manda la grilla.
- **Riesgo:** ninguno.

## 2. Aeropuertos alternativos y posicionamiento
- **Qué:** salir/llegar a otro aeropuerto, incluso de otro país (MDQ → EZE/AEP/MVD; LON → STN/LTN; MIL → BGY).
- **Cuándo rinde:** cuando el aeropuerto "natural" tiene poca competencia o impuestos altos. Desde Argentina, salir de **Montevideo, Santiago o São Paulo** puede cambiar totalmente el precio a Europa/EE.UU.
- **Cómo:** `vuelos.py cerca X --radio 500` y repetir la búsqueda desde cada uno. Sumar el traslado (bus, Buquebus, low-cost) en `costo`.
- **Riesgo:** bajo (perder la conexión si el posicionamiento es el mismo día → dejar margen o dormir allá).

## 3. Open-jaw y "mezcla de solo idas"
- **Qué:** ir a A y volver desde B; o comprar ida y vuelta como 2 solo-idas en aerolíneas distintas.
- **Cuándo rinde:** recorridos multi-ciudad (llegar a MAD, volver desde LIS/ROM). En low-costs y en muchas tarifas actuales la solo ida cuesta ~la mitad del ida y vuelta: combinar sale mejor.
- **Cómo:** Google Flights "multi-destino"; comparar con 2 solo idas.
- **Riesgo:** bajo.

## 4. País de venta / moneda (point of sale)
- **Qué:** la misma tarifa puede publicarse distinta según el país del sitio (aerolínea.com/ar vs /br vs /cl vs /us) y la moneda.
- **Cuándo rinde:** aerolíneas con precios por mercado (LATAM, Aerolíneas, Iberia, TAP, Air Europa, Copa) y OTAs (Kayak/Skyscanner de otro país muestran otras agencias).
- **Cómo:** abrir los links de Skyscanner/Kayak AR/BR/CL/US/ES que da `vuelos.py links`; probar el sitio de la aerolínea cambiando país. Pagar con tarjeta sin comisión por moneda extranjera o con USD.
- **Riesgo:** bajo-medio: algunas aerolíneas piden tarjeta del país o documentación; reembolsos en otra moneda.

## 5. Split-ticket por hubs
- **Qué:** cortar el viaje en 2–3 tickets: ORIG→HUB (low-cost o promo) + HUB→DEST.
- **Cuándo rinde:** cuando el hub tiene mucha más competencia que tu origen (GRU, SCL, LIS, MAD, MIA, PTY, BOG, IST). También para llegar a ciudades secundarias de Europa con Ryanair/easyJet desde MAD/LIS/BCN.
- **Cómo:** `vuelos.py split ORIG DEST`. Desvío ≤1.10 excelente, ≤1.25 aceptable. Super-conectores (Golfo/Estambul/Adís) ganan en largo radio aunque desvíen.
- **Reglas de oro:** ≥4 h entre tickets (≥1 noche en intercontinental o si el primer tramo es low-cost), equipaje de mano o volver a despachar, chequear **visa de tránsito** (p. ej. EE.UU. exige visa aunque sea "escala"; para ingresar a Schengen, argentinos no necesitan visa).
- **Riesgo:** medio — si el primer vuelo se atrasa, el segundo no te espera. Mitigar con seguro de "conexión perdida", tarifa flexible o noche de colchón.

## 6. Escala larga gratis (stopover)
- **Qué:** varias aerolíneas permiten parar días en su hub sin costo extra o con hotel (TAP en Lisboa/Oporto, Icelandair en Islandia, Turkish en Estambul con hotel gratis según escala, Copa en Panamá, Qatar/Emirates con paquetes).
- **Cuándo rinde:** te llevás 2 destinos por el precio de 1.
- **Cómo:** Google Flights "multi-destino" A→HUB (3 días) → DEST con la misma aerolínea; o el programa stopover de la aerolínea. Verificar condiciones vigentes.
- **Riesgo:** ninguno.

## 7. Quinta libertad
- **Qué:** aerolíneas de otro país operando un tramo entre dos países ajenos (p. ej. Emirates Río–Buenos Aires, Singapore Nueva York–Fráncfort).
- **Cuándo rinde:** producto premium a precio de competencia; a veces business muy barata.
- **Cómo:** la lista en `vuelos.py` (`QUINTA_LIBERTAD`) + WebSearch "fifth freedom route [ciudad]". Verificar que siga operando.
- **Riesgo:** ninguno.

## 8. Ofertas por "salir de otro lado" + ida y vuelta (truco del boleto cruzado)
- **Qué:** las tarifas ida y vuelta originadas en otro país pueden ser más baratas. Ejemplo: comprar BUE→MAD→BUE es caro, pero MVD→MAD→MVD está en promo → posicionarse en MVD.
- **Variante "back-to-back":** para varios viajes a la misma ruta, combinar dos ida y vuelta entrelazados.
- **Riesgo:** bajo-medio (perder el posicionamiento).

## 9. Millas y promos de canje
- **Qué:** pagar con millas cuando el valor por milla supera ~1–1,5 ¢ USD, o comprar millas en promo (Smiles suele vender con bonus) para un canje puntual.
- **Cuándo rinde:** temporada alta (cuando el cash está caro), business, último momento.
- **Cómo:** ver `millas.md`. Calcular: (precio cash – tasas del canje) / millas. En `costo`, cargar `millas` y `valor_milla`.
- **Riesgo:** bajo; cuidado con millas que vencen y con tasas/cargos de combustible altos (algunos programas los cobran, otros no).

## 10. Error fares y flash sales
- **Qué:** tarifas mal cargadas (moneda, falta de un cero, tasa omitida) o ventas relámpago.
- **Cuándo rinde:** aleatorio; suele durar horas. Hay que tener alertas y decisión rápida.
- **Cómo:** fuentes en `fuentes.md`. **Comprar primero, planificar después**: reservar sin pagar hoteles no reembolsables hasta que el ticket tenga número de emisión y pasen ~7 días. Muchas compras permiten cancelar gratis en 24 h según país de venta (en EE.UU. es regla del DOT para vuelos que tocan EE.UU.).
- **Riesgo:** medio — la aerolínea puede cancelar (te reembolsa). No pagar cosas no reembolsables encima.

## 11. Hidden-city (skiplagging)
- **Qué:** comprar ORIG→X con conexión en DEST y bajarse en DEST, porque ORIG→X es más barato que ORIG→DEST.
- **Cuándo rinde:** cuando DEST es un hub caro (MIA, ATL, MAD, GRU) y X es un destino con competencia.
- **Cómo:** `vuelos.py hidden ORIG DEST` lista X candidatos; buscarlos y ver si conectan en DEST.
- **Condiciones obligatorias:** solo ida, solo equipaje de mano (y el carry-on puede terminar en bodega si el avión se llena), sin número de viajero frecuente, sin ningún tramo posterior en la misma reserva.
- **Riesgo:** alto — viola las condiciones de transporte; la aerolínea puede cancelar millas, reclamar la diferencia o cambiarte la ruta ante irregularidades. Legal en general, pero contractual.

## 12. Tarifas de residente, estudiante, joven, familia
- **Qué:** descuentos que nadie busca: tarifas estudiantiles (StudentUniverse, Iberia/Air Europa jóvenes, ISIC), descuentos para mayores, tarifas de familia numerosa, tarifas de residente (ej. canarios/baleares si aplica), programas corporativos.
- **Riesgo:** ninguno (si cumplís los requisitos).

## 13. Clase y producto: la tarifa base engaña
- **Qué:** a veces premium economy o business de una aerolínea del Golfo/asiática cuesta poco más que economy de otra; o la "básica" sin valija + valija comprada aparte sale menos que la clásica.
- **Cómo:** comparar siempre el **costo real con valija** (`costo`), no la tarifa base. Probar upgrades por subasta (bid) después de comprar.
- **Riesgo:** ninguno.

## 14. Timing y monitoreo
- **Anticipación orientativa:** regional 3–8 semanas; internacional 2–8 meses; temporada alta (dic–feb, julio, Semana Santa) 4–9 meses.
- **Alertas:** Google Flights (seguimiento de precio), Kayak, Skyscanner, Hopper; alertas de ruta en Turismocity.
- **Fechas de ofertas:** Hot Sale y CyberMonday (Argentina), Black Friday/Cyber Monday (EE.UU.), Travel Sale de cada aerolínea, aniversarios de low-costs.
- **Precio objetivo:** definir de antemano "si baja de X, compro" (usar el piso histórico que muestra Google Flights: "los precios son bajos/típicos/altos").
- **Mito:** el modo incógnito no baja precios de forma confiable; lo que cambia precios es el inventario por clase tarifaria, el país de venta y la fecha.

---

### Matriz mínima por búsqueda
| Táctica | Siempre | Si es largo radio | Si es solo ida | Si el usuario acepta riesgo |
|---|---|---|---|---|
| Fechas flex | ✔ | | | |
| Aeropuertos alternativos | ✔ | | | |
| País de venta | ✔ | | | |
| Open-jaw / solo idas | | ✔ | | |
| Split por hub | | ✔ | | ✔ |
| Stopover / 5ª libertad | | ✔ | | |
| Millas | ✔ | | | |
| Error fares | ✔ (chequear) | | | |
| Hidden-city | | | ✔ | ✔ |
