import { MainMenu, SpaceScene, StatusPane, TerminalPane, CardPane, dialogPane } from "./ui.js"
import { Viewport } from "./viewport.js";
import { Grid } from "./grid.js";
import { Combat } from "./combat.js";
import { astar, Coordinate, screenToCell, sleep } from "./utils.js";
import { Entity, Player, RangedEntity, AreaDamagingEntity, PlayableEntity } from "./entity.js";
import { Graphics } from "./graphics.js";
import { Sound } from "./sound.js";
import { AnimationPlayer, createAnimationCatalogue } from "./animation.js";

const animationCatalogue = createAnimationCatalogue();

const CELL_SIZE = 64;

const captain = new PlayableEntity(new Coordinate(-96, 32), "Captain");
captain.party = "goodguysparty";
captain.entityType = "Cyborg";
const captainAnim = new AnimationPlayer(captain, animationCatalogue.sets[captain.entityType], { cellSize: CELL_SIZE });

const magician = new PlayableEntity(new Coordinate(-32, 32), "Weizardo");
magician.party = "goodguysparty";
magician.entityType = "Magician";
const magicianAnim = new AnimationPlayer(magician, animationCatalogue.sets[magician.entityType], { cellSize: CELL_SIZE });

const woman = new PlayableEntity(new Coordinate(32, 32), "Random Woman");
woman.party = "goodguysparty";
woman.entityType = "SpearWoman";
const womanAnim = new AnimationPlayer(woman, animationCatalogue.sets[woman.entityType], { cellSize: CELL_SIZE });

const meleeEntity = new Entity(new Coordinate(-32 - 4 * 64, 32), "Melee");
meleeEntity.entityType = "Skeleton";
meleeEntity.party = "enemies"
const meleeEntityAnim = new AnimationPlayer(meleeEntity, animationCatalogue.sets[meleeEntity.entityType], { cellSize: CELL_SIZE });

const rangedEntity = new AreaDamagingEntity(new Coordinate(-32 - 5 * 64, 32), "Ranged");
rangedEntity.party = "enemies";
rangedEntity.entityType = "BloodWizard";
const rangedEntityAnim = new AnimationPlayer(rangedEntity, animationCatalogue.sets[rangedEntity.entityType], { cellSize: CELL_SIZE });



class App {
    start() {
        //initial setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.mainMenu = new MainMenu(canvas);
        this.spaceScene = new SpaceScene(canvas);
        this.statusPane = new StatusPane(canvas);
        this.statusPane = new StatusPane(canvas);
        this.terminalPane = new TerminalPane(canvas);
        this.cardPane = new CardPane(canvas);
        this.dialogPane = new dialogPane(canvas);
        this.animationPlayers = [captainAnim, magicianAnim, womanAnim, meleeEntityAnim, rangedEntityAnim];

        this.viewport = new Viewport(this.canvas, captain.center);
        this.player = new Player(this.canvas, captain, this.viewport);
        this.map = new Grid(CELL_SIZE, this.player, [captain, magician, woman, meleeEntity, rangedEntity]);

        this.sound = new Sound();
        this.graphics = new Graphics(this.canvas, this.player, this.map);

        this.combat = new Combat(this.player, [captain, magician, woman, meleeEntity, rangedEntity], this.map);
        this.entities = [captain, magician, woman, meleeEntity, rangedEntity];

        // Animation timer
        this.lastTime = 0;

        this.acknowledgeEntity = (...entities) => {
            entities.reduce((e) => {
                this.map.trackedEntities.add(e);
                this.combat.addEntity(e);
                this.entities.push(e);
            });
        };

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

            if (this.player.hasAction) {
                this.player.publish("click", {
                    cell: this.map.hoveredCell,
                    entity: this.map.getCell(this.map.hoveredCell.col, this.map.hoveredCell.row)?.entity || null,
                    cellSize: this.map.cellSize
                });
            }
        });

        //Mouse up handler.
        window.addEventListener("mouseup", (e) => {
            if (e.button === 0) {
                this.graphics.stopPainting();
            }
        });

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
        this.player.update(deltaTime);

        this.map.update();

        this.combat.update();


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

            //Painters algorithm for animations
            this.animationPlayers
                .slice()
                .sort((a, b) => a.entity.center.y - b.entity.center.y)
                .forEach((p) => p.draw(this.ctx));
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
