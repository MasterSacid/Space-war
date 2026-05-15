import { Coordinate, cellToKey, reconstructPath, manhattan, astar, sleep } from "./utils.js";
import { actionRegistry } from "./action.js";
import { eventSystem, EventSystem } from "./eventSystem.js";
import { app } from "./index.js";

export class Entity extends EventSystem {
    constructor(center = new Coordinate(0, 0), name = "Empty") {
        super();

        this.showName = true;

        // Actions
        this.actions = new Set();
        this.actionQueue = [];

        // Position info
        this.center = center;
        this.width = 50;
        this.height = 50;
        this.cell = { col: undefined, row: undefined };
        this.color = "red";
        this.dijkstraInfo = new Set();
        this.moving = false;

        // Core Properties
        this.maxActionPoints = 3;
        this.maxHealth = 100;
        this.agility = 1;
        this.rotation = 0;

        // Combat info
        this.name = name;
        this.resourceName = this.name;
        this.party = this.name;
        this.actionPoints = 0;
        this.health = this.maxHealth;
        this.hasTurn = false;
        this.showAura = false;
        this.status = new Map();

        // Bot Ability definition
        this.ability = {
            name: "meleeAttack",
            args: { cost: 1, range: 1, damage: 20, swing: 10 }
        };

        // Initial update
        this.update(0);

        this.subscribe("gainAction", ({ combat, map }) => this.takeAction(combat, map));
        this.subscribe("move:end", () => {
            const cell = { col: Math.floor(this.center.x / 64), row: Math.floor(this.center.y / 64) }
            if (!(this.cell.col == cell.col && this.cell.row == cell.row)) {
                this.previousCell = this.cell;
                this.cell = cell;
            }
        });

        this.subscribe("action:end", () => {
            this.actionQueue.shift();
        })

        this.publish("move:end");
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        eventSystem.publish("entity:heal", { amount: amount })
    }

    takeDamage(damage) {
        if (this.status.has("dead")) return;
        this.health -= damage;
        eventSystem.publish("entity:damaged", {
            entityName: this.resourceName,
            health: this.health,
            damage: damage
        });

        if (this.health <= 0) {
            this.status.set("dead", true);
            eventSystem.publish("entity:death", { entity: this, entityName: this.name });
            this.publish("died", { entity: this });
            this.color = "gray";
        }
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
        const moveAction = actionRegistry.get("move").init(this, path, apLimit, cellSize);
        this.enqueueAction(moveAction);
    }

    takeAction(combat, map) {
        const targets = combat.filterEntitiesBy(
            (a, b) => manhattan(this.cell, a.cell) < manhattan(this.cell, b.cell),
            (parties) => {
                const array = [];
                for (const [party, members] of parties) {
                    if (party != this.party) array.push(members);
                }
                return array;
            },
            (filteredParties) => [...filteredParties]
        );

        const closest = targets.extractMin();

        if (!closest) {
            this.enqueueAction(actionRegistry.get("skip").init(this, null, { healRatio: 0.05 }));
            return;
        }

        map.appendCell(closest.cell.col, closest.cell.row, { occupied: false });
        const path = astar(this.cell, closest.cell, (cell) => map.getAdjacentCells(cell));
        map.appendCell(closest.cell.col, closest.cell.row, { occupied: true });

        const args = this.ability.args;

        if ((this.isCellIn(closest.cell, args.range) && this.actionPoints >= args.cost)) {
            this.enqueueAction(actionRegistry.get(this.ability.name).init(this, { target: [closest] }, args));
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
            if (!action.active) action.start();
            action.update(dt);
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
        //ctx.fillStyle = this.color;
        //ctx.fillRect(this.center.x - this.width / 2, this.center.y - this.height / 2, this.width, this.height);
        //if (this.showName) {
        //    ctx.fillStyle = "black";
        //    ctx.fillText(this.name, this.center.x - this.width / 20 * this.name.length, this.center.y + this.width / 1.25, this.width * 2);
        //    ctx.fillText(`${Math.ceil(this.center.x)}, ${Math.ceil(this.center.y)}`, this.center.x - this.width / 20 * this.name.length, this.center.y + this.width, this.width * 2);
        //}

        ctx.restore();
    }
}

export class RangedEntity extends Entity {
    constructor(center = new Coordinate(0, 0), name = "Empty") {
        super(center, name);
        this.ability = {
            name: "rangedAttack",
            args: { cost: 1, range: 5, damage: 10, swing: 8, kickback: 0.1, speed: 400 }
        };
    }

    takeAction(combat, map) {
        const targets = combat.filterEntitiesBy(
            (a, b) => manhattan(this.cell, a.cell) < manhattan(this.cell, b.cell),
            (parties) => {
                const array = [];
                for (const [party, members] of parties) {
                    if (party != this.party) array.push(members);
                }
                return array;
            },
            (filteredParties) => [...filteredParties]
        );

        const closest = targets.extractMin();

        if (!closest) {
            this.enqueueAction(actionRegistry.get("skip").init(this, null, { healRatio: 0.05 }));
            return;
        }

        const args = this.ability.args;
        const distance = manhattan(this.cell, closest.cell);
        const halfRange = Math.floor(args.range / 2);

        if (distance <= args.range && this.actionPoints >= args.cost) {
            this.enqueueAction(actionRegistry.get(this.ability.name).init(this, { target: [closest] }, args));
            return;
        }

        if (distance <= halfRange) {
            this.enqueueAction(actionRegistry.get("skip").init(this, null, { healRatio: 0.05 }));
            return;
        }

        map.appendCell(closest.cell.col, closest.cell.row, { occupied: false });
        const path = astar(this.cell, closest.cell, (cell) => map.getAdjacentCells(cell));
        map.appendCell(closest.cell.col, closest.cell.row, { occupied: true });

        const targetRangeToStopAt = this.actionPoints >= args.cost ? args.range : halfRange;

        const truncatedPath = [];
        for (const tile of path) {
            truncatedPath.push(tile);
            if (manhattan(tile, closest.cell) <= targetRangeToStopAt) {
                break;
            }
        }

        if (truncatedPath.length > 1) {
            this.tracePath(truncatedPath, map.cellSize, 0);
        } else {
            this.enqueueAction(actionRegistry.get("skip").init(this, null, { healRatio: 0.05 }));
        }
    }
}


export class AreaDamagingEntity extends Entity {
    constructor(center = new Coordinate(0, 0), name = "Empty") {
        super(center, name);
        this.maxActionPoints = 3;
        this.ability = {
            name: "areaAttack",
            args: { cost: 2, range: 6, radius: 2, damage: 15, swing: 10, kickback: -0.1, speed: 400 }
        };
    }

    takeAction(combat, map) {
        const targets = combat.filterEntitiesBy(
            (a, b) => manhattan(this.cell, a.cell) < manhattan(this.cell, b.cell),
            (parties) => {
                const array = [];
                for (const [party, members] of parties) {
                    if (party != this.party) array.push(members);
                }
                return array;
            },
            (filteredParties) => [...filteredParties]
        );

        const closest = targets.extractMin();

        if (!closest) {
            this.enqueueAction(actionRegistry.get("skip").init(this, null, { healRatio: 0.05 }));
            return;
        }

        const args = this.ability.args;
        const distance = manhattan(this.cell, closest.cell);
        const halfRange = Math.floor(args.range / 2);

        if (distance <= args.range && this.actionPoints >= args.cost) {
            this.enqueueAction(actionRegistry.get(this.ability.name).init(this, { target: [{ col: closest.cell.col, row: closest.cell.row }] }, args));
            return;
        }

        if (distance <= halfRange) {
            this.enqueueAction(actionRegistry.get("skip").init(this, null, { healRatio: 0.05 }));
            return;
        }

        map.appendCell(closest.cell.col, closest.cell.row, { occupied: false });
        const path = astar(this.cell, closest.cell, (cell) => map.getAdjacentCells(cell));
        map.appendCell(closest.cell.col, closest.cell.row, { occupied: true });

        const targetRangeToStopAt = this.actionPoints >= args.cost ? args.range : halfRange;

        const truncatedPath = [];
        for (const tile of path) {
            truncatedPath.push(tile);
            if (manhattan(tile, closest.cell) <= targetRangeToStopAt) {
                break;
            }
        }

        if (truncatedPath.length > 1) {
            this.tracePath(truncatedPath, map.cellSize, 0);
        } else {
            this.enqueueAction(actionRegistry.get("skip").init(this, null, { healRatio: 0.05 }));
        }
    }
}

export class PlayableEntity extends Entity {
    constructor(center, name) {
        super(center, name);

        this.targetAura = false;
        this.blastAura = false;
        this.playerActions = [];
        this.selectedAction = null;

        this.playerActions.push({ name: "skip", args: { healRatio: 0.05 } });

        this.updateActionMenu();

        this.subscribe("gainTurn", () => {
            this.updateActionMenu();
            this.selectedAction = null;
        });

        this.subscribe("receiveAction", ({ answer }) => {
            if (this.selectedAction) {
                if (this.actionPoints >= (this.selectedAction.args.cost || 0)) {
                    const action = actionRegistry.get(this.selectedAction.name).init(this, answer, this.selectedAction.args);
                    this.enqueueAction(action);
                }
            } else {
                if (answer && answer.cell && this.isCellInRange(answer.cell)) {
                    const cell = this.dijkstraInfo.get(cellToKey(answer.cell));
                    cell.col = answer.cell.col;
                    cell.row = answer.cell.row;
                    const path = reconstructPath(cell, this.dijkstraInfo);
                    const action = actionRegistry.get("move").init(this, path, 0, answer.cellSize);
                    this.enqueueAction(action);
                }
            }
        });

        this.subscribe("action:end", () => {
            this.updateActionMenu();
            eventSystem.publish("player:entity:action:complete");
        });
    }

    takeAction() { }

    updateActionMenu() {
        const array = [];
        for (const { name, args } of this.playerActions) {
            const action = actionRegistry.get(name).preview(this, args);

            const cost = args.cost || 0;
            const canAfford = this.actionPoints >= cost;

            array.push({
                title: action.getTitle(),
                description: action.getDescription(),
                canAfford: canAfford
            });
        }
        eventSystem.publish("entity:option", { options: array });
    }
}

export class Player extends EventSystem {
    constructor(canvas, entity = new Entity(new Coordinate(32, 32), "Player"), viewport) {
        super();
        this.canvas = canvas;
        this.entity = entity;
        this.viewport = viewport;
        this.keys = {};
        this.enableKeyboardMovement = false;
        this.hasAction = true;
        this.answer = {};
        this.answerQueue = [];

        this.#addEventListeners();

        this.subscribe("click", ({ cell, entity, cellSize }) => {
            if (!this.entity.selectedAction) {
                this.entity.publish("receiveAction", { answer: { cell: cell, cellSize: cellSize } });
            } else {
                this.processClick(cell, entity, cellSize);
            }
        });

        eventSystem.subscribe("player:entity:action:complete", () => this.played());

        eventSystem.subscribe("player:select", ({ index }) => {
            if (this.hasAction) {
                if (index === -1) {
                    this.entity.selectedAction = null;
                    this.answer = {};
                    this.answerQueue = [];
                    return;
                }

                this.entity.selectedAction = this.entity.playerActions[index];
                if (this.entity.selectedAction) {
                    const actionDef = this.entity.selectedAction;
                    const actionClass = actionRegistry.get(actionDef.name);
                    const targetRequest = actionClass.selection(actionDef.args || {});
                    this.manageSelection(targetRequest);
                }
            }
        });
    }

    manageSelection(request) {
        if (!request) {
            this.entity.publish("receiveAction", { answer: this.answer });
            return;
        };
        this.answer = {};
        this.answerQueue = Object.entries(request);
    }

    processClick(cell, entity, cellSize) {
        if (!this.answerQueue || this.answerQueue.length === 0) return;

        const [key, value] = this.answerQueue[0];

        if (!value.type || !value.amount) {
            this.answerQueue.shift();
            return this.processClick(cell, entity, cellSize);
        }

        if (value.range !== undefined) {
            if (!this.entity.isCellIn(cell, value.range)) {
                console.log("Invalid target: Selection is out of range!");
                eventSystem.publish("entity:action-blocked", { entityName: this.entity.resourceName });
                return;
            }
        }

        if (!this.answer[key]) this.answer[key] = [];

        if (value.type === "entity") {
            if (entity != null) {

                if (value.alignment === "enemy" && entity.party === this.entity.party) {
                    console.log("Invalid target: You cannot attack an ally!");
                    eventSystem.publish("entity:action-blocked", { entityName: this.entity.resourceName });
                    return;
                }
                if (value.alignment === "ally" && entity.party !== this.entity.party) {
                    console.log("Invalid target: You can only use this on an ally!");
                    eventSystem.publish("entity:action-blocked", { entityName: this.entity.resourceName });
                    return;
                }

                this.answer[key].push(entity);
            } else {
                console.log("Invalid target: This action requires you to click an Entity.");
                eventSystem.publish("entity:action-blocked", { entityName: this.entity.resourceName });
            }
        } else if (value.type === "cell" && cell != null) {
            this.answer[key].push(cell);
        }

        if (this.answer[key].length >= value.amount) {
            this.answerQueue.shift();

            if (this.answerQueue.length === 0) {
                this.entity.publish("receiveAction", { answer: this.answer });
            }
        }
    }

    played() {
        eventSystem.publish("player:played", {});
        this.hasAction = false;
        this.entity.showAura = false;
        this.targetAura = false;
        this.blastAura = false;
    }

    #addEventListeners() {
        window.addEventListener("keydown", (e) => this.keys[e.key] = true);
        window.addEventListener("keyup", (e) => this.keys[e.key] = false);
    }

    update(dt) { }
}
