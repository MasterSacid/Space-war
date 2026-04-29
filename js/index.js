import { Entity, Player } from "./entity.js";
import { Coordinate } from "./utils.js";
import { Viewport } from "./viewport.js";
import {Grid} from "./grid.js";


const entity = new Entity(new Coordinate(0, 0), "Player");
const entityOther = new Entity(new Coordinate(100, 200), "Other");


class App {
    start() {
        //initial setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.viewport = new Viewport(this.canvas, entity.center);
        this.player = new Player(this.canvas, entity);
        this.map = new Grid(64);

        this.lastTime = 0;

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'j') {
                this.player.entity = (this.player.entity === entity) ? entityOther : entity;
                this.viewport.coordinate = this.player.entity.center;
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            this.map.findHoveredCell(mouseX, mouseY, this.viewport);
        });
    }

    update(currentTime) {
        // we use delta time to calculate updates regardless of what fps we get
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        entity.update(deltaTime);
        this.player.update(deltaTime);

        this.viewport.reset();
        this.map.draw(this.ctx,this.viewport);
        entity.draw(this.ctx);
        entityOther.draw(this.ctx);

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
