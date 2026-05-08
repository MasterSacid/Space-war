import { Coordinate, lerp, cellToKey, reconstructPath, manhattan, astar } from "./utils.js";

export class Entity {
    constructor(center = new Coordinate(0, 0), name = "Empty") {
        //Position info
        this.center = center;
        this.width = 50;
        this.height = 50;
        this.cell = { col: undefined, row: undefined };
        this.color = "red";

        // Properties
        this.maxActionPoints = 3;
        this.maxHealth = 100;
        this.attackDamage = 20;
        this.attackSwing = 10;
        this.agility = 1;

        // Combat info
        this.name = name;
        this.party = this.name;
        this.cellsInReach = [];
        this.dijkstraInfo = null;
        this.dirty = true;
        this.reachRadius = this.maxActionPoints * this.agility;
        this.actionPoints = 0;
        this.health = this.maxHealth;
        this.hasTurn = false;

        // Animation info
        this.showAura = false;
        this.moving = false;
        this.lerpStart = new Coordinate(0, 0);
        this.lerpEnd = new Coordinate(0, 0);
        this.lerping = false;
        this.lerpingProgress = 0;
        this.lerpDuration = 1 / this.reachRadius;
        this.activePath = null;
        this.pathIndex = 1;
        this.cellSize = 0;
        this.apLimit = 0;

        // Initial update
        this.update(0);
    }

    isCellInReach(cell) {
        return this.dijkstraInfo.has(cellToKey(cell));
    }

    startTraversing(targetCell, cellSize, actionPointLimit) {
        if (this.moving) return;
        if (!this.isCellInReach(targetCell)) return;
        this.moving = true;
        // BUG: IT TOOK ME A LOT OF TIME TO FIGURE THIS SO DON'T FORGET IT NEXT TIME.
        // YOU WERE PASSING targetCell without the Dijkstra information.
        const targetCellWithInfo = this.dijkstraInfo.get(cellToKey(targetCell));
        targetCellWithInfo.col = targetCell.col;
        targetCellWithInfo.row = targetCell.row;
        this.activePath = reconstructPath(targetCellWithInfo, this.dijkstraInfo);
        this.pathIndex = 1;
        this.cellSize = cellSize;
        this.apLimit = actionPointLimit;
        return true;
    }

    moveToCell(targetCell) {
        this.lerpEnd.x = targetCell.col * this.cellSize + this.cellSize / 2;
        this.lerpEnd.y = targetCell.row * this.cellSize + this.cellSize / 2;
        this.lerpStart = this.center.clone();
        this.lerpingProgress = 0;
        this.lerping = true;
    }

    takeAction(combat, map) {
        const chance = Math.random();
        const healthRatio = this.health / this.maxHealth / 2;

        const closest = combat.filterEntitiesBy((a, b) => {
            manhattan(this.cell, a.cell) < manhattan(this.cell, b.cell);
        }).extractMin();

        if (chance < 0.5 + healthRatio) {
            //Attack
            const path = astar(this.cell, closest.cell, map.getAdjacentCells());
            this.activePath = path;
            this.startTraversing(closest.cell, map.cellSize, this.actionPoints);
            console.log(closest.cell);
        } else {
            //Run away
        }
    }


    update(dt) {
        if (this.lerping) {
            this.lerpingProgress += dt / this.lerpDuration;
            if (this.lerpingProgress >= 1) {
                this.lerpingProgress = 1;
                this.lerping = false;
                this.pathIndex++;
            }

            const easeout = 1 - (1 - this.lerpingProgress) * (1 - this.lerpingProgress);

            this.center.x = lerp(this.lerpStart.x, this.lerpEnd.x, easeout);
            this.center.y = lerp(this.lerpStart.y, this.lerpEnd.y, easeout);
        } else if (this.activePath && this.pathIndex < this.activePath.length) {
            let nextCell = this.activePath[this.pathIndex];

            if ((this.actionPoints - nextCell.totalCost) >= this.apLimit) {
                this.moveToCell(nextCell);
            } else if (this.moving) {
                this.moving = false;
                this.actionPoints = 0;
                this.actionPoints -= Math.ceil(this.activePath[this.pathIndex - 1].totalCost / this.agility);
                this.activePath = null;
                this.hasTurn = false;
            }
        } else if (this.moving) {
            this.moving = false;
            this.actionPoints -= Math.ceil(this.activePath[this.pathIndex - 1].totalCost / this.agility);
            this.activePath = null;
            if (this.actionPoints <= 0) {
                this.hasTurn = false;
            }
        }

        if (!this.moving) {
            const cell = { col: Math.floor(this.center.x / 64), row: Math.floor(this.center.y / 64) }
            if (!(this.cell.col == cell.col && this.cell.row == cell.row)) {
                this.previousCell = this.cell;
                this.cell = cell;
                this.dirty = true;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.center.x - this.width / 2, this.center.y - this.height / 2, this.width, this.height);
        ctx.fillStyle = "black";
        ctx.fillText(this.name, this.center.x - this.width / 20 * this.name.length, this.center.y + this.width / 1.25, this.width);
        ctx.fillText(`${Math.ceil(this.center.x)}, ${Math.ceil(this.center.y)}`, this.center.x - this.width / 20 * this.name.length, this.center.y + this.width, this.width);
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
        // Key checks
        if (!this.keys) return;
        if (this.keys['a']) this.mode = "attack";
        if (this.health < 0) {
            this.color = "gray";
        }
    }
}
