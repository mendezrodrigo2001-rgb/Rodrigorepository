// Gitana Jeans · Reel completo 9:16 (~11.6 s), estilo acuarela, misma protagonista del reel del espejo.
// 0–3 s HOOK: con una mano estira la pretina elástica y la suelta (snap) · 3–7 s CINTA MÉTRICA: macro de la
// cintura con la cinta amarilla ajustada · 7–11.6 s CHAT: sube el celular, la cámara entra a la pantalla y
// llega el mensaje de asesoramiento de talle. Sin logos; el único texto es el del chat.
import * as L from './engine/lib.js';
import { skin } from './props.js';

const W = 1080, H = 1920, FX = 540, FY = 1760, S = 1.15;       // pies de ella en (FX, FY), escala del personaje
const DUR = 10;
const C = { skin: '#E6B391', skinSh: '#CF946F', hair: '#3E271C', top: '#F3EADC', denim: '#22375E', denimIn: '#5F7BAA',
  denimHi: 'rgba(170,195,235,.16)', stitch: '#C9923F', shoe: '#F7F3EC', lip: '#B8645A', blush: 'rgba(222,120,110,.22)' };
const { clamp, lerp } = L, E = L.E;
const seg = (t, a, b, e = E.inOut) => e(clamp((t - a) / (b - a)));
const P2 = () => new Path2D();

// ---------------- la acción (escena 1: 0–7.2 s) ----------------
function state(t) {
  const pull = seg(t, 0.25, 1.2);                                   // una mano estira el lado derecho
  const rel = clamp((t - 1.75) / 0.32), snap = rel <= 0 ? 1 : rel >= 1 ? 0 : Math.exp(-rel * 5) * Math.cos(rel * 11);
  const eR = pull * (t < 1.75 ? 1 : snap);
  let face = 'soft';
  if (t > 0.9 && t < 1.8) face = 'wow'; else if (t >= 1.95 && t < 3.0) face = 'relief'; else if (t >= 6.2) face = 'smile';
  return { eL: 0, eR, stretch: eR, snapT: t - 1.75, shift: 0, bend: 0, turn: 0, face, blink: t > 6.9 && t < 7.0, tilt: t > 6.2 ? -0.05 : 0, t,
    wrap: seg(t, 3.2, 4.4), tape: t >= 3.15 && t < 6.9, tapeDrop: seg(t, 6.3, 6.8, E.in), phone: seg(t, 6.25, 6.9) };
}

// manos (coordenadas locales del personaje; y negativo = arriba)
const PHONE = { x: 78, y: -885, w: 150 };                          // celular en la mano derecha (pantalla hacia el espejo)
function hands(st) {
  const t = st.t, WB = -700, mixP = (a, b, q) => [lerp(a[0], b[0], q), lerp(a[1], b[1], q)];
  const sideL = [-146, -612], sideR = [146, -612], grip = [70 + 90 * st.eR, WB + 10 - 4 * st.eR];
  const tapeL = [-34, WB + 16], tapeR = [34, WB + 16], phoneR = [PHONE.x - 4, PHONE.y + 132];
  let L0 = sideL; if (t > 3.9) L0 = mixP(sideL, tapeL, seg(t, 3.9, 4.4)); if (t > 6.3) L0 = mixP(tapeL, sideL, seg(t, 6.3, 6.8));
  let R0 = grip;
  if (t > 2.1) R0 = mixP(grip, [-40, WB + 12], seg(t, 2.1, 2.8));                    // alisa la pretina
  if (t > 2.8) R0 = mixP([-40, WB + 12], [150, -640], seg(t, 2.8, 3.3));
  if (t > 3.9) R0 = mixP([150, -640], tapeR, seg(t, 3.9, 4.4));
  if (t > 4.5 && t < 6.3) R0 = [tapeR[0] + Math.sin((t - 4.5) * 9) * 3 * (1 - seg(t, 4.5, 5.2)), tapeR[1]]; // ajusta la cinta
  if (t > 6.3) R0 = mixP(tapeR, phoneR, seg(t, 6.25, 6.9));
  return [L0, R0];
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
  const kx = 1 - 0.22 * st.turn, sh = st.shift, bend = st.bend, cT = st.turn, e = st.stretch, eL = st.eL, eR = st.eR;
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
  const bwL = 78 + 90 * eL, bwR = 78 + 90 * eR, bwY = WB - 4 * e, B0 = 78;
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
  top.bezierCurveTo(X(112) + tS, -900, X(94) + tS, -840, X(84) + sh * 0.8, -760); top.lineTo(X(B0 - 4) + sh, WB + 8);
  top.lineTo(X(-B0 + 4) + sh, WB + 8); top.lineTo(X(-84) + sh * 0.8, -760); top.bezierCurveTo(X(-94) + tS, -840, X(-112) + tS, -900, shL[0], shL[1]); top.closePath();
  // cuello
  const neck = P2(); neck.rect(tS + hx * 0.2 - 19, -1060, 38, 72); fill(neck, C.skin); ink(neck, 2.5);
  fill(top, C.top); ink(top, 3.5);
  const fold = P2(); fold.moveTo(X(-40) + sh, WB - 6); fold.quadraticCurveTo(X(-20) + sh, WB - 26, X(-4) + sh, WB - 4); fold.moveTo(X(30) + sh, WB - 4); fold.quadraticCurveTo(X(46) + sh, WB - 24, X(60) + sh, WB - 6); ink(fold, 1.5);

  // --- pretina: se estira con las manos y vuelve con snap ---
  const band = P2(), lift = 10 * e, mid = (X(bwR) - X(bwL)) / 2 + sh, fl = q => BH + 14 * q;
  band.moveTo(X(-bwL) + sh, bwY + 2 * eL); band.quadraticCurveTo(mid, bwY - lift, X(bwR) + sh, bwY + 2 * eR);
  band.lineTo(X(bwR) + sh, bwY + BH * (1 - 0.35 * eR)); band.quadraticCurveTo(X(B0 + 20 * eR) + sh, bwY + fl(eR), X(B0 - 4) + sh, WB + BH);
  band.lineTo(X(-B0 + 4) + sh, WB + BH); band.quadraticCurveTo(X(-B0 - 20 * eL) + sh, bwY + fl(eL), X(-bwL) + sh, bwY + BH * (1 - 0.35 * eL)); band.closePath();
  if (e > 0.02) { const gap = P2(), g0 = X(-bwL + 10) + sh, g1 = X(bwR - 10) + sh, gm = lerp(g0, g1, 0.62); gap.moveTo(g0, bwY + 4); gap.quadraticCurveTo(gm, bwY - lift - 44 * e, g1, bwY + 4); gap.quadraticCurveTo(gm, bwY - lift + 4, g0, bwY + 4); fill(gap, '#8FA6CC'); ink(gap, 2); } // se ve el interior de la pretina
  fill(band, '#263D68'); ink(band, 3);
  const bs = P2(); bs.moveTo(X(-bwL + 4) + sh, bwY + 7); bs.quadraticCurveTo(mid, bwY - lift + 6, X(bwR - 4) + sh, bwY + 7); bs.moveTo(X(-B0 + 6) + sh, WB + BH - 6); bs.lineTo(X(B0 - 6) + sh, WB + BH - 6); stitch(bs, 0.95);
  // presillas
  [-0.8, -0.42, 0.42, 0.8].forEach(f => { const lx = X(f * (f < 0 ? bwL : bwR)) + sh, lo = P2(); lo.rect(lx - 6, bwY - 4, 12, BH + 10); fill(lo, '#2A4270'); ink(lo, 1.8); });
  // botón de cobre (sin logo)
  if (fa > 0) { c.save(); c.globalAlpha = fa; const bt = P2(); bt.arc(sh, bwY + BH / 2, 11, 0, 7); fill(bt, '#B97A3C'); ink(bt, 2); const bt2 = P2(); bt2.arc(sh, bwY + BH / 2, 5, 0, 7); ink(bt2, 1.2); c.restore(); }
  // líneas de tensión mientras estira (del lado que tira)
  [[-1, eL, bwL], [1, eR, bwR]].forEach(([sg, q, bw]) => { if (q > 0.15) { const tl = P2(); for (let k = 0; k < 3; k++) { const x0 = X(sg * (bw - 24 - k * 26)) + sh; tl.moveTo(x0, bwY + 8); tl.lineTo(x0 + sg * 14, bwY + BH - 8); } c.save(); c.globalAlpha = q; ink(tl, 1.4); c.restore(); } });
  // "snap": líneas de impacto al soltar (lado derecho)
  if (st.snapT > 0 && st.snapT < 0.45) { const a = 1 - st.snapT / 0.45, r0 = 30 + 40 * (1 - a), sp = P2();
    [-0.8, -0.2, 0.4].forEach(ang => { const cx = X(96) + sh, cy = WB + 12, dx = Math.cos(ang), dy = Math.sin(ang); sp.moveTo(cx + dx * r0, cy + dy * r0); sp.lineTo(cx + dx * (r0 + 30), cy + dy * (r0 + 30)); });
    c.save(); c.globalAlpha = a; ink(sp, 3); c.restore(); }
  // cinta métrica amarilla: sale de atrás por la izquierda, cruza el frente y se ajusta en el centro
  if (st.tape) { c.save(); c.globalAlpha = 1 - st.tapeDrop; c.translate(0, st.tapeDrop * 120);
    const y0 = WB + 3, th = 30, xa = X(-B0 - 6) + sh, xb = lerp(xa, X(44) + sh, st.wrap);
    const tp = P2(); tp.moveTo(xa, y0 + 2); tp.quadraticCurveTo((xa + xb) / 2, y0 - 3, xb, y0); tp.lineTo(xb, y0 + th); tp.quadraticCurveTo((xa + xb) / 2, y0 + th - 3, xa, y0 + th + 2); tp.closePath();
    fill(tp, '#F2C744'); ink(tp, 2.2);
    const tk = P2(); for (let x = xa + 4; x < xb - 2; x += 6) { const long = Math.round((x - xa) / 6) % 5 === 0; tk.moveTo(x, y0 + 1); tk.lineTo(x, y0 + (long ? 14 : 7)); } c.save(); c.strokeStyle = '#3A2F1C'; c.lineWidth = 1; c.stroke(tk); c.restore();
    const tab = P2(); tab.rect(xb - 3, y0 - 3, 7, th + 6); fill(tab, '#B9B4AA'); ink(tab, 1.6);   // puntera metálica
    if (st.wrap > 0.95) { const tail = P2(); tail.moveTo(X(-40) + sh, y0 + th - 2); tail.bezierCurveTo(X(-44) + sh, -600, X(-30) + sh, -560, X(-38) + sh, -520); tail.lineTo(X(-8) + sh, -520); tail.bezierCurveTo(X(-2) + sh, -560, X(-14) + sh, -600, X(-10) + sh, y0 + th - 2); tail.closePath();
      fill(tail, '#F2C744'); ink(tail, 2); }
    c.restore(); }

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
  if (st.phone > 0) { c.save(); const ph = st.phone; c.translate(PHONE.x, PHONE.y + (1 - ph) * 140); c.globalAlpha = clamp(ph * 3); phoneArt(K, sk, 0, 0, PHONE.w, { t: 0 }, (p, w) => ink(p, w)); c.restore();
    const th = P2(); th.ellipse(PHONE.x - PHONE.w / 2 + 4, PHONE.y + 70 + (1 - ph) * 140, 9, 22, 0.2, 0, 7); fill(th, C.skin); ink(th, 2); }
  c.restore();
}

// reflejo del espejo: dos vetas de luz muy suaves (la cámara es el espejo)
function glass(K, t) {
  const c = K.ctx; c.save(); c.globalCompositeOperation = 'lighter';
  [[760, 0.05, 90], [900, 0.035, 40]].forEach(([x0, a, w]) => { const g = c.createLinearGradient(x0 - w, 0, x0 + w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x0 - w + 200, -100); c.lineTo(x0 + w + 200, -100); c.lineTo(x0 + w - 520, H + 100); c.lineTo(x0 - w - 520, H + 100); c.closePath(); c.fill(); });
  c.restore();
}

// ---------------- el celular y el chat ----------------
const FONT = (px, b = '') => `${b} ${px}px "Liberation Sans", "DejaVu Sans", "Noto Color Emoji"`;
const OUT_MSG = '¡Hola! Quiero el chupín tiro alto 👖';
const IN_MSG = '¡Hola! Pasame tu medida de cintura y cadera y te confirmo tu talle ideal en 1 minuto 👖✨';
function wrapText(c, str, maxW) { const out = []; let line = ''; for (const w of str.split(' ')) { const tst = line ? line + ' ' + w : w; if (c.measureText(tst).width > maxW && line) { out.push(line); line = w; } else line = tst; } if (line) out.push(line); return out; }
function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
// pantalla del chat: w de referencia 740 px (se escala). st: { dots, typed, react, t }
function chatScreen(c, x, y, w, h, st) {
  const f = w / 740; c.save(); rrect(c, x, y, w, h, 46 * f); c.clip();
  c.fillStyle = '#EFE6D8'; c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(160,130,100,0.10)'; c.lineWidth = 2 * f; for (let k = 0; k < 40; k++) { const px = x + ((k * 97) % 740) * f, py = y + 200 * f + ((k * 173) % 1100) * f; c.beginPath(); c.arc(px, py, 14 * f, 0, 4); c.stroke(); } // fondo del chat
  // encabezado
  c.fillStyle = '#2C5F57'; c.fillRect(x, y, w, 190 * f);
  c.fillStyle = 'rgba(255,255,255,.85)'; c.font = FONT(26 * f, '600'); c.textBaseline = 'middle'; c.fillText('10:24', x + 44 * f, y + 36 * f);
  c.fillRect(x + w - 110 * f, y + 26 * f, 50 * f, 20 * f);
  c.beginPath(); c.arc(x + 92 * f, y + 122 * f, 44 * f, 0, 7); c.fillStyle = '#22375E'; c.fill();
  c.fillStyle = '#F3EADC'; c.beginPath(); c.moveTo(x + 72 * f, y + 100 * f); c.lineTo(x + 112 * f, y + 100 * f); c.lineTo(x + 116 * f, y + 150 * f); c.lineTo(x + 97 * f, y + 150 * f); c.lineTo(x + 92 * f, y + 118 * f); c.lineTo(x + 87 * f, y + 150 * f); c.lineTo(x + 68 * f, y + 150 * f); c.closePath(); c.fill(); // jean mini (avatar, sin logo)
  c.fillStyle = '#FFFFFF'; c.font = FONT(40 * f, '700'); c.fillText('Gitana Jeans', x + 156 * f, y + 108 * f);
  c.fillStyle = 'rgba(255,255,255,.8)'; c.font = FONT(28 * f); c.fillText(st.dots > 0 && st.typed <= 0 ? 'escribiendo…' : 'en línea', x + 156 * f, y + 150 * f);
  // burbuja enviada (ella)
  c.font = FONT(46 * f); const oL = wrapText(c, OUT_MSG, 520 * f), ow = Math.max(...oL.map(l => c.measureText(l).width)) + 60 * f, oh = oL.length * 58 * f + 78 * f, ox = x + w - 40 * f - ow, oy = y + 300 * f;
  rrect(c, ox, oy, ow, oh, 26 * f); c.fillStyle = '#D5F0C4'; c.fill();
  c.fillStyle = '#1D2B22'; oL.forEach((l, i) => c.fillText(l, ox + 30 * f, oy + 46 * f + i * 58 * f));
  c.fillStyle = '#6A7F70'; c.font = FONT(24 * f); c.textAlign = 'right'; c.fillText('10:23  ✓✓', ox + ow - 24 * f, oy + oh - 24 * f); c.textAlign = 'left';
  const iy = oy + oh + 40 * f;
  // "escribiendo" (tres puntitos)
  if (st.dots > 0 && st.typed <= 0) { c.save(); c.globalAlpha = st.dots; rrect(c, x + 40 * f, iy, 150 * f, 84 * f, 26 * f); c.fillStyle = '#FFFFFF'; c.fill();
    for (let k = 0; k < 3; k++) { const b = Math.max(0, Math.sin(st.t * 9 - k * 0.9)) * 10 * f; c.beginPath(); c.arc(x + (82 + k * 34) * f, iy + 42 * f - b, 9 * f, 0, 7); c.fillStyle = '#8A8F8C'; c.fill(); } c.restore(); }
  // mensaje de Gitana Jeans que se escribe
  if (st.typed > 0) { c.font = FONT(52 * f); const full = wrapText(c, IN_MSG, 560 * f), chars = Array.from(IN_MSG).length, n = Math.ceil(chars * clamp(st.typed));
    const bw = Math.max(...full.map(l => c.measureText(l).width)) + 64 * f, bh = full.length * 68 * f + 88 * f, pop = E.back(clamp(st.typed * 6));
    c.save(); c.translate(x + 40 * f, iy + bh); c.scale(pop, pop); c.translate(-(x + 40 * f), -(iy + bh));
    rrect(c, x + 40 * f, iy, bw, bh, 26 * f); c.fillStyle = '#FFFFFF'; c.fill();
    let left = n; c.fillStyle = '#1E1E1E'; full.forEach((l, i) => { const arr = Array.from(l); const k = Math.max(0, Math.min(arr.length, left)); left -= arr.length + 1; if (k > 0) c.fillText(arr.slice(0, k).join(''), x + 72 * f, iy + 54 * f + i * 68 * f); });
    c.fillStyle = '#8A8F8C'; c.font = FONT(24 * f); c.textAlign = 'right'; c.fillText('10:24', x + 40 * f + bw - 24 * f, iy + bh - 24 * f); c.textAlign = 'left';
    c.restore();
    if (st.react > 0) { const r = E.back(clamp(st.react)); c.save(); c.translate(x + 96 * f, iy + bh + 6 * f); c.scale(r, r); rrect(c, -44 * f, -26 * f, 88 * f, 56 * f, 28 * f); c.fillStyle = '#FFFFFF'; c.fill(); c.strokeStyle = '#E4DCCF'; c.lineWidth = 3 * f; c.stroke();
      c.font = FONT(34 * f); c.textAlign = 'center'; c.fillText('❤️', 0, 3 * f); c.textAlign = 'left'; c.restore(); } }
  // barra de escribir
  rrect(c, x + 30 * f, y + h - 130 * f, w - 170 * f, 90 * f, 45 * f); c.fillStyle = '#FFFFFF'; c.fill();
  c.fillStyle = '#9A9A9A'; c.font = FONT(34 * f); c.fillText('Mensaje', x + 80 * f, y + h - 84 * f);
  c.beginPath(); c.arc(x + w - 80 * f, y + h - 85 * f, 45 * f, 0, 7); c.fillStyle = '#2C5F57'; c.fill();
  c.restore();
}
// celular: cuerpo en acuarela + pantalla nítida. (cx, cy) = centro, w = ancho
function phoneArt(K, sk, cx, cy, w, st, ink) {
  const h = w * 2.05, bz = w * 0.045, body = P2(); body.roundRect(cx - w / 2, cy - h / 2, w, h, w * 0.13);
  sk.fill(body, '#2B2723'); ink(body, 3);
  chatScreen(K.ctx, cx - w / 2 + bz, cy - h / 2 + bz, w - 2 * bz, h - 2 * bz, st);
  const c = K.ctx; c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fill(body); c.restore(); // reflejo del vidrio
}

// ---------------- cámaras ----------------
const shake = t => ({ x: Math.sin(t * 1.3) * 7 + Math.sin(t * 3.1 + 1) * 3, y: Math.sin(t * 1.7 + 2) * 6 + Math.sin(t * 2.6) * 3 });
const toScr = (lx, ly) => [FX + lx * S, FY + ly * S];
function cam1(t) {
  const hk = toScr(30, -690), tp = toScr(0, -684), mac = toScr(-2, -688), ph = toScr(PHONE.x, PHONE.y), j = shake(t);
  let z = 2.6, p = hk;
  if (t > 3.0) { const q = seg(t, 3.0, 4.2); z = lerp(2.6, 2.25, q); p = [lerp(hk[0], tp[0], q), lerp(hk[1], tp[1], q)]; }
  if (t > 4.5) { const q = seg(t, 4.5, 6.2); z = lerp(2.25, 3.1, q); p = [lerp(tp[0], mac[0], q), lerp(tp[1], mac[1], q)]; }
  if (t > 6.2) { const q = seg(t, 6.2, 7.2); z = lerp(3.1, 1.55, q); p = [lerp(mac[0], ph[0], q), lerp(mac[1], ph[1], q)]; }
  const fade = 1 - seg(t, 6.9, 7.2); return { z, x: p[0] + j.x * fade, y: p[1] + j.y * fade };
}
const SC2 = { x: 540, y: 950, w: 700 };                               // celular en primer plano (escena 2)

export default {
  style: 'acuarela', format: '9:16', fps: 30, camera: false, chrome: false, captions: false,
  person: false, mascot: 'none',
  scenes: [
    // 1 · HOOK + CINTA MÉTRICA + sube el celular
    { type: 'story', dur: 7.2, cam: cam1,
      render(K, s, h) {
        const sk = skin(K), t = s.t, st = state(t);
        room(K, sk, t); light(K, t); woman(K, sk, st); glass(K, t);
        h.cue('enter', 0.2, { sfx: 'soft' });                           // agarra la pretina
        h.cue('count', 0.3, { sfx: 'soft', dur: 0.9 });                 // estira
        h.cue('impact', 1.77, { sfx: 'soft' }); h.cue('pop', 1.78, { sfx: 'pop' }); // ¡snap!
        h.cue('whoosh', 3.2, { sfx: 'soft' });                          // la cinta cruza
        h.cue('pop', 4.42, { sfx: 'paper' }); h.cue('enter', 4.6, { sfx: 'mechanical' }); // la cinta se ajusta
        h.cue('whoosh', 6.3, { sfx: 'film' });                          // sube el celular
      } },
    // 2 · la cámara entra a la pantalla: llega el mensaje de asesoramiento
    { type: 'story', dur: 4.4, trans: { type: 'zoom', x: 0.5, y: 0.5, zoom: 4.2, dur: 0.7 },
      cam: t => { const j = shake(t + 7.2); return { z: 1.0 + 0.04 * seg(t, 0, 4.4) , x: 540 + j.x * 0.6, y: 960 + j.y * 0.6 }; },
      render(K, s, h) {
        const sk = skin(K), t = s.t, c = K.ctx;
        c.save(); c.filter = 'blur(18px)'; c.translate(540, 960); c.scale(1.35, 1.35); c.translate(-540, -960); room(K, sk, t + 7.2); light(K, t + 7.2); c.restore(); // cuarto desenfocado
        c.save(); c.fillStyle = 'rgba(40,25,15,0.12)'; c.fillRect(-100, -100, 1280, 2120); c.restore();
        const ink = (p, w) => sk.stroke(p, w), ph = SC2, pw = ph.w, phh = pw * 2.05;
        // mano: palma y antebrazo por debajo del celular
        const arm = P2(); arm.moveTo(300, 2100); arm.bezierCurveTo(330, 1850, 420, 1720, 560, 1640); arm.lineTo(900, 1600); arm.bezierCurveTo(960, 1720, 980, 1900, 1000, 2100); arm.closePath(); sk.fill(arm, C.skin); ink(arm, 4);
        const st = { t, dots: seg(t, 0.6, 0.8) , typed: seg(t, 1.5, 3.0, E.linear), react: seg(t, 3.4, 3.8, E.linear) };
        phoneArt(K, sk, ph.x, ph.y, pw, st, ink);
        // dedos sobre el borde derecho y pulgar a la izquierda
        [1080, 1230, 1380].forEach((y, i) => { const fg = P2(); fg.ellipse(ph.x + pw / 2 + 6, y + 60, 34, 66, 0.12, 0, 7); sk.fill(fg, i === 1 ? C.skinSh : C.skin); ink(fg, 3); });
        const th = P2(); th.ellipse(ph.x - pw / 2 + 4, 1480, 38, 110, -0.25, 0, 7); sk.fill(th, C.skin); ink(th, 3);
        h.cue('enter', 0.75, { sfx: 'digital' });                       // "escribiendo…"
        h.cue('pop', 1.5, { sfx: 'pop' });                              // llega el mensaje
        h.cue('type', 1.55, { sfx: 'soft', dur: 1.4 });                 // se escribe
        h.cue('title', 3.4, { sfx: 'cosmic' });                         // ❤️
      } },
  ],
};
