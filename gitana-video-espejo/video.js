// Gitana Jeans · "Frente al espejo" — Reel 9:16 de 10 s, un solo plano, sin texto ni logos.
// La cámara es el espejo (POV selfie): ella estira la cintura elástica del chupín, suelta (snap),
// cambia el peso, gira 45° para mostrar el calce de costado/atrás y termina sonriendo mientras
// la cámara en mano se acerca a la cintura y la textura del denim.
import * as L from './engine/lib.js';
import { skin } from './props.js';

const W = 1080, H = 1920, FX = 540, FY = 1760, S = 1.15;       // pies de ella en (FX, FY), escala del personaje
const DUR = 10;
const C = { skin: '#E6B391', skinSh: '#CF946F', hair: '#3E271C', top: '#F3EADC', denim: '#22375E', denimIn: '#5F7BAA',
  denimHi: 'rgba(170,195,235,.16)', stitch: '#C9923F', shoe: '#F7F3EC', lip: '#B8645A', blush: 'rgba(222,120,110,.22)' };
const { clamp, lerp } = L, E = L.E;
const seg = (t, a, b, e = E.inOut) => e(clamp((t - a) / (b - a)));
const P2 = () => new Path2D();

// ---------------- la acción: estado del personaje en el tiempo t ----------------
function state(t) {
  // 0–3 s · estira la cintura y la suelta
  const pull = seg(t, 0.35, 1.55);                                  // 0→1 estira
  const rel = clamp((t - 2.05) / 0.32);                             // suelta con rebote elástico
  const snap = rel <= 0 ? 1 : rel >= 1 ? 0 : Math.exp(-rel * 5) * Math.cos(rel * 11);
  const stretch = pull * (t < 2.05 ? 1 : snap);
  // 3–7 s · cambia el peso y gira 45°
  const shift = seg(t, 2.9, 3.9) * (1 - seg(t, 7.0, 8.2)) * 26;     // cadera a su derecha (screen +x)
  const bend = seg(t, 2.9, 3.9) * (1 - seg(t, 7.0, 8.2));          // rodilla izquierda flexiona
  const turn = seg(t, 4.0, 5.3) * 0.85 - seg(t, 6.3, 7.3) * 0.7 - seg(t, 7.6, 8.8) * 0.15;
  // cara
  let face = 'neutral';
  if (t > 1.2 && t < 2.1) face = 'wow'; else if (t >= 2.25 && t < 3.3) face = 'relief'; else if (t >= 7.2) face = 'smile'; else if (t >= 3.3) face = 'soft';
  const blink = (t > 5.05 && t < 5.17) || (t > 8.45 && t < 8.57);
  const tilt = (face === 'relief' ? -0.05 : 0) + (t > 7.2 ? -0.06 * seg(t, 7.2, 8.2) : 0) + turn * 0.05;
  return { stretch, snapT: t - 2.05, shift, bend, turn, face, blink, tilt, t };
}

// manos: dónde están (coordenadas locales del personaje; y negativo = arriba)
function hands(st) {
  const t = st.t, e = st.stretch, WB = -700;
  const onBand = [[-70 - 90 * e, WB + 10 - 4 * e], [70 + 90 * e, WB + 10 - 4 * e]];
  const onHips = [[-118, -640], [118, -640]];
  const sides = [[-146, -612], [146, -612]];
  const pocket = [[-128, -585], [146, -612]];                         // izq. sobre el bolsillo trasero al girar
  const trace = [[-146, -612], [lerp(-40, 62, seg(t, 7.8, 9.4)), WB + 16]]; // der. recorre la pretina al final
  const mix = (A, B, q) => A.map((a, i) => [lerp(a[0], B[i][0], q), lerp(a[1], B[i][1], q)]);
  if (t < 2.2) return mix(sides, onBand, seg(t, 0.0, 0.35));
  if (t < 3.6) return mix(onBand, onHips, seg(t, 2.2, 2.7));
  if (t < 6.4) return mix(onHips, pocket, seg(t, 4.2, 5.2));
  if (t < 7.6) return mix(pocket, sides, seg(t, 6.4, 7.2));
  return mix(sides, trace, seg(t, 7.6, 8.1));
}

// IK de dos segmentos; side = hacia dónde sale el codo
function ik(sx, sy, tx, ty, l1, l2, side) {
  const dx = tx - sx, dy = ty - sy, d = clamp(Math.hypot(dx, dy), 20, l1 + l2 - 1);
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), b = Math.atan2(dy, dx) + side * a;
  return [sx + Math.cos(b) * l1, sy + Math.sin(b) * l1];
}
function limb(pts, ws) { // contorno de una cadena de puntos con medios-anchos ws
  const n = pts.length, nr = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
  const p = P2(); pts.forEach((q, i) => p[i ? 'lineTo' : 'moveTo'](q[0] + nr[i][0] * ws[i], q[1] + nr[i][1] * ws[i]));
  for (let i = n - 1; i >= 0; i--) p.lineTo(pts[i][0] - nr[i][0] * ws[i], pts[i][1] - nr[i][1] * ws[i]);
  p.closePath(); return p;
}

// ---------------- el cuarto (mundo, coordenadas de pantalla) ----------------
function room(K, sk, t) {
  const c = K.ctx, ink = (p, w) => sk.stroke(p, w);
  // piso de madera
  const fl = P2(); fl.rect(-200, 1470, W + 400, H - 1470 + 200); sk.fill(fl, '#C9A27C'); ink(fl, 3);
  const bd = P2(); for (let k = -6; k <= 6; k++) { bd.moveTo(FX + k * 60, 1470); bd.lineTo(FX + k * 210, H + 60); } [1560, 1680, 1830].forEach(y => { bd.moveTo(-200, y); bd.lineTo(W + 200, y); }); ink(bd, 1.2);
  const base = P2(); base.rect(-200, 1440, W + 400, 30); sk.fill(base, '#F1E7D8'); ink(base, 2.5);
  // ventana con cortina
  const win = P2(); win.rect(60, 250, 420, 720); sk.fill(win, '#D9E8EC'); ink(win, 4);
  const cl = P2(); cl.ellipse(210 + Math.sin(t * 0.3) * 14, 430, 70, 26, 0, 0, 7); cl.ellipse(360 + Math.sin(t * 0.25 + 1) * 12, 520, 55, 20, 0, 0, 7); sk.fill(cl, '#FFFFFF');
  const mu = P2(); mu.moveTo(270, 250); mu.lineTo(270, 970); mu.moveTo(60, 600); mu.lineTo(480, 600); ink(mu, 3);
  const sill = P2(); sill.rect(40, 965, 460, 26); sk.fill(sill, '#F4ECE0'); ink(sill, 2.5);
  const cur = P2(); cur.moveTo(30, 220); cur.bezierCurveTo(90 + Math.sin(t * 0.8) * 6, 500, 60, 800, 110 + Math.sin(t * 0.7) * 8, 1000); cur.lineTo(10, 1000); cur.lineTo(10, 220); cur.closePath();
  c.save(); c.globalAlpha = 0.85; sk.fill(cur, '#F6E6D2'); c.restore(); ink(cur, 2);
  const rod = P2(); rod.moveTo(0, 222); rod.lineTo(520, 222); ink(rod, 5);
  // planta
  const pot = P2(); pot.moveTo(120, 1500); pot.lineTo(100, 1370); pot.lineTo(260, 1370); pot.lineTo(240, 1500); pot.closePath();
  for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.38 + Math.sin(t * 1.2 + k) * 0.03, lf = P2(); lf.ellipse(180 + Math.cos(a) * 120, 1360 + Math.sin(a) * 120, 34, 88, a + Math.PI / 2, 0, 7); sk.fill(lf, k % 2 ? '#6F9670' : '#86A97F'); ink(lf, 2); }
  sk.fill(pot, '#C4663F'); ink(pot, 3);
  // cama a la derecha + cuadro
  const hb = P2(); hb.roundRect(760, 1060, 400, 260, 24); sk.fill(hb, '#B99A7E'); ink(hb, 3);
  const bed = P2(); bed.roundRect(740, 1250, 420, 210, 18); sk.fill(bed, '#EFE4D6'); ink(bed, 3);
  const pil = P2(); pil.roundRect(800, 1200, 220, 90, 40); sk.fill(pil, '#FBF6EE'); ink(pil, 2.5);
  const thr = P2(); thr.moveTo(740, 1340); thr.bezierCurveTo(900, 1320, 1000, 1360, 1160, 1330); thr.lineTo(1160, 1460); thr.lineTo(740, 1460); thr.closePath(); sk.fill(thr, '#D9A48C'); ink(thr, 2.5);
  const art = P2(); art.rect(800, 560, 220, 290); sk.fill(art, '#FBF5EA'); ink(art, 4);
  const blob = P2(); blob.arc(890, 680, 55, 0, 7); sk.fill(blob, '#C4663F'); const arc2 = P2(); arc2.ellipse(940, 770, 60, 30, -0.3, 0, 7); sk.fill(arc2, '#8FA7A1');
  // alfombra
  const rug = P2(); rug.ellipse(FX, 1780, 440, 105, 0, 0, 7); sk.fill(rug, '#E8D6C0'); ink(rug, 2.5);
  const rug2 = P2(); rug2.ellipse(FX, 1780, 380, 80, 0, 0, 7); ink(rug2, 1.2);
}

// luz de ventana: haz cálido, mancha de sol en el piso, polvo flotando
function light(K, t) {
  const c = K.ctx; c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createLinearGradient(260, 400, 900, 1800); g.addColorStop(0, 'rgba(255,205,150,0.13)'); g.addColorStop(1, 'rgba(255,205,150,0)');
  const b = P2(); b.moveTo(60, 250); b.lineTo(480, 250); b.lineTo(1150, 1500); b.lineTo(1150, 1960); b.lineTo(520, 1960); b.lineTo(60, 970); b.closePath(); c.fillStyle = g; c.fill(b);
  const patch = P2(); patch.moveTo(420, 1600); patch.lineTo(760, 1560); patch.lineTo(1060, 1900); patch.lineTo(620, 1960); patch.closePath(); c.fillStyle = 'rgba(255,214,160,0.10)'; c.fill(patch);
  for (let k = 0; k < 26; k++) { const px = 180 + ((k * 137.5 + t * (8 + (k % 5) * 3)) % 700), py = 380 + ((k * 211 + Math.sin(t * 0.6 + k) * 30) % 1000) + px * 0.35, r = 1.5 + (k % 3);
    c.fillStyle = `rgba(255,240,215,${0.18 + 0.12 * Math.sin(t * 2 + k)})`; c.beginPath(); c.arc(px, py, r, 0, 7); c.fill(); }
  c.restore();
}

// ---------------- ella ----------------
function woman(K, sk, st) {
  const c = K.ctx, ink = (p, w) => sk.stroke(p, w / S), fill = (p, col) => sk.fill(p, col);
  const kx = 1 - 0.22 * st.turn, sh = st.shift, bend = st.bend, cT = st.turn, e = st.stretch;
  const WB = -700, BH = 36;                                              // pretina (cintura alta)
  c.save(); c.translate(FX, FY); c.scale(S, S);
  // sombra en el piso (la luz viene de la izquierda)
  c.save(); c.fillStyle = 'rgba(60,35,20,0.16)'; c.beginPath(); c.ellipse(70, 2, 190, 26, 0, 0, 7); c.fill(); c.restore();

  const X = x => x * kx;                                                 // compresión horizontal al girar
  const tS = sh * 0.45;                                                  // torso contrarresta la cadera
  const shoulderY = -975, shL = [X(-118) + tS, shoulderY + sh * 0.12], shR = [X(118) + tS, shoulderY - sh * 0.12];

  // --- pelo (atrás) ---
  const hx = tS * 0.8 + cT * 10;
  const hb = P2(); hb.moveTo(hx - 64, -1150); hb.bezierCurveTo(hx - 118, -1080, hx - 120, -960, hx - 132, -860); hb.bezierCurveTo(hx - 110, -830, hx - 70, -835, hx - 40, -870);
  hb.lineTo(hx + 40, -870); hb.bezierCurveTo(hx + 70, -835, hx + 112, -830, hx + 130, -862); hb.bezierCurveTo(hx + 120, -960, hx + 118, -1080, hx + 64, -1150); hb.closePath();
  fill(hb, C.hair); ink(hb, 3.5);

  // --- piernas (jean) y zapatillas ---
  const legs = [-1, 1].map(sg => {
    const flex = sg < 0 ? bend : 0;
    const top = [X(sg * 110) + sh, -548 + (sg > 0 ? -sh * 0.25 : sh * 0.25)], crotch = [X(sg * 3) + sh, -500];
    const kn = [X(sg * 46) + sh * 0.55 + flex * 22, -282 + flex * 10], an = [X(sg * 44) + flex * 12, -48 - flex * 16];
    return { sg, top, crotch, kn, an, flex };
  });
  // zapatillas (antes del jean para que el ruedo las cubra)
  legs.forEach(l => { c.save(); c.translate(l.an[0], l.an[1] + 30); c.rotate(l.flex * -0.12); const s = P2(); s.moveTo(-40, 14); s.bezierCurveTo(-42, -18, -8, -26, 8, -26); s.bezierCurveTo(28, -26, 50, -4, 56, 14); s.closePath(); fill(s, C.shoe); ink(s, 3); const so = P2(); so.moveTo(-40, 8); so.lineTo(56, 8); ink(so, 1.5); c.restore(); });
  // silueta del jean: pelvis (ancho fijo) + dos piernas; la pretina estirada se dibuja aparte
  const bw = 78 + 90 * e, bwY = WB - 4 * e, B0 = 78;
  const jean = P2(), rear = 34 * cT, js = P2();
  jean.moveTo(X(-B0) + sh, WB); jean.bezierCurveTo(X(-96 - rear * 0.4) + sh, -660, X(-116 - rear) + sh, -610, legs[0].top[0] - X(rear * 0.5), legs[0].top[1]);
  jean.lineTo(legs[1].top[0], legs[1].top[1]); jean.bezierCurveTo(X(118 - rear * 0.2) + sh, -610, X(96) + sh, -660, X(B0) + sh, WB); jean.closePath();
  js.moveTo(X(-B0) + sh, WB); js.bezierCurveTo(X(-96 - rear * 0.4) + sh, -660, X(-116 - rear) + sh, -610, legs[0].top[0] - X(rear * 0.5), legs[0].top[1]);
  js.moveTo(X(B0) + sh, WB); js.bezierCurveTo(X(96) + sh, -660, X(118 - rear * 0.2) + sh, -610, legs[1].top[0], legs[1].top[1]);
  const legSegs = l => { const o = l.sg, ko = [l.kn[0] + o * 36, l.kn[1]], ki = [l.kn[0] - o * 32, l.kn[1]], ao = [l.an[0] + o * 25, l.an[1]], ai = [l.an[0] - o * 22, l.an[1]], tp = l.top;
    return [[tp, [tp[0] + o * 2, -440], [ko[0] + o * 4, -350], ko], [ko, [ko[0] - o * 2, -200], [ao[0] + o * 2, -120], ao], [ao, [l.an[0], l.an[1] + 8], [l.an[0], l.an[1] + 8], ai],
      [ai, [ai[0] - o * 2, -120], [ki[0], -200], ki], [ki, [ki[0], -360], [l.crotch[0] - o * 30, -470], l.crotch]]; };
  const legPath = (l, open) => { let sg = legSegs(l); if (!open && l.sg > 0) sg = sg.reverse().map(([a, b, c2, d]) => [d, c2, b, a]); // mismo sentido de giro que la pelvis (sin huecos al unir)
    const p = P2(); p.moveTo(sg[0][0][0], sg[0][0][1]); sg.forEach(([, b, c2, d]) => p.bezierCurveTo(b[0], b[1], c2[0], c2[1], d[0], d[1])); if (!open) { p.lineTo(sh, -600); p.closePath(); } return p; };
  const lp = legs.map(l => legPath(l, false)), all = P2(); all.addPath(jean); lp.forEach(p => all.addPath(p));
  // pierna de atrás un poco más oscura al girar
  fill(all, C.denim);                                                  // un solo relleno: sin costuras de acuarela entre piezas
  // textura del denim (sarga diagonal), brillos en muslos, costuras
  c.save(); c.clip(all, 'nonzero');
  c.strokeStyle = 'rgba(210,225,255,0.10)'; c.lineWidth = 1.2; c.beginPath(); for (let k = -900; k < 600; k += 7) { c.moveTo(k - 200, -760); c.lineTo(k + 560, 0); } c.stroke();
  c.strokeStyle = 'rgba(10,20,45,0.12)'; c.beginPath(); for (let k = -900; k < 600; k += 13) { c.moveTo(k - 196, -760); c.lineTo(k + 564, 0); } c.stroke();
  legs.forEach(l => { const g = c.createRadialGradient(l.kn[0] - l.sg * 4, -400, 5, l.kn[0], -400, 70); g.addColorStop(0, 'rgba(170,195,235,.28)'); g.addColorStop(1, 'rgba(170,195,235,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(l.kn[0] + (l.top[0] - l.kn[0]) * 0.4, -410, 42, 150, 0, 0, 7); c.fill(); });
  if (cT > 0.2) { const g = c.createRadialGradient(X(-70) + sh, -560, 5, X(-70) + sh, -560, 90); g.addColorStop(0, `rgba(170,195,235,${0.25 * cT})`); g.addColorStop(1, 'rgba(170,195,235,0)'); c.fillStyle = g; c.fillRect(-300, -700, 600, 300); } // curva de la cola al girar
  c.restore();
  legs.forEach(l => ink(legPath(l, true), 3.5)); ink(js, 3.5);
  const stitch = (p, a = 1) => { c.save(); c.globalAlpha = a; c.setLineDash([7, 6]); c.strokeStyle = C.stitch; c.lineWidth = 2.2; c.stroke(p); c.restore(); };
  // costura lateral exterior de cada pierna
  legs.forEach(l => { const p = P2(), o = l.sg; p.moveTo(l.top[0] - o * 8, l.top[1] + 4); p.bezierCurveTo(l.top[0] - o * 6, -440, l.kn[0] + o * 28, -350, l.kn[0] + o * 28, l.kn[1]); p.bezierCurveTo(l.kn[0] + o * 26, -200, l.an[0] + o * 18, -120, l.an[0] + o * 18, l.an[1] - 4); stitch(p, 0.7); });
  // frente: bolsillos delanteros, bragueta en J y botón (se desvanecen al girar)
  const fa = clamp(1 - cT * 1.4);
  if (fa > 0) { const fp = P2(); fp.moveTo(X(-86) + sh, WB + BH); fp.quadraticCurveTo(X(-70) + sh, -620, X(-108) + sh, -600); fp.moveTo(X(86) + sh, WB + BH); fp.quadraticCurveTo(X(70) + sh, -620, X(108) + sh, -600);
    c.save(); c.globalAlpha = fa; ink(fp, 2.5); c.restore(); stitch(fp, fa * 0.9);
    const fly = P2(); fly.moveTo(X(6) + sh, WB + BH); fly.lineTo(X(6) + sh, -560); fly.quadraticCurveTo(X(4) + sh, -535, X(-14) + sh, -540); stitch(fly, fa);
    const fl2 = P2(); fl2.moveTo(sh, WB + BH); fl2.lineTo(sh, -512); c.save(); c.globalAlpha = fa; ink(fl2, 2); c.restore(); }
  // atrás: canesú en V y bolsillos traseros (aparecen al girar)
  const ba = clamp((cT - 0.25) / 0.45);
  if (ba > 0) { const bx = sh - X(18);
    const yoke = P2(); yoke.moveTo(X(-100) + sh, -640); yoke.lineTo(bx, -612); yoke.lineTo(X(70) + sh, -648); c.save(); c.globalAlpha = ba; ink(yoke, 2.5); c.restore(); stitch(yoke, ba);
    [[-62, 0], [34, 1]].forEach(([px, k]) => { const x0 = X(px) + sh - X(22), pk = P2(); pk.moveTo(x0, -585); pk.lineTo(x0 + 64 * kx, -589); pk.lineTo(x0 + 60 * kx, -512); pk.lineTo(x0 + 30 * kx, -494); pk.lineTo(x0 + 2 * kx, -510); pk.closePath();
      c.save(); c.globalAlpha = ba; sk.fill(pk, '#2A4270'); ink(pk, 2.5); c.restore(); stitch(pk, ba); }); }

  // --- remera (tucked in) ---
  const top = P2();
  top.moveTo(X(-36) + tS, -1003); top.quadraticCurveTo(tS, -982, X(36) + tS, -1003); top.lineTo(shR[0], shR[1]);
  top.bezierCurveTo(X(112) + tS, -900, X(94) + tS, -840, X(84) + sh * 0.8, -760); top.lineTo(X(bw - 4) + sh, WB + 8);
  top.lineTo(X(-bw + 4) + sh, WB + 8); top.lineTo(X(-84) + sh * 0.8, -760); top.bezierCurveTo(X(-94) + tS, -840, X(-112) + tS, -900, shL[0], shL[1]); top.closePath();
  // cuello
  const neck = P2(); neck.rect(tS + hx * 0.2 - 19, -1060, 38, 72); fill(neck, C.skin); ink(neck, 2.5);
  fill(top, C.top); ink(top, 3.5);
  const fold = P2(); fold.moveTo(X(-40) + sh, WB - 6); fold.quadraticCurveTo(X(-20) + sh, WB - 26, X(-4) + sh, WB - 4); fold.moveTo(X(30) + sh, WB - 4); fold.quadraticCurveTo(X(46) + sh, WB - 24, X(60) + sh, WB - 6); ink(fold, 1.5);

  // --- pretina: se estira con las manos y vuelve con snap ---
  const band = P2(), lift = 10 * e, flap = BH + 14 * e;
  band.moveTo(X(-bw) + sh, bwY + 2 * e); band.quadraticCurveTo(sh, bwY - lift, X(bw) + sh, bwY + 2 * e);
  band.lineTo(X(bw) + sh, bwY + BH * (1 - 0.35 * e)); band.quadraticCurveTo(X(B0 + 20 * e) + sh, bwY + flap, X(B0 - 4) + sh, WB + BH);
  band.lineTo(X(-B0 + 4) + sh, WB + BH); band.quadraticCurveTo(X(-B0 - 20 * e) + sh, bwY + flap, X(-bw) + sh, bwY + BH * (1 - 0.35 * e)); band.closePath();
  if (e > 0.02) { const gap = P2(); gap.moveTo(X(-bw + 10) + sh, bwY + 4); gap.quadraticCurveTo(sh, bwY - lift - 44 * e, X(bw - 10) + sh, bwY + 4); gap.quadraticCurveTo(sh, bwY - lift + 4, X(-bw + 10) + sh, bwY + 4); fill(gap, '#8FA6CC'); ink(gap, 2); } // se ve el interior de la pretina
  fill(band, '#263D68'); ink(band, 3);
  const bs = P2(); bs.moveTo(X(-bw + 4) + sh, bwY + 7); bs.quadraticCurveTo(sh, bwY - lift + 6, X(bw - 4) + sh, bwY + 7); bs.moveTo(X(-B0 + 6) + sh, WB + BH - 6); bs.lineTo(X(B0 - 6) + sh, WB + BH - 6); stitch(bs, 0.95);
  // presillas
  [-0.8, -0.42, 0.42, 0.8].forEach(f => { const lx = X(f * bw) + sh, lo = P2(); lo.rect(lx - 6, bwY - 4, 12, BH + 10); fill(lo, '#2A4270'); ink(lo, 1.8); });
  // botón de cobre (sin logo)
  if (fa > 0) { c.save(); c.globalAlpha = fa; const bt = P2(); bt.arc(sh, bwY + BH / 2, 11, 0, 7); fill(bt, '#B97A3C'); ink(bt, 2); const bt2 = P2(); bt2.arc(sh, bwY + BH / 2, 5, 0, 7); ink(bt2, 1.2); c.restore(); }
  // líneas de tensión mientras estira
  if (e > 0.15) { const tl = P2(); [-1, 1].forEach(sg => { for (let k = 0; k < 3; k++) { const x0 = X(sg * (bw - 24 - k * 26)) + sh; tl.moveTo(x0, bwY + 8); tl.lineTo(x0 + sg * 14, bwY + BH - 8); } }); c.save(); c.globalAlpha = e; ink(tl, 1.4); c.restore(); }
  // "snap": líneas de impacto al soltar
  if (st.snapT > 0 && st.snapT < 0.45) { const a = 1 - st.snapT / 0.45, r0 = 30 + 40 * (1 - a), sp = P2();
    [-1, 1].forEach(sg => [-0.6, 0, 0.6].forEach(ang => { const cx = X(sg * 90) + sh, cy = WB + 12, dx = sg * Math.cos(ang), dy = Math.sin(ang); sp.moveTo(cx + dx * r0, cy + dy * r0); sp.lineTo(cx + dx * (r0 + 26), cy + dy * (r0 + 26)); }));
    c.save(); c.globalAlpha = a; ink(sp, 3); c.restore(); }

  // --- cabeza ---
  const hc = [hx, -1115];
  c.save(); c.translate(hc[0], -1045); c.rotate(st.tilt); c.translate(-hc[0], 1045);
  const head = P2(); head.ellipse(hc[0], hc[1], 56 * (1 - cT * 0.08), 70, 0, 0, 7); fill(head, C.skin); ink(head, 3);
  const fx = hc[0] + cT * 26;                                            // la cara se corre al girar (mira por encima del hombro)
  // rubor
  c.save(); c.fillStyle = C.blush; [-1, 1].forEach(sg => { c.beginPath(); c.ellipse(fx + sg * 30, -1090, 13, 8, 0, 0, 7); c.fill(); }); c.restore();
  // ojos
  const eyes = P2(), ey = -1118;
  [-1, 1].forEach(sg => { const ex = fx + sg * 21 * (sg < 0 ? 1 - cT * 0.35 : 1);
    if (st.blink || st.face === 'relief') { eyes.moveTo(ex - 9, ey); eyes.quadraticCurveTo(ex, ey + (st.face === 'relief' ? 7 : 2), ex + 9, ey); }
    else if (st.face === 'smile') { eyes.moveTo(ex - 9, ey + 2); eyes.quadraticCurveTo(ex, ey - 7, ex + 9, ey + 2); }
    else { c.save(); c.fillStyle = '#241D18'; c.beginPath(); c.ellipse(ex + cT * 3, ey, 5, st.face === 'wow' ? 7.5 : 6, 0, 0, 7); c.fill(); c.restore(); } });
  ink(eyes, 2.4);
  // cejas
  const br = P2(), by = -1138 - (st.face === 'wow' ? 8 : 0);
  [-1, 1].forEach(sg => { const ex = fx + sg * 21; br.moveTo(ex - 12, by + 2); br.quadraticCurveTo(ex, by - 5, ex + 12, by + 1); }); ink(br, 2.4);
  // nariz
  const nz = P2(); nz.moveTo(fx + 3, -1112); nz.quadraticCurveTo(fx + 8, -1092, fx - 1, -1090); ink(nz, 1.8);
  // boca
  const m = P2(), my = -1072;
  if (st.face === 'wow') { m.ellipse(fx, my, 7, 9, 0, 0, 7); fill(m, '#8E4A43'); }
  else if (st.face === 'smile' || st.face === 'relief') { m.moveTo(fx - 17, my - 3); m.quadraticCurveTo(fx, my + 12, fx + 17, my - 3); m.quadraticCurveTo(fx, my + 4, fx - 17, my - 3); fill(m, C.lip); }
  else { m.moveTo(fx - 12, my); m.quadraticCurveTo(fx, my + (st.face === 'soft' ? 6 : 3), fx + 12, my); }
  ink(m, 2);
  // pelo (adelante): flequillo con raya al costado + mechones sobre los hombros
  const hf = P2(); hf.moveTo(hc[0] - 60, -1100); hf.bezierCurveTo(hc[0] - 66, -1170, hc[0] - 20, -1196, hc[0] + 14, -1188);
  hf.bezierCurveTo(hc[0] + 56, -1182, hc[0] + 66, -1140, hc[0] + 60, -1100); hf.bezierCurveTo(hc[0] + 44, -1150, hc[0] + 20, -1160, hc[0] + 6, -1168); hf.bezierCurveTo(hc[0] - 20, -1150, hc[0] - 40, -1140, hc[0] - 60, -1100); hf.closePath();
  fill(hf, C.hair); ink(hf, 3);
  c.restore();
  const lock = sg => { const x0 = hx + sg * 56, p = P2(); p.moveTo(x0, -1110); p.bezierCurveTo(x0 + sg * 16, -1040, x0 + sg * 6, -960, x0 + sg * 22 + tS * 0.2, -890); p.bezierCurveTo(x0 + sg * 34, -870, x0 + sg * 44, -900, x0 + sg * 40, -930); p.bezierCurveTo(x0 + sg * 34, -1000, x0 + sg * 40, -1070, x0 + sg * 16, -1130); p.closePath(); return p; };
  [-1, 1].forEach(sg => { if (sg < 0 || cT < 0.6) { const p = lock(sg); fill(p, C.hair); ink(p, 2.5); } });

  // --- brazos + manos ---
  const hd = hands(st);
  [[shL, hd[0], 1], [shR, hd[1], -1]].forEach(([s0, h0, side]) => {
    const el = ik(s0[0], s0[1] + 12, h0[0], h0[1], 214, 206, side), arm = limb([[s0[0], s0[1] + 12], el, h0], [27, 20, 15]);
    fill(arm, C.skin); ink(arm, 3);
    const ang = Math.atan2(h0[1] - el[1], h0[0] - el[0]), hand = P2(); hand.ellipse(h0[0] + Math.cos(ang) * 16, h0[1] + Math.sin(ang) * 16, 17, 24, ang - Math.PI / 2, 0, 7); fill(hand, C.skin); ink(hand, 2.5);
  });
  // mangas cortas (encima del hombro)
  [[shL, -1], [shR, 1]].forEach(([s0, sg]) => { const sl = P2(); sl.moveTo(s0[0] - sg * 30, s0[1] - 6); sl.quadraticCurveTo(s0[0] + sg * 20, s0[1] - 10, s0[0] + sg * 34, s0[1] + 50); sl.lineTo(s0[0] + sg * 2, s0[1] + 78); sl.quadraticCurveTo(s0[0] - sg * 22, s0[1] + 50, s0[0] - sg * 30, s0[1] - 6); sl.closePath(); fill(sl, C.top); ink(sl, 3); });
  c.restore();
}

// reflejo del espejo: dos vetas de luz muy suaves (la cámara es el espejo)
function glass(K, t) {
  const c = K.ctx; c.save(); c.globalCompositeOperation = 'lighter';
  [[760, 0.05, 90], [900, 0.035, 40]].forEach(([x0, a, w]) => { const g = c.createLinearGradient(x0 - w, 0, x0 + w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x0 - w + 200, -100); c.lineTo(x0 + w + 200, -100); c.lineTo(x0 + w - 520, H + 100); c.lineTo(x0 - w - 520, H + 100); c.closePath(); c.fill(); });
  c.restore();
}

// cámara en mano: vaivén orgánico + push-in final a la pretina
function cam(t) {
  const st = state(t), hand = { x: Math.sin(t * 1.3) * 7 + Math.sin(t * 3.1 + 1) * 3, y: Math.sin(t * 1.7 + 2) * 6 + Math.sin(t * 2.6) * 3 };
  const q = seg(t, 7.0, 9.9, E.inOut), z = lerp(1.035, 3.1, q) + Math.sin(t * 2.2) * 0.004;
  const wx = FX + st.shift * S, wy = FY - 655 * S;                       // pretina en coordenadas de pantalla
  return { z, x: lerp(W / 2, wx, q) + hand.x, y: lerp(H / 2 + 10, wy, q) + hand.y };
}

export default {
  style: 'acuarela', format: '9:16', fps: 30, camera: false, chrome: false, captions: false,
  person: false, mascot: 'none',
  scenes: [
    { type: 'story', dur: DUR, cam,
      render(K, s, h) {
        const sk = skin(K), t = s.t, st = state(t);
        room(K, sk, t); light(K, t); woman(K, sk, st); glass(K, t);
        // sonido (efectos sintetizados, sin música)
        h.cue('enter', 0.35, { sfx: 'soft' });                          // agarra la pretina
        h.cue('count', 0.45, { sfx: 'soft', dur: 1.1 });                // estira (crujido del elástico)
        h.cue('impact', 2.07, { sfx: 'soft' }); h.cue('pop', 2.08, { sfx: 'pop' }); // ¡snap!
        h.cue('whoosh', 4.05, { sfx: 'soft' });                         // gira 45°
        h.cue('enter', 5.0, { sfx: 'paper' });                          // palmada en el bolsillo
        h.cue('whoosh', 6.35, { sfx: 'soft' });                         // vuelve a mirarse
        h.cue('title', 7.3, { sfx: 'cosmic' });                         // sonrisa
        h.cue('whoosh', 7.1, { sfx: 'film' });                          // push-in de la cámara
      } },
  ],
};
