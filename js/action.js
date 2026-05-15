import { Entity } from './entity.js';
import { Coordinate, lerp, manhattan } from './utils.js';
import { app } from './index.js';
import { eventSystem } from './eventSystem.js';


class Action {
    constructor() {
        this.entity;
        this.lerpDuration;
        this.lerpProgress;
        this.lerping = false;
        this.lerpEnd = { x: 0, y: 0 };
        this.lerpStart = { x: 0, y: 0 };
        this.lerper = (t) => 1 - (1 - t) * (1 - t);
        this.args = {};
    }

    preview(entity, args = {}) {
        this.entity = entity;
        this.args = args;
        return this;
    }

    init(entity, selection, args = {}) {
        this.entity = entity;
        this.args = args;
        this.lerpDuration = 0.5 / (this.entity.maxActionPoints * this.entity.agility)
        this.lerpProgress = 0;
        return this;
    }

    selection(args) { return null; }

    updateLerp(dt, onComplete) {
        this.lerpProgress += dt / this.lerpDuration;

        let finished = false;
        if (this.lerpProgress >= 1) {
            this.lerpProgress = 1;
            this.lerping = false;
            finished = true;
        }

        const t = this.lerper(this.lerpProgress);
        this.entity.center.x = lerp(this.lerpStart.x, this.lerpEnd.x, t);
        this.entity.center.y = lerp(this.lerpStart.y, this.lerpEnd.y, t);

        if (finished && onComplete) onComplete();
    }
}

export class Skip extends Action {
    getTitle() { return "Skip"; }

    getDescription() {
        const ratio = this.args.healRatio || 0.05;
        const healAmount = this.entity.actionPoints * Math.round(ratio * this.entity.maxHealth);
        return `Use all your remaining action points to rest.
                Heal yourself by ${ratio * 100}% per action point you have. (${healAmount})`;
    }

    start() {
        const ratio = this.args.healRatio || 0.05;
        const healAmount = this.entity.actionPoints * Math.round(ratio * this.entity.maxHealth);
        this.entity.heal(healAmount);
        this.entity.actionPoints = 0;
        this.entity.publish("action:end", { entity: this.entity });
    }

    update() { return true; }
}

export class MoveAction extends Action {
    constructor() {
        super();
        this.path;
        this.apLimit;
        this.cellSize;
        this.pathIndex;

        this.active = false;
    }

    selection() { return null };

    init(entity, path, apLimit, cellSize) {
        super.init(entity);
        this.path = path;
        this.apLimit = apLimit;
        this.cellSize = cellSize;

        return this;
    }

    start() {
        this.active = true;
        this.pathIndex = 1;
    }

    end() {
        const lastTile = this.path[this.pathIndex - 1];
        this.entity.actionPoints -= lastTile.totalCost;

        this.active = false;
        this.pathIndex = 0;
        this.entity.moving = false;

        this.entity.publish("action:end", { entity: this.entity });

        eventSystem.publish("move:end", { entityName: this.entity.resourceName });
    }

    moveTo(targetCell) {
        this.lerpEnd.x = targetCell.col * this.cellSize + this.cellSize / 2;
        this.lerpEnd.y = targetCell.row * this.cellSize + this.cellSize / 2;
        this.lerpStart = this.entity.center.clone();
        this.lerpProgress = 0;
        this.lerping = true;

        eventSystem.publish("entity:move", {
            eventAction: "move",
            entityName: this.entity.resourceName
        });

        this.entity.publish("move:start", {});
    }

    update(dt) {
        if (this.active) {
            if (this.lerping) {
                this.updateLerp(dt, () => {
                    this.entity.publish("move:end");
                    this.pathIndex++
                });
            } else if (this.pathIndex < this.path.length) {
                const nextTile = this.path[this.pathIndex];
                if (this.entity.actionPoints - nextTile.totalCost >= this.apLimit) {
                    this.moveTo(nextTile);
                } else {
                    this.end();
                }
            } else {
                this.end();
            }

            return false;
        } else {
            return true;
        }
    }
}

export class MeleeAttackAction extends Action {
    constructor() {
        super();
        this.active = false;
        this.lerper = (t) => t * t;
    }

    selection(args = {}) {
        const range = args.range || this.args?.range || 1;
        const alignment = args.alignment || this.args?.alignment || "none";

        return {
            target: {
                type: "entity",
                amount: 1,
                range: range,
                alignment: alignment,
                showTargetAura: true
            }
        };
    }

    getTitle() { return "Attack"; }

    getDescription() {
        return `Cost:${this.args.cost}.
                Range:${this.args.range}.
                Deal ${this.args.damage} + up to ${this.args.swing}.`;
    }

    init(entity, selection, args) {
        super.init(entity, selection, args);
        this.startingPosition = this.entity.center.clone();
        this.target = selection.target[0];
        return this;
    }

    start() {
        if (this.entity.actionPoints < (this.args?.cost || 1)) {
            console.warn("Action aborted: Insufficient AP.");
            this.end();
            return;
        }

        this.active = true;
        this.stage = 0;
    }

    end() {
        this.active = false;
        this.entity.publish("action:end", { entity: this.entity });
        eventSystem.publish("move:end", { entityName: this.entity.resourceName });
    }

    moveToTarget() {
        const dist = { x: (this.entity.center.x - this.target.center.x) * 0.5, y: (this.entity.center.y - this.target.center.y) * 0.5 };
        const endPos = { x: this.target.center.x + dist.x, y: this.target.center.y + dist.y };
        this.lerpStart = this.entity.center.clone();
        this.lerpEnd = endPos;
        this.lerping = true;
        this.lerpProgress = 0;
        eventSystem.publish("entity:move", {
            eventAction: "move",
            entityName: this.name
        });
    }

    moveBack() {
        this.lerpStart = this.entity.center.clone();
        this.lerpEnd = this.startingPosition;
        this.lerping = true;
        this.lerpProgress = 0;
        eventSystem.publish("entity:move", {
            eventAction: "move",
            entityName: this.name
        });
    }

    dealDamage() {
        this.entity.actionPoints -= this.args.cost;
        const damage = this.args.damage + Math.round(Math.random() * this.args.swing);
        this.target.takeDamage(damage);
        eventSystem.publish("entity:attack", { entityName: this.entity.resourceName });
    }

    update(dt) {
        if (this.active) {
            if (this.lerping) {
                this.updateLerp(dt, () => {
                    this.stage++
                });
            } else {
                if (this.stage == 0) {
                    this.moveToTarget();
                } else if (this.stage == 1) {
                    this.dealDamage();
                    this.moveBack();
                } else {
                    this.end()
                }
            }
            return false;
        } else {
            return true;
        }
    }
}

export class RangedAttackAction extends Action {
    constructor() { super(); }

    selection(args) {
        const safeArgs = args || this.args || {};
        const range = safeArgs.range || 1;
        const alignment = safeArgs.alignment || "any";

        return {
            target: {
                type: "entity",
                amount: 1,
                range: range,
                alignment: alignment,
                showTargetAura: true
            }
        };
    }

    getTitle() { return "Take aim"; }

    getDescription() {
        return `Cost:${this.args.cost}.
                Range:${this.args.range}.
                Deal ${this.args.damage} + up to ${this.args.swing} from afar.`;
    }

    init(entity, selection, args) {
        super.init(entity, selection, args);
        this.target = selection.target[0];

        this.kickback = this.args.kickback || 0.1;
        this.projectileSpeed = this.args.speed || 400;
        return this;
    }

    start() {
        if (this.entity.actionPoints < (this.args?.cost || 1)) {
            console.warn("Action aborted: Insufficient AP.");
            this.end();
            return;
        }

        this.startingPosition = this.entity.center.clone();
        this.lerperProjectile = (t) => t ** 2;

        this.distance = { x: this.target.center.x - this.entity.center.x, y: this.target.center.y - this.entity.center.y };
        const distMag = Math.sqrt(this.distance.x ** 2 + this.distance.y ** 2);
        const dir = {
            x: distMag > 0 ? this.distance.x / distMag : 0,
            y: distMag > 0 ? this.distance.y / distMag : 0
        };

        const spawn = {
            x: this.entity.center.x + (dir.x * this.entity.width * 0.6),
            y: this.entity.center.y + (dir.y * this.entity.height * 0.6)
        };

        this.projectile = new Entity(new Coordinate(spawn.x, spawn.y), "projectile");
        this.projectile.width = 20;
        this.projectile.height = 60;
        this.projectile.rotation = Math.atan2(this.target.center.y - this.entity.center.y, this.target.center.x - this.entity.center.x) + Math.PI / 2;
        this.projectileLerpDuration = distMag / this.projectileSpeed;
        this.projectileLerping = false;
        this.projectileLerpingProgress = 0;
        this.projectileLerpStart = { x: spawn.x, y: spawn.y };
        this.projectileLerpEnd = { x: this.target.center.x, y: this.target.center.y };

        this.active = true;
        this.stage = 0;
        this.moveBack();
    }

    end() {
        this.entity.publish("action:end", { entity: this.entity });
        eventSystem.publish("move:end", { entityName: this.name });
        this.active = false;
    }

    dealDamage() {
        this.entity.actionPoints -= this.args.cost;
        const damage = this.args.damage + Math.round(Math.random() * this.args.swing);
        this.target.takeDamage(damage);
        eventSystem.publish("entity:attack", { entityName: this.name });
    }

    updateLerpProjectile(dt) {
        this.projectileLerpingProgress += dt / this.projectileLerpDuration;

        if (this.projectileLerpingProgress >= 1) {
            this.projectileLerpingProgress = 1;
            this.projectileLerping = false;
        }

        const t = this.lerperProjectile(this.projectileLerpingProgress);
        this.projectile.center.x = lerp(this.projectileLerpStart.x, this.projectileLerpEnd.x, t);
        this.projectile.center.y = lerp(this.projectileLerpStart.y, this.projectileLerpEnd.y, t);
    }

    moveBack() {
        this.lerpStart = this.entity.center.clone();
        this.lerpEnd = {
            x: this.entity.center.x - this.distance.x * this.kickback,
            y: this.entity.center.y - this.distance.y * this.kickback
        };
        this.lerping = true;
        this.lerpProgress = 0;
        this.stage = 0;
    }

    moveToStart() {
        this.lerpStart = this.entity.center.clone();
        this.lerpEnd = this.startingPosition;
        this.lerping = true;
        this.lerpProgress = 0;
        this.stage = 1;
    }

    update(dt) {
        if (!this.active) return true;

        if (this.lerping) {
            this.updateLerp(dt, () => {
                if (this.stage === 0) {
                    app.entities.push(this.projectile);
                    this.projectileLerping = true;
                    this.moveToStart();
                }
            });
        }

        if (this.projectileLerping) {
            this.updateLerpProjectile(dt);

            if (!this.projectileLerping) {
                this.dealDamage();

                const index = app.entities.indexOf(this.projectile);
                if (index > -1) {
                    app.entities.splice(index, 1);
                }
            }
        }

        if (!this.projectileLerping && !this.lerping && this.stage === 1) {
            this.end();
            return true;
        }

        return false;
    }
}

export class AreaAttackAction extends RangedAttackAction {
    constructor() { super(); }

    selection(args = {}) {
        const radius = args.radius || this.args?.radius || 1;
        const range = args.range || this.args?.range || 1;
        return {
            target: {
                type: "cell",
                amount: 1,
                range: range,
                showTargetAura: true,
                showBlastAura: true,
                blastRadius: radius
            }
        };
    }

    getTitle() { return "Blast"; }

    getDescription() {
        return `Cost:${this.args.cost}.
                Range:${this.args.range}.
                Deal ${this.args.damage} + up to ${this.args.swing} to an area`;
    }

    dealDamage() {
        this.entity.actionPoints -= this.args.cost;
        const damage = this.args.damage + Math.round(Math.random() * this.args.swing);

        app.entities.forEach((e) => {
            if (!e.cell || e.health === undefined) return;
            const distance = manhattan(e.cell, this.impactCell);
            if (distance <= this.radius) {
                e.takeDamage(damage);
                eventSystem.publish("entity:attack", { entityName: this.entity.resourceName });
            }
        });
    }

    init(entity, selection, args) {
        this.entity = entity;

        const target = selection?.target?.[0];
        let targetCell;

        if (target && target.col !== undefined && target.row !== undefined) {
            targetCell = target;
        } else if (target && target.cell && target.cell.col !== undefined) {
            targetCell = target.cell;
        }

        if (!targetCell) {
            console.warn("AreaAttackAction failed: Target is missing or invalid.", selection);
            this.failed = true;
            return this;
        }

        const size = app.map.cellSize || 64;
        const targetX = (targetCell.col * size) + (size / 2);
        const targetY = (targetCell.row * size) + (size / 2);

        const dummyTarget = new Entity(new Coordinate(targetX, targetY), "dummyTarget");

        super.init(entity, { target: [dummyTarget] }, args);

        this.radius = args.radius || 1;
        this.impactCell = targetCell;

        return this;
    }
}

class ActionRegistry {
    constructor() { this.actions = new Map(); }

    register(name, actionClass) {
        this.actions.set(name, actionClass);
    }

    get(name) {
        const ActionClass = this.actions.get(name);
        return ActionClass ? new ActionClass() : null;
    }
}

export const actionRegistry = new ActionRegistry();

actionRegistry.register("skip", Skip);
actionRegistry.register("move", MoveAction);
actionRegistry.register("meleeAttack", MeleeAttackAction);
actionRegistry.register("rangedAttack", RangedAttackAction);
actionRegistry.register("areaAttack", AreaAttackAction);
