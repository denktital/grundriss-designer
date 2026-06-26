# Auto-Räume aus Wänden

## Ziel
Räume sind keine manuell gezeichneten Polygone mehr, sondern werden **live aus dem
Wandverlauf abgeleitet**. Ziehen von Wänden/Ecken verändert die Räume automatisch.
Eigenschaften (Name, Deckenhöhe, Bodenfarbe) hängen an **Raum-Stempeln**.

## Entscheidungen (mit Nutzer geklärt)
- **Voll automatisch** — Räume = geschlossene Flächen zwischen Wänden; manuelles
  Raum-Polygon-Werkzeug entfällt.
- **Raum-Stempel** — pro Fläche ein verschiebbarer Marker mit Name/Höhe/Farbe.
- **Altprojekte migrieren** — bestehende Räume werden beim Laden zu Stempeln.

## Datenmodell (`js/core.js`)
- Neu: `floor.roomMarkers: []` → `{ id, x, y, name, ceiling, color }` (persistent,
  Quelle der Wahrheit für Raumeigenschaften).
- `floor.rooms` wird **berechneter Cache** (von `GD.rooms.derive` befüllt), behält die
  bisherige Form `{ id, poly, name, ceiling, color, markerId }`, damit Elektro-Generator,
  Export, 3D und Bemaßung unverändert weiterlaufen.
- `GD.make.roomMarker(x, y, name)` Factory.

## Modul `js/rooms.js` (`GD.rooms`) — NEU
- `derive(floor)`:
  1. Wandsegmente sammeln; an allen Kreuzungen und T-Stößen splitten (Punkt liegt auf
     fremdem Segment → splitten).
  2. Knoten (quantisierte Koordinaten) + Halbkanten-Graph bauen; ausgehende Kanten je
     Knoten nach Winkel sortieren.
  3. Flächen-Traversierung: jede gerichtete Halbkante einmal; am Zielknoten die nächste
     Kante als „schärfster Rechtsknick" (nächste im Uhrzeigersinn) wählen, bis Start
     erreicht.
  4. Vorzeichen-Fläche je Loop; **äußere (unbegrenzte) Fläche verwerfen** (größte Fläche
     bzw. falsche Orientierung in y-Down-Koordinaten).
  5. Jede Innenfläche bekommt Daten vom Stempel, der in ihr liegt (`pointInPoly`).
     Fläche ohne Stempel → automatisch Stempel „Raum N" am Schwerpunkt anlegen.
  6. `floor.rooms` setzen.
- `migrate(floor)`: hat `floor.rooms` Legacy-Polygone und keine `roomMarkers` → je alten
  Raum einen Stempel am Schwerpunkt (Name/Höhe/Farbe) anlegen, dann `derive`.
- Aufruf von `derive` bei jeder strukturellen Änderung: in `commitStructure`, beim
  Projekt-Laden (`replaceProject`/`load`) und defensiv zu Beginn von `view2d.render`.

## Rendering (`js/view2d.js`)
- Raumfüllung + Raum-Badge (Name/Fläche) wie bisher aus `floor.rooms`.
- Badge sitzt an der Stempel-Position und ist das **Stempel-Handle** (auswählbar, ziehbar).
- Marker zeichnen (kind `roomMarker`), Selektion über bestehende `.sel`-Logik.

## Werkzeuge & Interaktion (`js/tools.js`)
- „room"-Draft-Werkzeug entfernen.
- Klick in eine Raumfläche selektiert deren `roomMarker`.
- `roomMarker` ist verschiebbar (re-bindet an die Fläche, in der er landet → `derive`).
- `findObj`: `roomMarker: fl.roomMarkers`. Delete/Duplicate/Nudge/Marquee um `roomMarker`.
- Wand-/Ecken-Ziehen unverändert (verbundene Endpunkte bewegen sich mit); danach `derive`.

## UI (`js/app.js`, `js/contextmenu.js`, `index.html`)
- Toolbar ohne „Raum (P)".
- Eigenschaften-Panel `roomMarker`: Name, Deckenhöhe, Bodenfarbe; read-only Fläche/Umfang
  aus der zugehörigen abgeleiteten Fläche.
- Kontextmenü: Umbenennen / Bodenfarbe am Marker.
- `index.html`: `<script src="js/rooms.js">` vor `app.js`.

## Vereinfachungen (v1, bewusst)
- Räume auf **Wand-Mittellinien** (wie bestehende Vorlagen), nicht lichte Innenkante.
- Nicht geschlossene Wandzüge → dort kein Raum.

## Verifikation
- Headless: `rooms.js` mit Standard-Projekt laden, `derive` → erwartete Raumzahl je
  Geschoss (EG 5–7, OG 6–7), keine NaN-Polygone, äußere Fläche fehlt.
- Browser: Wand-Ecke ziehen → Raum ändert Größe/Fläche live; Stempel umbenennen →
  Elektro-Generator erkennt Raumtyp weiter; Altprojekt lädt mit korrekten Namen.
