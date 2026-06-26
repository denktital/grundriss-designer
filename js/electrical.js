"use strict";
/* Elektro-Installations-Ebene: Symbole (DIN-EN-60617-angelehnt), Ausstattungsgrade,
   Auto-Generator (aus Räumen + Türen) und Stückliste. Bündelt das gesamte Elektro-Feature. */
window.GD = window.GD || {};

GD.elec = (function () {
  // Zeichen-Helfer in lokalen cm-Koordinaten, Ursprung = Mitte (wie js/library.js)
  const R = (x, y, w, h, e) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="esym" ${e || ""}/>`;
  const C = (cx, cy, r, e) => `<circle cx="${cx}" cy="${cy}" r="${r}" class="esym" ${e || ""}/>`;
  const L = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="esym"/>`;
  const P = (d) => `<path d="${d}" class="esym"/>`;
  const Fill = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" class="esym-fill"/>`;

  const S = {
    "outlet":     { name: "Steckdose", cat: "Steckdosen", w: 28, h: 24, draw() { return P("M -12 6 A 12 12 0 0 1 12 6") + L(-12, 6, 12, 6) + L(0, 6, 0, -8); } },
    "outlet-2":   { name: "Doppel-Steckdose", cat: "Steckdosen", w: 32, h: 24, draw() { return P("M -14 6 A 14 12 0 0 1 14 6") + L(-14, 6, 14, 6) + L(-5, 6, -5, -7) + L(5, 6, 5, -7); } },
    "outlet-wet": { name: "Steckdose Feuchtraum", cat: "Steckdosen", w: 28, h: 24, draw() { return P("M -12 6 A 12 12 0 0 1 12 6") + L(-12, 6, 12, 6) + L(0, 6, 0, -8) + Fill(0, -1, 2.5); } },
    "stove-conn": { name: "Herd-Anschluss (400V)", cat: "Steckdosen", w: 30, h: 24, draw() { return P("M -13 6 A 13 12 0 0 1 13 6") + L(-13, 6, 13, 6) + L(-6, 6, -6, -7) + L(0, 6, 0, -9) + L(6, 6, 6, -7); } },
    "tv":         { name: "TV-/Antennendose", cat: "Steckdosen", w: 26, h: 26, draw() { return C(0, 5, 7) + L(0, -2, 0, -12) + L(-5, -12, 5, -12); } },
    "data":       { name: "Netzwerk-/Telefondose", cat: "Steckdosen", w: 26, h: 24, draw() { return C(0, 4, 8) + L(-6, 4, 4, 4) + P("M 1 1 L 5 4 L 1 7"); } },

    "switch":     { name: "Schalter", cat: "Schalter", w: 24, h: 26, draw() { return C(0, 6, 6) + L(0, 6, 11, -10); } },
    "switch-alt": { name: "Wechselschalter", cat: "Schalter", w: 26, h: 26, draw() { return C(0, 6, 6) + L(0, 6, 11, -10) + L(0, 6, 4, -12); } },
    "dimmer":     { name: "Dimmer", cat: "Schalter", w: 26, h: 26, draw() { return C(0, 6, 6) + L(0, 6, 11, -10) + P("M -8 6 A 8 8 0 0 1 8 6"); } },
    "motion":     { name: "Bewegungsmelder", cat: "Schalter", w: 26, h: 24, draw() { return C(0, 2, 9) + P("M -5 0 A 7 7 0 0 1 5 0") + Fill(0, 1, 1.6); } },

    "light-ceiling": { name: "Deckenleuchte", cat: "Leuchten", w: 30, h: 30, draw() { return C(0, 0, 11) + L(-7.8, -7.8, 7.8, 7.8) + L(7.8, -7.8, -7.8, 7.8); } },
    "light-wall":    { name: "Wandleuchte", cat: "Leuchten", w: 28, h: 18, draw() { return P("M -12 4 A 12 9 0 0 1 12 4") + L(-12, 4, 12, 4) + L(-6, 4, 0, -5) + L(6, 4, 0, -5); } },
    "spot":          { name: "Einbauspot", cat: "Leuchten", w: 18, h: 18, draw() { return C(0, 0, 7) + C(0, 0, 2.5); } },

    "junction":   { name: "Abzweigdose", cat: "Verteilung", w: 22, h: 22, draw() { return C(0, 0, 9); } },
    "panel":      { name: "Verteiler / UV", cat: "Verteilung", w: 60, h: 38, draw() { return R(-28, -17, 56, 34, 'rx="2"') + L(-22, -17, -4, 17) + L(-8, -17, 10, 17) + L(6, -17, 24, 17); } },
    "smoke":      { name: "Rauchmelder", cat: "Verteilung", w: 26, h: 26, draw() { return C(0, 0, 10) + C(0, 0, 4) + L(-12, 0, -7, 0) + L(7, 0, 12, 0) + L(0, -12, 0, -7) + L(0, 7, 0, 12); } },
  };

  const cats = ["Steckdosen", "Schalter", "Leuchten", "Verteilung"];
  const def = (t) => S[t] || { name: t, cat: "", w: 24, h: 24, draw: () => C(0, 0, 10) };
  const list = () => Object.keys(S).map(k => Object.assign({ type: k }, S[k]));
  const byCat = (c) => list().filter(s => s.cat === c);
  const markup = (t) => def(t).draw();

  /* ---------- Raumtyp aus Name ableiten ---------- */
  function roomType(name) {
    const n = (name || "").toLowerCase();
    if (/küche|kueche|kitchen/.test(n)) return "kitchen";
    if (/bad|wc|dusche|sanit/.test(n)) return "bath";
    if (/wohn|ess|living/.test(n)) return "living";
    if (/schlaf|sleep/.test(n)) return "bedroom";
    if (/kind|child|gast/.test(n)) return "child";
    if (/flur|diele|gang|korridor/.test(n)) return "hall";
    if (/eingang|entree|wintergarten|vorraum|windfang/.test(n)) return "entrance";
    if (/treppe|stair/.test(n)) return "stairs";
    if (/speicher|abstell|lager|keller|hwr|hauswirt|technik|wasch/.test(n)) return "utility";
    return "other";
  }
  // sockets/lights je Grad; Flags für Spezialauslässe
  const SPEC = {
    living:   { sockets: { min: 3, standard: 5, comfort: 8 }, lights: { min: 1, standard: 1, comfort: 2 }, tv: true },
    bedroom:  { sockets: { min: 2, standard: 3, comfort: 5 }, lights: { min: 1, standard: 1, comfort: 1 }, tv: true, smoke: true },
    child:    { sockets: { min: 2, standard: 3, comfort: 4 }, lights: { min: 1, standard: 1, comfort: 1 }, smoke: true },
    kitchen:  { sockets: { min: 3, standard: 5, comfort: 7 }, lights: { min: 1, standard: 2, comfort: 2 }, kitchen: true },
    bath:     { sockets: { min: 1, standard: 2, comfort: 3 }, lights: { min: 1, standard: 1, comfort: 2 }, bath: true },
    hall:     { sockets: { min: 1, standard: 1, comfort: 2 }, lights: { min: 1, standard: 1, comfort: 1 }, smoke: true },
    entrance: { sockets: { min: 1, standard: 1, comfort: 2 }, lights: { min: 1, standard: 1, comfort: 1 }, smoke: true },
    stairs:   { sockets: { min: 0, standard: 1, comfort: 1 }, lights: { min: 1, standard: 1, comfort: 1 } },
    utility:  { sockets: { min: 1, standard: 2, comfort: 3 }, lights: { min: 1, standard: 1, comfort: 1 } },
    other:    { sockets: { min: 1, standard: 2, comfort: 3 }, lights: { min: 1, standard: 1, comfort: 1 } },
  };

  /* ---------- Geometrie-Kurzhelfer ---------- */
  const G = () => GD.geom;
  function deg(u) { return Math.atan2(u.y, u.x) * 180 / Math.PI; }
  function openingInfo(floor, o) { const w = floor.walls.find(x => x.id === o.wallId); if (!w) return null; const u = GD.geom.norm(GD.geom.sub(w.b, w.a)); return { w, u, n: GD.geom.perp(u), c: GD.geom.add(w.a, GD.geom.mul(u, o.pos)) }; }
  function doorsOfRoom(floor, room) {
    return floor.openings.filter(o => {
      if (GD.isWindow(o.type)) return false;
      const oi = openingInfo(floor, o); if (!oi) return false;
      let minD = 1e9;
      for (let i = 0; i < room.poly.length; i++) minD = Math.min(minD, GD.geom.projectOnSeg(oi.c, room.poly[i], room.poly[(i + 1) % room.poly.length]).dist);
      return minD < oi.w.thickness / 2 + 35;
    });
  }
  // Punkt auf dem Umfang bei relativer Länge t∈[0,1), nach innen versetzt
  function perimeterPoint(poly, t, inset, c) {
    const per = GD.geom.polygonPerimeter(poly); let acc = 0, target = per * t;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], seg = GD.geom.dist(a, b);
      if (acc + seg >= target) {
        const p = GD.geom.lerp(a, b, (target - acc) / seg);
        const dir = GD.geom.norm(GD.geom.sub(c, p));
        return { p: GD.geom.add(p, GD.geom.mul(dir, inset)), rot: deg(GD.geom.norm(GD.geom.sub(b, a))) };
      }
      acc += seg;
    }
    return { p: { x: c.x, y: c.y }, rot: 0 };
  }
  // L-förmige (orthogonale) Leitung von a nach b
  function manhattan(a, b) { return [{ x: a.x, y: a.y }, { x: b.x, y: a.y }, { x: b.x, y: b.y }]; }

  /* ---------- Auto-Generator ---------- */
  function generate(floor, level) {
    level = level || "standard";
    floor.electrical = []; floor.wires = [];
    const E = floor.electrical, W = floor.wires;
    const add = (type, x, y, rot, circuit) => { const e = GD.make.elec(type, x, y); e.rot = rot || 0; if (circuit) e.circuit = circuit; E.push(e); return e; };
    const wire = (kind, a, b) => W.push(GD.make.wire(kind, manhattan(a, b)));

    // Verteiler – ein passender Raum (Flur/Eingang/HWR) bevorzugt
    let panelRoom = floor.rooms.find(r => ["hall", "entrance", "utility"].includes(roomType(r.name))) || floor.rooms[0];
    let panel = null;
    if (panelRoom && panelRoom.poly.length >= 3) {
      const pp = perimeterPoint(panelRoom.poly, 0.02, 25, GD.geom.centroid(panelRoom.poly));
      panel = add("panel", pp.p.x, pp.p.y, 0, "HV");
    }

    floor.rooms.forEach((room, ri) => {
      if (room.poly.length < 3) return;
      const c = GD.geom.centroid(room.poly), bb = GD.geom.bbox(room.poly), area = GD.geom.polygonArea(room.poly);
      const rt = roomType(room.name), spec = SPEC[rt] || SPEC.other;
      const circuit = "L" + (ri + 1);

      // Abzweigdose (Sammelpunkt) – nahe Decke/Mitte, leicht versetzt
      const jb = add("junction", c.x, c.y - Math.min(bb.h * 0.3, 90), 0, circuit);

      // Leuchten (Fläche + Grad)
      let nLights = spec.lights[level] + (area > 200000 ? 1 : 0);
      const lights = [];
      if (nLights <= 1) lights.push(add("light-ceiling", c.x, c.y, 0, circuit));
      else for (let i = 0; i < nLights; i++) { const fx = c.x + (i % 2 ? 1 : -1) * bb.w * 0.22, fy = c.y + (i < 2 ? -1 : 1) * bb.h * 0.22; lights.push(add("light-ceiling", fx, fy, 0, circuit)); }
      lights.forEach(li => wire("light", { x: li.x, y: li.y }, { x: jb.x, y: jb.y }));

      // Schalter neben Türen (innen); 2+ Türen → Wechselschalter
      const doors = doorsOfRoom(floor, room);
      doors.forEach(o => {
        const oi = openingInfo(floor, o); if (!oi) return;
        const inside = GD.geom.dot(GD.geom.sub(c, oi.c), oi.n) > 0 ? 1 : -1;
        const sp = GD.geom.add(GD.geom.add(oi.c, GD.geom.mul(oi.u, o.width / 2 + 18)), GD.geom.mul(oi.n, inside * 16));
        const sw = add(doors.length > 1 ? "switch-alt" : "switch", sp.x, sp.y, deg(oi.u), circuit);
        if (lights[0]) wire("light", { x: sw.x, y: sw.y }, { x: lights[0].x, y: lights[0].y });
      });
      if (!doors.length && lights[0]) { const pp = perimeterPoint(room.poly, 0.5, 16, c); add("switch", pp.p.x, pp.p.y, pp.rot, circuit); }

      // Steckdosen entlang der Wände
      const nSock = spec.sockets[level];
      for (let i = 0; i < nSock; i++) {
        const pp = perimeterPoint(room.poly, (i + 0.5) / nSock, 14, c);
        const so = add(rt === "bath" ? "outlet-wet" : "outlet", pp.p.x, pp.p.y, pp.rot, circuit);
        wire("power", { x: so.x, y: so.y }, { x: jb.x, y: jb.y });
      }

      // Spezialauslässe je Raumtyp
      const spec2 = [];
      if (spec.kitchen) { spec2.push(["stove-conn", 0.62], ["outlet-2", 0.38], ["outlet-2", 0.5]); }
      if (spec.bath) { spec2.push(["outlet-wet", 0.4]); }
      if (spec.tv) { spec2.push(["tv", 0.5], ["data", 0.54]); }
      spec2.forEach(([type, t]) => { const pp = perimeterPoint(room.poly, t, 14, c); const sp = add(type, pp.p.x, pp.p.y, pp.rot, circuit); wire("power", { x: sp.x, y: sp.y }, { x: jb.x, y: jb.y }); });

      // Rauch-/Bewegungsmelder
      if (spec.smoke) add("smoke", c.x, c.y + 40, 0, "RM");

      // Abzweigdose → Verteiler
      if (panel) wire("power", { x: jb.x, y: jb.y }, { x: panel.x, y: panel.y });
    });
    return floor;
  }

  /* ---------- Stückliste ---------- */
  function tally(floor) {
    const counts = {};
    (floor.electrical || []).forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });
    let wireLen = 0;
    (floor.wires || []).forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) wireLen += GD.geom.dist(w.pts[i], w.pts[i + 1]); });
    const rows = Object.keys(counts).map(t => ({ type: t, name: def(t).name, count: counts[t] }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { rows, wireLen };
  }

  return { symbols: S, cats, def, list, byCat, markup, roomType, levels: SPEC, generate, tally };
})();
