import { Entity, Player } from "./entity.js";
import { Coordinate, screenToCell } from "./utils.js";
import { Viewport } from "./viewport.js";
import { Grid } from "./grid.js";
import { Graphics } from "./graphics.js";

const entity = new Entity(new Coordinate(-96, 32), "Player");
const wallofentities = Array.from({ length: 7 }, (_, i) => new Entity(new Coordinate(224, 224 - i * 64), "Wall"));


class App {
    start() {
        //initial setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.viewport = new Viewport(this.canvas, entity.center);
        this.player = new Player(this.canvas, entity);
        this.map = new Grid(64, this.player);
        this.graphics = new Graphics(this.canvas, this.player, this.map);

        // Animation timer
        this.lastTime = 0;

        this.canvas.addEventListener('mousemove', (e) => {
            this.map.hoveredCell = screenToCell(this.map, this.viewport, e.clientX, e.clientY);

            if (this.graphics.debugMode && this.graphics.isPainting) {
                if (e.buttons & 1) {
                    this.graphics.applyBrushToCell(this.map.hoveredCell);
                } else {
                    this.graphics.stopPainting();
                }
            }
        });

        this.canvas.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();

            const targetCell = screenToCell(this.map, this.viewport, e.clientX, e.clientY);
            this.map.hoveredCell = targetCell;

            if (this.graphics.debugMode) {
                this.graphics.startPainting(targetCell);
                return;
            }

            this.graphics.movePlayerToCell(targetCell);
        });

        window.addEventListener("mouseup", (e) => {
            if (e.button === 0) {
                this.graphics.stopPainting();
            }
        });

        this.map.trackedEntities = [entity, ...wallofentities];

        //this.canvas.style.cursor = 'none';
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
