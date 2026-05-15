import { MainMenu, SpaceScene, StatusPane, TerminalPane, CardPane, dialogPane, TempTextPane } from "./ui.js"
import { Viewport } from "./viewport.js";
import { Grid } from "./grid.js";
import { Combat } from "./combat.js";
import { astar, Coordinate, screenToCell, sleep } from "./utils.js";
import { Entity, Player, RangedEntity, AreaDamagingEntity, PlayableEntity } from "./entity.js";
import { Graphics, createGameTilesets, fetchMapList, fetchMapData } from "./graphics.js";
import { Sound } from "./sound.js";
import { AnimationPlayer, createAnimationCatalogue } from "./animation.js";
import { eventSystem } from "./eventSystem.js";

const captain = new PlayableEntity(new Coordinate(-32 - 4 * 64, 32), "Captain");
captain.party = "goodguysparty";
captain.resourceName = "Captain";
captain.playerActions.push({ name: "meleeAttack", args: { cost: 1, range: 1, damage: 20, swing: 10, alignment: "enemy" } });

const wizard = new PlayableEntity(new Coordinate(-32 - 6 * 64, 32), "Weizardo");
wizard.party = "goodguysparty";
wizard.playerActions.push({ name: "rangedAttack", args: { cost: 1, range: 6, damage: 10, swing: 10, kickback: 0.1, speed: 400, alignment: "enemy" } });
wizard.resourceName = "Magician"

const woman = new PlayableEntity(new Coordinate(-32 - 5 * 64, 32), "Random Woman");
woman.party = "goodguysparty";
woman.playerActions.push({ name: "areaAttack", args: { cost: 2, range: 7, radius: 2, damage: 10, swing: 20, kickback: -0.1, speed: 400 } });
woman.resourceName = "SpearWoman";

const meleeEntity = new Entity(new Coordinate(-96, 32), "Melee");
meleeEntity.party = "enemies"

const areaEntity = new AreaDamagingEntity(new Coordinate(-32, 32), "Area");
areaEntity.party = "enemies"

const rangedEntity = new AreaDamagingEntity(new Coordinate(32, 32), "Ranged");
rangedEntity.party = "enemies"

// Hangi entity'nin hangi animasyon setini kullanacağını burada eşliyoruz
const entityAnimationMap = [
    { entity: captain, setName: captain.resourceName },
    { entity: wizard, setName: wizard.resourceName },
    { entity: woman, setName: woman.resourceName },
    { entity: meleeEntity, setName: "Skeleton" },
    { entity: areaEntity, setName: "BloodWizard" },
    { entity: rangedEntity, setName: "Slime" },
];

class App {
    async load() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.animationCatalogue = createAnimationCatalogue();
        this.tilesets = createGameTilesets();

        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "#fff";
        this.ctx.font = "bold 120px monospace";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText("LOADING", this.canvas.width / 2, this.canvas.height / 2);

        const [, , mapList] = await Promise.all([
            this.animationCatalogue.ready(),
            Promise.all(this.tilesets.map((t) => t.ready)),
            fetchMapList(),
        ]);
        const initialFile = mapList[0]?.file ?? "map1.json";
        const initialTiles = (await fetchMapData(initialFile)).tiles ?? [];

        this.initialMapData = { mapList, currentFile: initialFile, tiles: initialTiles };
    }

    async start() {
        this.mainMenu = new MainMenu(this.canvas);
        this.spaceScene = new SpaceScene(this.canvas);
        this.statusPane = new StatusPane(this.canvas);
        this.statusPane = new StatusPane(this.canvas);
        this.terminalPane = new TerminalPane(this.canvas);
        this.cardPane = new CardPane(this.canvas);
        this.dialogPane = new dialogPane(this.canvas);
        this.tempTextPane = new TempTextPane(this.canvas);

        this.viewport = new Viewport(this.canvas, captain.center);
        this.player = new Player(this.canvas, captain, this.viewport);
        this.map = new Grid(64, this.player, [captain, wizard, woman, meleeEntity, areaEntity, rangedEntity]);

        const tilesetsByName = new Map(this.tilesets.map((t) => [t.name, t]));
        this.map.importPaintedTiles(
            this.initialMapData.tiles,
            (name) => tilesetsByName.get(name)
        );

        this.sound = new Sound();
        this.sound.playMusic("main", 0.07);
        this.graphics = new Graphics(this.canvas, this.player, this.map, this.tilesets, this.initialMapData);

        this.combat = new Combat(this.player, [captain, wizard, woman, meleeEntity, areaEntity, rangedEntity], this.map);
        this.entities = [captain, wizard, woman, meleeEntity, areaEntity, rangedEntity];

        eventSystem.subscribe("combat:end", ({ winnerParty }) => this.handleCombatEnd(winnerParty));

        // Animation timer
        this.lastTime = 0;

        // Her entity için bir AnimationPlayer oluştur ve entity'ye bağla
        this.animationPlayers = entityAnimationMap.map(({ entity, setName }) => {
            const set = this.animationCatalogue.sets[setName];
            if (!set) {
                console.warn(`Animation set "${setName}" not found for entity "${entity.resourceName}"`);
                return null;
            }
            const player = new AnimationPlayer(entity, set, {
                defaultAnimation: "idle",
                cellSize: this.map.cellSize,
            });
            // Entity'ye geri referans verelim, başka yerlerden de erişebilelim
            entity.animationPlayer = player;
            return player;
        }).filter(Boolean);
        // -----------------------

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

        // Animasyonlar hazır, ana döngüyü başlat
        this.ctx.save();
        requestAnimationFrame((time) => this.update(time));
    }

    async story() {
        await this.addDialog("A Call to Arms", "", "To battle!", () => {
            this.turnOffAllOverlays();
        });
    }

    async handleCombatEnd(winner) {
        await sleep(2000);
        if (winner === this.player.entity.party) {
            await this.tempTextPane.showMessage("VICTORY", 40, 2000);
        } else {
            await this.tempTextPane.showMessage("DEFEAT", 40, 2000);
        }
        await sleep(4000);
        this.turnOnAllOverlays();
        this.cardPane.off();
    }

    update(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        // we use delta time to calculate updates regardless of what fps we get
        this.lastTime = currentTime;

        // Make logic updates here
        if (this.spaceScene.visible) this.spaceScene.update(deltaTime);

        this.terminalPane.update(deltaTime);

        this.entities.forEach((e) => e.update(deltaTime));
        this.player.update(deltaTime);

        // Animation player'ları güncelle (frame ilerlemesi)
        this.animationPlayers.forEach((p) => p.update(deltaTime));

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

            this.entities.forEach((e) => e.draw(this.canvas));

            // Painter's algorithm: y koordinatına göre sırala, arkadakini önce çiz
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
await app.load();
await app.start();