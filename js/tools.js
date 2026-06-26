"use strict";
/* Werkzeuge & Interaktion: Auswahl, Zeichnen (Wand/Raum), Öffnungen, Möbel, Bemaßung, Labels */
window.GD = window.GD || {};

GD.editor = (function () {
  let svg, wrap;
  const V = () => GD.view2d;
  let tool = "select";
  let selected = [];
  let pendingType = null;       // Möbeltyp bei tool 'furniture'
  let draft = null;             // {kind:'wall'|'room', pts:[]}
  let drag = null;
  let snapPoint = null;
  let mouseW = { x: 0, y: 0 };
  let spaceDown = false;

  /* ---------- API für view2d ---------- */
  const self = {
    get selected() { return selected; },
    get snapPoint() { return snapPoint; },
    preview: null,
  };

  function emitSel() { GD.state.emit("selection"); V().render(); }
  function isSelected(kind, id) { return selected.some(s => s.kind === kind && s.id === id); }
  function setSelection(arr) { selected = arr; emitSel(); }
  function clearSel() { if (selected.length) { selected = []; emitSel(); } }
  function selectOne(kind, id, additive) {
    if (additive) { if (isSelected(kind, id)) selected = selected.filter(s => !(s.kind === kind && s.id === id)); else selected.push({ kind, id }); }
    else selected = [{ kind, id }];
    emitSel();
  }

  function setTool(t, opt) {
    tool = t; pendingType = (t === "furniture" || t === "elec") ? (opt || pendingType) : null;
    draft = null; self.preview = null; snapPoint = null;
    wrap.style.cursor = (t === "select") ? "default" : "crosshair";
    GD.state.emit("tool", t); V().render();
  }
  function getTool() { return tool; }

  /* ---------- Helfer ---------- */
  function floor() { return GD.state.activeFloor(); }
  function snapW(opts) { const s = V().snap(mouseW, opts); snapPoint = s; return s; }
  function dScreen(aw, bScreen) { const [ax, ay] = V().W2S(aw.x, aw.y); return Math.hypot(ax - bScreen[0], ay - bScreen[1]); }

  function moveCoincident(fl, from, to) {
    const eq = (p) => GD.geom.dist(p, from) < 1.2;
    fl.walls.forEach(w => { if (eq(w.a)) { w.a.x = to.x; w.a.y = to.y; } if (eq(w.b)) { w.b.x = to.x; w.b.y = to.y; } });
    // Räume werden aus den Wänden abgeleitet (GD.rooms.refresh im Render) – kein manuelles Mitziehen nötig.
  }

  /* ---------- Pointer ---------- */
  function onDown(evt) {
    const px = V().svgPoint(evt); mouseW = V().S2W(px[0], px[1]);
    if (evt.button === 1 || spaceDown) { drag = { mode: "pan", px }; wrap.setPointerCapture(evt.pointerId); wrap.style.cursor = "grabbing"; return; }
    if (evt.button !== 0) return;

    if (tool === "select") return downSelect(evt, px);
    if (tool === "wall" || tool === "wire") return downDraft(evt);
    if (tool === "window" || tool === "door" || tool === "door-double" || tool === "door-slide") return placeOpening(evt);
    if (tool === "furniture") return placeItem(evt);
    if (tool === "elec") return placeElec(evt);
    if (tool === "dim") return dimClick(evt);
    if (tool === "label") return placeLabel(evt);
  }

  function downSelect(evt, px) {
    const fl = floor();
    // 1) Handles selektierter Objekte
    for (const s of selected) {
      if (s.kind === "item") {
        const it = fl.furniture.find(i => i.id === s.id); if (!it) continue;
        const [cx, cy] = V().W2S(it.x, it.y); const hy = cy - (it.h * V().view.scale / 2) - 22;
        const rh = rotateHandlePos(it);
        if (Math.hypot(px[0] - rh[0], px[1] - rh[1]) < 10) { beginDrag({ mode: "rotate-item", id: it.id }); return; }
      }
      if (s.kind === "wall") {
        const w = fl.walls.find(x => x.id === s.id); if (!w) continue;
        for (const key of ["a", "b"]) if (dScreen(w[key], px) < 10) { beginDrag({ mode: "node", from: { x: w[key].x, y: w[key].y } }); return; }
      }
    }
    // 2) Objekt unter Cursor
    const hit = V().hitTest(mouseW);
    if (hit) {
      // Shift = Auswahl nur umschalten (hinzufügen/entfernen), kein Verschieben
      if (evt.shiftKey) { selectOne(hit.kind, hit.id, true); return; }
      // Noch nicht ausgewählt: erst NUR auswählen – Verschieben erst beim nächsten Greifen
      if (!isSelected(hit.kind, hit.id)) { selectOne(hit.kind, hit.id, false); return; }
      // Bereits ausgewählt: jetzt darf gezogen werden (einzeln oder als Gruppe)
      if (selected.length > 1) beginGroupDrag();
      else beginDrag({ mode: "move", kind: hit.kind, id: hit.id });
    } else {
      if (!evt.shiftKey) clearSel();
      drag = { mode: "marquee", px, start: { x: mouseW.x, y: mouseW.y } };
    }
  }

  function beginGroupDrag() {
    const fl = floor();
    const items = selected.map(s => ({ s, orig: GD.state.clone(findObj(fl, s.kind, s.id)) })).filter(x => x.orig);
    drag = { mode: "group", startW: { x: mouseW.x, y: mouseW.y }, items, didSnap: false };
  }
  function snapDelta(d) { const g = GD.state.project.settings.gridCm; return Math.round(d / g) * g; }
  function shiftObject(o, kind, orig, dx, dy) {
    if (kind === "item" || kind === "label" || kind === "electrical" || kind === "roomMarker") { o.x = orig.x + dx; o.y = orig.y + dy; }
    else if (kind === "wall" || kind === "dim") { o.a = { x: orig.a.x + dx, y: orig.a.y + dy }; o.b = { x: orig.b.x + dx, y: orig.b.y + dy }; }
    else if (kind === "wire") { o.pts = orig.pts.map(p => ({ x: p.x + dx, y: p.y + dy })); }
  }

  function rotateHandlePos(it) {
    const sc = V().view.scale; const len = (it.h * sc / 2) + 22;
    const a = it.rot * Math.PI / 180;
    const [cx, cy] = V().W2S(it.x, it.y);
    return [cx + Math.sin(a) * 0 - Math.sin(a) * 0, cy - len]; // Handle oben, vor Rotation gezeichnet -> rotiert mit g; nähern wir an
  }

  function beginDrag(d) { drag = Object.assign({ didSnap: false, startW: { x: mouseW.x, y: mouseW.y } }, d); ensureOrig(); }
  function ensureOrig() {
    const fl = floor();
    if (drag.mode === "move" && drag.kind) {
      const o = findObj(fl, drag.kind, drag.id); drag.orig = GD.state.clone(o);
    }
  }
  function findObj(fl, kind, id) {
    return ({ wall: fl.walls, room: fl.rooms, roomMarker: fl.roomMarkers, opening: fl.openings, item: fl.furniture, dim: fl.dims, label: fl.labels, electrical: fl.electrical, wire: fl.wires }[kind] || []).find(o => o.id === id);
  }

  function onMove(evt) {
    const px = V().svgPoint(evt); mouseW = V().S2W(px[0], px[1]);
    if (drag) {
      if (drag.mode === "pan") { const d = drag.px; V().pan(px[0] - d[0], px[1] - d[1]); drag.px = px; return; }
      if (drag.mode === "marquee") { snapPoint = null; V().render(); drawMarquee(px); return; }
      performDrag(px);
      return;
    }
    if (tool === "wall") { snapW({ ref: draft && draft.pts.length ? draft.pts[draft.pts.length - 1] : null }); V().render(); return; }
    if (tool === "window" || tool === "door" || tool === "door-double" || tool === "door-slide" || tool === "furniture" || tool === "dim" || tool === "label") { snapPoint = (tool === "furniture") ? null : V().snap(mouseW); V().render(); }
  }

  function performDrag(px) {
    const fl = floor();
    if (!drag.didSnap) { GD.state.snapshot(); drag.didSnap = true; }
    if (drag.mode === "move") {
      const o = findObj(fl, drag.kind, drag.id);
      if (drag.kind === "item" || drag.kind === "electrical") { const s = V().snap(mouseW); o.x = s.x; o.y = s.y; snapPoint = s; }
      else if (drag.kind === "opening") { const w = fl.walls.find(x => x.id === o.wallId); if (w) { const pr = GD.geom.projectOnSeg(mouseW, w.a, w.b); o.pos = Math.max(o.width / 2, Math.min(pr.t * GD.geom.dist(w.a, w.b), GD.geom.dist(w.a, w.b) - o.width / 2)); } }
      else if (drag.kind === "label" || drag.kind === "roomMarker") { o.x = mouseW.x; o.y = mouseW.y; }
      else { // wall/dim/wire: ganze Verschiebung
        const dx = mouseW.x - drag.startW.x, dy = mouseW.y - drag.startW.y;
        if (drag.kind === "wall") { o.a = { x: drag.orig.a.x + dx, y: drag.orig.a.y + dy }; o.b = { x: drag.orig.b.x + dx, y: drag.orig.b.y + dy }; }
        else if (drag.kind === "dim") { o.a = { x: drag.orig.a.x + dx, y: drag.orig.a.y + dy }; o.b = { x: drag.orig.b.x + dx, y: drag.orig.b.y + dy }; }
        else if (drag.kind === "wire") { o.pts = drag.orig.pts.map(p => ({ x: p.x + dx, y: p.y + dy })); }
      }
    } else if (drag.mode === "node") {
      const s = V().snap(mouseW); moveCoincident(fl, drag.from, { x: s.x, y: s.y }); drag.from = { x: s.x, y: s.y }; snapPoint = s;
    } else if (drag.mode === "rotate-item") {
      const it = fl.furniture.find(i => i.id === drag.id);
      let ang = Math.atan2(mouseW.y - it.y, mouseW.x - it.x) * 180 / Math.PI + 90;
      ang = Math.round(ang / 15) * 15; it.rot = ((ang % 360) + 360) % 360;
    } else if (drag.mode === "group") {
      const dx = snapDelta(mouseW.x - drag.startW.x), dy = snapDelta(mouseW.y - drag.startW.y);
      for (const it of drag.items) { const o = findObj(fl, it.s.kind, it.s.id); if (o) shiftObject(o, it.s.kind, it.orig, dx, dy); }
    }
    GD.state.touch();
  }

  function onUp(evt) {
    if (!drag) return;
    if (drag.mode === "pan") wrap.style.cursor = (tool === "select" ? "default" : "crosshair");
    if (drag.mode === "marquee") { finishMarquee(); }
    // Nach struktureller Verschiebung Räume/Stempel neu ableiten + persistieren
    if (drag.didSnap && drag.mode !== "marquee" && GD.rooms) { GD.rooms.sync(floor()); GD.state.save(); GD.state.emit("structure"); }
    try { wrap.releasePointerCapture(evt.pointerId); } catch (e) {}
    snapPoint = null; drag = null; V().render();
  }

  /* ---------- Marquee-Auswahl ---------- */
  function drawMarquee(px) {
    const [sx, sy] = V().W2S(drag.start.x, drag.start.y);
    const r = V().el("rect", { x: Math.min(sx, px[0]), y: Math.min(sy, px[1]), width: Math.abs(px[0] - sx), height: Math.abs(py(px)), class: "marquee" }, svg);
    function py(p) { return p[1] - sy; }
  }
  function finishMarquee() {
    const fl = floor(); const a = drag.start, b = mouseW;
    const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x), minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
    if (Math.abs(maxX - minX) < 5 && Math.abs(maxY - minY) < 5) return;
    const inside = (p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
    const sel = [];
    if (GD.state.project.settings.activeLayer === "electrical") {
      fl.electrical.forEach(e => { if (inside(e)) sel.push({ kind: "electrical", id: e.id }); });
      fl.wires.forEach(w => { if (w.pts.every(inside)) sel.push({ kind: "wire", id: w.id }); });
    } else {
      fl.furniture.forEach(i => { if (inside(i)) sel.push({ kind: "item", id: i.id }); });
      fl.walls.forEach(w => { if (inside(w.a) && inside(w.b)) sel.push({ kind: "wall", id: w.id }); });
      fl.roomMarkers.forEach(mk => { if (inside(mk)) sel.push({ kind: "roomMarker", id: mk.id }); });
    }
    setSelection(sel);
  }

  /* ---------- Zeichnen: Wand / Raum ---------- */
  function downDraft(evt) {
    const s = snapW({ ref: draft && draft.pts.length ? draft.pts[draft.pts.length - 1] : null });
    const pt = { x: s.x, y: s.y };
    if (!draft) draft = { kind: tool, pts: [pt] };
    else draft.pts.push(pt);
    self.preview = drawDraftPreview;
    V().render();
  }
  function drawDraftPreview(el, W2S, svgEl) {
    if (!draft) return;
    const pts = draft.pts.concat([snapPoint ? { x: snapPoint.x, y: snapPoint.y } : mouseW]);
    const d = pts.map((p, i) => (i ? "L" : "M") + W2S(p.x, p.y).join(" ")).join(" ");
    el("path", { d, class: "draft-" + tool }, svgEl);
    pts.forEach(p => { const [x, y] = W2S(p.x, p.y); el("circle", { cx: x, cy: y, r: 3, class: "draft-node" }, svgEl); });
  }
  function finishDraft() {
    if (!draft) return;
    const fl = floor();
    if (draft.kind === "wall" && draft.pts.length >= 2) {
      GD.state.commitStructure(() => { for (let i = 0; i < draft.pts.length - 1; i++) fl.walls.push(GD.make.wall(draft.pts[i], draft.pts[i + 1], GD.state.project.settings.wallThicknessCm || 18)); });
    } else if (draft.kind === "wire" && draft.pts.length >= 2) {
      GD.state.commitStructure(() => { const w = GD.make.wire("power", draft.pts); fl.wires.push(w); selected = [{ kind: "wire", id: w.id }]; });
    }
    draft = null; self.preview = null; snapPoint = null; GD.state.emit("selection"); V().render();
  }
  function cancelDraft() { draft = null; self.preview = null; snapPoint = null; V().render(); }

  /* ---------- Öffnungen ---------- */
  function placeOpening(evt) {
    const fl = floor();
    let best = null, bestD = 1e9, bestPos = 0;
    for (const w of fl.walls) { const pr = GD.geom.projectOnSeg(mouseW, w.a, w.b); if (pr.dist < bestD) { bestD = pr.dist; best = w; bestPos = pr.t * GD.geom.dist(w.a, w.b); } }
    if (!best || bestD > best.thickness / 2 + 30) { GD.ui && GD.ui.toast && GD.ui.toast("Bitte auf eine Wand klicken"); return; }
    const type = tool === "window" ? "window" : "door-single";
    const width = GD.isWindow(type) ? 100 : 90;
    const len = GD.geom.dist(best.a, best.b);
    const pos = Math.max(width / 2, Math.min(bestPos, len - width / 2));
    GD.state.commitStructure(() => { const o = GD.make.opening(best.id, pos, width, type); fl.openings.push(o); selected = [{ kind: "opening", id: o.id }]; });
    GD.state.emit("selection"); V().render();
  }

  /* ---------- Möbel ---------- */
  function placeItem(evt) {
    if (!pendingType) return;
    const fl = floor(); const s = V().snap(mouseW);
    GD.state.commitStructure(() => { const it = GD.make.item(pendingType, s.x, s.y); fl.furniture.push(it); selected = [{ kind: "item", id: it.id }]; });
    GD.state.emit("selection"); V().render();
  }

  /* ---------- Elektro-Symbol ---------- */
  function placeElec(evt) {
    if (!pendingType) return;
    const fl = floor(); const s = V().snap(mouseW);
    GD.state.commitStructure(() => { const e = GD.make.elec(pendingType, s.x, s.y); fl.electrical.push(e); selected = [{ kind: "electrical", id: e.id }]; });
    GD.state.emit("selection"); V().render();
  }

  /* ---------- Bemaßung ---------- */
  let dimA = null;
  function dimClick(evt) {
    const s = snapW(); const pt = { x: s.x, y: s.y };
    if (!dimA) { dimA = pt; self.preview = (el, W2S, svgEl) => { const [x, y] = W2S(pt.x, pt.y); el("circle", { cx: x, cy: y, r: 3, class: "draft-node" }, svgEl); const m = W2S(mouseW.x, mouseW.y); el("line", { x1: x, y1: y, x2: m[0], y2: m[1], class: "draft-wall" }, svgEl); }; }
    else { const a = dimA, b = pt; dimA = null; self.preview = null; GD.state.commitStructure(() => { const d = GD.make.dim(a, b); fl().dims.push(d); selected = [{ kind: "dim", id: d.id }]; }); GD.state.emit("selection"); }
    V().render();
    function fl() { return floor(); }
  }

  /* ---------- Label ---------- */
  function placeLabel(evt) {
    const text = prompt("Text:", "Notiz"); if (!text) return;
    const fl = floor();
    GD.state.commitStructure(() => { const l = GD.make.label(mouseW.x, mouseW.y, text); fl.labels.push(l); selected = [{ kind: "label", id: l.id }]; });
    GD.state.emit("selection"); V().render();
  }

  /* ---------- Aktionen (vom Kontextmenü / Tastatur) ---------- */
  function nudgeSelection(dx, dy) {
    const fl = floor();
    GD.state.commitStructure(() => {
      for (const s of selected) {
        const o = findObj(fl, s.kind, s.id); if (!o) continue;
        if (s.kind === "item" || s.kind === "label" || s.kind === "electrical" || s.kind === "roomMarker") { o.x += dx; o.y += dy; }
        else if (s.kind === "wall" || s.kind === "dim") { o.a.x += dx; o.a.y += dy; o.b.x += dx; o.b.y += dy; }
        else if (s.kind === "wire") { o.pts.forEach(p => { p.x += dx; p.y += dy; }); }
        else if (s.kind === "opening") { const w = fl.walls.find(x => x.id === o.wallId); if (w) { const len = GD.geom.dist(w.a, w.b); o.pos = Math.max(o.width / 2, Math.min(o.pos + (dx || dy), len - o.width / 2)); } }
      }
    });
    V().render();
    if (GD.ui && GD.ui.buildProps) GD.ui.buildProps();
  }

  function deleteSelection() {
    if (!selected.length) return;
    const fl = floor();
    GD.state.commitStructure(() => {
      for (const s of selected) {
        if (s.kind === "wall") { fl.walls = fl.walls.filter(w => w.id !== s.id); fl.openings = fl.openings.filter(o => o.wallId !== s.id); }
        else if (s.kind === "roomMarker") fl.roomMarkers = fl.roomMarkers.filter(m => m.id !== s.id);
        else if (s.kind === "opening") fl.openings = fl.openings.filter(o => o.id !== s.id);
        else if (s.kind === "item") fl.furniture = fl.furniture.filter(i => i.id !== s.id);
        else if (s.kind === "dim") fl.dims = fl.dims.filter(d => d.id !== s.id);
        else if (s.kind === "label") fl.labels = fl.labels.filter(l => l.id !== s.id);
        else if (s.kind === "electrical") fl.electrical = fl.electrical.filter(e => e.id !== s.id);
        else if (s.kind === "wire") fl.wires = fl.wires.filter(w => w.id !== s.id);
      }
      selected = [];
    });
    GD.state.emit("selection"); V().render();
  }
  function duplicateSelection() {
    const fl = floor(); const nu = [];
    GD.state.commitStructure(() => {
      for (const s of selected) {
        if (s.kind === "item") { const o = GD.state.clone(fl.furniture.find(i => i.id === s.id)); o.id = GD.uid("item"); o.x += 30; o.y += 30; fl.furniture.push(o); nu.push({ kind: "item", id: o.id }); }
        else if (s.kind === "electrical") { const o = GD.state.clone(fl.electrical.find(i => i.id === s.id)); o.id = GD.uid("elec"); o.x += 30; o.y += 30; fl.electrical.push(o); nu.push({ kind: "electrical", id: o.id }); }
        else if (s.kind === "wall") { const o = GD.state.clone(fl.walls.find(i => i.id === s.id)); o.id = GD.uid("wall"); o.a.x += 30; o.a.y += 30; o.b.x += 30; o.b.y += 30; fl.walls.push(o); nu.push({ kind: "wall", id: o.id }); }
      }
      if (nu.length) selected = nu;
    });
    GD.state.emit("selection"); V().render();
  }
  function rotateSelection(deg) {
    const fl = floor();
    GD.state.commit(() => { for (const s of selected) { const o = (s.kind === "item") ? fl.furniture.find(i => i.id === s.id) : (s.kind === "electrical") ? fl.electrical.find(i => i.id === s.id) : null; if (o) o.rot = (((o.rot + deg) % 360) + 360) % 360; } });
    V().render();
  }
  function flipOpening() {
    const fl = floor();
    GD.state.commit(() => { for (const s of selected) if (s.kind === "opening") { const o = fl.openings.find(x => x.id === s.id); o.hinge = (o.hinge || "left") === "left" ? "right" : "left"; } });
    V().render();
    if (GD.ui && GD.ui.buildProps) GD.ui.buildProps();
  }

  /* ---------- Init ---------- */
  function init(svgEl, wrapEl) {
    svg = svgEl; wrap = wrapEl;
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wrap.addEventListener("dblclick", () => { if (draft) finishDraft(); else if (selected.length) GD.state.emit("edit-selected"); });
    wrap.addEventListener("contextmenu", (e) => { e.preventDefault(); const px = V().svgPoint(e); mouseW = V().S2W(px[0], px[1]); const hit = V().hitTest(mouseW); if (hit && !isSelected(hit.kind, hit.id)) selectOne(hit.kind, hit.id); GD.contextmenu.open(e.clientX, e.clientY, hit); });
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", (e) => { if (e.code === "Space") spaceDown = false; });
  }
  function onKey(e) {
    const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName);
    if (e.code === "Space" && !typing) { spaceDown = true; }
    if (typing) return;
    if (e.key === "Escape") { if (draft) cancelDraft(); else if (tool !== "select") setTool("select"); else clearSel(); }
    if (e.key === "Enter" && draft) finishDraft();
    const arrow = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrow[e.key] && selected.length) {
      e.preventDefault();
      const g = GD.state.project.settings.gridCm, step = e.shiftKey ? Math.max(1, Math.round(g / 5)) : g;
      nudgeSelection(arrow[e.key][0] * step, arrow[e.key][1] * step);
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); deleteSelection(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? GD.state.redo() : GD.state.undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); GD.state.redo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelection(); }
    if (e.key === "r" && !e.ctrlKey && !e.metaKey) rotateSelection(15);
    // Werkzeug-Kürzel (ebenen-abhängig)
    const map = GD.state.project.settings.activeLayer === "electrical"
      ? { v: "select", w: "wire" }
      : { v: "select", w: "wall", t: "door", f: "window", m: "dim", x: "label" };
    if (map[e.key] && !e.ctrlKey && !e.metaKey) setTool(map[e.key]);
  }

  Object.assign(self, {
    init, setTool, getTool, setSelection, clearSel, selectOne, isSelected, deleteSelection, duplicateSelection,
    rotateSelection, flipOpening, finishDraft, cancelDraft, findObj,
    get pendingType() { return pendingType; },
  });
  return self;
})();
