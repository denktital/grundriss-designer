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
    drawUnderlay(floor);
    floor.rooms.forEach(r => drawRoomFill(r));
    floor.walls.forEach(w => drawWall(floor, w));
    floor.openings.forEach(o => drawOpening(floor, o));
    floor.furniture.forEach(it => drawItem(it));
    if (st.showDims) floor.dims.forEach(d => drawDim(d));
    floor.labels.forEach(l => drawLabel(l));
    floor.rooms.forEach(r => drawRoomBadge(r));

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
    if (!u || !u.visible || !u.src) return;
    const [sx, sy] = W2S(u.x, u.y);
    const img = el("image", { x: sx, y: sy, opacity: u.opacity, preserveAspectRatio: "none" }, svg);
    img.setAttributeNS("http://www.w3.org/1999/xlink", "href", u.src);
    img.setAttribute("href", u.src);
    if (u.rotation) img.setAttribute("transform", `rotate(${u.rotation} ${sx} ${sy})`);
    if (!u._nw) {
      const probe = new Image();
      probe.onload = () => { u._nw = probe.naturalWidth; u._nh = probe.naturalHeight; render(); };
      probe.src = u.src;
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
    const sel = isSel("wall", w.id);
    for (const [s, e] of segs) {
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

  function drawOpening(floor, o) {
    const w = floor.walls.find(x => x.id === o.wallId);
    if (!w) return;
    const t = w.thickness, s = o.pos - o.width / 2, e = o.pos + o.width / 2;
    const sel = isSel("opening", o.id);
    const cls = sel ? " sel" : "";
    if (o.type === "window") {
      // Rahmen + Glaslinie
      const c1 = wallLocalToScreen(w, s, -t / 2), c2 = wallLocalToScreen(w, e, -t / 2);
      const c3 = wallLocalToScreen(w, e, t / 2), c4 = wallLocalToScreen(w, s, t / 2);
      el("polygon", { points: [c1, c2, c3, c4].map(p => p.join(",")).join(" "), class: "win-open" }, svg);
      el("line", { x1: c1[0], y1: c1[1], x2: c2[0], y2: c2[1], class: "win-frame" + cls }, svg);
      el("line", { x1: c4[0], y1: c4[1], x2: c3[0], y2: c3[1], class: "win-frame" + cls }, svg);
      const m1 = wallLocalToScreen(w, s, 0), m2 = wallLocalToScreen(w, e, 0);
      el("line", { x1: m1[0], y1: m1[1], x2: m2[0], y2: m2[1], class: "win-glass" + cls }, svg);
    } else {
      // Türöffnung: Wand-Aussparung weiß
      const c1 = wallLocalToScreen(w, s, -t / 2), c2 = wallLocalToScreen(w, e, -t / 2), c3 = wallLocalToScreen(w, e, t / 2), c4 = wallLocalToScreen(w, s, t / 2);
      el("polygon", { points: [c1, c2, c3, c4].map(p => p.join(",")).join(" "), class: "win-open" }, svg);
      const sideOff = (o.swing === "right") ? t / 2 : -t / 2;
      if (o.type === "door-double") {
        drawLeaf(w, s, s + o.width / 2, sideOff, false, cls);
        drawLeaf(w, e, e - o.width / 2, sideOff, true, cls);
      } else if (o.type === "door-slide") {
        const a = wallLocalToScreen(w, s, 0), b = wallLocalToScreen(w, e, 0);
        el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: "door-leaf" + cls }, svg);
        const a2 = wallLocalToScreen(w, s + o.width * .15, sideOff * .8), b2 = wallLocalToScreen(w, e + o.width * .1, sideOff * .8);
        el("line", { x1: a2[0], y1: a2[1], x2: b2[0], y2: b2[1], class: "door-leaf" + cls }, svg);
      } else {
        const hinge = o.flip ? e : s, tip = o.flip ? s : e;
        drawLeaf(w, hinge, tip, sideOff, o.flip, cls);
      }
    }
  }

  // Türblatt von hinge(along) zu tip(along), schwenkt zur Seite sideOff
  function drawLeaf(w, hingeAlong, tipAlong, sideOff, flip, cls) {
    const width = Math.abs(tipAlong - hingeAlong);
    const hinge = wallLocalToScreen(w, hingeAlong, 0);
    // Türblatt: vom Scharnier senkrecht in den Raum
    const leafEnd = wallLocalToScreen(w, hingeAlong, sideOff > 0 ? width : -width);
    el("line", { x1: hinge[0], y1: hinge[1], x2: leafEnd[0], y2: leafEnd[1], class: "door-leaf" + cls }, svg);
    // Schwenkbogen vom Türblattende zum Anschlag
    const tip = wallLocalToScreen(w, tipAlong, 0);
    const rPx = GD.geom.dist({ x: hinge[0], y: hinge[1] }, { x: tip[0], y: tip[1] });
    el("path", { d: `M ${leafEnd[0]} ${leafEnd[1]} A ${rPx} ${rPx} 0 0 ${sideOff > 0 ? (tipAlong > hingeAlong ? 1 : 0) : (tipAlong > hingeAlong ? 0 : 1)} ${tip[0]} ${tip[1]}`, class: "door-arc" + cls }, svg);
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
    const b = GD.geom.bbox(pts), pad = 90;
    const Wd = wrap.clientWidth, Ht = wrap.clientHeight;
    view.scale = Math.min(12, Math.max(0.03, Math.min((Wd - pad * 2) / (b.w || 1), (Ht - pad * 2) / (b.h || 1))));
    view.tx = (Wd - b.w * view.scale) / 2 - b.minX * view.scale;
    view.ty = (Ht - b.h * view.scale) / 2 - b.minY * view.scale;
    render(); GD.state.emit("zoom");
  }

  return { init, render, hitTest, snap, fit, zoomAt, zoomBy, pan, view, W2S, S2W, svgPoint, wallLocalToScreen, el };
})();
