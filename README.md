# Grundriss-Designer

Ein professionelles, vollständig im Browser laufendes Tool zum Erstellen und Bearbeiten von
Grundrissen – ohne Backend, ohne Build-Schritt, ohne Installation.

**Live:** https://denktital.github.io/grundriss-designer/

## Funktionen

- **2D-Editor** – Wände und Räume frei zeichnen (mit Raster-/Kanten-/Ortho-Fang, gekoppelte Wände),
  Türen & Fenster (Dreh-, Doppel-, Schiebetür), Möbel- & Sanitär-Bibliothek mit Suche,
  freie Bemaßung, Textlabels, automatische Flächen-/Umfangberechnung.
- **Höhen für alles** – Wandhöhe, Fenster (Brüstung + Höhe), Türhöhe, Möbelhöhe.
- **3D-Ansicht** – ganzes Geschoss oder gesamtes Objekt als extrudiertes Modell mit ausgesparten
  Öffnungen, Böden, Möbeln und konfigurierbarem **Dach** (Sattel-, Walm-, Pult-, Flachdach).
- **Mehrere Geschosse**, gestapelt nach Sockelhöhe.
- **Kontextmenü** (Rechtsklick) für schnelle Objektbearbeitung.
- **Design** – mehrere Theme-Presets (hell/dunkel) und frei wählbare Akzentfarbe.
- **Import:** DXF, SVG, OBJ (3D → Grundriss, mit Maß-Interpretation), Bild-Vorlage, Projekt-JSON.
- **Export:** PNG, JPG, SVG, PDF (maßstäblich), DXF, OBJ, glTF, Projekt-JSON.
- **Auto-Speichern** im Browser (`localStorage`).

## Nutzung

Einfach die Live-URL öffnen. Projekte werden lokal im Browser gespeichert; zum Weitergeben über
**Export → Projekt-JSON** sichern und bei Bedarf wieder importieren.

## Lokal ausführen

Reine statische Dateien – für vollen Funktionsumfang über einen kleinen HTTP-Server starten:

```bash
node server.js     # -> http://localhost:8770
# oder:  python3 -m http.server 8770
```

(Direktes Öffnen von `index.html` per Doppelklick funktioniert weitgehend, einzelne Browser
beschränken bei `file://` aber Bild-/PDF-Export.)

## Technik

Vanilla JavaScript + SVG für den 2D-Plan, [Three.js](https://threejs.org/) für die 3D-Ansicht,
[jsPDF](https://github.com/parallax/jsPDF) für PDF-Export. Alle Bibliotheken liegen lokal unter
`lib/`, es werden keine externen Dienste aufgerufen.

## Hinweis

Die optionale „Vorlage"-Einblendung erwartet Hintergrundbilder im Projektordner; eigene Pläne
lassen sich jederzeit über **Bild laden…** als Vorlage einbinden.
