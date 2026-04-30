import { Viewport } from "./viewport.js";
import { MainMenu, SpaceScene, StatusPane, TerminalPane } from "./ui.js"
import { Coordinate, sleep } from "./utils.js";

class App {
    start() {
        //initial setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.viewport = new Viewport(this.canvas, new Coordinate(0, 0));
        this.mainMenu = new MainMenu(canvas);
        this.spaceScene = new SpaceScene(canvas);
        this.statusPane = new StatusPane(canvas);
        this.statusPane = new StatusPane(canvas);
        this.terminalPane = new TerminalPane(canvas);

        this.addText = (string, letterPerSec) => new Promise((resolve) => {
            this.terminalPane.addText(string, letterPerSec, resolve);
        });

        this.lastTime = 0;

        this.mainMenu.playBtn.addEventListener("click", () => {
            this.mainMenu.off();
            this.statusPane.on();
            this.terminalPane.on();

            this.story();
        });

        this.mainMenu.on();
        this.spaceScene.visible = true;
    }

    async story() {
        await sleep(200);
        await this.addText("Systems rebooting...", 6);
        //await sleep(2000);
        this.statusPane.G8000Online();
        await this.addText("Systems reboot complete", 20);
        await sleep(1000);
        await this.addText("[G8000]: You are finally awake captain.", 20);
        await this.addText("[G8000]: After the last missile the alien ships have sent us, you banged your head pretty bad.", 20);
    }

    update(currentTime) {
        // we use delta time to calculate updates regardless of what fps we get
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Make logic updates here
        if (this.spaceScene.visible) this.spaceScene.update(deltaTime);

        this.terminalPane.update(deltaTime);

        // Make drawings here
        this.viewport.reset();
        this.spaceScene.draw();
        this.mainMenu.draw();
        this.statusPane.draw();
        this.terminalPane.draw();

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
requestAnimationFrame((time) => app.update(time));
