"use strict";
/* Import & Export: JSON, PNG/JPG, SVG, PDF, DXF, OBJ, glTF */
window.GD = window.GD || {};

GD.io = (function () {

  /* Plan-Stilregeln wie auf dem Bildschirm (nutzen die Theme-Variablen) */
  const PLAN_CSS = `
    text{font-family:-apple-system,"Segoe UI",Roboto,sans-serif}
    .grid{stroke:var(--grid);stroke-width:1}.grid.strong{stroke:var(--grid-strong)}
    .room-fill{fill:var(--room-fill);stroke:none}
    .wall{fill:var(--wall-fill);stroke:none}
    .win-open{fill:var(--canvas-bg);stroke:none}
    .win-frame{stroke:var(--line);stroke-width:1.4;fill:none}
    .win-glass{stroke:var(--accent);stroke-width:1.6;fill:none}
    .door-leaf{stroke:var(--line);stroke-width:1.6;fill:none}
    .door-arc{stroke:var(--txt-dim);stroke-width:1;fill:none;stroke-dasharray:4 3}
    .win-sash{stroke:var(--accent);stroke-width:1;fill:none;opacity:.7}
    .win-sash-arc{stroke:var(--accent);stroke-width:.8;fill:none;opacity:.45;stroke-dasharray:3 3}
    .sym{stroke:var(--sym-stroke);fill:none;stroke-width:1.4;vector-effect:non-scaling-stroke}
    .sym-arrow{stroke:var(--accent);fill:none;stroke-width:1.4;vector-effect:non-scaling-stroke}
    .item-label{fill:var(--txt-dim);font-size:11px;text-anchor:middle}
    .room-name{fill:var(--txt);font-size:13px;font-weight:600;text-anchor:middle}
    .room-sub{fill:var(--txt-dim);font-size:11px;text-anchor:middle}
    .dim-line{stroke:var(--dim);stroke-width:1.2}.dim-help{stroke:var(--dim);stroke-width:.6;opacity:.7}
    .dim-tick{fill:var(--dim)}.dim-text{fill:var(--dim);font-size:11px;text-anchor:middle}
    .free-label{fill:var(--txt);text-anchor:middle}
    .adim-line{stroke:var(--txt-dim);stroke-width:.8}.adim-line.in{stroke:var(--accent);opacity:.65}
    .adim-help{stroke:var(--txt-dim);stroke-width:.6;opacity:.45}
    .adim-tick{stroke:var(--txt-dim);stroke-width:1.2}.adim-tick.in{stroke:var(--accent)}
    .adim-text{fill:var(--txt-soft);font-size:9.5px;text-anchor:middle;paint-order:stroke;stroke:var(--canvas-bg);stroke-width:3px;stroke-linejoin:round}
    .adim-text.in{fill:var(--accent)}
    .ghost-wall{fill:var(--txt-dim);opacity:.16}.ghost-room{fill:none;stroke:var(--txt-dim);stroke-width:1;stroke-dasharray:3 5;opacity:.4}
    .ghost-label{fill:var(--txt-dim);font-size:11px;opacity:.7}
    .origin-mark{stroke:#ff9f43;stroke-width:1.4}.origin-dot{fill:#ff9f43}.origin-label{fill:#ff9f43;font-size:10px;font-weight:600}
    .roof-hint{fill:none;stroke:var(--accent);stroke-width:1.2;stroke-dasharray:9 6;opacity:.55}
    .roof-ridge{stroke:var(--accent);stroke-width:1.4;stroke-dasharray:4 4;opacity:.8}
    .roof-label{fill:var(--accent);font-size:11px;font-weight:600;text-anchor:middle;opacity:.85}
  `;
  // entfernt nur temporäre UI-Overlays (Auswahl/Fang/Hilfslinien) – Raster bleibt wie am Schirm
  const STRIP = ["node-handle", "rot-handle", "sel-box", "snap-ind", "marquee", "draft-wall", "draft-room", "draft-node", "sel-dot", "edge-hit", "win-hit", "wall-add-hit", "handle"];
  const THEME_VARS = ["--canvas-bg", "--grid", "--grid-strong", "--wall-fill", "--room-fill", "--line", "--accent", "--txt", "--txt-dim", "--txt-soft", "--sym-stroke", "--dim"];
  function themeVarStyle() { const cs = getComputedStyle(document.documentElement); return THEME_VARS.map(n => n + ":" + cs.getPropertyValue(n).trim()).join(";"); }
  function canvasBg() { return getComputedStyle(document.documentElement).getPropertyValue("--canvas-bg").trim() || "#ffffff"; }
  function hexToRgb(hex) { hex = (hex || "").trim().replace("#", ""); if (hex.length === 3) hex = hex.split("").map(c => c + c).join(""); const n = parseInt(hex, 16); return isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  function download(name, data, mime) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 100);
  }

  /* ---------- sauberes SVG vom aktuellen Plan ---------- */
  function cleanSVG() {
    GD.editor.clearSel(); GD.view2d.render();
    const live = document.getElementById("canvas");
    const clone = live.cloneNode(true);
    STRIP.forEach(c => clone.querySelectorAll("." + c).forEach(n => n.remove()));
    const vb = live.getAttribute("viewBox").split(" ").map(Number);
    clone.setAttribute("width", vb[2]); clone.setAttribute("height", vb[3]);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("style", themeVarStyle());                    // aktuelle Theme-Farben mitgeben
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style"); style.textContent = PLAN_CSS;
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", 0); bg.setAttribute("y", 0); bg.setAttribute("width", vb[2]); bg.setAttribute("height", vb[3]); bg.setAttribute("fill", canvasBg());
    clone.insertBefore(bg, clone.firstChild); clone.insertBefore(style, clone.firstChild);
    return { node: clone, w: vb[2], h: vb[3] };
  }
  function serialize(node) { return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(node); }
  function svgString() { return serialize(cleanSVG().node); }   // synchron, ohne Bild-Einbettung (Kompatibilität)

  // Bild (relativer Pfad / URL) in eine eingebettete Daten-URL umwandeln
  function imageToDataURL(src) {
    return new Promise((res, rej) => {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => { const c = document.createElement("canvas"); c.width = img.naturalWidth || 1; c.height = img.naturalHeight || 1; try { c.getContext("2d").drawImage(img, 0, 0); res(c.toDataURL("image/png")); } catch (e) { rej(e); } };
      img.onerror = () => rej(new Error("load"));
      img.src = src;
    });
  }
  // Alle <image> (z.B. Vorlage/Underlay) zur Export-Zeit einbetten, damit sie im Bild/PDF erscheinen
  async function embedImages(node) {
    for (const im of Array.from(node.querySelectorAll("image"))) {
      const href = im.getAttribute("href") || im.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (!href || /^data:/i.test(href)) continue;
      try { const du = await imageToDataURL(href); im.setAttribute("href", du); im.setAttributeNS("http://www.w3.org/1999/xlink", "href", du); }
      catch (e) { im.remove(); }
    }
  }
  async function exportSvgString() { const { node } = cleanSVG(); await embedImages(node); return serialize(node); }

  async function exportSVG() { download((GD.state.project.name || "grundriss") + ".svg", await exportSvgString(), "image/svg+xml"); }

  async function svgToCanvas(scale) {
    const { node, w, h } = cleanSVG();
    await embedImages(node);
    const img = new Image();
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(serialize(node));
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const s = scale || 2;
    const canvas = document.createElement("canvas"); canvas.width = w * s; canvas.height = h * s;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = canvasBg(); ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  async function exportPNG(jpeg) {
    const canvas = await svgToCanvas(2);
    canvas.toBlob(b => download((GD.state.project.name || "grundriss") + (jpeg ? ".jpg" : ".png"), b, jpeg ? "image/jpeg" : "image/png"), jpeg ? "image/jpeg" : "image/png", 0.92);
  }

  async function exportPDF() {
    const canvas = await svgToCanvas(2.5);
    const ratio = canvas.width / canvas.height;
    const jspdf = window.jspdf && window.jspdf.jsPDF;
    if (!jspdf) { alert("PDF-Bibliothek nicht geladen."); return; }
    const landscape = ratio >= 1;
    const pdf = new jspdf({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    const margin = 12; let w = pw - margin * 2, h = w / ratio;
    if (h > ph - margin * 2) { h = ph - margin * 2; w = h * ratio; }
    const x = (pw - w) / 2, y = (ph - h) / 2;
    const cs = getComputedStyle(document.documentElement);
    const bg = hexToRgb(cs.getPropertyValue("--canvas-bg")), tx = hexToRgb(cs.getPropertyValue("--txt"));
    pdf.setFillColor(bg[0], bg[1], bg[2]); pdf.rect(0, 0, pw, ph, "F");   // Seite = Bildschirm-Hintergrund
    pdf.setFontSize(13); pdf.setTextColor(tx[0], tx[1], tx[2]); pdf.text(GD.state.project.name || "Grundriss", margin, 9);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, w, h);
    pdf.save((GD.state.project.name || "grundriss") + ".pdf");
  }

  /* ---------- JSON ---------- */
  function exportJSON() { download((GD.state.project.name || "grundriss") + ".json", JSON.stringify(GD.state.project, null, 2), "application/json"); }
  function importJSON(text) {
    try { const p = JSON.parse(text); if (!p.floors || !p.floors.length) throw 0; p.floors.forEach(f => { if (f && f.underlay) f.underlay.src = GD.sanitizeImageSrc(f.underlay.src); }); GD.state.replaceProject(p); GD.view2d.fit(); GD.ui.refreshAll(); GD.ui.toast("Projekt geladen"); }
    catch (e) { alert("Ungültige Projektdatei."); }
  }

  /* ---------- DXF Export (R12 ASCII) ---------- */
  function exportDXF() {
    const fl = GD.state.activeFloor();
    let s = "0\nSECTION\n2\nENTITIES\n";
    const line = (a, b) => { s += `0\nLINE\n8\nWALLS\n10\n${a.x / 100}\n20\n${-a.y / 100}\n30\n0\n11\n${b.x / 100}\n21\n${-b.y / 100}\n31\n0\n`; };
    const text = (x, y, h, str) => { s += `0\nTEXT\n8\nLABELS\n10\n${x / 100}\n20\n${-y / 100}\n30\n0\n40\n${h}\n1\n${str}\n`; };
    // Wände als beide Laibungslinien
    for (const w of fl.walls) {
      const u = GD.geom.norm(GD.geom.sub(w.b, w.a)), n = GD.geom.perp(u), o = GD.geom.mul(n, w.thickness / 2);
      line(GD.geom.add(w.a, o), GD.geom.add(w.b, o)); line(GD.geom.sub(w.a, o), GD.geom.sub(w.b, o));
    }
    // Räume als POLYLINE
    for (const r of fl.rooms) {
      s += "0\nPOLYLINE\n8\nROOMS\n66\n1\n70\n1\n";
      r.poly.forEach(p => { s += `0\nVERTEX\n8\nROOMS\n10\n${p.x / 100}\n20\n${-p.y / 100}\n30\n0\n`; });
      s += "0\nSEQEND\n";
      const c = GD.geom.centroid(r.poly); text(c.x, c.y, 0.2, r.name.replace(/\n/g, " "));
    }
    fl.dims.forEach(d => line(d.a, d.b));
    s += "0\nENDSEC\n0\nEOF\n";
    download((GD.state.project.name || "grundriss") + ".dxf", s, "application/dxf");
  }

  /* ---------- DXF Import (LINE, LWPOLYLINE, POLYLINE) ---------- */
  function importDXF(text) {
    const lines = text.split(/\r?\n/);
    const ents = []; let i = 0;
    // einfache Paar-Lesung
    const pairs = [];
    for (let k = 0; k < lines.length - 1; k += 2) pairs.push([lines[k].trim(), lines[k + 1]]);
    let cur = null, mode = null, poly = null, scale = 100; // m->cm
    function flushPoly() { if (poly && poly.length >= 2) ents.push({ type: "poly", pts: poly }); poly = null; }
    let pendingX = null;
    for (const [code, val] of pairs) {
      if (code === "0") {
        if (cur && cur.type === "LINE" && cur.x1 != null) ents.push({ type: "line", a: { x: cur.x1 * scale, y: -cur.y1 * scale }, b: { x: cur.x2 * scale, y: -cur.y2 * scale } });
        flushPoly();
        cur = { type: val.trim() };
        if (cur.type === "LWPOLYLINE" || cur.type === "POLYLINE") poly = [];
      } else if (!cur) { continue; }
      else if (cur.type === "LINE") {
        if (code === "10") cur.x1 = +val; else if (code === "20") cur.y1 = +val; else if (code === "11") cur.x2 = +val; else if (code === "21") cur.y2 = +val;
      } else if (cur.type === "LWPOLYLINE") {
        if (code === "10") pendingX = +val; else if (code === "20" && pendingX != null) { poly.push({ x: pendingX * scale, y: -(+val) * scale }); pendingX = null; }
      } else if (cur.type === "VERTEX") {
        if (code === "10") pendingX = +val; else if (code === "20" && pendingX != null) { (poly = poly || []).push({ x: pendingX * scale, y: -(+val) * scale }); pendingX = null; }
      }
    }
    if (cur && cur.type === "LINE" && cur.x1 != null) ents.push({ type: "line", a: { x: cur.x1 * scale, y: -cur.y1 * scale }, b: { x: cur.x2 * scale, y: -cur.y2 * scale } });
    flushPoly();
    if (!ents.length) { alert("Keine Linien/Polylinien im DXF gefunden."); return; }
    const fl = GD.state.activeFloor();
    GD.state.commitStructure(() => {
      ents.forEach(e => {
        if (e.type === "line") fl.walls.push(GD.make.wall(e.a, e.b, 18));
        else for (let j = 0; j < e.pts.length - 1; j++) fl.walls.push(GD.make.wall(e.pts[j], e.pts[j + 1], 18));
      });
    });
    GD.view2d.fit(); GD.ui.toast(ents.length + " DXF-Elemente importiert");
  }

  /* ---------- SVG Import ---------- */
  function importSVG(text) {
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const fl = GD.state.activeFloor(); const walls = [];
    const add = (a, b) => walls.push(GD.make.wall(a, b, 18));
    doc.querySelectorAll("line").forEach(l => add({ x: +l.getAttribute("x1"), y: +l.getAttribute("y1") }, { x: +l.getAttribute("x2"), y: +l.getAttribute("y2") }));
    const polypts = (s) => s.trim().split(/\s+/).map(pp => { const [x, y] = pp.split(","); return { x: +x, y: +y }; });
    doc.querySelectorAll("polyline,polygon").forEach(p => { const pts = polypts(p.getAttribute("points") || ""); const close = p.tagName.toLowerCase() === "polygon"; for (let j = 0; j < pts.length - 1; j++) add(pts[j], pts[j + 1]); if (close && pts.length > 2) add(pts[pts.length - 1], pts[0]); });
    doc.querySelectorAll("rect").forEach(r => { const x = +r.getAttribute("x"), y = +r.getAttribute("y"), w = +r.getAttribute("width"), h = +r.getAttribute("height"); add({ x, y }, { x: x + w, y }); add({ x: x + w, y }, { x: x + w, y: y + h }); add({ x: x + w, y: y + h }, { x, y: y + h }); add({ x, y: y + h }, { x, y }); });
    if (!walls.length) { alert("Keine verwertbare Geometrie im SVG."); return; }
    GD.state.commitStructure(() => { walls.forEach(w => fl.walls.push(w)); });
    GD.view2d.fit(); GD.ui.toast(walls.length + " SVG-Segmente importiert");
  }

  function importImage(dataURL) {
    const src = GD.sanitizeImageSrc(dataURL);
    if (!src) { alert("Nicht unterstütztes Bildformat."); return; }
    const fl = GD.state.activeFloor();
    GD.state.commit(() => { fl.underlay = { src, x: 0, y: 0, scale: 1, rotation: 0, opacity: 0.5, visible: true }; });
    GD.view2d.render(); GD.ui.refreshAll();
  }

  /* ---------- 3D Export: OBJ / glTF ---------- */
  function ensure3D() { GD.view3d.init(document.getElementById("view3d")); GD.view3d.build(); }
  function exportOBJ() {
    ensure3D();
    const root = GD.view3d.getScene(); root.updateMatrixWorld(true);
    let out = "# Grundriss-Designer OBJ\n"; let base = 1;
    root.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry; const pos = g.attributes.position; if (!pos) return;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); v.applyMatrix4(o.matrixWorld); out += `v ${v.x.toFixed(4)} ${v.y.toFixed(4)} ${v.z.toFixed(4)}\n`; }
      const idx = g.index;
      if (idx) for (let i = 0; i < idx.count; i += 3) out += `f ${base + idx.getX(i)} ${base + idx.getX(i + 1)} ${base + idx.getX(i + 2)}\n`;
      else for (let i = 0; i < pos.count; i += 3) out += `f ${base + i} ${base + i + 1} ${base + i + 2}\n`;
      base += pos.count;
    });
    download((GD.state.project.name || "grundriss") + ".obj", out, "text/plain");
  }
  function exportGLTF() {
    ensure3D();
    const exporter = new THREE.GLTFExporter();
    exporter.parse(GD.view3d.getScene(), (result) => {
      const out = JSON.stringify(result);
      download((GD.state.project.name || "grundriss") + ".gltf", out, "model/gltf+json");
    }, {});
  }

  /* ---------- OBJ Import (3D → Grundriss, volle Maß-Interpretation) ---------- */
  function importOBJ(text) {
    const unit = (prompt("Einheit der OBJ-Datei (m, cm oder mm):", "m") || "m").trim().toLowerCase();
    const f = unit === "mm" ? 0.1 : unit === "cm" ? 1 : 100; // -> cm
    const verts = [], faces = [];
    for (const line of text.split(/\r?\n/)) {
      const p = line.trim().split(/\s+/);
      if (p[0] === "v" && p.length >= 4) verts.push({ x: +p[1] * f, y: +p[2] * f, z: +p[3] * f });
      else if (p[0] === "f" && p.length >= 4) {
        const idx = p.slice(1).map(s => { let n = parseInt(s.split("/")[0], 10); if (n < 0) n = verts.length + 1 + n; return n - 1; });
        if (idx.every(n => n >= 0 && n < 1e9)) faces.push(idx);
      }
    }
    if (verts.length < 3 || !faces.length) { alert("Keine verwertbare OBJ-Geometrie gefunden."); return; }
    const G = GD.geom, segs = [];
    for (const fc of faces) {
      const vs = fc.map(i => verts[i]).filter(Boolean); if (vs.length < 3) continue;
      const e1 = { x: vs[1].x - vs[0].x, y: vs[1].y - vs[0].y, z: vs[1].z - vs[0].z };
      const e2 = { x: vs[2].x - vs[0].x, y: vs[2].y - vs[0].y, z: vs[2].z - vs[0].z };
      const nx = e1.y * e2.z - e1.z * e2.y, ny = e1.z * e2.x - e1.x * e2.z, nz = e1.x * e2.y - e1.y * e2.x;
      const nl = Math.hypot(nx, ny, nz) || 1;
      if (Math.abs(ny / nl) > 0.35) continue;                 // horizontal -> Boden/Decke
      let ymin = Infinity, ymax = -Infinity; vs.forEach(v => { ymin = Math.min(ymin, v.y); ymax = Math.max(ymax, v.y); });
      const hgt = ymax - ymin;
      if (hgt < 150) continue;                                // zu niedrig -> Möbel/Detail
      const proj = vs.map(v => ({ x: v.x, y: v.z }));         // planX=x, planY=z
      let a = proj[0], b = proj[1], best = -1;
      for (let i = 0; i < proj.length; i++) for (let j = i + 1; j < proj.length; j++) { const d = G.dist(proj[i], proj[j]); if (d > best) { best = d; a = proj[i]; b = proj[j]; } }
      if (best < 25) continue;                                // zu kurz -> Stirnseite der Wand
      segs.push({ a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, h: hgt });
    }
    if (!segs.length) { alert("Keine Wandflächen im OBJ erkannt (nur niedrige/horizontale Geometrie)."); return; }
    const walls = mergeWallSegments(segs);
    const heights = segs.map(s => s.h).sort((x, y) => x - y);
    const wallHeight = Math.round(heights[Math.floor(heights.length / 2)] || 260);
    const fl = GD.make.floor("OBJ-Import");
    fl.wallHeight = wallHeight;
    fl.elevation = GD.state.project.floors.reduce((a, b) => Math.max(a, b.elevation + b.wallHeight), 0);
    walls.forEach(w => fl.walls.push(GD.make.wall(w.a, w.b, Math.max(6, Math.round(w.thickness)))));
    GD.state.commitStructure(() => { GD.state.project.floors.push(fl); GD.state.project.activeFloorId = fl.id; });
    GD.view2d.fit(); GD.ui.refreshAll();
    GD.ui.toast(walls.length + " Wände importiert · Höhe " + (wallHeight / 100).toFixed(2) + " m");
  }
  // Parallele Wandseiten zu Mittellinie + Dicke zusammenführen
  function mergeWallSegments(segs) {
    const G = GD.geom, used = new Array(segs.length).fill(false), out = [];
    const sameWall = (a, b) => out.some(w => (G.dist(w.a, a) < 9 && G.dist(w.b, b) < 9) || (G.dist(w.a, b) < 9 && G.dist(w.b, a) < 9));
    const push = (a, b, th) => { if (!sameWall(a, b)) out.push({ a, b, thickness: th }); };
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      const S = segs[i], dir = G.norm(G.sub(S.b, S.a)), perp = G.perp(dir), lenS = G.dist(S.a, S.b);
      let bestJ = -1, bestOff = 1e9;
      for (let j = i + 1; j < segs.length; j++) {
        if (used[j]) continue;
        const T = segs[j], dirT = G.norm(G.sub(T.b, T.a));
        if (Math.abs(dir.x * dirT.y - dir.y * dirT.x) > 0.12) continue;     // nicht parallel
        const off = G.dot(G.sub(T.a, S.a), perp);
        if (Math.abs(off) < 2 || Math.abs(off) > 60) continue;             // Querabstand = Wanddicke
        const ta = G.dot(G.sub(T.a, S.a), dir), tb = G.dot(G.sub(T.b, S.a), dir);
        if (Math.min(lenS, Math.max(ta, tb)) - Math.max(0, Math.min(ta, tb)) < 20) continue; // Überlappung
        if (Math.abs(off) < bestOff) { bestOff = Math.abs(off); bestJ = j; }
      }
      if (bestJ >= 0) {
        const T = segs[bestJ]; used[i] = used[bestJ] = true;
        const off = G.dot(G.sub(T.a, S.a), perp), shift = G.mul(perp, off / 2);
        const ts = [S.a, S.b, T.a, T.b].map(p => G.dot(G.sub(p, S.a), dir));
        const t0 = Math.min.apply(null, ts), t1 = Math.max.apply(null, ts);
        push(G.add(G.add(S.a, G.mul(dir, t0)), shift), G.add(G.add(S.a, G.mul(dir, t1)), shift), Math.abs(off));
      } else { used[i] = true; push(S.a, S.b, 18); }
    }
    return out;
  }

  /* ---------- Datei-Auswahl ---------- */
  function pickFile(accept, cb, asDataURL) {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = accept;
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => cb(r.result, f); asDataURL ? r.readAsDataURL(f) : r.readAsText(f); };
    inp.click();
  }
  function importDialog() {
    pickFile(".json,.dxf,.svg,.obj,.png,.jpg,.jpeg", (data, file) => {
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext === "json") importJSON(data);
      else if (ext === "dxf") importDXF(data);
      else if (ext === "svg") importSVG(data);
      else if (ext === "obj") importOBJ(data);
    });
  }
  function importImageDialog() { pickFile("image/*", (d) => importImage(d), true); }

  return { exportSVG, exportPNG, exportPDF, exportJSON, importJSON, exportDXF, importDXF, importSVG, importOBJ, importImage, exportOBJ, exportGLTF, pickFile, importDialog, importImageDialog, download, svgString, exportSvgString };
})();
