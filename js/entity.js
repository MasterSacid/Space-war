import { Coordinate, lerp, astar } from "./utils.js";

export class Entity {
    constructor(center = new Coordinate(0, 0), name = "Empty") {
        this.center = center;
        this.name = name;
        this.width = 50;
        this.height = 50;
        this.cell = { row: undefined, col: undefined };
        this.reachRadius = 3;
        this.cellsInReach = [];
        this.lerpStart = new Coordinate(0, 0);
        this.lerpEnd = new Coordinate(0, 0);
        this.lerping = false;
        this.lerpingProgress = 0;
        this.lerpDuration = 1 / this.reachRadius;
        this.showAura = true;
    }

    draw(ctx) {
        ctx.fillStyle = "red";
        ctx.fillRect(this.center.x - this.width / 2, this.center.y - this.height / 2, this.width, this.height);
        ctx.fillStyle = "black";
        ctx.fillText(this.name, this.center.x - this.width / 20 * this.name.length, this.center.y + this.width / 1.25, this.width);
        ctx.fillText(`${Math.ceil(this.center.x)}, ${Math.ceil(this.center.y)}`, this.center.x - this.width / 20 * this.name.length, this.center.y + this.width, this.width);
    }

    isCellInReach(hoveredCell) {
        for (const cell of this.cellsInReach) {
            if (hoveredCell.col == cell.col && hoveredCell.row == cell.row) {
                return true;
            }
        }
        return false;
    }

    async takePath(cellSize, path) {
        this.showAura = false;
        for (let i = 1; i < path.length; i++) {
            await new Promise((resolve) => this.moveToCell(cellSize, path[i], resolve));
        }
        this.showAura = true;
    }

    moveToCell(cellSize, targetCell, resolve) {
        this.lerpEnd.x = targetCell.col * cellSize + cellSize / 2;
        this.lerpEnd.y = targetCell.row * cellSize + cellSize / 2;
        this.lerpStart = this.center.clone();
        this.lerpingProgress = 0;
        this.lerping = true;
        this.resolve = resolve;
        return true;
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
    }
}

export class Player {
    constructor(canvas, entity = new Entity(new Coordinate(0, 0), "Player")) {
        this.canvas = canvas;
        this.entity = entity;
        this.keys = {};
        this.enableKeyboardMovement = false;

        this.#addEventListeners();
    }

    #addEventListeners() {
        window.addEventListener("keydown", (e) => this.keys[e.key] = true);
        window.addEventListener("keyup", (e) => this.keys[e.key] = false);
    }

    update(dt) {
        if (!this.keys) return;
        if (this.enableKeyboardMovement) {
            if (this.keys['w']) this.entity.center.y -= 100 * dt;
            if (this.keys['a']) this.entity.center.x -= 100 * dt;
            if (this.keys['s']) this.entity.center.y += 100 * dt;
            if (this.keys['d']) this.entity.center.x += 100 * dt;
        }
    }
}
