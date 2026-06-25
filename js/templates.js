"use strict";
/* Start-Vorlagen EG & OG im Wand-/Polygon-Modell. Maße in cm, rekonstruiert aus den Scans. */
window.GD = window.GD || {};

GD.templates = (function () {

  // Wände aus achsenparallelen Rechtecken erzeugen (gemeinsame Wände werden vereinigt)
  function buildWallsFromRects(rects, thickness) {
    const hor = {}, ver = {}; // key=achse -> Intervalle
    const key = v => Math.round(v);
    for (const r of rects) {
      const x2 = r.x + r.w, y2 = r.y + r.h;
      (hor[key(r.y)] = hor[key(r.y)] || []).push([r.x, x2]);
      (hor[key(y2)] = hor[key(y2)] || []).push([r.x, x2]);
      (ver[key(r.x)] = ver[key(r.x)] || []).push([r.y, y2]);
      (ver[key(x2)] = ver[key(x2)] || []).push([r.y, y2]);
    }
    const union = (ivs) => {
      ivs.sort((a, b) => a[0] - b[0]);
      const out = [];
      for (const iv of ivs) {
        const last = out[out.length - 1];
        if (last && iv[0] <= last[1] + 0.5) last[1] = Math.max(last[1], iv[1]);
        else out.push([iv[0], iv[1]]);
      }
      return out;
    };
    const walls = [];
    for (const yk in hor) for (const iv of union(hor[yk])) walls.push(GD.make.wall({ x: iv[0], y: +yk }, { x: iv[1], y: +yk }, thickness));
    for (const xk in ver) for (const iv of union(ver[xk])) walls.push(GD.make.wall({ x: +xk, y: iv[0] }, { x: +xk, y: iv[1] }, thickness));
    return walls;
  }

  function rectPoly(r) { return [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }]; }

  // Öffnung der nächstgelegenen Wand zuordnen
  function attachOpenings(walls, defs) {
    const ops = [];
    for (const d of defs) {
      let best = null, bestDist = 1e9, bestPos = 0;
      for (const w of walls) {
        const pr = GD.geom.projectOnSeg(d.center, w.a, w.b);
        if (pr.dist < bestDist) { bestDist = pr.dist; best = w; bestPos = pr.t * GD.geom.dist(w.a, w.b); }
      }
      if (best && bestDist < 60) {
        const o = GD.make.opening(best.id, bestPos, d.width, d.type);
        if (d.swing) o.swing = d.swing; if (d.flip) o.flip = d.flip;
        ops.push(o);
      }
    }
    return ops;
  }

  const DATA = {
    EG: {
      name: "Erdgeschoss", elevation: 0, wallHeight: 250,
      underlay: { src: "Grundriss EG.jpg", x: -120, y: -110, scale: 1.34, rotation: 0, opacity: 0.45, visible: false },
      rects: [
        { name: "Eingang / Wintergarten", x: 0, y: 200, w: 300, h: 420, dh: 225 },
        { name: "Küche", x: 300, y: 0, w: 325, h: 340, dh: 215 },
        { name: "Wohn- / Essbereich", x: 625, y: 0, w: 445, h: 620, dh: 215 },
        { name: "Treppe", x: 300, y: 340, w: 180, h: 280, dh: 225 },
        { name: "Bad / Dusche", x: 480, y: 340, w: 145, h: 280, dh: 210 },
      ],
      openings: [
        { center: { x: 0, y: 400 }, width: 320, type: "window" },
        { center: { x: 510, y: 0 }, width: 120, type: "window" },
        { center: { x: 760, y: 0 }, width: 130, type: "window" },
        { center: { x: 940, y: 0 }, width: 130, type: "window" },
        { center: { x: 1070, y: 195 }, width: 150, type: "window" },
        { center: { x: 1070, y: 435 }, width: 150, type: "window" },
        { center: { x: 550, y: 620 }, width: 80, type: "window" },
        { center: { x: 150, y: 620 }, width: 100, type: "door-single", swing: "left" },
        { center: { x: 300, y: 480 }, width: 90, type: "door-single", swing: "right" },
        { center: { x: 625, y: 480 }, width: 80, type: "door-single", swing: "left" },
        { center: { x: 625, y: 170 }, width: 110, type: "door-double" },
      ],
      furniture: [
        { type: "stove", x: 450, y: 60, rot: 0 }, { type: "sink", x: 350, y: 55, rot: 0 },
        { type: "fridge", x: 590, y: 55, rot: 0 },
        { type: "sofa", x: 980, y: 120, rot: 0 }, { type: "table-round", x: 760, y: 200, rot: 0 },
        { type: "tv", x: 980, y: 500, rot: 180 },
        { type: "wc", x: 600, y: 590, rot: 180 }, { type: "shower", x: 540, y: 410, rot: 0 },
        { type: "basin", x: 510, y: 380, rot: 0 },
        { type: "stairs", x: 390, y: 480, rot: 0 }, { type: "plant", x: 60, y: 560, rot: 0 },
      ],
    },
    OG: {
      name: "Dachgeschoss", elevation: 250, wallHeight: 220,
      underlay: { src: "Grundriss OG.jpg", x: -150, y: -90, scale: 1.32, rotation: 0, opacity: 0.45, visible: false },
      rects: [
        { name: "Einbauschrank", x: 0, y: 0, w: 270, h: 342, dh: 150 },
        { name: "Speicherraum", x: 0, y: 342, w: 270, h: 248, dh: 150 },
        { name: "Schlafzimmer", x: 270, y: 0, w: 385, h: 342, dh: 205 },
        { name: "Kinderzimmer", x: 655, y: 0, w: 435, h: 590, dh: 205 },
        { name: "Treppe", x: 270, y: 342, w: 180, h: 248, dh: 205 },
        { name: "Bad / WC", x: 450, y: 342, w: 205, h: 248, dh: 205 },
      ],
      openings: [
        { center: { x: 0, y: 472 }, width: 100, type: "window" },
        { center: { x: 460, y: 0 }, width: 100, type: "window" },
        { center: { x: 735, y: 0 }, width: 100, type: "window" },
        { center: { x: 1090, y: 90 }, width: 80, type: "window" },
        { center: { x: 1090, y: 410 }, width: 100, type: "window" },
        { center: { x: 570, y: 590 }, width: 80, type: "window" },
        { center: { x: 460, y: 342 }, width: 90, type: "door-single", swing: "left" },
        { center: { x: 655, y: 460 }, width: 90, type: "door-single", swing: "right" },
        { center: { x: 540, y: 342 }, width: 80, type: "door-single", swing: "left" },
      ],
      furniture: [
        { type: "bed-double", x: 400, y: 130, rot: 0 }, { type: "wardrobe", x: 135, y: 40, rot: 0 },
        { type: "bed-single", x: 1000, y: 130, rot: 0 }, { type: "wardrobe", x: 720, y: 40, rot: 0 },
        { type: "wc", x: 480, y: 540, rot: 0 }, { type: "basin", x: 560, y: 380, rot: 0 },
        { type: "bathtub", x: 560, y: 520, rot: 0 },
        { type: "stairs", x: 360, y: 466, rot: 0 },
      ],
    },
  };

  function buildFloor(key) {
    const d = DATA[key];
    const f = GD.make.floor(d.name);
    f.elevation = d.elevation; f.wallHeight = d.wallHeight; f.templateKey = key;
    f.underlay = Object.assign({}, d.underlay);
    f.walls = buildWallsFromRects(d.rects, 18);
    f.rooms = d.rects.map(r => { const room = GD.make.room(rectPoly(r), r.name); room.ceiling = r.dh; return room; });
    f.openings = attachOpenings(f.walls, d.openings);
    f.furniture = d.furniture.map(it => { const i = GD.make.item(it.type, it.x, it.y); i.rot = it.rot || 0; return i; });
    return f;
  }

  function buildDefaultProject() {
    const p = GD.make.project();
    p.floors = [buildFloor("EG"), buildFloor("OG")];
    p.activeFloorId = p.floors[0].id;
    return p;
  }

  return { DATA, buildFloor, buildDefaultProject, buildWallsFromRects, rectPoly, attachOpenings };
})();
