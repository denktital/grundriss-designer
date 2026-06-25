"use strict";
/* Import & Export: JSON, PNG/JPG, SVG, PDF, DXF, OBJ, glTF */
window.GD = window.GD || {};

GD.io = (function () {

  /* eingebettetes Stylesheet für sauberen SVG-Export (helles Blatt) */
  const SVG_STYLE = `
    .room-fill{fill:#f7f8fa;stroke:none}
    .wall{fill:#222;stroke:none}
    .win-open{fill:#fff;stroke:none}
    .win-frame{stroke:#222;stroke-width:1px;fill:none}
    .win-glass{stroke:#2b6cd4;stroke-width:1.4px;fill:none}
    .door-leaf{stroke:#222;stroke-width:1.4px;fill:none}
    .door-arc{stroke:#888;stroke-width:1px;fill:none;stroke-dasharray:4 3}
    .sym{fill:none;stroke:#444;stroke-width:1.2px;vector-effect:non-scaling-stroke}
    .sym-arrow{fill:none;stroke:#888;stroke-width:1px;vector-effect:non-scaling-stroke}
    .item-label{fill:#555;font:11px sans-serif;text-anchor:middle}
    .dim-line{stroke:#c0392b;stroke-width:1px}.dim-help{stroke:#c0392b;stroke-width:.5px}
    .dim-tick{fill:#c0392b}.dim-text{fill:#c0392b;font:11px sans-serif;text-anchor:middle}
    .room-name{fill:#222;font:600 13px sans-serif;text-anchor:middle}
    .room-sub{fill:#777;font:11px sans-serif;text-anchor:middle}
    .free-label{fill:#222;font:14px sans-serif;text-anchor:middle}
  `;
  const STRIP = ["grid", "node-handle", "rot-handle", "sel-box", "snap-ind", "marquee", "draft-wall", "draft-room", "draft-node", "sel-dot"];

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
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style"); style.textContent = SVG_STYLE;
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", 0); bg.setAttribute("y", 0); bg.setAttribute("width", vb[2]); bg.setAttribute("height", vb[3]); bg.setAttribute("fill", "#ffffff");
    clone.insertBefore(bg, clone.firstChild); clone.insertBefore(style, clone.firstChild);
    return { node: clone, w: vb[2], h: vb[3] };
  }
  function svgString() { const { node } = cleanSVG(); return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(node); }

  function exportSVG() { download((GD.state.project.name || "grundriss") + ".svg", svgString(), "image/svg+xml"); }

  async function svgToCanvas(scale) {
    const { w, h } = cleanSVG();
    const str = svgString();
    const img = new Image();
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(str);
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const s = scale || 2;
    const canvas = document.createElement("canvas"); canvas.width = w * s; canvas.height = h * s;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    pdf.setFontSize(13); pdf.text(GD.state.project.name || "Grundriss", margin, margin - 3 < 6 ? 8 : margin - 2);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, w, h);
    pdf.save((GD.state.project.name || "grundriss") + ".pdf");
  }

  /* ---------- JSON ---------- */
  function exportJSON() { download((GD.state.project.name || "grundriss") + ".json", JSON.stringify(GD.state.project, null, 2), "application/json"); }
  function importJSON(text) {
    try { const p = JSON.parse(text); if (!p.floors || !p.floors.length) throw 0; GD.state.replaceProject(p); GD.view2d.fit(); GD.ui.refreshAll(); GD.ui.toast("Projekt geladen"); }
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
    const fl = GD.state.activeFloor();
    GD.state.commit(() => { fl.underlay = { src: dataURL, x: 0, y: 0, scale: 1, rotation: 0, opacity: 0.5, visible: true }; });
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

  return { exportSVG, exportPNG, exportPDF, exportJSON, importJSON, exportDXF, importDXF, importSVG, importOBJ, importImage, exportOBJ, exportGLTF, pickFile, importDialog, importImageDialog, download, svgString };
})();
