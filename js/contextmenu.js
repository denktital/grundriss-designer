"use strict";
/* Kontextmenü (Rechtsklick) für Objektbearbeitung */
window.GD = window.GD || {};

GD.contextmenu = (function () {
  let menu;
  function ensure() {
    if (menu) return;
    menu = document.createElement("div");
    menu.className = "context-menu";
    menu.style.display = "none";
    document.body.appendChild(menu);
    document.addEventListener("pointerdown", (e) => { if (menu && !menu.contains(e.target)) hide(); });
    window.addEventListener("blur", hide);
  }
  function hide() { if (menu) menu.style.display = "none"; }

  function build(hit) {
    const E = GD.editor, fl = GD.state.activeFloor();
    const items = [];
    const sel = E.selected;
    const kind = hit ? hit.kind : (sel[0] && sel[0].kind);

    if (kind) {
      items.push({ label: "Eigenschaften…", ic: "✎", act: () => GD.state.emit("edit-selected") });
      items.push({ sep: 1 });
    }
    if (kind === "item") {
      items.push({ label: "90° drehen", ic: "⟳", act: () => E.rotateSelection(90) });
      items.push({ label: "Duplizieren", ic: "⧉", sc: "Strg+D", act: () => E.duplicateSelection() });
    } else if (kind === "opening") {
      const o = fl.openings.find(x => sel.some(s => s.id === x.id));
      const cat = o ? GD.openingCat(o.type) : "door";
      if (cat === "door") items.push({ label: "Anschlag spiegeln", ic: "⇋", act: () => E.flipOpening() });
      GD.openingTypesByCat(cat).forEach(tp => {
        items.push({ label: GD.openingDefs[tp].name, ic: o && o.type === tp ? "●" : "○", act: () => changeOpeningType(tp) });
      });
    } else if (kind === "room") {
      items.push({ label: "Umbenennen…", ic: "✎", act: () => renameRoom() });
      items.push({ label: "Bodenfarbe…", ic: "🎨", act: () => colorRoom() });
      items.push({ label: "Duplizieren", ic: "⧉", act: () => E.duplicateSelection() });
    } else if (kind === "wall") {
      items.push({ label: "Wandstärke…", ic: "▭", act: () => wallThickness() });
      items.push({ label: "Duplizieren", ic: "⧉", act: () => E.duplicateSelection() });
    } else if (kind === "electrical") {
      items.push({ label: "90° drehen", ic: "⟳", act: () => E.rotateSelection(90) });
      items.push({ label: "Duplizieren", ic: "⧉", sc: "Strg+D", act: () => E.duplicateSelection() });
    } else if (kind === "wire") {
      items.push({ label: "Leitung umtypen", ic: "⇋", act: () => { const fl2 = GD.state.activeFloor(); GD.state.commit(() => sel.forEach(s => { if (s.kind === "wire") { const w = fl2.wires.find(x => x.id === s.id); if (w) w.kind = w.kind === "light" ? "power" : "light"; } })); GD.view2d.render(); } });
    }
    if (kind) {
      items.push({ sep: 1 });
      items.push({ label: "Löschen", ic: "🗑", sc: "Entf", danger: 1, act: () => E.deleteSelection() });
    }
    if (!kind) {
      items.push({ label: "Alles auswählen", ic: "▦", act: () => selectAll() });
      items.push({ label: GD.state.project.settings.showGrid ? "Raster aus" : "Raster an", ic: "▦", act: () => { GD.state.project.settings.showGrid = !GD.state.project.settings.showGrid; GD.state.save(); GD.view2d.render(); } });
      items.push({ label: "Ansicht einpassen", ic: "⤢", act: () => GD.view2d.fit() });
    }
    return items;
  }

  function open(x, y, hit) {
    ensure();
    menu.innerHTML = "";
    for (const it of build(hit)) {
      if (it.sep) { const d = document.createElement("div"); d.className = "cm-sep"; menu.appendChild(d); continue; }
      const row = document.createElement("div");
      row.className = "cm-item" + (it.danger ? " danger" : "");
      row.innerHTML = `<span class="cm-ic">${it.ic || ""}</span><span class="cm-lbl">${it.label}</span>${it.sc ? `<span class="cm-sc">${it.sc}</span>` : ""}`;
      row.onclick = () => { hide(); it.act(); };
      menu.appendChild(row);
    }
    menu.style.display = "block";
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.min(x, window.innerWidth - mw - 6) + "px";
    menu.style.top = Math.min(y, window.innerHeight - mh - 6) + "px";
  }

  /* Aktionen */
  function changeOpeningType(tp) {
    const fl = GD.state.activeFloor();
    GD.state.commit(() => {
      GD.editor.selected.forEach(s => {
        if (s.kind !== "opening") return;
        GD.setOpeningType(fl.openings.find(x => x.id === s.id), tp);
      });
    });
    GD.view2d.render();
    if (GD.ui && GD.ui.buildProps) GD.ui.buildProps();
  }
  function renameRoom() {
    const fl = GD.state.activeFloor(); const s = GD.editor.selected.find(s => s.kind === "room"); if (!s) return;
    const r = fl.rooms.find(x => x.id === s.id); const n = prompt("Raumname:", r.name); if (n != null) { GD.state.commit(() => r.name = n); GD.view2d.render(); }
  }
  function colorRoom() {
    const fl = GD.state.activeFloor(); const s = GD.editor.selected.find(s => s.kind === "room"); if (!s) return;
    const r = fl.rooms.find(x => x.id === s.id); const c = prompt("Bodenfarbe (Hex, z.B. #eaf2ff):", r.color || "#ffffff"); if (c) { GD.state.commit(() => r.color = c); GD.view2d.render(); }
  }
  function wallThickness() {
    const fl = GD.state.activeFloor();
    const cur = (() => { const s = GD.editor.selected.find(s => s.kind === "wall"); return s ? fl.walls.find(w => w.id === s.id).thickness : 18; })();
    const t = parseFloat(prompt("Wandstärke (cm):", cur)); if (!isNaN(t) && t > 0) { GD.state.commit(() => GD.editor.selected.forEach(s => { if (s.kind === "wall") fl.walls.find(w => w.id === s.id).thickness = t; })); GD.view2d.render(); }
  }
  function selectAll() {
    const fl = GD.state.activeFloor(); const sel = [];
    if (GD.state.project.settings.activeLayer === "electrical") {
      fl.electrical.forEach(e => sel.push({ kind: "electrical", id: e.id }));
      fl.wires.forEach(w => sel.push({ kind: "wire", id: w.id }));
    } else {
      fl.rooms.forEach(r => sel.push({ kind: "room", id: r.id }));
      fl.walls.forEach(w => sel.push({ kind: "wall", id: w.id }));
      fl.furniture.forEach(i => sel.push({ kind: "item", id: i.id }));
    }
    GD.editor.setSelection(sel);
  }

  return { open, hide };
})();
