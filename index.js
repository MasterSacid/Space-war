//Includes
import {Entity, InputManager} from "./tools/entity.js";

//Globals
let canvas;
let canvasContext;
let entities = [];
let inputManager = new InputManager();

class App {
    start() {
        //Acilista kurulus
        canvas = document.getElementById('canvas');
        canvasContext = canvas.getContext('2d');


        let player = new Entity(
            {x: 20, y: 20},
            {width: 40, height: 40},
            "player",
            "red"
        );
        entities.push(player);

        //Ana loop a giris
        setInterval(() => this.update(), 1000 / 60); // ~60fps
    }

    update() {
        //Her frame canvasi temizleyerek basla
        this.clearCanvas();

        for (const entity of entities) {
            inputManager.handleInput(entity);
            entity.spawnEntity(canvasContext);
        }
    }

    clearCanvas() {
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    }
}

const app = new App();
app.start();

