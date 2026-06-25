"use strict";
/* Generiert ein originalgetreues Projekt-JSON aus den abgelesenen Plan-Massen.
   Nutzt die echten Tool-Bausteine (core/library/templates) -> format-sicher. */
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
require("../js/core.js");
require("../js/library.js");
require("../js/templates.js");
const fs = require("fs");
const T = GD.templates;

function mkFloor(name, elevation, wallHeight, underlay, rects, openings, furniture) {
  const f = GD.make.floor(name);
  f.elevation = elevation; f.wallHeight = wallHeight;
  f.underlay = Object.assign({ src: "", x: 0, y: 0, scale: 1, rotation: 0, opacity: 0.45, visible: false }, underlay);
  f.walls = T.buildWallsFromRects(rects, 18);
  f.rooms = rects.filter(r => !r.noRoom).map(r => { const room = GD.make.room(T.rectPoly(r), r.name); room.ceiling = r.dh || wallHeight; if (r.color) room.color = r.color; return room; });
  f.openings = T.attachOpenings(f.walls, openings || []);
  f.furniture = (furniture || []).map(it => { const i = GD.make.item(it.type, it.x, it.y); i.rot = it.rot || 0; if (it.w) i.w = it.w; if (it.h) i.h = it.h; return i; });
  return f;
}

/* =================== ERDGESCHOSS ===================
   Ursprung x=0 = linke Aussenkante Wintergarten, y=0 = obere Kueche/Wohn-Wand.
   Untere Masskette 3.20|5.35|2.10|2.85 (=13.50), rechts 6.20, oben 3.25|4.45 (=7.70 rechtsbuendig). */
const EG_RECTS = [
  { name: "Küche", x: 580, y: 0, w: 325, h: 370, dh: 215 },
  { name: "Wohn- / Essbereich", x: 905, y: 0, w: 445, h: 370, dh: 215 },     // oberer Teil
  { name: "Wohn- / Essbereich", x: 1065, y: 370, w: 285, h: 250, dh: 215 },  // unterer Teil (L)
  { name: "Treppe", x: 580, y: 370, w: 275, h: 250, dh: 225 },
  { name: "Bad / Dusche", x: 855, y: 370, w: 210, h: 250, dh: 210 },
  { name: "Diele", x: 320, y: 370, w: 260, h: 250, dh: 225 },
  { name: "Eingang / Wintergarten", x: 0, y: 240, w: 320, h: 380, dh: 225 },
];
const EG_OPEN = [
  // Fenster
  { center: { x: 760, y: 0 }, width: 110, type: "window" },                 // Kueche oben
  { center: { x: 1010, y: 0 }, width: 120, type: "window" },                // Wohn oben links
  { center: { x: 1230, y: 0 }, width: 120, type: "window" },                // Wohn oben rechts
  { center: { x: 1350, y: 170 }, width: 130, type: "window" },              // Wohn rechts oben
  { center: { x: 1350, y: 470 }, width: 130, type: "window" },              // Wohn rechts unten
  { center: { x: 0, y: 430 }, width: 340, type: "window-fixed" },           // Wintergarten Glasfront
  { center: { x: 980, y: 620 }, width: 90, type: "window" },                // Bad unten
  // Tueren
  { center: { x: 160, y: 620 }, width: 100, type: "door-single", hinge: "left", dir: "out" }, // Haustuer
  { center: { x: 320, y: 470 }, width: 90, type: "door-single", hinge: "left", dir: "in" },   // Wintergarten->Diele
  { center: { x: 580, y: 470 }, width: 90, type: "door-single", hinge: "right", dir: "in" },  // Diele->Treppe
  { center: { x: 855, y: 480 }, width: 80, type: "door-single", hinge: "left", dir: "in" },   // ->Bad
  { center: { x: 905, y: 200 }, width: 110, type: "door-double" },          // Kueche<->Wohn Durchgang
];
const EG_FURN = [
  { type: "sink-corner", x: 640, y: 55, rot: 0 },
  { type: "stove", x: 770, y: 50, rot: 0 },
  { type: "counter", x: 880, y: 120, rot: 90, w: 200, h: 50 },
  { type: "table-round", x: 1090, y: 150, rot: 0 },
  { type: "sofa", x: 1290, y: 110, rot: 90 },
  { type: "wardrobe", x: 1280, y: 470, rot: 90 },
  { type: "stairs", x: 700, y: 500, rot: 0, w: 120, h: 230 },
  { type: "basin", x: 910, y: 410, rot: 0 },
  { type: "fireplace", x: 1010, y: 395, rot: 0 },
  { type: "bathtub", x: 1000, y: 560, rot: 0, w: 150, h: 75 },
  { type: "shower", x: 905, y: 560, rot: 0, w: 80, h: 90 },
  { type: "plant", x: 70, y: 560, rot: 0 },
];

/* =================== DACHGESCHOSS ===================
   Ursprung x=0 linke Aussenkante, y=0 obere Wand.
   Oben 3.85|4.35 (=8.20), rechts 0.80|2.50|2.40 (=5.70), unten 1.35|4.40, links 3.42. */
const OG_RECTS = [
  { name: "Schlafzimmer", x: 270, y: 0, w: 385, h: 342, dh: 205 },
  { name: "Kinderzimmer", x: 655, y: 0, w: 435, h: 250, dh: 205 },          // oberer rechter Raum
  { name: "Kind / Gast", x: 655, y: 250, w: 435, h: 340, dh: 205 },         // unterer rechter Raum
  { name: "Bad / WC", x: 450, y: 342, w: 205, h: 248, dh: 205 },
  { name: "Treppe", x: 270, y: 342, w: 180, h: 130, dh: 205 },
  { name: "Einbauschrank", x: 270, y: 472, w: 180, h: 118, dh: 130 },
  { name: "Speicherraum", x: 0, y: 342, w: 270, h: 248, dh: 130 },
];
const OG_OPEN = [
  { center: { x: 460, y: 0 }, width: 100, type: "window" },                 // Schlafzimmer oben
  { center: { x: 735, y: 0 }, width: 100, type: "window" },                 // Kinderzimmer oben
  { center: { x: 1090, y: 80 }, width: 80, type: "window" },                // rechts oben (0.80)
  { center: { x: 1090, y: 410 }, width: 100, type: "window" },              // rechts unten (1.0m)
  { center: { x: 0, y: 200 }, width: 100, type: "window" },                 // links Schlafzimmer
  { center: { x: 0, y: 470 }, width: 100, type: "window" },                 // links Speicher
  { center: { x: 570, y: 590 }, width: 80, type: "window" },                // Bad unten (0.8)
  { center: { x: 200, y: 590 }, width: 90, type: "window" },                // Speicher unten
  // Tueren
  { center: { x: 460, y: 342 }, width: 90, type: "door-single", hinge: "left", dir: "in" },
  { center: { x: 655, y: 150 }, width: 90, type: "door-single", hinge: "left", dir: "in" },
  { center: { x: 655, y: 430 }, width: 90, type: "door-single", hinge: "right", dir: "in" },
  { center: { x: 540, y: 342 }, width: 80, type: "door-single", hinge: "left", dir: "in" },
  { center: { x: 270, y: 410 }, width: 80, type: "door-single", hinge: "left", dir: "in" },
];
const OG_FURN = [
  { type: "bed-double", x: 400, y: 130, rot: 0 },
  { type: "wardrobe", x: 600, y: 130, rot: 90 },
  { type: "bed-single", x: 1000, y: 150, rot: 0 },
  { type: "bed-single", x: 1000, y: 430, rot: 0 },
  { type: "wc", x: 530, y: 540, rot: 0 },
  { type: "basin", x: 480, y: 380, rot: 0 },
  { type: "stairs", x: 360, y: 405, rot: 0, w: 150, h: 120 },
];

const eg = mkFloor("Erdgeschoss", 0, 250, { src: "Grundriss EG.jpg", scale: 1.34, x: -120, y: -110 }, EG_RECTS, EG_OPEN, EG_FURN);
const og = mkFloor("Dachgeschoss", 250, 230, { src: "Grundriss OG.jpg", scale: 1.32, x: -150, y: -90 }, OG_RECTS, OG_OPEN, OG_FURN);

const project = GD.make.project();
project.name = "Haus – Originalplan";
project.floors = [eg, og];
project.activeFloorId = eg.id;

fs.writeFileSync(__dirname + "/../grundriss-original.json", JSON.stringify(project, null, 2));
console.log("OK – EG:", eg.walls.length, "Wände,", eg.rooms.length, "Räume,", eg.openings.length, "Öffnungen,", eg.furniture.length, "Möbel");
console.log("OK – OG:", og.walls.length, "Wände,", og.rooms.length, "Räume,", og.openings.length, "Öffnungen,", og.furniture.length, "Möbel");
