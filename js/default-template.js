"use strict";
/* Fest hinterlegte Standard-Vorlage (Quelle: Grundriss EG/OG). Wird beim
   ersten Start und bei „Neues Projekt aus Vorlage“ geladen. */
window.GD = window.GD || {};
GD.DEFAULT_PROJECT = {
  "name": "Grundriss EG/OG",
  "floors": [
    {
      "id": "floor_eg",
      "name": "Erdgeschoss",
      "elevation": 0,
      "wallHeight": 250,
      "walls": [
        {
          "id": "w_eg_n",
          "a": {
            "x": 0,
            "y": 0
          },
          "b": {
            "x": 770,
            "y": 0
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_eg_e",
          "a": {
            "x": 770,
            "y": 0
          },
          "b": {
            "x": 770,
            "y": 620
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_eg_s",
          "a": {
            "x": 0,
            "y": 620
          },
          "b": {
            "x": 770,
            "y": 620
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_eg_wup",
          "a": {
            "x": 0,
            "y": 0
          },
          "b": {
            "x": 0,
            "y": 315
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_eg_kw",
          "a": {
            "x": 335,
            "y": 0
          },
          "b": {
            "x": 335,
            "y": 315
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_eg_cross",
          "a": {
            "x": 0,
            "y": 315
          },
          "b": {
            "x": 490,
            "y": 315
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_eg_tb",
          "a": {
            "x": 280,
            "y": 315
          },
          "b": {
            "x": 280,
            "y": 620
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_eg_bw",
          "a": {
            "x": 490,
            "y": 315
          },
          "b": {
            "x": 490,
            "y": 620
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_eg_dieletop",
          "a": {
            "x": -180,
            "y": 260
          },
          "b": {
            "x": 0,
            "y": 260
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_eg_winterdiele",
          "a": {
            "x": -180,
            "y": 260
          },
          "b": {
            "x": -180,
            "y": 620
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_eg_dieles",
          "a": {
            "x": -180,
            "y": 620
          },
          "b": {
            "x": 0,
            "y": 620
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_eg_wintertop",
          "a": {
            "x": -470,
            "y": 260
          },
          "b": {
            "x": -180,
            "y": 260
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_eg_winterw",
          "a": {
            "x": -470,
            "y": 260
          },
          "b": {
            "x": -470,
            "y": 620
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_eg_winters",
          "a": {
            "x": -470,
            "y": 620
          },
          "b": {
            "x": -180,
            "y": 620
          },
          "thickness": 18,
          "height": null
        }
      ],
      "rooms": [
        {
          "id": "room-rm_185f24",
          "markerId": "rm_185f24",
          "name": "Küche",
          "ceiling": 215,
          "color": "#ffffff",
          "poly": [
            {
              "x": 0,
              "y": 0
            },
            {
              "x": 335,
              "y": 0
            },
            {
              "x": 335,
              "y": 315
            },
            {
              "x": 280,
              "y": 315
            },
            {
              "x": 0,
              "y": 315
            },
            {
              "x": 0,
              "y": 260
            }
          ]
        },
        {
          "id": "room-rm_186f24",
          "markerId": "rm_186f24",
          "name": "Wohn- / Essbereich",
          "ceiling": 215,
          "color": "#ffffff",
          "poly": [
            {
              "x": 335,
              "y": 0
            },
            {
              "x": 770,
              "y": 0
            },
            {
              "x": 770,
              "y": 620
            },
            {
              "x": 490,
              "y": 620
            },
            {
              "x": 490,
              "y": 315
            },
            {
              "x": 335,
              "y": 315
            }
          ]
        },
        {
          "id": "room-rm_187f24",
          "markerId": "rm_187f24",
          "name": "Treppe",
          "ceiling": 225,
          "color": "#ffffff",
          "poly": [
            {
              "x": 280,
              "y": 620
            },
            {
              "x": 0,
              "y": 620
            },
            {
              "x": -180,
              "y": 620
            },
            {
              "x": -180,
              "y": 260
            },
            {
              "x": 0,
              "y": 260
            },
            {
              "x": 0,
              "y": 315
            },
            {
              "x": 280,
              "y": 315
            }
          ]
        },
        {
          "id": "room-rm_188f24",
          "markerId": "rm_188f24",
          "name": "Bad / Dusche",
          "ceiling": 210,
          "color": "#ffffff",
          "poly": [
            {
              "x": 490,
              "y": 620
            },
            {
              "x": 280,
              "y": 620
            },
            {
              "x": 280,
              "y": 315
            },
            {
              "x": 335,
              "y": 315
            },
            {
              "x": 490,
              "y": 315
            }
          ]
        },
        {
          "id": "room-rm_190f24",
          "markerId": "rm_190f24",
          "name": "Eingang / Wintergarten",
          "ceiling": 225,
          "color": "#ffffff",
          "poly": [
            {
              "x": -180,
              "y": 260
            },
            {
              "x": -180,
              "y": 620
            },
            {
              "x": -470,
              "y": 620
            },
            {
              "x": -470,
              "y": 260
            }
          ]
        }
      ],
      "openings": [
        {
          "id": "op_floor_eg_1",
          "wallId": "w_eg_n",
          "pos": 190,
          "type": "window",
          "width": 75,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        },
        {
          "id": "op_floor_eg_2",
          "wallId": "w_eg_n",
          "pos": 396,
          "type": "window",
          "width": 90,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        },
        {
          "id": "op_floor_eg_3",
          "wallId": "w_eg_n",
          "pos": 609,
          "type": "window",
          "width": 90,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        },
        {
          "id": "op_floor_eg_4",
          "wallId": "w_eg_e",
          "pos": 195,
          "type": "window",
          "width": 75,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        },
        {
          "id": "op_floor_eg_5",
          "wallId": "w_eg_e",
          "pos": 469,
          "type": "window",
          "width": 75,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        },
        {
          "id": "op_floor_eg_6",
          "wallId": "w_eg_s",
          "pos": 436,
          "type": "window",
          "width": 80,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        },
        {
          "id": "op_floor_eg_7",
          "wallId": "w_eg_wup",
          "pos": 145,
          "type": "window",
          "width": 55,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        },
        {
          "id": "op_floor_eg_8",
          "wallId": "w_eg_kw",
          "pos": 228,
          "type": "door-single",
          "width": 80,
          "hinge": "left",
          "dir": "in",
          "sill": 0,
          "height": 200
        },
        {
          "id": "op_floor_eg_9",
          "wallId": "w_eg_cross",
          "pos": 241,
          "type": "door-single",
          "width": 80,
          "hinge": "left",
          "dir": "in",
          "sill": 0,
          "height": 200
        },
        {
          "id": "op_floor_eg_10",
          "wallId": "w_eg_tb",
          "pos": 150,
          "type": "door-single",
          "width": 80,
          "hinge": "left",
          "dir": "in",
          "sill": 0,
          "height": 200
        },
        {
          "id": "op_floor_eg_11",
          "wallId": "w_eg_winterdiele",
          "pos": 270,
          "type": "door-single",
          "width": 100,
          "hinge": "right",
          "dir": "out",
          "sill": 0,
          "height": 200
        },
        {
          "id": "op_floor_eg_12",
          "wallId": "w_eg_wintertop",
          "pos": 100,
          "type": "window",
          "width": 200,
          "hinge": "left",
          "dir": "in",
          "sill": 0,
          "height": 225
        },
        {
          "id": "op_floor_eg_13",
          "wallId": "w_eg_winterw",
          "pos": 180,
          "type": "window",
          "width": 335,
          "hinge": "left",
          "dir": "in",
          "sill": 0,
          "height": 225
        },
        {
          "id": "op_19786x",
          "wallId": "w_eg_winters",
          "pos": 100,
          "type": "window",
          "width": 200,
          "hinge": "left",
          "dir": "in",
          "sill": 0,
          "height": 225
        },
        {
          "id": "op_1990s6",
          "wallId": "w_eg_winterdiele",
          "pos": 104.05605884308513,
          "type": "window",
          "width": 100,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        }
      ],
      "furniture": [
        {
          "id": "item_floor_eg_21",
          "type": "stairs",
          "x": 100,
          "y": 400,
          "rot": 90,
          "w": 130,
          "h": 200,
          "hh": 0,
          "label": ""
        }
      ],
      "dims": [],
      "labels": [],
      "roof": {
        "enabled": false,
        "type": "gable",
        "height": 200,
        "overhang": 35,
        "ridge": "auto",
        "color": "#9a4a3a"
      },
      "underlay": {
        "src": "Grundriss EG.jpg",
        "x": -505,
        "y": -190,
        "scale": 1.47,
        "rotation": 0,
        "opacity": 0.45,
        "visible": false
      },
      "templateKey": "EG",
      "roomMarkers": [
        {
          "id": "rm_185f24",
          "x": 167.5,
          "y": 157.5,
          "name": "Küche",
          "color": "#ffffff",
          "ceiling": 215
        },
        {
          "id": "rm_186f24",
          "x": 582.2560975609756,
          "y": 276.5243902439024,
          "name": "Wohn- / Essbereich",
          "color": "#ffffff",
          "ceiling": 215
        },
        {
          "id": "rm_187f24",
          "x": 140,
          "y": 467.5,
          "name": "Treppe",
          "color": "#ffffff",
          "ceiling": 225
        },
        {
          "id": "rm_188f24",
          "x": 385,
          "y": 467.5,
          "name": "Bad / Dusche",
          "color": "#ffffff",
          "ceiling": 210
        },
        {
          "id": "rm_189f24",
          "x": -90,
          "y": 440,
          "name": "Diele",
          "color": "#ffffff",
          "ceiling": 225
        },
        {
          "id": "rm_190f24",
          "x": -325,
          "y": 440,
          "name": "Eingang / Wintergarten",
          "color": "#ffffff",
          "ceiling": 225
        }
      ]
    },
    {
      "id": "floor_og",
      "name": "Dachgeschoss",
      "elevation": 250,
      "wallHeight": 220,
      "walls": [
        {
          "id": "w_og_n",
          "a": {
            "x": 0,
            "y": 0
          },
          "b": {
            "x": 770,
            "y": 0
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_og_e",
          "a": {
            "x": 770,
            "y": 0
          },
          "b": {
            "x": 770,
            "y": 620
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_og_s",
          "a": {
            "x": -180,
            "y": 620
          },
          "b": {
            "x": 770,
            "y": 620
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_og_w",
          "a": {
            "x": 0,
            "y": 0
          },
          "b": {
            "x": 0,
            "y": 620
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_og_spertop",
          "a": {
            "x": -180,
            "y": 260
          },
          "b": {
            "x": 0,
            "y": 260
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_og_sperw",
          "a": {
            "x": -180,
            "y": 260
          },
          "b": {
            "x": -180,
            "y": 620
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "w_og_spers",
          "a": {
            "x": -180,
            "y": 620
          },
          "b": {
            "x": 0,
            "y": 620
          },
          "thickness": 18,
          "height": null
        },
        {
          "id": "wall_198cf2",
          "a": {
            "x": 0,
            "y": 260
          },
          "b": {
            "x": 200,
            "y": 260
          },
          "thickness": 18,
          "height": null
        }
      ],
      "rooms": [
        {
          "id": "room-rm_191f24",
          "markerId": "rm_191f24",
          "name": "Zimmer",
          "ceiling": 205,
          "color": "#ffffff",
          "poly": [
            {
              "x": 0,
              "y": 0
            },
            {
              "x": 770,
              "y": 0
            },
            {
              "x": 770,
              "y": 620
            },
            {
              "x": 0,
              "y": 620
            },
            {
              "x": 0,
              "y": 260
            },
            {
              "x": 200,
              "y": 260
            },
            {
              "x": 0,
              "y": 260
            }
          ]
        },
        {
          "id": "room-rm_196f24",
          "markerId": "rm_196f24",
          "name": "Speicherraum",
          "ceiling": 150,
          "color": "#ffffff",
          "poly": [
            {
              "x": 0,
              "y": 620
            },
            {
              "x": -180,
              "y": 620
            },
            {
              "x": -180,
              "y": 260
            },
            {
              "x": 0,
              "y": 260
            }
          ]
        }
      ],
      "openings": [
        {
          "id": "op_floor_og_3",
          "wallId": "w_og_n",
          "pos": 600,
          "type": "window",
          "width": 95,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        },
        {
          "id": "op_floor_og_4",
          "wallId": "w_og_e",
          "pos": 209,
          "type": "window",
          "width": 90,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        },
        {
          "id": "op_floor_og_5",
          "wallId": "w_og_e",
          "pos": 456,
          "type": "window",
          "width": 90,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        },
        {
          "id": "op_floor_og_6",
          "wallId": "w_og_s",
          "pos": 446,
          "type": "window",
          "width": 90,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        },
        {
          "id": "op_floor_og_7",
          "wallId": "w_og_s",
          "pos": 740,
          "type": "window",
          "width": 90,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        },
        {
          "id": "op_floor_og_8",
          "wallId": "w_og_s",
          "pos": 805,
          "type": "window",
          "width": 90,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        },
        {
          "id": "op_floor_og_9",
          "wallId": "w_og_w",
          "pos": 142,
          "type": "window",
          "width": 55,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        },
        {
          "id": "op_floor_og_15",
          "wallId": "w_og_sperw",
          "pos": 86,
          "type": "window",
          "width": 100,
          "hinge": "left",
          "dir": "in",
          "sill": 90,
          "height": 120
        }
      ],
      "furniture": [
        {
          "id": "item_floor_og_22",
          "type": "stairs",
          "x": 100,
          "y": 350,
          "rot": 90,
          "w": 130,
          "h": 200,
          "hh": 0,
          "label": ""
        }
      ],
      "dims": [],
      "labels": [],
      "roof": {
        "enabled": true,
        "type": "gable",
        "height": 200,
        "overhang": 35,
        "ridge": "auto",
        "color": "#9a4a3a"
      },
      "underlay": {
        "src": "Grundriss OG.jpg",
        "x": -381,
        "y": -140,
        "scale": 1.32,
        "rotation": 0,
        "opacity": 0.45,
        "visible": false
      },
      "templateKey": "OG",
      "roomMarkers": [
        {
          "id": "rm_191f24",
          "x": 180,
          "y": 157.5,
          "name": "Zimmer",
          "color": "#ffffff",
          "ceiling": 205,
          "auto": false
        },
        {
          "id": "rm_192f24",
          "x": 588.451487946042,
          "y": 285.0431800574215,
          "name": "Kinderzimmer",
          "color": "#ffffff",
          "ceiling": 205
        },
        {
          "id": "rm_193f24",
          "x": 102.5,
          "y": 392.5,
          "name": "Treppe",
          "color": "#ffffff",
          "ceiling": 205
        },
        {
          "id": "rm_194f24",
          "x": 102.5,
          "y": 545,
          "name": "Einbauschrank",
          "color": "#ffffff",
          "ceiling": 150
        },
        {
          "id": "rm_195f24",
          "x": 339.5,
          "y": 467.5,
          "name": "Bad / WC",
          "color": "#ffffff",
          "ceiling": 205
        },
        {
          "id": "rm_196f24",
          "x": -90,
          "y": 440,
          "name": "Speicherraum",
          "color": "#ffffff",
          "ceiling": 150
        }
      ]
    }
  ],
  "activeFloorId": "floor_eg",
  "settings": {
    "gridCm": 25,
    "snapCm": 15,
    "theme": "dark",
    "accent": "#4f8cff",
    "showGrid": true,
    "showDims": true,
    "ortho": true,
    "showGhost": false,
    "themePreset": "midnight"
  }
};
