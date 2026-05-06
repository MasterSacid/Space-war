import { Coordinate, lerp, cellToKey, reconstructPath } from "./utils.js";

export class Entity {
    constructor(center = new Coordinate(0, 0), name = "Empty") {
        this.center = center;
        this.name = name;
        this.width = 50;
        this.height = 50;
        this.cell = { col: undefined, row: undefined };
        this.reachRadius = 3;
        this.cellsInReach = [];
        this.moving = false;
        this.lerpStart = new Coordinate(0, 0);
        this.lerpEnd = new Coordinate(0, 0);
        this.lerping = false;
        this.lerpingProgress = 0;
        this.lerpDuration = 1 / this.reachRadius;
        this.showAura = false;
        this.dijkstraInfo = null;
        this.dirty = true;

        this.health = 100;
        this.attackDamage = 20;
        this.actionResolve = null;
        this.update(0);
    }

    draw(ctx) {
        ctx.fillStyle = "red";
        ctx.fillRect(this.center.x - this.width / 2, this.center.y - this.height / 2, this.width, this.height);
        ctx.fillStyle = "black";
        ctx.fillText(this.name, this.center.x - this.width / 20 * this.name.length, this.center.y + this.width / 1.25, this.width);
        ctx.fillText(`${Math.ceil(this.center.x)}, ${Math.ceil(this.center.y)}`, this.center.x - this.width / 20 * this.name.length, this.center.y + this.width, this.width);
    }

    isCellInReach(hoveredCell) {
        return this.dijkstraInfo.has(cellToKey(hoveredCell));
    }

    async takePathTo(cellSize, targetCell) {
        const path = reconstructPath(targetCell, this.dijkstraInfo);
        console.log(cellSize);
        this.moving = true;
        for (let i = 1; i < path.length; i++) {
            await new Promise((resolve) => this.moveToCell(cellSize, path[i], resolve));
        }
        this.moving = false;
        return true;
    }

    moveToCell(cellSize, targetCell, resolve) {
        this.lerpEnd.x = targetCell.col * cellSize + cellSize / 2;
        this.lerpEnd.y = targetCell.row * cellSize + cellSize / 2;
        this.lerpStart = this.center.clone();
        this.lerpingProgress = 0;
        this.lerping = true;
        this.resolve = resolve;
    }

    update(dt) {
        if (this.lerping) {
            this.lerpingProgress += dt / this.lerpDuration;
            if (this.lerpingProgress >= 1) {
                this.lerpingProgress = 1;
                this.lerping = false;
                this.resolve();
            }

            const easeout = 1 - (1 - this.lerpingProgress) * (1 - this.lerpingProgress);

            this.center.x = lerp(this.lerpStart.x, this.lerpEnd.x, easeout);
            this.center.y = lerp(this.lerpStart.y, this.lerpEnd.y, easeout);
        }

        if (!this.moving) {
            const cell = { col: Math.floor(this.center.x / 64), row: Math.floor(this.center.y / 64) }
            if (!(this.cell.col == cell.col && this.cell.row == cell.row)) {
                this.cell = cell;
                this.dirty = true;
            }
        }
    }
}

export class Player {
    constructor(canvas, entity = new Entity(new Coordinate(0, 0), "Player")) {
        this.canvas = canvas;
        this.entity = entity;
        this.keys = {};
        this.enableKeyboardMovement = false;
        this.actionResolve = null;

        this.#addEventListeners();
    }

    #addEventListeners() {
        window.addEventListener("keydown", (e) => this.keys[e.key] = true);
        window.addEventListener("keyup", (e) => this.keys[e.key] = false);
    }

    update(dt) {
        if (this.actionResolve != null && !this.entity.moving) {
            this.entity.showAura = true;
        } else {
            this.entity.showAura = false;
        }
        // Key checks
        if (!this.keys) return;
        if (this.keys['a']) this.mode = "attack";
    }
}
