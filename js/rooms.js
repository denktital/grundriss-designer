"use strict";
/* Automatische Räume aus dem Wandverlauf.
   Wände bilden einen planaren Graphen; die kleinsten geschlossenen Flächen sind die Räume.
   Eigenschaften (Name/Höhe/Farbe) hängen an Raum-Stempeln (floor.roomMarkers), die per
   Punkt-in-Polygon der jeweiligen Fläche zugeordnet werden. */
window.GD = window.GD || {};

GD.rooms = (function () {
  const NODE_Q = 1;       // cm: Knoten in diesem Raster zusammenfassen
  const ON_TOL = 1.0;     // cm: Punkt-auf-Segment-Toleranz (T-Stoß)
  const MIN_AREA = 400;   // cm²: kleinere Flächen ignorieren (Rauschen)

  const key = (x, y) => Math.round(x / NODE_Q) + "," + Math.round(y / NODE_Q);
  const ang = (n, to) => Math.atan2(to.y - n.y, to.x - n.x);

  function signedArea(poly) {
    let s = 0;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a.x * b.y - b.x * a.y; }
    return s / 2;
  }

  // Proper-Schnitt zweier Segmente (echtes Kreuzen, 0<t<1 auf beiden)
  function segInt(A, B) {
    const r = { x: A.b.x - A.a.x, y: A.b.y - A.a.y };
    const s = { x: B.b.x - B.a.x, y: B.b.y - B.a.y };
    const d = r.x * s.y - r.y * s.x;
    if (Math.abs(d) < 1e-9) return null;
    const qp = { x: B.a.x - A.a.x, y: B.a.y - A.a.y };
    const t = (qp.x * s.y - qp.y * s.x) / d;
    const u = (qp.x * r.y - qp.y * r.x) / d;
    if (t > 1e-4 && t < 1 - 1e-4 && u > 1e-4 && u < 1 - 1e-4)
      return { x: A.a.x + r.x * t, y: A.a.y + r.y * t, t };
    return null;
  }

  // Segmente an Kreuzungen und T-Stößen aufteilen
  function splitSegments(segs) {
    const out = [];
    for (let i = 0; i < segs.length; i++) {
      const A = segs[i];
      const pts = [{ t: 0, x: A.a.x, y: A.a.y }, { t: 1, x: A.b.x, y: A.b.y }];
      for (let j = 0; j < segs.length; j++) {
        if (i === j) continue;
        const B = segs[j];
        // Endpunkte von B, die auf A liegen (T-Stoß)
        for (const P of [B.a, B.b]) {
          const pr = GD.geom.projectOnSeg(P, A.a, A.b);
          if (pr.dist < ON_TOL && pr.t > 1e-4 && pr.t < 1 - 1e-4)
            pts.push({ t: pr.t, x: A.a.x + (A.b.x - A.a.x) * pr.t, y: A.a.y + (A.b.y - A.a.y) * pr.t });
        }
        const X = segInt(A, B);
        if (X) pts.push(X);
      }
      pts.sort((p, q) => p.t - q.t);
      const uniq = [];
      for (const p of pts) { const last = uniq[uniq.length - 1]; if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.5) uniq.push(p); }
      for (let k = 0; k < uniq.length - 1; k++) out.push({ a: { x: uniq[k].x, y: uniq[k].y }, b: { x: uniq[k + 1].x, y: uniq[k + 1].y } });
    }
    return out;
  }

  // Kleinste geschlossene Flächen des Wandgraphen
  function computeFaces(walls) {
    const segs = walls.map(w => ({ a: w.a, b: w.b })).filter(s => GD.geom.dist(s.a, s.b) > 1);
    if (segs.length < 3) return [];
    const sub = splitSegments(segs);

    const nodes = new Map();
    function node(x, y) { const k = key(x, y); let n = nodes.get(k); if (!n) { n = { x, y, k, out: [] }; nodes.set(k, n); } return n; }
    const edges = new Set();
    const halfedges = [];
    for (const s of sub) {
      const a = node(s.a.x, s.a.y), b = node(s.b.x, s.b.y);
      if (a.k === b.k) continue;
      const ek = a.k < b.k ? a.k + "|" + b.k : b.k + "|" + a.k;
      if (edges.has(ek)) continue;
      edges.add(ek);
      const h1 = { from: a, to: b }, h2 = { from: b, to: a };
      h1.twin = h2; h2.twin = h1;
      a.out.push(h1); b.out.push(h2);
      halfedges.push(h1, h2);
    }
    for (const n of nodes.values()) n.out.sort((p, q) => ang(n, p.to) - ang(n, q.to));

    const visited = new Set();
    const faces = [];
    for (const h of halfedges) {
      if (visited.has(h)) continue;
      const loop = [];
      let e = h, guard = 0;
      do {
        visited.add(e);
        loop.push({ x: e.from.x, y: e.from.y });
        const v = e.to;
        const i = v.out.indexOf(e.twin);
        e = v.out[(i - 1 + v.out.length) % v.out.length]; // nächste Kante im Uhrzeigersinn
        if (++guard > 100000) break;
      } while (e !== h);
      if (loop.length >= 3) faces.push(loop);
    }
    // Außenhüllen verwerfen: die größte Fläche je Zusammenhangskomponente ist die unbegrenzte;
    // alle Flächen mit deren Orientierung weglassen, der Rest sind die Innenräume.
    const scored = faces.map(p => ({ p, A: signedArea(p) })).filter(f => Math.abs(f.A) >= MIN_AREA);
    if (!scored.length) return [];
    const outer = scored.reduce((m, f) => Math.abs(f.A) > Math.abs(m.A) ? f : m);
    const outerSign = Math.sign(outer.A);
    return scored.filter(f => Math.sign(f.A) !== outerSign).map(f => f.p);
  }

  function markerInFace(floor, poly) {
    for (const mk of floor.roomMarkers) if (GD.geom.pointInPoly(mk, poly)) return mk;
    return null;
  }

  // Räume neu berechnen. persist=true: Stempel erzeugen/aufräumen (struktureller Commit/Laden);
  // persist=false: nur floor.rooms aus Wänden+Stempeln neu aufbauen (Live-Render).
  function build(floor, persist) {
    if (!floor.roomMarkers) floor.roomMarkers = [];
    const faces = computeFaces(floor.walls);

    if (persist) {
      // auto erzeugte Stempel entfernen, die in keiner Fläche mehr liegen
      floor.roomMarkers = floor.roomMarkers.filter(mk => !mk.auto || faces.some(p => GD.geom.pointInPoly(mk, p)));
      // jede Fläche ohne Stempel bekommt einen automatischen
      let n = 1;
      const used = new Set();
      for (const p of faces) {
        const mk = markerInFace(floor, p);
        if (mk) used.add(mk.id);
      }
      const autoCount = floor.roomMarkers.filter(m => m.auto).length;
      let idx = autoCount;
      for (const p of faces) {
        if (markerInFace(floor, p)) continue;
        const c = GD.geom.centroid(p);
        const mk = GD.make.roomMarker(c.x, c.y, "Raum " + (++idx));
        mk.auto = true;
        floor.roomMarkers.push(mk);
      }
    }

    const rooms = [];
    for (const p of faces) {
      const mk = markerInFace(floor, p);
      rooms.push({
        id: mk ? "room-" + mk.id : GD.uid("room"),
        markerId: mk ? mk.id : null,
        name: mk ? mk.name : "Raum",
        ceiling: mk ? mk.ceiling : floor.wallHeight,
        color: mk ? mk.color : "#ffffff",
        poly: p,
      });
    }
    floor.rooms = rooms;
    return rooms;
  }

  // Altprojekt: explizite Raum-Polygone → Stempel (einmalig)
  function migrate(floor) {
    if (!floor.roomMarkers) floor.roomMarkers = [];
    if (floor.roomMarkers.length) return;
    if (!floor.rooms || !floor.rooms.length) return;
    for (const r of floor.rooms) {
      if (!r.poly || r.poly.length < 3) continue;
      const c = GD.geom.centroid(r.poly);
      const mk = GD.make.roomMarker(c.x, c.y, r.name);
      if (r.ceiling != null) mk.ceiling = r.ceiling;
      if (r.color) mk.color = r.color;
      floor.roomMarkers.push(mk);
    }
  }

  return {
    sync(floor) { migrate(floor); build(floor, true); },     // strukturell: Stempel persistieren
    refresh(floor) { build(floor, false); },                 // Render: nur Polygone neu
    computeFaces,
  };
})();
