import { TilePalette, Tileset } from "./tileset.js";
import { cellToKey } from "./utils.js";

export class Graphics {
    constructor(canvas, player, map) {
        this.canvas = canvas;
        this.player = player;
        this.map = map;
        this.ctx = this.canvas.getContext('2d');
        this.debugMode = false;
        this.isPainting = false;
        this.lastPaintedCellKey = null;
        this.defaultMapFile = "map1.json";
        this.selectedMapFile = this.defaultMapFile;
        this.currentTileSelection = null;
        this.ctx.imageSmoothingEnabled = false;

        this.setupTilesets();
        this.setDebugMode(false);
    }

    setupTilesets() {
        const paletteContainer = document.getElementById("tilePalette");
        const panel = document.getElementById("tilePanel");
        const toggle = document.getElementById("tilePanelToggle");
        this.modeToggle = document.getElementById("modeToggle");
        this.mapSelect = document.getElementById("mapSelect");
        this.loadMapButton = document.getElementById("loadMapButton");
        this.saveMapButton = document.getElementById("saveMapButton");
        this.saveStatus = document.getElementById("saveStatus");

        this.tilePalette = new TilePalette(paletteContainer, {
            onSelect: (selection) => {
                this.currentTileSelection = selection;
            }
        });

        const tilesets = [
            new Tileset({
                name: "Spaceship",
                imageUrl: new URL("../img/spaceship.png", import.meta.url).href,
                tileSize: 32,
                tilesPerRow: 10
            })
        ];
        this.tilesetsByName = new Map(tilesets.map((tileset) => [tileset.name, tileset]));

        for (const tileset of tilesets) {
            this.tilePalette.addTileset(tileset);
        }

        Promise.all(tilesets.map((tileset) => tileset.ready)).then(() => {
            this.setupMaps();
        });

        toggle.addEventListener("click", () => {
            const collapsed = panel.classList.toggle("is-collapsed");
            toggle.textContent = collapsed ? ">" : "<";
            toggle.title = collapsed ? "Paneli ac" : "Paneli kapat";
        });

        this.modeToggle.addEventListener("click", () => {
            this.setDebugMode(!this.debugMode);
        });

        this.loadMapButton.addEventListener("click", () => {
            this.loadSelectedMap();
        });

        this.saveMapButton.addEventListener("click", () => {
            this.saveMap();
        });
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.player.enableKeyboardMovement = enabled;
        this.stopPainting();

        this.canvas.classList.toggle("is-debug", enabled);
        this.modeToggle.classList.toggle("is-debug", enabled);
        this.modeToggle.textContent = enabled ? "Debug Mode" : "Normal Mode";
        this.modeToggle.title = enabled
            ? "Debug: WASD hareket, mouse ile tile boya"
            : "Normal: mouse ile hareket";
    }

    createMapData() {
        return {
            version: 1,
            savedAt: new Date().toISOString(),
            file: this.selectedMapFile,
            cellSize: this.map.cellSize,
            tiles: this.map.exportPaintedTiles()
        };
    }

    async setupMaps() {
        const maps = await this.fetchMapList();
        this.renderMapOptions(maps);

        this.selectedMapFile = maps[0]?.file ?? this.defaultMapFile;
        this.mapSelect.value = this.selectedMapFile;

        this.mapSelect.addEventListener("change", () => {
            this.selectedMapFile = this.mapSelect.value;
            this.loadSelectedMap();
        });

        await this.loadSelectedMap();
    }

    async fetchMapList() {
        try {
            const response = await fetch("./api/maps", { cache: "no-store" });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.maps) && data.maps.length > 0) {
                    return data.maps;
                }
            }
        } catch (error) {
            console.warn("Couldn't connect to NodeJS backend for map lists.");
        }

        try {
            const response = await fetch("./maps/index.json", { cache: "no-store" });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.maps) && data.maps.length > 0) {
                    return data.maps;
                }
            }
        } catch (error) {
            console.warn("Couldn't open the file for map lists.");
        }

        return [{ name: "Map 1", file: this.defaultMapFile }];
    }

    renderMapOptions(maps) {
        this.mapSelect.replaceChildren();

        for (const map of maps) {
            const option = document.createElement("option");
            option.value = map.file;
            option.textContent = map.name ?? map.file;
            this.mapSelect.appendChild(option);
        }
    }

    async saveMap() {
        const mapData = this.createMapData();

        try {
            const response = await fetch(`./api/maps/${encodeURIComponent(this.selectedMapFile)}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(mapData, null, 2)
            });

            if (!response.ok) {
                throw new Error("Map save request failed");
            }

            this.setSaveStatus(`${this.selectedMapFile} kaydedildi`);
        } catch (error) {
            this.setSaveStatus("Kaydetmek icin node server.js kullan");
        }
    }

    async loadSelectedMap() {
        this.selectedMapFile = this.mapSelect.value || this.defaultMapFile;

        try {
            const response = await fetch(`./maps/${encodeURIComponent(this.selectedMapFile)}`, {
                cache: "no-store"
            });
            if (!response.ok) {
                throw new Error("Map load request failed");
            }

            const mapData = await response.json();
            if (!Array.isArray(mapData.tiles)) return;

            this.map.importPaintedTiles(
                mapData.tiles,
                (tilesetName) => this.tilesetsByName.get(tilesetName)
            );
            this.setSaveStatus(`${this.selectedMapFile} yuklendi`);
        } catch (error) {
            this.setSaveStatus("Harita yuklenemedi");
        }
    }

    setSaveStatus(message) {
        this.saveStatus.textContent = message;
    }

    movePlayerToCell(targetCell) {
        const oldPos = this.map.worldToCell(this.player.entity.center.x, this.player.entity.center.y);
        this.map.appendCell(oldPos.col, oldPos.row, { occupied: false, entity: null });
        this.player.entity.moveToCell(this.map.cellSize, targetCell);
    }

    startPainting(targetCell) {
        this.isPainting = true;
        this.lastPaintedCellKey = null;
        this.applyBrushToCell(targetCell);
    }

    stopPainting() {
        this.isPainting = false;
        this.lastPaintedCellKey = null;
    }

    applyBrushToCell(targetCell) {
        if (!this.currentTileSelection) return;

        const cellKey = cellToKey({ col: targetCell.col, row: targetCell.row });
        if (this.lastPaintedCellKey === cellKey) return;

        this.lastPaintedCellKey = cellKey;

        if (this.currentTileSelection.type === "eraser") {
            this.map.clearTile(targetCell.col, targetCell.row);
            return;
        }

        this.map.paintTile(
            targetCell.col,
            targetCell.row,
            this.currentTileSelection.tileset,
            this.currentTileSelection.tileIndex
        );
    }

}
