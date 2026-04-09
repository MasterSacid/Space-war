//Includes
import {Entity} from "./tools/entity.js";

//Globals
let canvas;
let canvasContext;
let entities = [];

class App {
    start() {
        //initial setup
        canvas = document.getElementById('myCanvas');
        canvasContext = canvas.getContext('2d');


        let player = new Entity(
            {x: 20, y: 20},
            {width: 40, height: 40},
            "player",
            "red"
        );
        entities.push(player);

        //At the end of setup get into the main loop
        setInterval(() => this.update(), 1000 / 60); // ~60fps
    }

    update() {
        //clear canvas every frame in the beginning
        this.clearCanvas();
        for (const entity of entities) {
            entity.spawnEntity(canvasContext);
        }
    }

    clearCanvas() {
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    }
}

const app = new App();
app.start();

