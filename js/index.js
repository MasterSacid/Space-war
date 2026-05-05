import { Entity, Player } from "./entity.js";
import { Coordinate, astar } from "./utils.js";
import { Viewport } from "./viewport.js";
import { Grid } from "./grid.js";


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

        this.lastTime = 0;

        this.canvas.addEventListener('mousemove', (e) => {
            const pos = this.viewport.screenToWorld(e.clientX, e.clientY);
            this.map.findHoveredCell(pos.x, pos.y);
        });

        this.canvas.addEventListener("mousedown", () => {
            const centerCell = { col: Math.floor(this.player.entity.center.x / 64), row: Math.floor(this.player.entity.center.y / 64) };
            //astar(centerCell, this.map.hoveredCell, () => this.map.getAdjacentCells);

            const success = this.player.entity.moveToCell(this.map.cellSize, this.map.hoveredCell);
            if (success) {
                const oldPos = this.map.worldToCell(this.player.entity.center.x, this.player.entity.center.y);
                this.map.appendCell(oldPos.col, oldPos.row, { occupied: false, entity: null });
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
