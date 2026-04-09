import { Entity, InputManager } from './tools/entity.js'

let player;
let inputManager = new InputManager();

class App {
    start() {
        //initial setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');

        player = new Entity(
            { x: 20, y: 20 },
            { width: 40, height: 40 },
            "player",
            "red"
        );
    }

    update(currentTime) {
        // we use delta time to calculate updates regardless of what fps we get
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.clearCanvas();

        inputManager.handleInput(player);
        player.spawnEntity(this.ctx);

        // keep the animation going by requesting another animation frame
        requestAnimationFrame((time) => this.update(time));
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}


const app = new App();
app.start();
requestAnimationFrame((time) => app.update(time))
