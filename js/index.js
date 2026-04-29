import { Entity, Player } from "./entity.js";
import { Coordinate } from "./utils.js";
import { Viewport } from "./viewport.js";
import { MainMenu, SpaceScene, StatusPane, TerminalPane } from "./ui.js"

const entity = new Entity(new Coordinate(0, 0), "Player");
const entityOther = new Entity(new Coordinate(100, 200), "Other");

class App {
    start() {
        //initial setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.viewport = new Viewport(this.canvas, entity.center);
        this.player = new Player(canvas, entity);
        this.mainMenu = new MainMenu(canvas);
        this.spaceScene = new SpaceScene(canvas);
        this.statusPane = new StatusPane(canvas);
        this.statusPane = new StatusPane(canvas);
        this.TerminalPane = new TerminalPane(canvas);

        this.lastTime = 0;

        this.mainMenu.playBtn.addEventListener("click", () => this.mainMenuHide());

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'j') {
                this.player.entity = (this.player.entity === entity) ? entityOther : entity;
                this.viewport.coordinate = this.player.entity.center;
            }
            if (e.key.toLowerCase() === '=') {
                this.viewport.zoom += 0.1;
                this.viewport.zoom = (this.viewport.zoom > 2) ? 2 : this.viewport.zoom;
            }
            if (e.key.toLowerCase() === '-') {
                this.viewport.zoom -= 0.1;
                this.viewport.zoom = (this.viewport.zoom < 0.5) ? 0.5 : this.viewport.zoom;
            }
        });
        // ENABLE main menu from here.
        // this.mainMenuShow();
    }

    update(currentTime) {
        // we use delta time to calculate updates regardless of what fps we get
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Make logic updates here
        if (this.spaceScene.visible) this.spaceScene.update(deltaTime);

        entity.update(deltaTime);
        this.player.update(deltaTime);
        this.TerminalPane.update(deltaTime);

        // Make drawings here
        this.viewport.reset();
        this.spaceScene.draw();
        this.mainMenu.draw();
        this.statusPane.draw();
        this.TerminalPane.draw();

        if (!(this.mainMenu.fullscreen && this.mainMenu.visible)) {
            this.viewport.transform();
            entity.draw(this.ctx);
            entityOther.draw(this.ctx);
        }

        // keep the animation going by requesting another animation frame
        requestAnimationFrame((time) => this.update(time));
    }
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    mainMenuShow() {
        this.mainMenu.on();
        this.spaceScene.visible = true;
    }

    mainMenuHide() {
        this.mainMenu.off();
        this.spaceScene.visible = false;

        this.statusPane.visible = true;
        this.TerminalPane.visible = true;
    }
}


const app = new App();
app.start();
app.ctx.save();
requestAnimationFrame((time) => app.update(time));
