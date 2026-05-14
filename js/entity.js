import { Coordinate, cellToKey, reconstructPath, manhattan, astar } from "./utils.js";
import { ActionDescriptor, AreaAttackAction, MeleeAttackAction, MoveAction, RangedAttackAction, Skip } from "./action.js";
import { eventSystem, EventSystem } from "./eventSystem.js";

export class Entity extends EventSystem {
    constructor(center = new Coordinate(0, 0), name = "Empty", entityType = "Empty", facingLeft = false) {
        super();

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
        this.facing = facingLeft ? -1 : 1;

        // Properties
        this.maxActionPoints = 3;
        this.maxHealth = 100;
        this.attackDamage = 20;
        this.rangedDamage = 10;
        this.areaDamage = 15;
        this.areaDamageRadius = 2;

        this.attackSwing = 10;
        this.agility = 1;
        this.attackRange = 1;
        this.attackCost = 1;

        this.rotation = 0;

        // Combat info
        this.name = name;
        this.party = this.name;
        this.entityType = entityType;
        this.actionPoints = 0;
        this.health = this.maxHealth;
        this.hasTurn = false;
        this.showAura = false;
        this.status = "alive"

        // Initial update
        this.update(0);

        this.subscribe("gainTurn", ({ combat, map }) => this.takeAction(combat, map));
    }

    faceToward(targetX) {
        const dx = targetX - this.center.x;
        if (dx === 0) return;
        this.facing = dx < 0 ? -1 : 1;
    }

    takeDamage(damage) {
        this.health -= damage;

        eventSystem.publish("entity:takeDamage", {
            eventAction: "takeDamage",
            health: this.health,
            damage: damage
        });

        if (this.health <= 0) {
            eventSystem.publish("entity:death", {
                entity: this
            });
        }

        this.publish("died", { entity: this });
        this.color = "gray";
    }

    enqueueAction(action) {
        this.actionQueue.push(action);
    }

    isIdle() {
        return this.actionQueue.length === 0;
    }

    isCellIn(cell, hdist) {
        return manhattan(this.cell, cell) <= hdist;
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

    getAttackDamage() {
        return this.attackDamage + Math.round(Math.random() * this.attackSwing);
    }

    getRangedDamage() {
        return this.rangedDamage + Math.round(Math.random() * this.attackSwing * 0.8);
    }

    getAreaDamage() {
        return this.rangedDamage + Math.round(Math.random() * this.attackSwing * 0.6);
    }

    takeAction(combat, map) {
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

        const closest = targets.extractMin();

        if (!closest) {
            this.enqueueAction(new Skip(this));
            return;
        }

        map.appendCell(closest.cell.col, closest.cell.row, { occupied: false });
        const path = astar(this.cell, closest.cell, (cell) => map.getAdjacentCells(cell));
        map.appendCell(closest.cell.col, closest.cell.row, { occupied: true });

        if ((this.isCellIn(closest.cell, this.attackRange) && this.actionPoints >= this.attackCost)) {
            this.enqueueAction(new MeleeAttackAction(this, closest));
        } else if (this.isCellInRange(closest.cell)) {
            path.pop();
            if (path.length > 1) {
                this.tracePath(path, map.cellSize);
            }
        } else {
            this.tracePath(path, map.cellSize);
        }
    }

    update(dt) {
        if (!this.isIdle()) {
            const action = this.actionQueue[0];
            const done = action.update(dt);
            if (done) {
                if (this.actionPoints <= 0) this.hasTurn = false;
                this.actionQueue.shift()
            }
        }

        if (this.health <= 0) {
            this.status = "dead";
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

    draw(canvas) {
        const ctx = canvas.getContext('2d');

        if (this.health <= 0) {
            this.color = "gray";
        }

        ctx.save();

        if (this.rotation !== 0) {
            ctx.translate(this.center.x, this.center.y);
            ctx.rotate(this.rotation);
            ctx.translate(-this.center.x, -this.center.y);
        }
        ctx.fillStyle = this.color;
        ctx.fillRect(this.center.x - this.width / 2, this.center.y - this.height / 2, this.width, this.height);
        ctx.fillStyle = "black";
        ctx.fillText(this.name, this.center.x - this.width / 20 * this.name.length, this.center.y + this.width / 1.25, this.width);
        ctx.fillText(`${Math.ceil(this.center.x)}, ${Math.ceil(this.center.y)}`, this.center.x - this.width / 20 * this.name.length, this.center.y + this.width, this.width);

        ctx.restore();
    }
}


export class RangedEntity extends Entity {
    constructor(center = new Coordinate(0, 0), name = "Empty", entityType = "Empty", facingLeft = false) {
        super(center, name, entityType, facingLeft);
        this.attackRange = 5;
        this.attackCost = 1;
    }
    takeAction(combat, map) {
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

        map.appendCell(closest.cell.col, closest.cell.row, { occupied: false });
        const path = astar(this.cell, closest.cell, (cell) => map.getAdjacentCells(cell));
        map.appendCell(closest.cell.col, closest.cell.row, { occupied: true });

        if (this.isCellIn(closest.cell, this.attackRange)) {
            if (this.actionPoints >= this.attackCost) {
                this.enqueueAction(new RangedAttackAction(this, closest, 0.1, 400));
            } else {
                this.enqueueAction(new Skip(this));
            }
        } else if (this.isCellInRange(closest.cell)) {
            path.pop();
            if (path.length > 1) {
                this.tracePath(path, map.cellSize);
            }
        } else {
            this.tracePath(path, map.cellSize);
        }
    }
}

export class AreaDamagingEntity extends Entity {
    constructor(center = new Coordinate(0, 0), name = "Empty", entityType = "Empty", facingLeft = false) {
        super(center, name, entityType, facingLeft);
        this.maxActionPoints = 3;
        this.attackRange = 6;
        this.attackCost = 2;
    }
    takeAction(combat, map) {
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

        map.appendCell(closest.cell.col, closest.cell.row, { occupied: false });
        const path = astar(this.cell, closest.cell, (cell) => map.getAdjacentCells(cell));
        map.appendCell(closest.cell.col, closest.cell.row, { occupied: true });

        if (this.isCellIn(closest.cell, this.attackRange)) {
            if (this.actionPoints >= this.attackCost) {
                this.enqueueAction(new AreaAttackAction(this, closest, -0.1, 400, this.areaDamageRadius));
            } else {
                console.log(this.actionPoints);
                this.enqueueAction(new Skip(this));
            }
        } else if (this.isCellInRange(closest.cell)) {
            path.pop();
            if (path.length > 1) {
                this.tracePath(path, map.cellSize);
            }
        } else {
            this.tracePath(path, map.cellSize);
        }
    }
}

export class Player extends EventSystem {
    constructor(canvas, entity = new Entity(new Coordinate(0, 0), "Player")) {
        super();
        this.canvas = canvas;
        this.entity = entity;
        this.keys = {};
        this.enableKeyboardMovement = false;
        this.hasTurn = true;

        this.#addEventListeners();

        this.subscribe("move", ({ path, cellSize, apLimit }) => {
            this.entity.tracePath(path, cellSize, apLimit);
            this.hasTurn = false;
        });
    }

    #addEventListeners() {
        window.addEventListener("keydown", (e) => this.keys[e.key] = true);
        window.addEventListener("keyup", (e) => this.keys[e.key] = false);
    }

    update(dt) {
        // Key checks
        if (!this.keys) return;
        if (this.keys['a']) this.mode = "attack";
    }
}
