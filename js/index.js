import { MainMenu, SpaceScene, StatusPane, TerminalPane, CardPane, dialogPane } from "./ui.js"
import { Viewport } from "./viewport.js";
import { Grid } from "./grid.js";
import { Bot, Combat } from "./combat.js";
import { astar, Coordinate, screenToCell, sleep } from "./utils.js";
import { Entity, Player, RangedEntity, AreaDamagingEntity } from "./entity.js";
import { Graphics } from "./graphics.js";
import { Sound } from "./sound.js";
import { AnimationPlayer, createAnimationCatalogue } from "./animation.js";

const animationCatalogue = createAnimationCatalogue();


//Entity type Katalog içindeki ile bire bir eşleşmek zorunda!
const spaceGuy = new Entity(new Coordinate(-96, 32), "Player","Wizard");
const spaceGuyAnim = new AnimationPlayer(spaceGuy, animationCatalogue.sets[spaceGuy.entityType]);

const wallofentities = Array.from({ length: 4 }, (_, i) => {
    const wall = new Entity(new Coordinate(224, 288 - i * 64), "Wall " + (i + 1));
    wall.party = "enemies";
    wall.entityType = "StreetBro";
    return wall;
});
const wallAnims = wallofentities.map((w) =>
    new AnimationPlayer(w, animationCatalogue.sets[w.entityType])
);

const areaEntity = new AreaDamagingEntity(new Coordinate(-32 - 6 * 64, 32), "Area");
areaEntity.party = "enemies";
areaEntity.entityType = "StreetBro";
const areaAnim = new AnimationPlayer(areaEntity, animationCatalogue.sets[areaEntity.entityType]);

const animationPlayers = [spaceGuyAnim, ...wallAnims, areaAnim];

class App {
    start() {
        //initial setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = new Player(this.canvas, spaceGuy);
        this.viewport = new Viewport(this.canvas, this.player.entity.center);
        this.mainMenu = new MainMenu(canvas);
        this.spaceScene = new SpaceScene(canvas);
        this.statusPane = new StatusPane(canvas);
        this.statusPane = new StatusPane(canvas);
        this.terminalPane = new TerminalPane(canvas);
        this.cardPane = new CardPane(canvas);
        this.dialogPane = new dialogPane(canvas);
        this.map = new Grid(64, this.player);
        this.sound = new Sound();

        this.graphics = new Graphics(this.canvas, this.player, this.map);
        this.bot = new Bot(wallofentities, this.map);
        this.combat = new Combat(this.player, [spaceGuy, ...wallofentities, areaEntity], this.map, this.bot);

        this.entities = [spaceGuy, ...wallofentities, areaEntity];

        this.animationPlayers = animationPlayers;
        // Animation timer
        this.lastTime = 0;

        //Writing text to terminal pane with a cb
        this.addText = (string, letterPerSec) => new Promise((resolve) => {
            this.terminalPane.addText(string, letterPerSec, resolve);
        });

        //Showing dialog on the spacescene with a cb
        this.addDialog = (title, description, select = "select", onSelect) => new Promise((resolve) => {
            this.dialogPane.addDialog(title, description, select, resolve, onSelect);
        });

        this.mainMenu.playBtn.addEventListener("click", () => {
            this.mainMenu.off();
            this.turnOnAllOverlays();
            this.spaceScene.smallMode = true;

            this.story();
        });

        // Handles mousemove
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

        // Handles mouse downs
        this.canvas.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();

            const targetCell = screenToCell(this.map, this.viewport, e.clientX, e.clientY);
            this.map.hoveredCell = targetCell;

            if (this.graphics.debugMode) {
                this.graphics.startPainting(targetCell);
                return;
            }

            if (this.player.entity.isCellInReach(this.map.hoveredCell)) {
                const dijkstraPath = this.player.entity.getDijkstraPath(this.map.hoveredCell);
                this.player.publish("move", { path: dijkstraPath, cellSize: this.map.cellSize, apLimit: 0 });
            }

        });

        //Mouse up handler.
        window.addEventListener("mouseup", (e) => {
            if (e.button === 0) {
                this.graphics.stopPainting();
            }
        });

        this.map.trackedEntities = [spaceGuy, ...wallofentities, areaEntity];
        //this.canvas.style.cursor = 'none';

        //this.mainMenu.on();
        this.spaceScene.visible = false;
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

        this.entities.forEach((e) => e.update(deltaTime));
        this.animationPlayers.forEach((p) => p.update(deltaTime));
        this.player.update(deltaTime);

        this.map.update();

        this.combat.update();

        //this.bot.update();

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

            this.animationPlayers.forEach((p) => p.draw(this.ctx));
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
        this.cardPane.off();
        this.spaceScene.visible = false;
    }

    turnOnAllOverlays() {
        this.dialogPane.on();
        this.statusPane.on();
        this.terminalPane.on();
        this.cardPane.on();
        this.spaceScene.visible = true;
    }
}

export const app = new App();
app.start();
app.ctx.save();
requestAnimationFrame((time) => app.update(time));
