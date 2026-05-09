import { Coordinate, cellToKey, reconstructPath, manhattan, astar } from "./utils.js";
import { MoveAction } from "./action.js";

export class Entity {
    constructor(center = new Coordinate(0, 0), name = "Empty") {
        // Actions
        this.actionQueue = [];

        //Position info
        this.center = center;
        this.width = 50;
        this.height = 50;
        this.cell = { col: undefined, row: undefined };
        this.color = "red";
        this.dirty = true;
        this.dijkstraInfo = null;
        this.moving = false;

        // Properties
        this.maxActionPoints = 3;
        this.maxHealth = 100;
        this.attackDamage = 20;
        this.attackSwing = 10;
        this.agility = 1;

        // Combat info
        this.name = name;
        this.party = this.name;
        this.actionPoints = 0;
        this.health = this.maxHealth;
        this.hasTurn = false;
        this.showAura = false;

        // Initial update
        this.update(0);
    }

    enqueueAction(action) {
        this.actionQueue.push(action);
    }

    isIdle() {
        return this.actionQueue.length === 0;
    }

    isCellInReach(cell) {
        return this.dijkstraInfo.has(cellToKey(cell));
    }

    isCellInRange(cell) {
        return manhattan(this.cell, cell) <= this.getReachRadius();
    }

    getReachRadius() {
        return Math.floor(this.actionPoints * this.agility);
    }

    getDijkstraPath(targetCell) {
        if (!this.isCellInReach(targetCell)) return null;
        const targetCellWithInfo = this.dijkstraInfo.get(cellToKey(targetCell));
        targetCellWithInfo.col = targetCell.col;
        targetCellWithInfo.row = targetCell.row;
        return reconstructPath(targetCellWithInfo, this.dijkstraInfo);
    }

    tracePath(path, cellSize, apLimit = 0) {
        const moveAction = new MoveAction(this, path, apLimit, cellSize);
        this.enqueueAction(moveAction);
    }

    takeAction(combat, map) {
        const chance = Math.random();

        const targets = combat.filterEntitiesBy(
            (a, b) => {
                return manhattan(this.cell, a.cell) < manhattan(this.cell, b.cell);
            },
            (parties) => {
                const array = [];
                for (const [party, members] of parties) {
                    if (party != this.party) {
                        array.push(members);
                    }
                }
                return array;
            },
            (filteredParties) => {
                return [...filteredParties];
            }
        );

        const healthRatio = this.health / this.maxHealth / 2;

        const closest = targets.extractMin();

        if (chance < 0.5 + healthRatio) {
            //Attack
            if (this.isCellInRange(closest.cell)) {
                console.log('in reach');
                this.hasTurn = false;
            } else {
                map.appendCell(closest.cell.col, closest.cell.row, { occupied: false });
                const path = astar(this.cell, closest.cell, (cell) => map.getAdjacentCells(cell));
                map.appendCell(closest.cell.col, closest.cell.row, { occupied: true });
                this.tracePath(path, map.cellSize, 0);
            }
        } else {
            //Run away
        }
    }

    update(dt) {
        if (this.actionPoints <= 0) this.hasTurn = false;
        if (!this.isIdle()) {
            const action = this.actionQueue[0];
            const done = action.update(dt);
            if (done) this.actionQueue.shift();
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
