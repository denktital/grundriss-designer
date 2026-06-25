"use strict";
/* Symbolbibliothek: Möbel & Sanitär. Symbole werden in lokalen cm-Koordinaten
   gezeichnet, Ursprung = Mitte, x→rechts, y→unten. stroke via non-scaling-stroke.
   z = Standard-Bauhöhe (cm) für die 3D-Ansicht. */
window.GD = window.GD || {};

GD.library = (function () {
  const R = (x, y, w, h, extra) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="sym" ${extra || ""}/>`;
  const C = (cx, cy, r, extra) => `<circle cx="${cx}" cy="${cy}" r="${r}" class="sym" ${extra || ""}/>`;
  const L = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="sym"/>`;
  const P = (d) => `<path d="${d}" class="sym"/>`;
  const E = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" class="sym"/>`;

  const S = {
    /* --- Schlafen --- */
    "bed-double": { name: "Doppelbett", cat: "Schlafen", w: 160, h: 200, z: 50, draw(w, h) {
      const x = -w / 2, y = -h / 2;
      return R(x, y, w, h, 'rx="4"') + R(x, y, w, 26) + R(x + 8, y + 32, w / 2 - 14, 42, 'rx="5"') + R(x + w / 2 + 6, y + 32, w / 2 - 14, 42, 'rx="5"') + L(x, y + 92, x + w, y + 92);
    }},
    "bed-single": { name: "Einzelbett", cat: "Schlafen", w: 100, h: 200, z: 50, draw(w, h) {
      const x = -w / 2, y = -h / 2;
      return R(x, y, w, h, 'rx="4"') + R(x, y, w, 26) + R(x + 12, y + 32, w - 24, 46, 'rx="5"') + L(x, y + 94, x + w, y + 94);
    }},
    "wardrobe": { name: "Schrank", cat: "Schlafen", w: 120, h: 60, z: 210, draw(w, h) {
      const x = -w / 2, y = -h / 2;
      return R(x, y, w, h) + L(0, y, 0, y + h) + L(x + w * .04, y + h * .4, x + w * .14, y + h * .4) + L(x + w * .96, y + h * .4, x + w * .86, y + h * .4);
    }},
    "nightstand": { name: "Nachttisch", cat: "Schlafen", w: 45, h: 40, z: 50, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h, 'rx="3"') + L(x + 6, y + h / 2, x + w - 6, y + h / 2) + C(0, y + h * .28, 2); }},
    "dresser": { name: "Kommode", cat: "Schlafen", w: 110, h: 48, z: 85, draw(w, h) { const x = -w / 2, y = -h / 2; let s = R(x, y, w, h, 'rx="3"'); for (let i = 1; i < 3; i++) s += L(x + w * i / 3, y, x + w * i / 3, y + h); return s; }},
    /* --- Wohnen --- */
    "sofa": { name: "Sofa", cat: "Wohnen", w: 200, h: 90, z: 80, draw(w, h) {
      const x = -w / 2, y = -h / 2;
      return R(x, y, w, h, 'rx="10"') + R(x, y, w, 26) + R(x, y + 22, 22, h - 22, 'rx="8"') + R(x + w - 22, y + 22, 22, h - 22, 'rx="8"') + L(x + 30, y + 30, x + 30, y + h - 8) + L(x + w - 30, y + 30, x + w - 30, y + h - 8);
    }},
    "sofa-corner": { name: "Ecksofa", cat: "Wohnen", w: 230, h: 200, z: 80, draw(w, h) {
      const x = -w / 2, y = -h / 2;
      return P(`M ${x} ${y} H ${x + w} V ${y + 90} H ${x + 90} V ${y + h} H ${x} Z`) + R(x, y, w, 24) + R(x, y, 24, 90);
    }},
    "armchair": { name: "Sessel", cat: "Wohnen", w: 80, h: 80, z: 80, draw(w, h) {
      const x = -w / 2, y = -h / 2;
      return R(x, y, w, h, 'rx="10"') + R(x, y, w, 22) + R(x, y + 18, 18, h - 18, 'rx="7"') + R(x + w - 18, y + 18, 18, h - 18, 'rx="7"');
    }},
    "table-rect": { name: "Esstisch", cat: "Wohnen", w: 160, h: 90, z: 75, draw(w, h) {
      const x = -w / 2, y = -h / 2; let s = R(x, y, w, h, 'rx="5"');
      for (const cx of [-w / 4, w / 4]) { s += R(cx - 18, y - 26, 36, 22, 'rx="4"'); s += R(cx - 18, y + h + 4, 36, 22, 'rx="4"'); }
      return s;
    }},
    "table-round": { name: "Runder Tisch", cat: "Wohnen", w: 110, h: 110, z: 75, draw(w, h) {
      let s = C(0, 0, w / 2);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; s += R(Math.cos(a) * (w / 2 + 4) - 16, Math.sin(a) * (w / 2 + 4) - 11, 32, 22, 'rx="4"'); }
      return s;
    }},
    "desk": { name: "Schreibtisch", cat: "Wohnen", w: 140, h: 70, z: 75, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h, 'rx="3"') + R(x + w - 46, y + 8, 38, h - 16, 'rx="3"'); }},
    "office-chair": { name: "Bürostuhl", cat: "Wohnen", w: 55, h: 55, z: 95, draw(w, h) { return C(0, 4, w / 2 - 4) + P(`M ${-w / 2 + 6} ${-2} A ${w / 2} ${w / 2} 0 0 1 ${w / 2 - 6} ${-2}`); }},
    "bookshelf": { name: "Bücherregal", cat: "Wohnen", w: 90, h: 30, z: 200, draw(w, h) { const x = -w / 2, y = -h / 2; let s = R(x, y, w, h); for (let i = 1; i < 4; i++) s += L(x + w * i / 4, y, x + w * i / 4, y + h); return s; }},
    "tv": { name: "TV", cat: "Wohnen", w: 120, h: 14, z: 60, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h, 'rx="2"') + L(x + w / 2 - 16, y + h, x + w / 2 + 16, y + h); }},
    "fireplace": { name: "Kamin", cat: "Wohnen", w: 110, h: 40, z: 120, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h) + R(x + 18, y + 8, w - 36, h - 8, 'rx="3"') + P(`M ${-12} ${y + h - 4} q 12 -16 0 -22 q -12 6 0 22`); }},
    "piano": { name: "Klavier", cat: "Wohnen", w: 150, h: 60, z: 110, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h, 'rx="4"') + R(x, y + h - 18, w, 18) + L(x, y + h - 9, x + w, y + h - 9); }},
    "rug": { name: "Teppich", cat: "Wohnen", w: 200, h: 140, z: 1, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h, 'rx="6" stroke-dasharray="10 6"') + R(x + 14, y + 14, w - 28, h - 28, 'rx="4"'); }},
    /* --- Küche --- */
    "stove": { name: "Herd", cat: "Küche", w: 60, h: 60, z: 90, draw(w, h) {
      const x = -w / 2, y = -h / 2, r = 9;
      return R(x, y, w, h, 'rx="3"') + C(x + w * .28, y + h * .28, r) + C(x + w * .72, y + h * .28, r) + C(x + w * .28, y + h * .72, r) + C(x + w * .72, y + h * .72, r);
    }},
    "sink": { name: "Spüle", cat: "Küche", w: 80, h: 50, z: 90, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h, 'rx="3"') + R(x + 8, y + 8, w - 16, h - 16, 'rx="7"') + C(x + w - 14, y + 10, 3); }},
    "sink-corner": { name: "Eckspüle", cat: "Küche", w: 80, h: 80, z: 90, draw(w, h) { const x = -w / 2, y = -h / 2; return P(`M ${x} ${y} H ${x + w} V ${y + 50} H ${x + 50} V ${y + h} H ${x} Z`) + E(x + 28, y + 28, 18, 14); }},
    "fridge": { name: "Kühlschrank", cat: "Küche", w: 60, h: 60, z: 175, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h, 'rx="3"') + L(x + 7, y + h * .4, x + 7, y + h * .4 + 14); }},
    "counter": { name: "Arbeitsplatte", cat: "Küche", w: 120, h: 60, z: 90, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h); }},
    "dishwasher": { name: "Geschirrspüler", cat: "Küche", w: 60, h: 60, z: 85, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h, 'rx="3"') + R(x + 8, y + 8, w - 16, h - 22, 'rx="2"') + L(x + 10, y + h - 8, x + w - 10, y + h - 8); }},
    "oven": { name: "Backofen", cat: "Küche", w: 60, h: 60, z: 85, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h, 'rx="3"') + R(x + 8, y + 16, w - 16, h - 24, 'rx="2"') + L(x + 8, y + 9, x + w - 8, y + 9); }},
    /* --- Sanitär --- */
    "wc": { name: "WC", cat: "Sanitär", w: 40, h: 60, z: 40, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x + 4, y, w - 8, 18, 'rx="3"') + E(0, y + 38, w / 2 - 3, 18); }},
    "basin": { name: "Waschbecken", cat: "Sanitär", w: 60, h: 45, z: 85, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h, 'rx="7"') + E(0, y + h / 2 + 2, w / 2 - 8, h / 2 - 8) + C(0, y + 6, 2.5); }},
    "double-basin": { name: "Doppelwaschtisch", cat: "Sanitär", w: 120, h: 50, z: 85, draw(w, h) { const x = -w / 2, y = -h / 2; let s = R(x, y, w, h, 'rx="6"'); for (const cx of [-w / 4, w / 4]) { s += E(cx, y + h / 2 + 2, w / 5, h / 2 - 8) + C(cx, y + 6, 2.2); } return s; }},
    "shower": { name: "Dusche", cat: "Sanitär", w: 90, h: 90, z: 5, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h) + L(x, y, x + w, y + h) + L(x + w, y, x, y + h) + C(x + w - 12, y + 12, 4); }},
    "bathtub": { name: "Badewanne", cat: "Sanitär", w: 170, h: 75, z: 55, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h, 'rx="12"') + R(x + 10, y + 10, w - 20, h - 20, 'rx="22"') + C(x + 20, y + h / 2, 3); }},
    "washer": { name: "Waschmaschine", cat: "Sanitär", w: 60, h: 60, z: 85, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h, 'rx="3"') + C(0, 4, w / 2 - 14) + C(0, 4, w / 2 - 22); }},
    "heater": { name: "Heizkörper", cat: "Sanitär", w: 90, h: 14, z: 60, draw(w, h) { const x = -w / 2, y = -h / 2; let s = R(x, y, w, h, 'rx="2"'); for (let i = 1; i < 9; i++) s += L(x + w * i / 9, y, x + w * i / 9, y + h); return s; }},
    /* --- Sonstiges --- */
    "stairs": { name: "Treppe", cat: "Sonstiges", w: 100, h: 250, z: 0, draw(w, h) {
      const x = -w / 2, y = -h / 2; let s = R(x, y, w, h);
      const n = 12; for (let i = 1; i < n; i++) s += L(x, y + h * i / n, x + w, y + h * i / n);
      s += `<path d="M ${x + w / 2} ${y + 14} L ${x + w / 2} ${y + h - 14}" class="sym-arrow"/>` + `<path d="M ${x + w / 2 - 6} ${y + 26} L ${x + w / 2} ${y + 12} L ${x + w / 2 + 6} ${y + 26}" class="sym-arrow"/>`;
      return s;
    }},
    "stairs-spiral": { name: "Wendeltreppe", cat: "Sonstiges", w: 130, h: 130, z: 0, draw(w, h) { let s = C(0, 0, w / 2); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; s += L(0, 0, Math.cos(a) * w / 2, Math.sin(a) * w / 2); } return s + C(0, 0, 10); }},
    "plant": { name: "Pflanze", cat: "Sonstiges", w: 50, h: 50, z: 60, draw(w, h) { return C(0, 0, w / 2) + C(0, 0, w / 2 - 10) + L(-8, -8, 8, 8) + L(-8, 8, 8, -8); }},
    "tree": { name: "Baum", cat: "Sonstiges", w: 120, h: 120, z: 400, draw(w, h) { return C(0, 0, w / 2) + C(0, 0, w / 2 - 16, 'stroke-dasharray="6 6"') + C(0, 0, 6); }},
    "car": { name: "Auto", cat: "Sonstiges", w: 180, h: 450, z: 140, draw(w, h) { const x = -w / 2, y = -h / 2; return R(x, y, w, h, 'rx="24"') + R(x + 14, y + 40, w - 28, 120, 'rx="16"') + R(x + 14, y + h - 200, w - 28, 150, 'rx="16"'); }},
  };

  const cats = ["Schlafen", "Wohnen", "Küche", "Sanitär", "Sonstiges"];

  return {
    symbols: S, cats,
    def(type) { return S[type] || { name: type, w: 60, h: 60, z: 50, draw: (w, h) => R(-w / 2, -h / 2, w, h) }; },
    list() { return Object.keys(S).map(k => Object.assign({ type: k }, S[k])); },
    byCat(cat) { return this.list().filter(s => s.cat === cat); },
    markup(type, w, h) { const d = this.def(type); return d.draw(w || d.w, h || d.h); },
  };
})();
