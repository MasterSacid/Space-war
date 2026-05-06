import { MainMenu, SpaceScene, StatusPane, TerminalPane, dialogPane } from "./ui.js"
import { Viewport } from "./viewport.js";
import { Grid } from "./grid.js";
import { Bot, Combat } from "./combat.js";
import { Coordinate } from "./utils.js";
import { Entity, Player } from "./entity.js";

const entity = new Entity(new Coordinate(-96, 32), "Player");
const wallofentities = Array.from({ length: 5 }, (_, i) => {
    const wall = new Entity(new Coordinate(224, 160 - i * 64), "Wall " + (i + 1));
    wall.party = "walls";
    return wall;
});

class App {
    start() {
        //initial setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = new Player(this.canvas, entity);
        this.viewport = new Viewport(this.canvas, this.player.entity.center);
        this.mainMenu = new MainMenu(canvas);
        this.spaceScene = new SpaceScene(canvas);
        this.statusPane = new StatusPane(canvas);
        this.statusPane = new StatusPane(canvas);
        this.terminalPane = new TerminalPane(canvas);
        this.dialogPane = new dialogPane(canvas);
        this.map = new Grid(64, this.player);
        this.player.entity.reachRadius = 5;
        this.player.entity.lerpDuration = 0.25;

        this.lastTime = 0;


        this.addText = (string, letterPerSec) => new Promise((resolve) => {
            this.terminalPane.addText(string, letterPerSec, resolve);
        });


        this.addDialog = (title, description, select = "select", onSelect) => new Promise((resolve) => {
            this.dialogPane.addDialog(title, description, select, resolve, onSelect);
        });

        this.mainMenu.playBtn.addEventListener("click", () => {
            this.mainMenu.off();
            this.turnOnAllOverlays();

            this.story();
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const pos = this.viewport.screenToWorld(e.clientX, e.clientY);
            this.map.findHoveredCell(pos.x, pos.y);
        });

        this.canvas.addEventListener("mousedown", async () => {
            this.player.entity.showAura = false;
            if (this.player.actionResolve != null) {
                const success = await this.player.entity.takePathTo(this.map.cellSize, this.map.hoveredCell);
                if (success) {
                    this.map.appendCell(this.player.entity.cell.col, this.player.entity.cell.row, { occupied: false, entity: null });
                    this.player.actionResolve();
                    this.player.actionResolve = null;
                }
            }
        });

        this.map.trackedEntities = [entity, ...wallofentities];
        //this.canvas.style.cursor = 'none';

        this.combat = new Combat(this.player, [entity, ...wallofentities]);
        this.bot = new Bot(this.combat, "walls", this.map);

        this.mainMenu.on();
        this.spaceScene.visible = true;
    }

    async story() {
        //await sleep(200);
        //await this.addText("Systems rebooting...", 6);
        //await sleep(2000);
        //this.statusPane.G8000Online();
        //await this.addText("Systems reboot complete", 20);
        //await sleep(1000);
        //await this.addText("[G8000]: You are finally awake captain.", 20);
        //await this.addText("[G8000]: After the last missile the alien ships have sent us, you banged your head pretty bad.", 20);

        await this.addDialog("A Call to Arms", "", "To battle!", () => {
            this.turnOffAllOverlays();
        });
    }

    update(currentTime) {
        // we use delta time to calculate updates regardless of what fps we get
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Make logic updates here
        if (this.spaceScene.visible) this.spaceScene.update(deltaTime);

        this.terminalPane.update(deltaTime);

        wallofentities.forEach((entity) => entity.update(deltaTime));
        entity.update(deltaTime);
        this.player.update(deltaTime);

        this.map.update();

        this.combat.update();

        this.bot.update();

        // Viewport reset
        this.viewport.reset();
        // Screen Coordinate drawings here
        this.spaceScene.draw();
        this.mainMenu.draw();
        this.statusPane.draw();
        this.terminalPane.draw();

        // Viewport transform
        this.viewport.transform();
        // World coordinate drawings here
        if (!this.spaceScene.visible) {
            this.map.draw(this.ctx, this.viewport);

            entity.draw(this.ctx);
            wallofentities.forEach(entity => {
                entity.draw(this.ctx);
            });
        }

        // keep the animation going by requesting another animation frame
        requestAnimationFrame((time) => this.update(time));
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    turnOffAllOverlays() {
        this.dialogPane.off();
        this.statusPane.off();
        this.terminalPane.off();
        this.spaceScene.visible = false;
    }

    turnOnAllOverlays() {
        this.dialogPane.on();
        this.statusPane.on();
        this.terminalPane.on();
        this.spaceScene.visible = true;
    }
}

const app = new App();
app.start();
app.ctx.save();
requestAnimationFrame((time) => app.update(time));
