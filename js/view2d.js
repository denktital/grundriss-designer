"use strict";
/* 2D-SVG-Renderer + View-Transform + Hit-Testing + Snapping */
window.GD = window.GD || {};

GD.view2d = (function () {
  const NS = "http://www.w3.org/2000/svg";
  let svg, wrap;
  const view = { scale: 0.55, tx: 80, ty: 80 };

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const W2S = (x, y) => [x * view.scale + view.tx, y * view.scale + view.ty];
  const S2W = (sx, sy) => ({ x: (sx - view.tx) / view.scale, y: (sy - view.ty) / view.scale });
  function svgPoint(evt) { const r = svg.getBoundingClientRect(); return [evt.clientX - r.left, evt.clientY - r.top]; }

  function init(svgEl, wrapEl) { svg = svgEl; wrap = wrapEl; }

  /* ---------- Editor-Zustand (von tools.js gesetzt) ---------- */
  function ed() { return GD.editor || {}; }
  function isSel(kind, id) { return (ed().selected || []).some(s => s.kind === kind && s.id === id); }

  /* ---------- Öffnungs-Intervalle pro Wand ---------- */
  function openingsOfWall(floor, wall) {
    return (floor.openings || []).filter(o => o.wallId === wall.id)
      .map(o => ({ o, c: o.pos, s: o.pos - o.width / 2, e: o.pos + o.width / 2 }))
      .sort((a, b) => a.s - b.s);
  }

  /* ---------- Render ---------- */
  function render() {
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const Wd = wrap.clientWidth, Ht = wrap.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${Wd} ${Ht}`);
    const floor = GD.state.activeFloor();
    const st = GD.state.project.settings;

    if (st.showGrid) drawGrid(Wd, Ht);
    if (st.showGhost) drawGhost(floor);
    drawUnderlay(floor);
    floor.rooms.forEach(r => drawRoomFill(r));
    floor.walls.forEach(w => drawWall(floor, w));
    floor.openings.forEach(o => drawOpening(floor, o));
    floor.furniture.forEach(it => drawItem(it));
    if (st.showDims) { drawAutoDims(floor); floor.dims.forEach(d => drawDim(d)); }
    floor.labels.forEach(l => drawLabel(l));
    floor.rooms.forEach(r => drawRoomBadge(r));
    drawRoofHint(floor);
    if (st.showGhost) drawOriginMarker();

    drawSelection(floor);
    if (ed().preview) ed().preview(el, W2S, svg);
    if (ed().snapPoint) drawSnap(ed().snapPoint);
  }

  function drawGrid(Wd, Ht) {
    const g = GD.state.project.settings.gridCm;
    const step = g * view.scale;
    if (step < 5) return;
    const tl = S2W(0, 0), br = S2W(Wd, Ht);
    const x0 = Math.floor(tl.x / g) * g, y0 = Math.floor(tl.y / g) * g;
    for (let x = x0; x <= br.x; x += g) { const [sx] = W2S(x, 0); el("line", { x1: sx, y1: 0, x2: sx, y2: Ht, class: "grid" + (Math.abs(x % 100) < .01 ? " strong" : "") }, svg); }
    for (let y = y0; y <= br.y; y += g) { const [, sy] = W2S(0, y); el("line", { x1: 0, y1: sy, x2: Wd, y2: sy, class: "grid" + (Math.abs(y % 100) < .01 ? " strong" : "") }, svg); }
  }

  function drawUnderlay(floor) {
    const u = floor.underlay;
    if (!u || !u.visible) return;
    const src = GD.sanitizeImageSrc(u.src);
    if (!src) return;
    const [sx, sy] = W2S(u.x, u.y);
    const img = el("image", { x: sx, y: sy, opacity: u.opacity, preserveAspectRatio: "none" }, svg);
    img.setAttributeNS("http://www.w3.org/1999/xlink", "href", src);
    img.setAttribute("href", src);
    if (u.rotation) img.setAttribute("transform", `rotate(${u.rotation} ${sx} ${sy})`);
    if (!u._nw) {
      const probe = new Image();
      probe.onload = () => { u._nw = probe.naturalWidth; u._nh = probe.naturalHeight; render(); };
      probe.src = src;
      img.setAttribute("width", 1000 * u.scale * view.scale); img.setAttribute("height", 700 * u.scale * view.scale);
    } else { img.setAttribute("width", u._nw * u.scale * view.scale); img.setAttribute("height", u._nh * u.scale * view.scale); }
  }

  function drawRoomFill(room) {
    const pts = room.poly.map(p => W2S(p.x, p.y).join(",")).join(" ");
    el("polygon", { points: pts, class: "room-fill" + (isSel("room", room.id) ? " sel" : ""), fill: room.color && room.color !== "#ffffff" ? room.color : "" }, svg);
  }

  function wallQuad(w) {
    const t = w.thickness, u = GD.geom.norm(GD.geom.sub(w.b, w.a)), n = GD.geom.perp(u);
    const o = { x: n.x * t / 2, y: n.y * t / 2 };
    return [GD.geom.add(w.a, o), GD.geom.add(w.b, o), GD.geom.sub(w.b, o), GD.geom.sub(w.a, o)];
  }

  function drawWall(floor, w) {
    const len = GD.geom.dist(w.a, w.b);
    if (len < 0.5) return;
    const u = GD.geom.norm(GD.geom.sub(w.b, w.a));
    const ops = openingsOfWall(floor, w);
    // Wandstücke zwischen den Öffnungen
    const segs = []; let cur = 0;
    for (const op of ops) { if (op.s > cur) segs.push([cur, op.s]); cur = Math.max(cur, op.e); }
    if (cur < len) segs.push([cur, len]);
    const extA = GD.wallCornerExt(floor, w, w.a), extB = GD.wallCornerExt(floor, w, w.b);
    const sel = isSel("wall", w.id);
    for (let [s, e] of segs) {
      if (s < 0.01) s = -extA;                       // Anfangssegment bis zur Ecke verlängern
      if (Math.abs(e - len) < 0.01) e = len + extB;  // Endsegment bis zur Ecke verlängern
      const a = GD.geom.add(w.a, GD.geom.mul(u, s)), b = GD.geom.add(w.a, GD.geom.mul(u, e));
      const q = wallQuad({ a, b, thickness: w.thickness });
      el("polygon", { points: q.map(p => W2S(p.x, p.y).join(",")).join(" "), class: "wall" + (sel ? " sel" : "") }, svg);
    }
  }

  // lokale Wand-Koords -> Screen: entlang u (Länge), n (Querrichtung)
  function wallLocalToScreen(w, along, off) {
    const u = GD.geom.norm(GD.geom.sub(w.b, w.a)), n = GD.geom.perp(u);
    const p = { x: w.a.x + u.x * along + n.x * off, y: w.a.y + u.y * along + n.y * off };
    return W2S(p.x, p.y);
  }

  // Welche Seite der Wand (entlang der Normale +n) zeigt ins Gebäude-Innere? +1 / -1
  function wallInsideSign(floor, w) {
    const u = GD.geom.norm(GD.geom.sub(w.b, w.a)), n = GD.geom.perp(u);
    const m = GD.geom.lerp(w.a, w.b, 0.5), off = Math.max(w.thickness, 25) + 12;
    const inPlus = floor.rooms.some(r => r.poly.length > 2 && GD.geom.pointInPoly({ x: m.x + n.x * off, y: m.y + n.y * off }, r.poly));
    const inMinus = floor.rooms.some(r => r.poly.length > 2 && GD.geom.pointInPoly({ x: m.x - n.x * off, y: m.y - n.y * off }, r.poly));
    if (inPlus && !inMinus) return 1;
    if (inMinus && !inPlus) return -1;
    return 1;
  }

  function drawOpening(floor, o) {
    const w = floor.walls.find(x => x.id === o.wallId);
    if (!w) return;
    const t = w.thickness, s = o.pos - o.width / 2, e = o.pos + o.width / 2;
    const cls = isSel("opening", o.id) ? " sel" : "";
    const c1 = wallLocalToScreen(w, s, -t / 2), c2 = wallLocalToScreen(w, e, -t / 2), c3 = wallLocalToScreen(w, e, t / 2), c4 = wallLocalToScreen(w, s, t / 2);
    el("polygon", { points: [c1, c2, c3, c4].map(p => p.join(",")).join(" "), class: "win-open" }, svg);
    if (GD.isWindow(o.type)) drawWindow(floor, w, o, s, e, t, cls);
    else drawDoor(floor, w, o, s, e, t, cls);
  }

  function drawWindow(floor, w, o, s, e, t, cls) {
    const line = (off, c) => { const a = wallLocalToScreen(w, s, off), b = wallLocalToScreen(w, e, off); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: c + cls }, svg); };
    line(-t / 2, "win-frame"); line(t / 2, "win-frame");          // Laibungen
    if (o.type === "window-fixed") { line(-t * 0.2, "win-glass"); line(t * 0.2, "win-glass"); }
    else line(0, "win-glass");
    if (o.type === "window-double") {                              // Mittelpfosten
      const a = wallLocalToScreen(w, o.pos, -t / 2), b = wallLocalToScreen(w, o.pos, t / 2);
      el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: "win-frame" + cls }, svg);
    }
    // Öffnungs-Anschlag nach innen (Fenster öffnen i.d.R. nach innen); nicht bei Festverglasung
    const def = GD.openingDefs[o.type];
    if (def && def.hinge) {
      const inside = wallInsideSign(floor, w), hinge = o.hinge || "left";
      if (o.type === "window-double") {
        const fw = Math.min(o.width / 2, 50);                  // je ein Flügel von beiden Seiten
        drawLeaf(w, s, s + fw, inside, cls, "win-sash", "win-sash-arc");
        drawLeaf(w, e, e - fw, inside, cls, "win-sash", "win-sash-arc");
      } else {
        const fw = Math.min(o.width, 60);                      // realistische Flügelbreite
        const hA = hinge === "left" ? s : e, tA = hinge === "left" ? s + fw : e - fw;
        drawLeaf(w, hA, tA, inside, cls, "win-sash", "win-sash-arc");
      }
    }
  }

  function drawDoor(floor, w, o, s, e, t, cls) {
    const hinge = o.hinge || o.swing || "left";
    const dir = o.dir || (o.flip ? "out" : "in");
    const inside = wallInsideSign(floor, w);
    const side = (dir === "in") ? inside : -inside;
    if (o.type === "door-double") {
      drawLeaf(w, s, s + o.width / 2, side, cls);
      drawLeaf(w, e, e - o.width / 2, side, cls);
    } else if (o.type === "door-slide") {
      const off = side * t * 0.55;
      const a = wallLocalToScreen(w, s, off), b = wallLocalToScreen(w, e, off);
      el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: "door-leaf" + cls }, svg);
      const tip = wallLocalToScreen(w, hinge === "left" ? e : s, off);
      el("circle", { cx: tip[0], cy: tip[1], r: 2.6, class: "door-leaf" + cls }, svg);
    } else if (o.type === "door-fold") {
      const hA = hinge === "left" ? s : e, d = hinge === "left" ? 1 : -1, seg = o.width / 2;
      const pts = [[hA, 0], [hA + d * seg * 0.5, side * seg * 0.5], [hA + d * seg, 0], [hA + d * seg * 1.5, side * seg * 0.5], [hA + d * o.width, 0]]
        .map(([al, of]) => wallLocalToScreen(w, al, of));
      el("path", { d: "M " + pts.map(p => p.join(" ")).join(" L "), class: "door-leaf" + cls, fill: "none" }, svg);
    } else {
      drawLeaf(w, hinge === "left" ? s : e, hinge === "left" ? e : s, side, cls);
    }
  }

  // Flügel: vom Scharnier senkrecht zur Wandseite (side = +1/-1), plus Schwenkbogen
  function drawLeaf(w, hingeAlong, tipAlong, side, cls, leafCls, arcCls) {
    leafCls = leafCls || "door-leaf"; arcCls = arcCls || "door-arc";
    const width = Math.abs(tipAlong - hingeAlong);
    const hinge = wallLocalToScreen(w, hingeAlong, 0);
    const leafEnd = wallLocalToScreen(w, hingeAlong, side * width);
    el("line", { x1: hinge[0], y1: hinge[1], x2: leafEnd[0], y2: leafEnd[1], class: leafCls + cls }, svg);
    const tip = wallLocalToScreen(w, tipAlong, 0);
    const rPx = GD.geom.dist({ x: hinge[0], y: hinge[1] }, { x: tip[0], y: tip[1] });
    const sweep = side > 0 ? (tipAlong > hingeAlong ? 1 : 0) : (tipAlong > hingeAlong ? 0 : 1);
    el("path", { d: `M ${leafEnd[0]} ${leafEnd[1]} A ${rPx} ${rPx} 0 0 ${sweep} ${tip[0]} ${tip[1]}`, class: arcCls + cls }, svg);
  }

  function drawItem(it) {
    const [sx, sy] = W2S(it.x, it.y);
    const g = el("g", { transform: `translate(${sx} ${sy}) rotate(${it.rot}) scale(${view.scale})`, class: "item" + (isSel("item", it.id) ? " sel" : "") }, svg);
    g.innerHTML = GD.library.markup(it.type, it.w, it.h);
    if (it.label) { const t = el("text", { x: 0, y: it.h / 2 + 14, class: "item-label" }, g); t.textContent = it.label; }
  }

  function drawDim(d) {
    const u = GD.geom.norm(GD.geom.sub(d.b, d.a)), n = GD.geom.perp(u);
    const off = GD.geom.mul(n, d.offset);
    const a = GD.geom.add(d.a, off), b = GD.geom.add(d.b, off);
    const [ax, ay] = W2S(a.x, a.y), [bx, by] = W2S(b.x, b.y);
    const [oax, oay] = W2S(d.a.x, d.a.y), [obx, oby] = W2S(d.b.x, d.b.y);
    const sel = isSel("dim", d.id) ? " sel" : "";
    el("line", { x1: oax, y1: oay, x2: ax, y2: ay, class: "dim-help" }, svg);
    el("line", { x1: obx, y1: oby, x2: bx, y2: by, class: "dim-help" }, svg);
    el("line", { x1: ax, y1: ay, x2: bx, y2: by, class: "dim-line" + sel }, svg);
    for (const [px, py] of [[ax, ay], [bx, by]]) el("circle", { cx: px, cy: py, r: 2.2, class: "dim-tick" }, svg);
    const len = GD.geom.dist(d.a, d.b);
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const ang = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
    const t = el("text", { x: mx, y: my - 4, class: "dim-text", transform: `rotate(${ang > 90 || ang < -90 ? ang + 180 : ang} ${mx} ${my})` }, svg);
    t.textContent = (len / 100).toFixed(2) + " m";
  }

  /* ---------- Automatische Bemaßung (Bauplan-Standard) ---------- */
  // Eine Maßstrecke a→b, Maßlinie um perpPx (Screen) versetzt, mit Hilfslinien,
  // 45°-Maßbegrenzung und Maßzahl (in m). inner = Innenmaß (Akzentfarbe).
  function drawMeasure(a, b, perpPx, inner) {
    const A = W2S(a.x, a.y), B = W2S(b.x, b.y);
    const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy);
    if (len < 1) return;
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const A2 = [A[0] + nx * perpPx, A[1] + ny * perpPx], B2 = [B[0] + nx * perpPx, B[1] + ny * perpPx];
    const cls = inner ? " in" : "";
    if (!inner) {
      el("line", { x1: A[0], y1: A[1], x2: A2[0] + nx * 4, y2: A2[1] + ny * 4, class: "adim-help" }, svg);
      el("line", { x1: B[0], y1: B[1], x2: B2[0] + nx * 4, y2: B2[1] + ny * 4, class: "adim-help" }, svg);
    }
    el("line", { x1: A2[0], y1: A2[1], x2: B2[0], y2: B2[1], class: "adim-line" + cls }, svg);
    const s = 4.5, tdx = (ux + nx) * s, tdy = (uy + ny) * s;
    for (const P of [A2, B2]) el("line", { x1: P[0] - tdx, y1: P[1] - tdy, x2: P[0] + tdx, y2: P[1] + tdy, class: "adim-tick" + cls }, svg);
    if (len > 18) {
      const mx = (A2[0] + B2[0]) / 2, my = (A2[1] + B2[1]) / 2;
      let ang = Math.atan2(dy, dx) * 180 / Math.PI; if (ang > 90 || ang < -90) ang += 180;
      const t = el("text", { x: mx, y: my, dy: "-2.5", class: "adim-text" + cls, transform: `rotate(${ang} ${mx} ${my})` }, svg);
      t.textContent = (GD.geom.dist(a, b) / 100).toFixed(2);
    }
  }

  function uniqueAxis(vals) {
    const out = []; vals.sort((a, b) => a - b);
    for (const v of vals) if (!out.length || Math.abs(out[out.length - 1] - v) > 1) out.push(v);
    return out;
  }
  function drawAutoDims(floor) {
    const wpts = []; floor.walls.forEach(w => wpts.push(w.a, w.b));
    if (wpts.length >= 2) {
      const b = GD.geom.bbox(wpts);
      const vx = uniqueAxis(floor.walls.filter(w => Math.abs(w.a.x - w.b.x) < 1).map(w => w.a.x).concat([b.minX, b.maxX]));
      const hy = uniqueAxis(floor.walls.filter(w => Math.abs(w.a.y - w.b.y) < 1).map(w => w.a.y).concat([b.minY, b.maxY]));
      // Oben: Einzelmaße (Wandabschnitte) + Gesamtmaß
      for (let i = 0; i < vx.length - 1; i++) drawMeasure({ x: vx[i], y: b.minY }, { x: vx[i + 1], y: b.minY }, -30);
      if (vx.length > 2) drawMeasure({ x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY }, -56);
      // Links: Einzelmaße + Gesamtmaß
      for (let i = 0; i < hy.length - 1; i++) drawMeasure({ x: b.minX, y: hy[i] }, { x: b.minX, y: hy[i + 1] }, 30);
      if (hy.length > 2) drawMeasure({ x: b.minX, y: b.minY }, { x: b.minX, y: b.maxY }, 56);
    }
    // Innenmaße je Raum (lichte Breite/Länge an oberer/linker Kante)
    for (const r of floor.rooms) {
      if (r.poly.length < 3) continue;
      const rb = GD.geom.bbox(r.poly);
      if (rb.w > 60) drawMeasure({ x: rb.minX, y: rb.minY }, { x: rb.maxX, y: rb.minY }, 22, true);
      if (rb.h > 60) drawMeasure({ x: rb.minX, y: rb.minY }, { x: rb.minX, y: rb.maxY }, -22, true);
    }
  }

  function drawLabel(l) {
    const [sx, sy] = W2S(l.x, l.y);
    const t = el("text", { x: sx, y: sy, class: "free-label" + (isSel("label", l.id) ? " sel" : ""), "font-size": l.size, transform: `rotate(${l.rot} ${sx} ${sy})` }, svg);
    t.textContent = l.text;
  }

  function drawRoomBadge(room) {
    if (room.poly.length < 3) return;
    const c = GD.geom.centroid(room.poly);
    const [cx, cy] = W2S(c.x, c.y);
    const area = GD.geom.polygonArea(room.poly) / 10000; // m²
    const t1 = el("text", { x: cx, y: cy - 3, class: "room-name" }, svg); t1.textContent = room.name;
    const t2 = el("text", { x: cx, y: cy + 14, class: "room-sub" }, svg);
    t2.textContent = area.toFixed(2) + " m²" + (room.ceiling ? " · DH " + (room.ceiling / 100).toFixed(2) : "");
  }

  /* ---------- Auswahl-Overlays ---------- */
  /* ---------- Geschoss-Orientierung (Ghost) + Dach-Andeutung ---------- */
  function ghostFloor() {
    const floors = GD.state.project.floors, cur = GD.state.activeFloor();
    let below = null, above = null;
    floors.forEach(f => {
      if (f.id === cur.id) return;
      if (f.elevation <= cur.elevation && (!below || f.elevation > below.elevation)) below = f;
      if (f.elevation >= cur.elevation && (!above || f.elevation < above.elevation)) above = f;
    });
    return below || above;
  }
  function drawGhost(cur) {
    const g = ghostFloor(); if (!g) return;
    g.rooms.forEach(r => { if (r.poly.length < 3) return; el("polygon", { points: r.poly.map(p => W2S(p.x, p.y).join(",")).join(" "), class: "ghost-room" }, svg); });
    g.walls.forEach(w => { const q = wallQuad(w); el("polygon", { points: q.map(p => W2S(p.x, p.y).join(",")).join(" "), class: "ghost-wall" }, svg); });
    const [lx, ly] = W2S(0, 0);
    const t = el("text", { x: lx + 22, y: ly + 16, class: "ghost-label" }, svg); t.textContent = "⊘ " + g.name + (g.elevation < cur.elevation ? " (darunter)" : " (darüber)");
  }
  function drawOriginMarker() {
    const [ox, oy] = W2S(0, 0), s = 13;
    el("line", { x1: ox - s, y1: oy, x2: ox + s, y2: oy, class: "origin-mark" }, svg);
    el("line", { x1: ox, y1: oy - s, x2: ox, y2: oy + s, class: "origin-mark" }, svg);
    el("circle", { cx: ox, cy: oy, r: 3.5, class: "origin-dot" }, svg);
    const t = el("text", { x: ox + 9, y: oy - 7, class: "origin-label" }, svg); t.textContent = "Nullpunkt 0,0";
  }
  function drawRoofHint(floor) {
    const r = floor.roof; if (!r || !r.enabled) return;
    const pts = []; floor.walls.forEach(w => pts.push(w.a, w.b)); if (pts.length < 2) return;
    const b = GD.geom.bbox(pts), ov = r.overhang || 0;
    const x0 = b.minX - ov, x1 = b.maxX + ov, y0 = b.minY - ov, y1 = b.maxY + ov;
    el("polygon", { points: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => W2S(x, y).join(",")).join(" "), class: "roof-hint" }, svg);
    const ridgeX = (r.ridge === "x") || (r.ridge === "auto" && (x1 - x0) >= (y1 - y0));
    let a = null, b2 = null;
    if (r.type === "gable" || r.type === "hip") {
      if (ridgeX) { const ym = (y0 + y1) / 2; a = W2S(x0, ym); b2 = W2S(x1, ym); } else { const xm = (x0 + x1) / 2; a = W2S(xm, y0); b2 = W2S(xm, y1); }
    } else if (r.type === "pent") {
      if (ridgeX) { a = W2S(x0, y0); b2 = W2S(x1, y0); } else { a = W2S(x0, y0); b2 = W2S(x0, y1); }
    }
    if (a) el("line", { x1: a[0], y1: a[1], x2: b2[0], y2: b2[1], class: "roof-ridge" }, svg);
    const names = { gable: "Satteldach", hip: "Walmdach", pent: "Pultdach", flat: "Flachdach" };
    const [lx, ly] = W2S((x0 + x1) / 2, y0);
    const t = el("text", { x: lx, y: ly - 6, class: "roof-label" }, svg); t.textContent = "△ " + (names[r.type] || "Dach");
  }

  function drawSelection(floor) {
    for (const s of (ed().selected || [])) {
      if (s.kind === "item") {
        const it = floor.furniture.find(i => i.id === s.id); if (!it) continue;
        const [sx, sy] = W2S(it.x, it.y);
        const g = el("g", { transform: `translate(${sx} ${sy}) rotate(${it.rot})` }, svg);
        const w = it.w * view.scale, h = it.h * view.scale;
        el("rect", { x: -w / 2 - 3, y: -h / 2 - 3, width: w + 6, height: h + 6, class: "sel-box" }, g);
        el("line", { x1: 0, y1: -h / 2 - 3, x2: 0, y2: -h / 2 - 22, class: "sel-box" }, g);
        el("circle", { cx: 0, cy: -h / 2 - 22, r: 5, class: "rot-handle", "data-handle": "rotate", "data-id": it.id }, g);
      } else if (s.kind === "wall") {
        const w = floor.walls.find(x => x.id === s.id); if (!w) continue;
        for (const p of [w.a, w.b]) { const [hx, hy] = W2S(p.x, p.y); el("circle", { cx: hx, cy: hy, r: 5, class: "node-handle" }, svg); }
      } else if (s.kind === "opening") {
        const o = floor.openings.find(x => x.id === s.id); if (!o) continue;
        const w = floor.walls.find(x => x.id === o.wallId); if (!w) continue;
        const [mx, my] = wallLocalToScreen(w, o.pos, 0);
        el("circle", { cx: mx, cy: my, r: 6, class: "sel-dot" }, svg);
      } else if (s.kind === "room") {
        const r = floor.rooms.find(x => x.id === s.id); if (!r) continue;
        r.poly.forEach(p => { const [hx, hy] = W2S(p.x, p.y); el("rect", { x: hx - 4, y: hy - 4, width: 8, height: 8, class: "node-handle", "data-vert": 1, "data-id": r.id }, svg); });
      } else if (s.kind === "dim" || s.kind === "label") {
        const o = (s.kind === "dim" ? floor.dims : floor.labels).find(x => x.id === s.id); if (!o) continue;
        const p = s.kind === "label" ? o : GD.geom.lerp(o.a, o.b, .5);
        const [hx, hy] = W2S(p.x, p.y); el("circle", { cx: hx, cy: hy, r: 5, class: "sel-dot" }, svg);
      }
    }
  }

  function drawSnap(sp) {
    const [sx, sy] = W2S(sp.x, sp.y);
    el("circle", { cx: sx, cy: sy, r: 6, class: "snap-ind snap-" + (sp.type || "grid") }, svg);
  }

  /* ---------- Hit-Testing ---------- */
  function hitTest(wp) {
    const floor = GD.state.activeFloor();
    const tolW = 8 / view.scale;
    // Möbel (bbox in lokalen Koords, rotiert)
    for (let i = floor.furniture.length - 1; i >= 0; i--) {
      const it = floor.furniture[i];
      const a = -it.rot * Math.PI / 180;
      const dx = wp.x - it.x, dy = wp.y - it.y;
      const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(lx) <= it.w / 2 + 2 && Math.abs(ly) <= it.h / 2 + 2) return { kind: "item", id: it.id, obj: it };
    }
    // Labels
    for (let i = floor.labels.length - 1; i >= 0; i--) { const l = floor.labels[i]; if (GD.geom.dist(wp, l) < 30) return { kind: "label", id: l.id, obj: l }; }
    // Maßketten
    for (const d of floor.dims) {
      const n = GD.geom.perp(GD.geom.norm(GD.geom.sub(d.b, d.a))); const off = GD.geom.mul(n, d.offset);
      const pr = GD.geom.projectOnSeg(wp, GD.geom.add(d.a, off), GD.geom.add(d.b, off));
      if (pr.dist < tolW * 1.5) return { kind: "dim", id: d.id, obj: d };
    }
    // Öffnungen
    for (const o of floor.openings) {
      const w = floor.walls.find(x => x.id === o.wallId); if (!w) continue;
      const u = GD.geom.norm(GD.geom.sub(w.b, w.a));
      const c = GD.geom.add(w.a, GD.geom.mul(u, o.pos));
      if (GD.geom.dist(wp, c) < Math.max(o.width / 2, tolW)) return { kind: "opening", id: o.id, obj: o };
    }
    // Wände
    for (const w of floor.walls) {
      const pr = GD.geom.projectOnSeg(wp, w.a, w.b);
      if (pr.dist < w.thickness / 2 + tolW) return { kind: "wall", id: w.id, obj: w, t: pr.t };
    }
    // Räume
    for (let i = floor.rooms.length - 1; i >= 0; i--) { if (GD.geom.pointInPoly(wp, floor.rooms[i].poly)) return { kind: "room", id: floor.rooms[i].id, obj: floor.rooms[i] }; }
    return null;
  }

  /* ---------- Snapping ---------- */
  function snap(wp, opts) {
    opts = opts || {};
    const floor = GD.state.activeFloor();
    const st = GD.state.project.settings;
    const tolW = 12 / view.scale;
    let best = null, bestD = tolW;
    // Knoten (Wandenden, Raumecken)
    const nodes = [];
    floor.walls.forEach(w => { nodes.push(w.a); nodes.push(w.b); });
    floor.rooms.forEach(r => r.poly.forEach(p => nodes.push(p)));
    for (const nd of nodes) { const d = GD.geom.dist(wp, nd); if (d < bestD) { bestD = d; best = { x: nd.x, y: nd.y, type: "node" }; } }
    if (best) return best;
    // Wandkanten
    let edge = null, edgeD = tolW;
    for (const w of floor.walls) { const pr = GD.geom.projectOnSeg(wp, w.a, w.b); if (pr.dist < edgeD) { edgeD = pr.dist; edge = { x: pr.point.x, y: pr.point.y, type: "edge" }; } }
    if (edge) return edge;
    // Orthogonal zum Referenzpunkt
    if (opts.ref && st.ortho) {
      const dx = wp.x - opts.ref.x, dy = wp.y - opts.ref.y;
      if (Math.abs(dx) > Math.abs(dy) * 2) return { x: snapG(wp.x), y: opts.ref.y, type: "ortho" };
      if (Math.abs(dy) > Math.abs(dx) * 2) return { x: opts.ref.x, y: snapG(wp.y), type: "ortho" };
    }
    // Raster
    return { x: snapG(wp.x), y: snapG(wp.y), type: "grid" };
  }
  function snapG(v) { const g = GD.state.project.settings.gridCm; return Math.round(v / g) * g; }

  /* ---------- View ---------- */
  function zoomAt(px, py, f) {
    const wp = S2W(px, py);
    view.scale = Math.min(12, Math.max(0.03, view.scale * f));
    view.tx = px - wp.x * view.scale; view.ty = py - wp.y * view.scale;
    render(); GD.state.emit("zoom");
  }
  function zoomBy(f) { zoomAt(wrap.clientWidth / 2, wrap.clientHeight / 2, f); }
  function pan(dx, dy) { view.tx += dx; view.ty += dy; render(); }
  function fit() {
    const floor = GD.state.activeFloor();
    const pts = [];
    floor.walls.forEach(w => { pts.push(w.a, w.b); });
    floor.rooms.forEach(r => r.poly.forEach(p => pts.push(p)));
    if (!pts.length) { view.scale = 0.55; view.tx = 80; view.ty = 80; render(); return; }
    const b = GD.geom.bbox(pts), pad = GD.state.project.settings.showDims ? 130 : 90;
    const Wd = wrap.clientWidth, Ht = wrap.clientHeight;
    view.scale = Math.min(12, Math.max(0.03, Math.min((Wd - pad * 2) / (b.w || 1), (Ht - pad * 2) / (b.h || 1))));
    view.tx = (Wd - b.w * view.scale) / 2 - b.minX * view.scale;
    view.ty = (Ht - b.h * view.scale) / 2 - b.minY * view.scale;
    render(); GD.state.emit("zoom");
  }

  return { init, render, hitTest, snap, fit, zoomAt, zoomBy, pan, view, W2S, S2W, svgPoint, wallLocalToScreen, el };
})();
