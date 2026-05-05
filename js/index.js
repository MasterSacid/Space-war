import { Entity, Player } from "./entity.js";
import { Coordinate } from "./utils.js";
import { Viewport } from "./viewport.js";
import { Grid } from "./grid.js";
import { Tileset, TilePalette } from "./tileset.js";


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

        for (const tileset of tilesets) {
            this.tilePalette.addTileset(tileset);
        }

        toggle.addEventListener("click", () => {
            const collapsed = panel.classList.toggle("is-collapsed");
            toggle.textContent = collapsed ? ">" : "<";
            toggle.title = collapsed ? "Paneli ac" : "Paneli kapat";
        });

        this.modeToggle.addEventListener("click", () => {
            this.setDebugMode(!this.debugMode);
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
