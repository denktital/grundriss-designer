"use strict";
/* Grundriss-Designer – Kern: Geometrie, Datenmodell, State, Undo/Redo, Persistenz, Events */
window.GD = window.GD || {};

/* ---------------- Geometrie ---------------- */
GD.geom = {
  dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); },
  add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; },
  sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; },
  mul(a, s) { return { x: a.x * s, y: a.y * s }; },
  len(a) { return Math.hypot(a.x, a.y); },
  norm(a) { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; },
  perp(a) { return { x: -a.y, y: a.x }; },
  dot(a, b) { return a.x * b.x + a.y * b.y; },
  angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); },
  lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; },
  round(a, g) { return { x: Math.round(a.x / g) * g, y: Math.round(a.y / g) * g }; },

  // Punkt P auf Segment AB projizieren -> {point, t, dist}
  projectOnSeg(p, a, b) {
    const ab = GD.geom.sub(b, a), ap = GD.geom.sub(p, a);
    const len2 = ab.x * ab.x + ab.y * ab.y || 1e-9;
    let t = (ap.x * ab.x + ap.y * ab.y) / len2;
    t = Math.max(0, Math.min(1, t));
    const point = { x: a.x + ab.x * t, y: a.y + ab.y * t };
    return { point, t, dist: GD.geom.dist(p, point) };
  },

  polygonArea(poly) {
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      s += a.x * b.y - b.x * a.y;
    }
    return Math.abs(s) / 2;
  },
  polygonPerimeter(poly) {
    let s = 0;
    for (let i = 0; i < poly.length; i++) s += GD.geom.dist(poly[i], poly[(i + 1) % poly.length]);
    return s;
  },
  centroid(poly) {
    let x = 0, y = 0, a = 0;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      const cross = p.x * q.y - q.x * p.y;
      x += (p.x + q.x) * cross; y += (p.y + q.y) * cross; a += cross;
    }
    a = a * 0.5;
    if (Math.abs(a) < 1e-6) { // Fallback: Mittelwert
      let mx = 0, my = 0; poly.forEach(p => { mx += p.x; my += p.y; });
      return { x: mx / poly.length, y: my / poly.length };
    }
    return { x: x / (6 * a), y: y / (6 * a) };
  },
  pointInPoly(p, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      if (((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  },
  bbox(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  },
};

/* ---------------- IDs ---------------- */
let _id = 1;
GD.uid = (p) => (p || "id") + "_" + (_id++) + Date.now().toString(36).slice(-3);

/* Eckverlängerung: trifft am Punkt pt eine andere Wand, wird diese Wand um die halbe
   Dicke der dicksten dort anschließenden Wand verlängert, damit die Ecke bündig schließt. */
GD.wallCornerExt = function (floor, wall, pt) {
  let maxT = 0;
  for (const o of floor.walls) {
    if (o.id === wall.id) continue;
    if (GD.geom.dist(o.a, pt) < 1.5 || GD.geom.dist(o.b, pt) < 1.5) maxT = Math.max(maxT, o.thickness);
  }
  return maxT > 0 ? maxT / 2 : 0;
};

/* Tür-/Fenstertypen mit ihren relevanten Eigenschaften.
   hinge = Anschlagseite (links/rechts), dir = Öffnungsrichtung (innen/außen). */
GD.openingDefs = {
  "window":        { cat: "window", name: "Einfachfenster", hinge: true },
  "window-double": { cat: "window", name: "Doppelflügel", hinge: true },
  "window-fixed":  { cat: "window", name: "Festverglasung" },
  "window-floor":  { cat: "window", name: "Französisch (bodentief)", noSill: true, hinge: true },
  "door-single":   { cat: "door", name: "Drehtür", hinge: true, dir: true },
  "door-double":   { cat: "door", name: "Doppeltür", dir: true },
  "door-slide":    { cat: "door", name: "Schiebetür", hinge: true },
  "door-fold":     { cat: "door", name: "Falttür", hinge: true },
};
// Nur Bild-Quellen zulassen: base64-Bild-DataURLs oder relative Bildpfade.
// Verwirft javascript:, externe/absolute URLs, non-base64 data:-URLs usw.
GD.sanitizeImageSrc = function (src) {
  if (typeof src !== "string" || !src) return "";
  if (/^data:image\/[a-z.+-]+;base64,/i.test(src)) return src;
  if (src.indexOf(":") === -1 && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(src)) return src;
  return "";
};

GD.isWindow = (t) => typeof t === "string" && t.indexOf("window") === 0;
GD.openingCat = (t) => (GD.openingDefs[t] || {}).cat || (GD.isWindow(t) ? "window" : "door");
GD.openingTypesByCat = (cat) => Object.keys(GD.openingDefs).filter(k => GD.openingDefs[k].cat === cat);
// Typ wechseln und die für den Typ sinnvollen Parameter setzen
GD.setOpeningType = function (o, type) {
  o.type = type;
  const def = GD.openingDefs[type] || {};
  if (GD.isWindow(type)) {
    o.sill = def.noSill ? 0 : (o.sill > 0 ? o.sill : 90);
    if (!o.height || o.height > 260) o.height = 120;
  } else {
    o.sill = 0;
    if (!o.height || o.height < 140) o.height = 200;
    if (o.hinge == null) o.hinge = "left";
    if (o.dir == null) o.dir = "in";
  }
};

/* ---------------- Modell-Factories ---------------- */
GD.make = {
  project() {
    return {
      name: "Mein Grundriss",
      floors: [],
      activeFloorId: null,
      settings: { gridCm: 25, snapCm: 15, theme: "dark", accent: "#4f8cff", showGrid: true, showDims: true, ortho: true, showGhost: false, activeLayer: "architecture", elecLevel: "standard", showLegend: true },
    };
  },
  floor(name) {
    return {
      id: GD.uid("floor"), name: name || "Geschoss", elevation: 0, wallHeight: 260,
      walls: [], rooms: [], roomMarkers: [], openings: [], furniture: [], dims: [], labels: [],
      electrical: [], wires: [],
      roof: { enabled: false, type: "gable", height: 200, overhang: 35, ridge: "auto", color: "#9a4a3a" },
      underlay: { src: "", x: 0, y: 0, scale: 1, rotation: 0, opacity: 0.5, visible: false },
    };
  },
  wall(a, b, thickness) { return { id: GD.uid("wall"), a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, thickness: thickness || 18, height: null }; },
  room(poly, name) { return { id: GD.uid("room"), name: name || "Raum", poly: poly.map(p => ({ x: p.x, y: p.y })), color: "#ffffff", ceiling: 260 }; },
  roomMarker(x, y, name) { return { id: GD.uid("rm"), x, y, name: name || "Raum", color: "#ffffff", ceiling: 260 }; },
  opening(wallId, pos, width, type) {
    type = type || "door-single";
    const win = GD.isWindow(type);
    return {
      id: GD.uid("op"), wallId, pos, type,
      width: width || (win ? 100 : 90),
      hinge: "left", dir: "in",
      sill: win ? (type === "window-floor" ? 0 : 90) : 0,
      height: win ? 120 : 200,
    };
  },
  item(type, x, y) { const d = GD.library.def(type); return { id: GD.uid("item"), type, x, y, rot: 0, w: d.w, h: d.h, hh: d.z != null ? d.z : 50, label: "" }; },
  elec(type, x, y) { const d = GD.elec.def(type); return { id: GD.uid("elec"), type, x, y, rot: 0, w: d.w, h: d.h, circuit: null, label: "" }; },
  wire(kind, pts) { return { id: GD.uid("wire"), kind: kind || "power", pts: (pts || []).map(p => ({ x: p.x, y: p.y })) }; },
  dim(a, b) { return { id: GD.uid("dim"), a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, offset: 40 }; },
  label(x, y, text) { return { id: GD.uid("lbl"), x, y, text: text || "Text", size: 16, rot: 0 }; },
};

/* ---------------- State + Events + Undo/Redo ---------------- */
GD.state = (function () {
  const KEY = "grundriss-pro-v1";
  let project = null;
  const listeners = {};
  let undoStack = [], redoStack = [];
  const MAX_UNDO = 60;

  function emit(evt, data) { (listeners[evt] || []).forEach(fn => fn(data)); }
  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function activeFloor() { return project.floors.find(f => f.id === project.activeFloorId) || project.floors[0]; }

  function snapshot() {
    undoStack.push(clone(project));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
  }
  function undo() { if (!undoStack.length) return; redoStack.push(clone(project)); project = undoStack.pop(); syncRooms(); save(); emit("change"); emit("structure"); emit("rerender"); }
  function redo() { if (!redoStack.length) return; undoStack.push(clone(project)); project = redoStack.pop(); syncRooms(); save(); emit("change"); emit("structure"); emit("rerender"); }
  function canUndo() { return undoStack.length > 0; }
  function canRedo() { return redoStack.length > 0; }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(project)); } catch (e) {} }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw); if (p && p.floors && p.floors.length) return p; } } catch (e) {}
    return null;
  }

  function syncRooms() { if (GD.rooms && project) project.floors.forEach(f => GD.rooms.sync(f)); }

  // Geladene/Vorlage-Projekte robust machen: fehlende Arrays/Settings ergänzen
  function normalize(p) {
    if (!p || !p.floors) return p;
    const proto = GD.make.floor();
    p.floors.forEach(f => {
      ["walls", "rooms", "roomMarkers", "openings", "furniture", "dims", "labels", "electrical", "wires"].forEach(k => { if (!Array.isArray(f[k])) f[k] = []; });
      if (!f.roof) f.roof = clone(proto.roof);
      if (!f.underlay) f.underlay = clone(proto.underlay);
    });
    const sd = GD.make.project().settings;
    p.settings = p.settings || {};
    for (const k in sd) if (p.settings[k] === undefined) p.settings[k] = sd[k];
    return p;
  }

  function init() {
    project = load();
    if (!project) { project = GD.templates.buildDefaultProject(); }
    normalize(project);
    if (!project.activeFloorId) project.activeFloorId = project.floors[0].id;
    syncRooms();
  }

  // Mutation mit Undo-Snapshot
  function commit(fn) { snapshot(); fn(); save(); emit("change"); }
  function commitStructure(fn) { snapshot(); fn(); syncRooms(); save(); emit("change"); emit("structure"); }
  // Live-Änderung ohne Snapshot (z.B. während Drag) – Snapshot vor dem Drag setzen
  function touch() { save(); emit("change"); }

  return {
    init, on, emit, get project() { return project; }, set project(p) { project = p; },
    activeFloor, snapshot, undo, redo, canUndo, canRedo, save, commit, commitStructure, touch, clone,
    replaceProject(p) { undoStack = []; redoStack = []; project = p; normalize(project); if (!project.activeFloorId) project.activeFloorId = project.floors[0].id; syncRooms(); save(); emit("change"); emit("structure"); },
  };
})();

/* ---------------- Vorlagen-/Projektspeicher (mehrere benannte Pläne im Browser) ---------------- */
GD.store = (function () {
  const KEY = "grundriss-templates-v1";
  function all() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function persist(arr) { try { localStorage.setItem(KEY, JSON.stringify(arr)); return true; } catch (e) { return false; } }
  return {
    list() { return all().map(t => ({ id: t.id, name: t.name, savedAt: t.savedAt, floors: (t.project.floors || []).length })); },
    save(name, project) {
      const arr = all(); const id = GD.uid("tpl");
      arr.push({ id, name: name || "Vorlage", savedAt: Date.now(), project: JSON.parse(JSON.stringify(project)) });
      return persist(arr) ? id : null;
    },
    load(id) { const t = all().find(x => x.id === id); return t ? JSON.parse(JSON.stringify(t.project)) : null; },
    remove(id) { persist(all().filter(x => x.id !== id)); },
    rename(id, name) { const arr = all(); const t = arr.find(x => x.id === id); if (t) { t.name = name; persist(arr); } },
  };
})();
