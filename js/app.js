"use strict";
/* UI-Verdrahtung & Bootstrap */
window.GD = window.GD || {};

GD.ui = (function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  function h(tag, props, kids) {
    const e = document.createElement(tag);
    if (props) for (const k in props) {
      if (k === "class") e.className = props[k];
      else if (k === "html") e.innerHTML = props[k];
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), props[k]);
      else if (props[k] != null) e.setAttribute(k, props[k]);
    }
    (kids || []).forEach(c => e.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return e;
  }
  const m = cm => (cm / 100).toFixed(2);

  /* ---------- Toast ---------- */
  let toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = h("div", { class: "toast" }); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  /* ---------- Icons (line-art SVG) ---------- */
  const svgIc = (inner, fill) => `<svg viewBox="0 0 24 24" fill="${fill ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const ICONS = {
    select: svgIc('<path d="M5 3l5.5 15 2.2-6.3L19 9.5 5 3z"/>', true),
    wall: svgIc('<path d="M3 8.5h18M3 15.5h18"/><path d="M7 8.5v7M12 8.5v7M17 8.5v7" stroke-width="1"/>'),
    room: svgIc('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/>'),
    door: svgIc('<path d="M7 21V4h8v17"/><path d="M15 9a8 8 0 016 7"/><path d="M4 21h16"/>'),
    window: svgIc('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M4 12h16"/>'),
    dim: svgIc('<path d="M3 12h18"/><path d="M6 9l-3 3 3 3M18 9l3 3-3 3"/><path d="M3 7v10M21 7v10" stroke-width="1.1"/>'),
    label: svgIc('<path d="M5 6.5h14M12 6.5V19M9 19h6"/>'),
    furniture: svgIc('<path d="M4 11.5V8a2 2 0 012-2h12a2 2 0 012 2v3.5"/><path d="M3.5 11.5A1.8 1.8 0 015 13.3V16h14v-2.7a1.8 1.8 0 011.5-1.8"/><path d="M6 19v-3M18 19v-3"/>'),
    expand: svgIc('<path d="M9 6l6 6-6 6"/>'),
    collapse: svgIc('<path d="M15 6l-6 6 6 6"/>'),
  };

  /* ---------- Werkzeugleiste ---------- */
  const TOOLS = [
    { t: "select", ic: "select", name: "Auswahl (V)" },
    { t: "wall", ic: "wall", name: "Wand (W)" },
    { t: "room", ic: "room", name: "Raum (P)" },
    { t: "door", ic: "door", name: "Tür (T)" },
    { t: "window", ic: "window", name: "Fenster (F)" },
    { t: "dim", ic: "dim", name: "Bemaßung (M)" },
    { t: "label", ic: "label", name: "Text (X)" },
  ];
  function mkToolBtn(icKey, name, tool, onclick) {
    const short = name.replace(/\s*\(.*\)$/, "");
    return h("button", { class: "tool-btn", "data-tool": tool || "", onclick }, [
      h("span", { class: "tool-ic", html: ICONS[icKey] || icKey }),
      h("span", { class: "tool-name" }, [short]),
      h("span", { class: "tool-tip" }, [name]),
    ]);
  }
  function buildToolbar() {
    const bar = $("#toolbar"); bar.innerHTML = "";
    TOOLS.forEach(tl => bar.appendChild(mkToolBtn(tl.ic, tl.name, tl.t, () => GD.editor.setTool(tl.t))));
    bar.appendChild(h("div", { class: "tool-sep" }));
    bar.appendChild(mkToolBtn("furniture", "Möbel & Symbole", "", () => openTab("lib")));
    bar.appendChild(h("div", { class: "tool-spacer" }));
    const exp = mkToolBtn("expand", "Beschriftung", "", toggleToolbarLabels); exp.classList.add("tool-expand");
    bar.appendChild(exp);
    const on = !!GD.state.project.settings.toolbarExpanded;
    bar.classList.toggle("expanded", on);
    exp.querySelector(".tool-ic").innerHTML = on ? ICONS.collapse : ICONS.expand;
    syncTool();
  }
  function toggleToolbarLabels() {
    const bar = $("#toolbar"); const on = bar.classList.toggle("expanded");
    GD.state.project.settings.toolbarExpanded = on; GD.state.save();
    const ic = $("#toolbar .tool-expand .tool-ic"); if (ic) ic.innerHTML = on ? ICONS.collapse : ICONS.expand;
  }
  function syncTool() { const t = GD.editor.getTool(); $$("#toolbar .tool-btn").forEach(b => b.classList.toggle("active", b.dataset.tool === t)); }

  /* ---------- Etagen ---------- */
  function buildFloors() {
    const el = $("#floors"); el.innerHTML = "";
    GD.state.project.floors.forEach(f => {
      const tab = h("div", { class: "floor-tab" + (f.id === GD.state.project.activeFloorId ? " active" : ""), onclick: () => switchFloor(f.id), ondblclick: () => renameFloor(f) }, [f.name]);
      el.appendChild(tab);
    });
    el.appendChild(h("button", { class: "floor-add", title: "Geschoss hinzufügen", onclick: addFloor }, ["+"]));
  }
  function switchFloor(id) { GD.state.project.activeFloorId = id; GD.editor.clearSel(); GD.state.save(); GD.view2d.fit(); refreshAll(); if (mode3d) GD.view3d.build(); }
  function addFloor() {
    const name = prompt("Name des Geschosses:", "Geschoss " + (GD.state.project.floors.length + 1)); if (!name) return;
    GD.state.commitStructure(() => { const f = GD.make.floor(name); const top = GD.state.project.floors.reduce((a, b) => Math.max(a, b.elevation + b.wallHeight), 0); f.elevation = top; GD.state.project.floors.push(f); GD.state.project.activeFloorId = f.id; });
    refreshAll(); GD.view2d.fit();
  }
  function renameFloor(f) { const n = prompt("Geschoss umbenennen:", f.name); if (n) { GD.state.commit(() => f.name = n); buildFloors(); } }

  /* ---------- Sidebar Tabs ---------- */
  let sideTab = "props";
  function openTab(t) { sideTab = t; $$("#sideTabs .side-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === t)); renderSide(); }
  function renderSide() { sideTab === "lib" ? buildLibrary() : buildProps(); }

  /* ---------- Bibliothek ---------- */
  let libQuery = "";
  function buildLibrary() {
    const box = $("#sideBody"); box.innerHTML = "";
    const search = h("input", { type: "text", class: "lib-search", placeholder: "🔍  Symbol suchen…", value: libQuery });
    search.addEventListener("input", () => { libQuery = search.value.toLowerCase(); renderLibList(); });
    box.appendChild(search);
    box.appendChild(h("div", { id: "libList" }));
    renderLibList();
  }
  function renderLibList() {
    const list = $("#libList"); if (!list) return; list.innerHTML = "";
    let total = 0;
    GD.library.cats.forEach(cat => {
      const items = GD.library.byCat(cat).filter(s => !libQuery || s.name.toLowerCase().includes(libQuery));
      if (!items.length) return; total += items.length;
      list.appendChild(h("div", { class: "lib-cat" }, [cat]));
      const grid = h("div", { class: "lib-grid" });
      items.forEach(sym => {
        const pad = 16, vb = `${-sym.w / 2 - pad} ${-sym.h / 2 - pad} ${sym.w + pad * 2} ${sym.h + pad * 2}`;
        const cell = h("button", { class: "lib-item" + (GD.editor.pendingType === sym.type ? " active" : ""), title: sym.name, onclick: () => { GD.editor.setTool("furniture", sym.type); renderLibList(); toast("Platzieren: " + sym.name); } });
        cell.innerHTML = `<svg viewBox="${vb}" class="lib-svg">${GD.library.markup(sym.type, sym.w, sym.h)}</svg><span>${sym.name}</span>`;
        grid.appendChild(cell);
      });
      list.appendChild(grid);
    });
    if (!total) list.appendChild(h("p", { class: "hint-sm" }, ["Keine Treffer."]));
  }

  /* ---------- Eigenschaften ---------- */
  function field(label, inputEl) { return h("label", { class: "fld" }, [h("span", {}, [label]), inputEl]); }
  function num(val, on, step) { const i = h("input", { type: "number", value: val, step: step || "0.01" }); i.addEventListener("change", () => { const v = parseFloat(i.value); if (isFinite(v)) on(v); else i.value = val; }); return i; }
  function txt(val, on) { const i = h("input", { type: "text", value: val || "" }); i.addEventListener("change", () => on(i.value)); i.addEventListener("input", () => on(i.value)); return i; }

  function buildProps() {
    const box = $("#sideBody"); box.innerHTML = "";
    const fl = GD.state.activeFloor(); const sel = GD.editor.selected;
    if (sel.length === 0) return buildFloorProps(box, fl);
    if (sel.length > 1) {
      box.appendChild(h("h3", {}, [sel.length + " Objekte ausgewählt"]));
      box.appendChild(h("button", { class: "btn block", onclick: () => GD.editor.duplicateSelection() }, ["Duplizieren"]));
      box.appendChild(h("button", { class: "btn block danger", onclick: () => GD.editor.deleteSelection() }, ["Löschen"]));
      return;
    }
    const s = sel[0]; const o = GD.editor.findObj(fl, s.kind, s.id); if (!o) return buildFloorProps(box, fl);
    const commit = (fn) => { GD.state.commit(fn); GD.view2d.render(); };
    if (s.kind === "room") {
      box.appendChild(h("h3", {}, ["Raum"]));
      box.appendChild(field("Name", txt(o.name, v => commit(() => o.name = v))));
      box.appendChild(field("Deckenhöhe (m)", num(m(o.ceiling), v => commit(() => o.ceiling = v * 100))));
      const cp = h("input", { type: "color", value: o.color && o.color[0] === "#" ? o.color : "#ffffff" }); cp.addEventListener("input", () => commit(() => o.color = cp.value));
      box.appendChild(field("Bodenfarbe", cp));
      box.appendChild(h("p", { class: "ro" }, ["Fläche: " + (GD.geom.polygonArea(o.poly) / 10000).toFixed(2) + " m²  ·  Umfang: " + (GD.geom.polygonPerimeter(o.poly) / 100).toFixed(2) + " m"]));
    } else if (s.kind === "wall") {
      box.appendChild(h("h3", {}, ["Wand"]));
      box.appendChild(field("Wandstärke (cm)", num(o.thickness, v => commit(() => o.thickness = v), "1")));
      const wh = h("input", { type: "number", step: "1", placeholder: "auto", value: o.height ? o.height : "" });
      wh.addEventListener("change", () => { const v = parseFloat(wh.value); commit(() => o.height = (isFinite(v) && v > 0) ? v : null); });
      box.appendChild(field("Höhe (cm, leer = Geschoss)", wh));
      box.appendChild(h("p", { class: "ro" }, ["Länge: " + m(GD.geom.dist(o.a, o.b)) + " m"]));
    } else if (s.kind === "opening") {
      const isWin = GD.isWindow(o.type), odef = GD.openingDefs[o.type] || {};
      box.appendChild(h("h3", {}, [isWin ? "Fenster" : "Tür"]));
      const sel2 = h("select");
      GD.openingTypesByCat(GD.openingCat(o.type)).forEach(k => { const op = h("option", { value: k }, [GD.openingDefs[k].name]); if (o.type === k) op.selected = true; sel2.appendChild(op); });
      sel2.addEventListener("change", () => { GD.state.commit(() => GD.setOpeningType(o, sel2.value)); GD.view2d.render(); buildProps(); });
      box.appendChild(field("Typ", sel2));
      box.appendChild(field("Breite (m)", num(m(o.width), v => commit(() => o.width = v * 100))));
      if (isWin) {
        if (!odef.noSill) box.appendChild(field("Brüstungshöhe (m)", num(m(o.sill != null ? o.sill : 90), v => commit(() => o.sill = Math.max(0, v * 100)))));
        box.appendChild(field("Fensterhöhe (m)", num(m(o.height != null ? o.height : 120), v => commit(() => o.height = Math.max(10, v * 100)))));
      } else {
        box.appendChild(field("Türhöhe (m)", num(m(o.height != null ? o.height : 200), v => commit(() => o.height = Math.max(10, v * 100)))));
      }
      if (odef.hinge) {
        const sh = h("select"), slide = o.type === "door-slide";
        [["left", slide ? "schiebt nach links" : "links"], ["right", slide ? "schiebt nach rechts" : "rechts"]].forEach(([v, n]) => { const op = h("option", { value: v }, [n]); if ((o.hinge || "left") === v) op.selected = true; sh.appendChild(op); });
        sh.addEventListener("change", () => commit(() => o.hinge = sh.value));
        box.appendChild(field(slide ? "Schieberichtung" : "Anschlagseite", sh));
      }
      if (odef.dir) {
        const sd = h("select"); [["in", "nach innen"], ["out", "nach außen"]].forEach(([v, n]) => { const op = h("option", { value: v }, [n]); if ((o.dir || "in") === v) op.selected = true; sd.appendChild(op); });
        sd.addEventListener("change", () => commit(() => o.dir = sd.value));
        box.appendChild(field("Öffnungsrichtung", sd));
      }
    } else if (s.kind === "item") {
      box.appendChild(h("h3", {}, [GD.library.def(o.type).name]));
      box.appendChild(field("Breite (m)", num(m(o.w), v => commit(() => o.w = v * 100))));
      box.appendChild(field("Tiefe (m)", num(m(o.h), v => commit(() => o.h = v * 100))));
      box.appendChild(field("Höhe (m)", num(m(o.hh != null ? o.hh : 50), v => commit(() => o.hh = Math.max(0, v * 100)))));
      box.appendChild(field("Drehung (°)", num(o.rot, v => commit(() => o.rot = ((v % 360) + 360) % 360), "15")));
      box.appendChild(field("Beschriftung", txt(o.label, v => commit(() => o.label = v))));
    } else if (s.kind === "dim") {
      box.appendChild(h("h3", {}, ["Maßkette"]));
      box.appendChild(field("Versatz (cm)", num(o.offset, v => commit(() => o.offset = v), "5")));
      box.appendChild(h("p", { class: "ro" }, ["Länge: " + m(GD.geom.dist(o.a, o.b)) + " m"]));
    } else if (s.kind === "label") {
      box.appendChild(h("h3", {}, ["Text"]));
      box.appendChild(field("Text", txt(o.text, v => commit(() => o.text = v))));
      box.appendChild(field("Größe", num(o.size, v => commit(() => o.size = v), "1")));
      box.appendChild(field("Drehung (°)", num(o.rot, v => commit(() => o.rot = v), "15")));
    }
    box.appendChild(h("button", { class: "btn block danger", onclick: () => GD.editor.deleteSelection() }, ["Löschen (Entf)"]));
  }

  function buildFloorProps(box, fl) {
    box.appendChild(h("h3", {}, ["Projekt"]));
    box.appendChild(field("Projektname", txt(GD.state.project.name, v => { GD.state.project.name = v; GD.state.save(); })));
    box.appendChild(h("h3", { class: "mt" }, ["Aktuelles Geschoss"]));
    box.appendChild(field("Name", txt(fl.name, v => { GD.state.commit(() => fl.name = v); buildFloors(); })));
    box.appendChild(field("Wandhöhe (m)", num(m(fl.wallHeight), v => { GD.state.commit(() => fl.wallHeight = v * 100); })));
    box.appendChild(field("Sockelhöhe (m)", num(m(fl.elevation), v => { GD.state.commit(() => fl.elevation = v * 100); })));
    // Vorlage / Underlay
    box.appendChild(h("h3", { class: "mt" }, ["Vorlage (Hintergrundbild)"]));
    const u = fl.underlay;
    const chk = h("input", { type: "checkbox" }); chk.checked = !!(u && u.visible);
    chk.addEventListener("change", () => { GD.state.commit(() => u.visible = chk.checked); GD.view2d.render(); });
    box.appendChild(field("Einblenden", chk));
    if (u && u.src) {
      const op = h("input", { type: "range", min: 0, max: 100, value: Math.round((u.opacity || .5) * 100) }); op.addEventListener("input", () => { u.opacity = op.value / 100; GD.state.touch(); GD.view2d.render(); });
      box.appendChild(field("Transparenz", op));
      const sc = num(u.scale.toFixed(3), v => { GD.state.commit(() => u.scale = v); GD.view2d.render(); }, "0.01"); box.appendChild(field("Skalierung", sc));
    }
    box.appendChild(h("button", { class: "btn block", onclick: () => GD.io.importImageDialog() }, ["Bild laden…"]));
    // Dach
    if (!fl.roof) fl.roof = GD.make.floor().roof;
    const r = fl.roof;
    box.appendChild(h("h3", { class: "mt" }, ["Dach / Dachgeschoss"]));
    const re = h("input", { type: "checkbox" }); re.checked = !!r.enabled;
    re.addEventListener("change", () => { GD.state.commit(() => r.enabled = re.checked); rebuild3D(); GD.view2d.render(); buildProps(); });
    box.appendChild(field("Dach aktivieren", re));
    if (r.enabled) {
      const rt = h("select"); [["gable", "Satteldach"], ["hip", "Walmdach"], ["pent", "Pultdach"], ["flat", "Flachdach"]].forEach(([v, n]) => { const op = h("option", { value: v }, [n]); if (r.type === v) op.selected = true; rt.appendChild(op); });
      rt.addEventListener("change", () => { GD.state.commit(() => r.type = rt.value); rebuild3D(); GD.view2d.render(); });
      box.appendChild(field("Dachform", rt));
      box.appendChild(field("Firsthöhe (m)", num(m(r.height), v => { GD.state.commit(() => r.height = Math.max(0, v * 100)); rebuild3D(); })));
      box.appendChild(field("Dachüberstand (cm)", num(r.overhang, v => { GD.state.commit(() => r.overhang = Math.max(0, v)); rebuild3D(); GD.view2d.render(); }, "1")));
      const ra = h("select"); [["auto", "Automatisch"], ["x", "First längs (X)"], ["y", "First quer (Y)"]].forEach(([v, n]) => { const op = h("option", { value: v }, [n]); if ((r.ridge || "auto") === v) op.selected = true; ra.appendChild(op); });
      ra.addEventListener("change", () => { GD.state.commit(() => r.ridge = ra.value); rebuild3D(); GD.view2d.render(); });
      box.appendChild(field("Firstrichtung", ra));
      const rc = h("input", { type: "color", value: r.color || "#9a4a3a" }); rc.addEventListener("input", () => { GD.state.commit(() => r.color = rc.value); rebuild3D(); });
      box.appendChild(field("Dachfarbe", rc));
      box.appendChild(h("p", { class: "ro" }, ["Im 3D-Tab sichtbar (Dachform & Neigung)."]));
    }
    box.appendChild(h("h3", { class: "mt" }, ["Geschoss"]));
    if (fl.templateKey) box.appendChild(h("button", { class: "btn block", onclick: resetFloor }, ["Auf Vorlage zurücksetzen"]));
    box.appendChild(h("button", { class: "btn block danger", onclick: deleteFloor }, ["Geschoss löschen"]));
  }
  function rebuild3D() { if (mode3d) GD.view3d.build(); }
  function resetFloor() {
    const fl = GD.state.activeFloor(); if (!fl.templateKey) return;
    if (!confirm("Geschoss auf Vorlage zurücksetzen? Änderungen gehen verloren.")) return;
    GD.state.commitStructure(() => { const fresh = GD.templates.buildFloor(fl.templateKey); fresh.id = fl.id; const idx = GD.state.project.floors.findIndex(f => f.id === fl.id); GD.state.project.floors[idx] = fresh; });
    refreshAll(); GD.view2d.fit();
  }
  function deleteFloor() {
    if (GD.state.project.floors.length <= 1) return toast("Mindestens ein Geschoss nötig");
    const fl = GD.state.activeFloor(); if (!confirm("Geschoss „" + fl.name + "“ löschen?")) return;
    GD.state.commitStructure(() => { GD.state.project.floors = GD.state.project.floors.filter(f => f.id !== fl.id); GD.state.project.activeFloorId = GD.state.project.floors[0].id; });
    refreshAll(); GD.view2d.fit();
  }

  /* ---------- Menüs (Topbar Dropdowns) ---------- */
  function menu(label, items) {
    const drop = h("div", { class: "menu-drop" });
    items.forEach(it => { if (it === "-") return drop.appendChild(h("div", { class: "cm-sep" })); drop.appendChild(h("div", { class: "menu-item" + (it.danger ? " danger" : ""), onclick: () => { closeMenus(); it.act(); } }, [it.label + (it.sc ? "  " : ""), it.sc ? h("span", { class: "cm-sc" }, [it.sc]) : ""].filter(Boolean))); });
    const btn = h("button", { class: "menu-btn", onclick: (e) => { e.stopPropagation(); const open = drop.classList.contains("open"); closeMenus(); if (!open) drop.classList.add("open"); } }, [label]);
    return h("div", { class: "menu" }, [btn, drop]);
  }
  function closeMenus() { $$(".menu-drop.open").forEach(d => d.classList.remove("open")); }

  function buildMenubar() {
    const bar = $("#menubar"); bar.innerHTML = "";
    bar.appendChild(menu("Datei", [
      { label: "Neu (Vorlage)", act: newProject },
      { label: "Importieren… (JSON/DXF/SVG/OBJ)", act: () => GD.io.importDialog() },
      { label: "OBJ importieren (3D → Grundriss)…", act: () => GD.io.pickFile(".obj", (d) => GD.io.importOBJ(d)) },
      { label: "Bild als Vorlage…", act: () => GD.io.importImageDialog() },
      "-",
      { label: "Projekt speichern (JSON)", act: () => GD.io.exportJSON() },
    ]));
    bar.appendChild(menu("Export", [
      { label: "PNG-Bild", act: () => GD.io.exportPNG(false) },
      { label: "JPG-Bild", act: () => GD.io.exportPNG(true) },
      { label: "SVG (Vektor)", act: () => GD.io.exportSVG() },
      { label: "PDF (maßstäblich)", act: () => GD.io.exportPDF() },
      "-",
      { label: "DXF (CAD)", act: () => GD.io.exportDXF() },
      { label: "OBJ (3D)", act: () => GD.io.exportOBJ() },
      { label: "glTF (3D)", act: () => GD.io.exportGLTF() },
    ]));
    bar.appendChild(menu("Bearbeiten", [
      { label: "Rückgängig", sc: "Strg+Z", act: () => GD.state.undo() },
      { label: "Wiederholen", sc: "Strg+Y", act: () => GD.state.redo() },
      "-",
      { label: "Duplizieren", sc: "Strg+D", act: () => GD.editor.duplicateSelection() },
      { label: "Löschen", sc: "Entf", act: () => GD.editor.deleteSelection() },
    ]));
    bar.appendChild(menu("Ansicht", [
      { label: "Einpassen", act: () => GD.view2d.fit() },
      { label: "Raster ein/aus", act: () => { GD.state.project.settings.showGrid = !GD.state.project.settings.showGrid; GD.state.save(); GD.view2d.render(); } },
      { label: "Bemaßung (innen + außen) ein/aus", act: () => { const s = GD.state.project.settings; s.showDims = !s.showDims; GD.state.save(); GD.view2d.render(); toast("Bemaßung: " + (s.showDims ? "an" : "aus")); } },
      { label: "Nachbargeschoss einblenden", act: () => { const s = GD.state.project.settings; s.showGhost = !s.showGhost; GD.state.save(); GD.view2d.render(); toast("Nachbargeschoss: " + (s.showGhost ? "an" : "aus")); } },
      { label: "Ortho-Fang ein/aus", act: () => { GD.state.project.settings.ortho = !GD.state.project.settings.ortho; GD.state.save(); toast("Ortho: " + (GD.state.project.settings.ortho ? "an" : "aus")); } },
    ]));
    document.addEventListener("click", closeMenus);
  }
  function newProject() { if (!confirm("Neues Projekt aus Vorlage? Aktuelles wird ersetzt.")) return; GD.state.replaceProject(GD.templates.buildDefaultProject()); GD.view2d.fit(); refreshAll(); }

  /* ---------- 2D/3D ---------- */
  let mode3d = false;
  function setView(threeD) {
    mode3d = threeD;
    $("#canvasWrap").style.display = threeD ? "none" : "block";
    $("#view3dWrap").style.display = threeD ? "block" : "none";
    $("#tab2d").classList.toggle("active", !threeD); $("#tab3d").classList.toggle("active", threeD);
    $("#toolbar").style.display = threeD ? "none" : "flex";
    $("#d3controls").style.display = threeD ? "flex" : "none";
    if (threeD) { GD.view3d.init($("#view3d")); GD.view3d.show(); } else { GD.view3d.hide(); GD.view2d.render(); }
  }

  /* ---------- Design-Themes ---------- */
  const THEMES = {
    midnight: { name: "Mitternacht", base: "dark", swatch: ["#0e1117", "#4f8cff"], vars: { bg: "#0e1117", panel: "#161b24", elev: "#1d2430", elev2: "#242c3a", border: "#2a3340", "border-soft": "#222a36", txt: "#e6eaf0", "txt-dim": "#8b95a5", "txt-soft": "#aab3c2", accent: "#4f8cff" } },
    graphite: { name: "Graphit", base: "dark", swatch: ["#15171a", "#e0823a"], vars: { bg: "#141618", panel: "#1c1f23", elev: "#24282d", elev2: "#2e333a", border: "#33383f", "border-soft": "#272b30", txt: "#eceef0", "txt-dim": "#9aa0a8", "txt-soft": "#bcc2ca", accent: "#e0823a" } },
    emerald: { name: "Smaragd", base: "dark", swatch: ["#0d1714", "#2fd6a0"], vars: { bg: "#0c1512", panel: "#121d19", elev: "#172621", elev2: "#1d2f29", border: "#243a33", "border-soft": "#1c2d28", txt: "#e4efea", "txt-dim": "#82998f", "txt-soft": "#a7bdb3", accent: "#2fd6a0" } },
    nordic: { name: "Nordlicht", base: "dark", swatch: ["#0f1620", "#56b6e6"], vars: { bg: "#0e1620", panel: "#141d2a", elev: "#1a2636", elev2: "#213044", border: "#2a3a50", "border-soft": "#202d3e", txt: "#e3ecf5", "txt-dim": "#8493a6", "txt-soft": "#a8b7c9", accent: "#56b6e6" } },
    plum: { name: "Pflaume", base: "dark", swatch: ["#16111d", "#b07cff"], vars: { bg: "#15101d", panel: "#1d1729", elev: "#251e34", elev2: "#2f2742", border: "#392f4f", "border-soft": "#2a2340", txt: "#ece6f5", "txt-dim": "#9889ad", "txt-soft": "#bcadd0", accent: "#b07cff" } },
    paper: { name: "Papier", base: "light", swatch: ["#eef1f5", "#3b7ddd"], vars: { bg: "#eaedf2", panel: "#ffffff", elev: "#f5f7fb", elev2: "#eef1f6", border: "#d7dce4", "border-soft": "#e3e7ee", txt: "#1c2533", "txt-dim": "#6b7686", "txt-soft": "#445065", accent: "#3b7ddd" } },
    sand: { name: "Sand", base: "light", swatch: ["#f3ede2", "#c2683a"], vars: { bg: "#f0e9dc", panel: "#fbf7ef", elev: "#f3ecdf", elev2: "#ece2d0", border: "#ddd0bb", "border-soft": "#e7dccb", txt: "#3a3026", "txt-dim": "#8a7a64", "txt-soft": "#5f5240", accent: "#c2683a" } },
  };

  function applyTheme() {
    const s = GD.state.project.settings;
    if (!s.themePreset || !THEMES[s.themePreset]) s.themePreset = (s.theme === "light") ? "paper" : "midnight";
    const p = THEMES[s.themePreset];
    const root = document.documentElement;
    root.setAttribute("data-theme", p.base);
    for (const k in p.vars) root.style.setProperty("--" + k, p.vars[k]);
    if (s.accent) root.style.setProperty("--accent", s.accent);
  }
  function setThemePreset(key) {
    const s = GD.state.project.settings;
    s.themePreset = key; s.accent = THEMES[key].vars.accent; s.theme = THEMES[key].base;
    GD.state.save(); applyTheme();
    const keys = Object.keys(THEMES);
    $$("#designPanel .theme-card").forEach((c, i) => c.classList.toggle("active", keys[i] === key));
    const ac = $("#designPanel input[type=color]"); if (ac) ac.value = s.accent;
  }
  function buildDesignPanel() {
    const box = $("#designPanel"); if (!box) return; box.innerHTML = "";
    box.appendChild(h("div", { class: "design-head" }, ["Design-Konzept"]));
    const grid = h("div", { class: "theme-grid" });
    const cur = GD.state.project.settings.themePreset;
    Object.keys(THEMES).forEach(k => {
      const t = THEMES[k];
      const card = h("button", { class: "theme-card" + (k === cur ? " active" : ""), title: t.name, onclick: () => setThemePreset(k) }, [
        h("span", { class: "theme-swatch", style: `background:${t.swatch[0]}` }, [h("span", { class: "theme-dot", style: `background:${t.swatch[1]}` })]),
        h("span", { class: "theme-name" }, [t.name]),
      ]);
      grid.appendChild(card);
    });
    box.appendChild(grid);
    const accentRow = h("div", { class: "design-accent" });
    const ac = h("input", { type: "color", value: GD.state.project.settings.accent || "#4f8cff" });
    ac.addEventListener("input", () => { GD.state.project.settings.accent = ac.value; GD.state.save(); applyTheme(); });
    accentRow.appendChild(h("span", {}, ["Akzentfarbe"])); accentRow.appendChild(ac);
    box.appendChild(accentRow);
  }

  function buildSettingsBar() {
    $("#zoomIn").onclick = () => GD.view2d.zoomBy(1.2);
    $("#zoomOut").onclick = () => GD.view2d.zoomBy(1 / 1.2);
    $("#zoomFit").onclick = () => GD.view2d.fit();
    const dWrap = $("#designWrap"), dBtn = $("#designBtn"), dPanel = $("#designPanel");
    dBtn.onclick = (e) => { e.stopPropagation(); dWrap.classList.toggle("open"); };
    document.addEventListener("click", (e) => { if (!dWrap.contains(e.target)) dWrap.classList.remove("open"); });
    buildDesignPanel();
    $("#togglePanel").onclick = () => $("#sidebar").classList.toggle("collapsed");
  }

  /* ---------- Status ---------- */
  function updateStatus() {
    const fl = GD.state.activeFloor();
    const area = fl.rooms.reduce((a, r) => a + GD.geom.polygonArea(r.poly), 0) / 10000;
    $("#status").textContent = `${fl.name} · ${fl.rooms.length} Räume · ${fl.walls.length} Wände · ${area.toFixed(1)} m² · Zoom ${Math.round(GD.view2d.view.scale / 0.55 * 100)}%`;
    $("#undoBtn").disabled = !GD.state.canUndo(); $("#redoBtn").disabled = !GD.state.canRedo();
  }

  function refreshAll() { applyTheme(); buildFloors(); syncTool(); renderSide(); updateStatus(); }

  /* ---------- Init ---------- */
  function init() {
    GD.state.init();
    GD.view2d.init($("#canvas"), $("#canvasWrap"));
    GD.editor.init($("#canvas"), $("#canvasWrap"));
    buildMenubar(); buildToolbar(); buildSettingsBar();
    $("#tab2d").onclick = () => setView(false);
    $("#tab3d").onclick = () => setView(true);
    $("#undoBtn").onclick = () => GD.state.undo(); $("#redoBtn").onclick = () => GD.state.redo();
    $("#d3mode").onchange = (e) => GD.view3d.setMode(e.target.value);
    $("#d3rebuild").onclick = () => GD.view3d.build();
    $$("#sideTabs .side-tab").forEach(b => b.onclick = () => openTab(b.dataset.tab));

    GD.state.on("change", () => { GD.state.save && 0; updateStatus(); });
    GD.state.on("structure", () => { buildFloors(); });
    GD.state.on("rerender", () => { GD.view2d.render(); buildFloors(); renderSide(); updateStatus(); if (mode3d) GD.view3d.build(); });
    GD.state.on("selection", () => { if (sideTab === "props") buildProps(); updateStatus(); });
    GD.state.on("tool", () => { syncTool(); });
    GD.state.on("zoom", updateStatus);
    GD.state.on("edit-selected", () => { openTab("props"); });

    applyTheme(); buildFloors(); buildLibrary(); openTab("props");
    GD.view2d.fit(); updateStatus();
    $("#canvasWrap").addEventListener("wheel", (e) => { e.preventDefault(); const px = GD.view2d.svgPoint(e); GD.view2d.zoomAt(px[0], px[1], e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });
    window.addEventListener("resize", () => { GD.view2d.render(); if (mode3d) GD.view3d.onResize(); });
  }

  return { init, toast, refreshAll, buildProps, buildLibrary };
})();

window.addEventListener("DOMContentLoaded", () => GD.ui.init());
