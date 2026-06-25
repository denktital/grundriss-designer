"use strict";
/* 3D-Ansicht (Three.js): extrudierte Wände mit Öffnungen, Böden, Möbel, Geschoss-Stapel */
window.GD = window.GD || {};

GD.view3d = (function () {
  let container, renderer, scene, camera, controls, content, raf = null, ready = false;
  let mode = "all"; // 'floor' | 'all'

  const M = (cm) => cm / 100; // cm -> m

  function init(el) {
    if (ready) return;
    container = el;
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x10141c);

    camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(8, 8, 10);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 0.9); scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.7); dir.position.set(10, 20, 8); scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.25); dir2.position.set(-8, 10, -6); scene.add(dir2);

    const grid = new THREE.GridHelper(60, 60, 0x2a3550, 0x1c2438); grid.position.y = -0.01; scene.add(grid);

    content = new THREE.Group(); scene.add(content);
    ready = true;
    window.addEventListener("resize", onResize);
  }

  const MAT = {
    wall: () => new THREE.MeshStandardMaterial({ color: 0xeae6df, roughness: 0.9, metalness: 0 }),
    floor: (c) => new THREE.MeshStandardMaterial({ color: c || 0xcdd6e6, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
    glass: () => new THREE.MeshStandardMaterial({ color: 0x8fc4ff, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.2 }),
    furn: () => new THREE.MeshStandardMaterial({ color: 0x9aa6bd, roughness: 0.8 }),
  };

  function clearContent() { while (content.children.length) { const c = content.children.pop(); c.geometry && c.geometry.dispose && c.geometry.dispose(); } }

  function addBox(w, h, d, cx, cy, cz, angle, mat) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mat);
    m.position.set(cx, cy, cz); m.rotation.y = angle;
    content.add(m); return m;
  }

  function openingsOfWall(floor, wall) {
    return (floor.openings || []).filter(o => o.wallId === wall.id).map(o => ({ o, s: o.pos - o.width / 2, e: o.pos + o.width / 2 })).sort((a, b) => a.s - b.s);
  }

  function buildFloor(floor) {
    const yBase = M(floor.elevation);
    const H = M(floor.wallHeight);
    // Böden
    for (const room of floor.rooms) {
      if (room.poly.length < 3) continue;
      const shape = new THREE.Shape();
      room.poly.forEach((p, i) => { i ? shape.lineTo(M(p.x), M(p.y)) : shape.moveTo(M(p.x), M(p.y)); });
      const geo = new THREE.ShapeGeometry(shape);
      const col = room.color && room.color !== "#ffffff" ? new THREE.Color(room.color).getHex() : 0xd2dae8;
      const mesh = new THREE.Mesh(geo, MAT.floor(col));
      mesh.rotation.x = Math.PI / 2; mesh.position.y = yBase + 0.005;
      content.add(mesh);
    }
    // Wände
    for (const w of floor.walls) {
      const len = GD.geom.dist(w.a, w.b); if (len < 1) continue;
      const ang = -Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x);
      const t = M(w.thickness), Hw = M(w.height || floor.wallHeight);
      const u = GD.geom.norm(GD.geom.sub(w.b, w.a));
      const ops = openingsOfWall(floor, w);
      const segs = []; let cur = 0;
      for (const op of ops) { if (op.s > cur) segs.push([cur, op.s]); cur = Math.max(cur, op.e); }
      if (cur < len) segs.push([cur, len]);
      const place = (s, e, hgt, yc) => {
        if (hgt <= 0) return;
        const mid = (s + e) / 2; const c = GD.geom.add(w.a, GD.geom.mul(u, mid));
        addBox(M(e - s), hgt, t, M(c.x), yBase + yc, M(c.y), ang, MAT.wall());
      };
      for (const [s, e] of segs) place(s, e, Hw, Hw / 2);
      for (const op of ops) {
        const o = op.o;
        if (o.type === "window") {
          const sill = M(o.sill != null ? o.sill : 90), winH = M(o.height != null ? o.height : 120), head = sill + winH;
          place(op.s, op.e, sill, sill / 2);
          if (head < Hw) place(op.s, op.e, Hw - head, head + (Hw - head) / 2);
          const mid = (op.s + op.e) / 2, c = GD.geom.add(w.a, GD.geom.mul(u, mid));
          addBox(M(op.e - op.s), winH, t * 0.3, M(c.x), yBase + (sill + head) / 2, M(c.y), ang, MAT.glass());
        } else {
          const dh = M(o.height != null ? o.height : 200);
          if (dh < Hw) place(op.s, op.e, Hw - dh, dh + (Hw - dh) / 2);
        }
      }
    }
    // Möbel als einfache Volumen (Höhe je Objekt)
    for (const it of floor.furniture) {
      const hgt = it.hh != null ? M(it.hh) : furnHeight(it.type);
      if (hgt <= 0.001) continue;
      addBox(M(it.w), hgt, M(it.h), M(it.x), yBase + hgt / 2 + 0.01, M(it.y), -it.rot * Math.PI / 180, MAT.furn());
    }
    if (floor.roof && floor.roof.enabled) buildRoof(floor);
  }

  /* ---------- Dach ---------- */
  function buildRoof(floor) {
    const pts = [];
    floor.walls.forEach(w => { pts.push({ x: w.a.x, y: w.a.y }, { x: w.b.x, y: w.b.y }); });
    if (pts.length < 2) return;
    const b = GD.geom.bbox(pts);
    const r = floor.roof, ov = (r.overhang || 0);
    const x0 = M(b.minX - ov), x1 = M(b.maxX + ov), z0 = M(b.minY - ov), z1 = M(b.maxY + ov);
    const yE = M(floor.elevation + floor.wallHeight);
    const yR = yE + M(r.height || 200);
    const color = new THREE.Color(r.color || "#9a4a3a").getHex();
    const ridgeX = (r.ridge === "x") || (r.ridge === "auto" && (x1 - x0) >= (z1 - z0));
    const V = [], F = [];
    const add = (x, y, z) => { V.push(x, y, z); return V.length / 3 - 1; };
    const quad = (a, c, d, e) => { F.push(a, c, d, a, d, e); };
    const tri = (a, c, d) => { F.push(a, c, d); };

    if (r.type === "flat") {
      const a = add(x0, yE, z0), c = add(x1, yE, z0), d = add(x1, yE, z1), e = add(x0, yE, z1);
      quad(a, c, d, e);
    } else if (r.type === "pent") {
      // Pultdach: hoch an einer Seite
      if (ridgeX) { const a = add(x0, yR, z0), c = add(x1, yR, z0), d = add(x1, yE, z1), e = add(x0, yE, z1); quad(a, c, d, e); }
      else { const a = add(x0, yR, z0), c = add(x1, yE, z0), d = add(x1, yE, z1), e = add(x0, yR, z1); quad(a, c, d, e); }
    } else if (r.type === "hip") {
      const zm = (z0 + z1) / 2, xm = (x0 + x1) / 2;
      if (ridgeX) {
        const inset = Math.min((z1 - z0) / 2, (x1 - x0) / 2);
        const e0 = add(x0, yE, z0), e1 = add(x1, yE, z0), e2 = add(x1, yE, z1), e3 = add(x0, yE, z1);
        const r0 = add(x0 + inset, yR, zm), r1 = add(x1 - inset, yR, zm);
        quad(e0, e1, r1, r0); quad(e2, e3, r0, r1); tri(e1, e2, r1); tri(e3, e0, r0);
      } else {
        const inset = Math.min((x1 - x0) / 2, (z1 - z0) / 2);
        const e0 = add(x0, yE, z0), e1 = add(x1, yE, z0), e2 = add(x1, yE, z1), e3 = add(x0, yE, z1);
        const r0 = add(xm, yR, z0 + inset), r1 = add(xm, yR, z1 - inset);
        quad(e3, e0, r0, r1); quad(e1, e2, r1, r0); tri(e0, e1, r0); tri(e2, e3, r1);
      }
    } else { // gable Satteldach
      if (ridgeX) {
        const zm = (z0 + z1) / 2;
        const e0 = add(x0, yE, z0), e1 = add(x1, yE, z0), e2 = add(x1, yE, z1), e3 = add(x0, yE, z1);
        const r0 = add(x0, yR, zm), r1 = add(x1, yR, zm);
        quad(e0, e1, r1, r0); quad(e2, e3, r0, r1); tri(e0, r0, e3); tri(e1, e2, r1);
      } else {
        const xm = (x0 + x1) / 2;
        const e0 = add(x0, yE, z0), e1 = add(x1, yE, z0), e2 = add(x1, yE, z1), e3 = add(x0, yE, z1);
        const r0 = add(xm, yR, z0), r1 = add(xm, yR, z1);
        quad(e1, e2, r1, r0); quad(e3, e0, r0, r1); tri(e0, e1, r0); tri(e2, e3, r1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(V, 3));
    geo.setIndex(F); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }));
    content.add(mesh);
  }

  function furnHeight(t) {
    const m = { "bed-double": 0.5, "bed-single": 0.5, "sofa": 0.8, "armchair": 0.8, "table-rect": 0.75, "table-round": 0.75, "wardrobe": 2.0, "stove": 0.9, "sink": 0.9, "fridge": 1.7, "counter": 0.9, "wc": 0.4, "basin": 0.85, "shower": 0.05, "bathtub": 0.55, "stairs": 1.0, "plant": 0.6, "tv": 0.6, "car": 1.4 };
    return m[t] || 0.5;
  }

  function build() {
    if (!ready) return;
    clearContent();
    const p = GD.state.project;
    const floors = mode === "all" ? p.floors : [GD.state.activeFloor()];
    floors.forEach(buildFloor);
    frameCamera(floors);
  }

  function frameCamera(floors) {
    const pts = [];
    floors.forEach(f => f.walls.forEach(w => { pts.push({ x: M(w.a.x), y: M(w.a.y) }, { x: M(w.b.x), y: M(w.b.y) }); }));
    if (!pts.length) return;
    const b = GD.geom.bbox(pts);
    const cx = (b.minX + b.maxX) / 2, cz = (b.minY + b.maxY) / 2;
    const r = Math.max(b.w, b.h) || 8;
    controls.target.set(cx, M(120), cz);
    camera.position.set(cx + r * 0.9, r * 0.9 + 3, cz + r * 1.1);
    camera.updateProjectionMatrix();
  }

  function onResize() { if (!ready || !container.clientWidth) return; camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); }

  function loop() { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); }
  function show() { if (!ready) return; onResize(); build(); if (!raf) loop(); }
  function hide() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
  function setMode(m) { mode = m; build(); }
  function getRenderer() { return renderer; }
  function getScene() { return content; }

  return { init, build, show, hide, setMode, getMode: () => mode, onResize, getRenderer, getScene, ready: () => ready };
})();
