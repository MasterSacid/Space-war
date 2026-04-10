import { Entity, Player } from "./entity.js";
import { Coordinate } from "./utils.js";
import { Viewport } from "./viewport.js";


const entity = new Entity(new Coordinate(0, 0), "Player");
const entityOther = new Entity(new Coordinate(100, 200), "Other");


class App {
    start() {
        //initial setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.viewport = new Viewport(this.canvas, entity.center);
        this.player = new Player(canvas, entity);

        this.lastTime = 0;

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'j') {
                this.player.entity = (this.player.entity === entity) ? entityOther : entity;
                this.viewport.coordinate = this.player.entity.center;
            }
        });
    }

    update(currentTime) {
        // we use delta time to calculate updates regardless of what fps we get
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        entity.update(deltaTime);
        this.player.update(deltaTime);

        this.viewport.reset();
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
