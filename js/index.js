import { Entity, Player } from "./entity.js";
import { Coordinate } from "./utils.js";
import { Viewport } from "./viewport.js";
import { Grid } from "./grid.js";
import { Tileset, TilePalette } from "./tileset.js";

const DEFAULT_MAP_FILE = "map1.json";

const entity = new Entity(new Coordinate(-96, 32), "Player");
const wallofentities = Array.from({ length: 7 }, (_, i) => new Entity(new Coordinate(224, 224 - i * 64), "Wall"));


class App {
    start() {
        //initial setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.viewport = new Viewport(this.canvas, entity.center);
        this.player = new Player(this.canvas, entity);
        this.map = new Grid(64, this.player);
        this.currentTileSelection = null;
        this.debugMode = false;
        this.isPainting = false;
        this.lastPaintedCellKey = null;
        this.selectedMapFile = DEFAULT_MAP_FILE;

        this.lastTime = 0;
        this.setupTilesets();
        this.setDebugMode(false);

        this.canvas.addEventListener('mousemove', (e) => {
            const targetCell = this.getCanvasCellFromEvent(e);
            this.map.hoveredCell = targetCell;

            if (this.debugMode && this.isPainting) {
                if (e.buttons & 1) {
                    this.applyBrushToCell(targetCell);
                } else {
                    this.stopPainting();
                }
            }
        });

        this.canvas.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();

            const targetCell = this.getCanvasCellFromEvent(e);
            this.map.hoveredCell = targetCell;

            if (this.debugMode) {
                this.startPainting(targetCell);
                return;
            }

            this.movePlayerToCell(targetCell);
        });

        window.addEventListener("mouseup", (e) => {
            if (e.button === 0) {
                this.stopPainting();
            }
        });

        this.map.trackedEntities = [entity, ...wallofentities];

        //this.canvas.style.cursor = 'none';
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
                imageUrl: new URL("./spaceship.png", import.meta.url).href,
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

        this.selectedMapFile = maps[0]?.file ?? DEFAULT_MAP_FILE;
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
        }

        return [{ name: "Map 1", file: DEFAULT_MAP_FILE }];
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
        this.selectedMapFile = this.mapSelect.value || DEFAULT_MAP_FILE;

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

    getCanvasCellFromEvent(e) {
        const pos = this.viewport.screenToWorld(e.clientX, e.clientY);
        return this.map.worldToCell(pos.x, pos.y);
    }

    movePlayerToCell(targetCell) {
        const success = this.player.entity.moveToCell(this.map.cellSize, targetCell);
        if (success) {
            const oldPos = this.map.worldToCell(this.player.entity.center.x, this.player.entity.center.y);
            this.map.appendCell(oldPos.col, oldPos.row, { occupied: false, entity: null });
        }
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

        const cellKey = this.map.cellKey(targetCell.col, targetCell.row);
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

    update(currentTime) {
        // we use delta time to calculate updates regardless of what fps we get
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        entity.update(deltaTime);
        this.player.update(deltaTime);

        this.map.update();

        this.viewport.reset();

        this.map.draw(this.ctx, this.viewport);

        wallofentities.forEach(entity => {
            entity.draw(this.ctx);
        });


        entity.draw(this.ctx);



        // keep the animation going by requesting another animation frame
        requestAnimationFrame((time) => this.update(time));
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

const app = new App();
app.start();
app.ctx.save();
requestAnimationFrame((time) => app.update(time))
