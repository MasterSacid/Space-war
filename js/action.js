import { Entity } from './entity.js';
import { Coordinate, lerp, manhattan } from './utils.js';
import { app } from './index.js';
import { eventSystem } from './eventSystem.js';

export class Lerp {
    constructor(coordinate, end, start = coordinate.clone(), duration = 1) {
        this.coordinate = coordinate;
        this.src = start;
        this.dst = end;
        this.duration = duration;

        this.active = false;
        this.progress = 0;
        this.lerper = (t) => 1 - (1 - t) * (1 - t);
    }

    start() {
        this.active = true;
        this.progress = 0;
        return this;
    }

    end() {
        this.active = false;
        return this;
    }

    update(dt) {
        if (!this.active) return true;

        this.progress += dt / this.duration;
        if (this.progress >= 1) {
            this.progress = 1;
            this.end();
        }

        const t = this.lerper(this.progress);
        this.coordinate.x = lerp(this.src.x, this.dst.x, t);
        this.coordinate.y = lerp(this.src.y, this.dst.y, t);

        return false;
    }
}

class Action {
    constructor() {
        this.entity = null;
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
        return this;
    }

    selection(args) { return null; }
    start() { }
    update(dt) { return true; }
    end() { }

    get defaultLerpDuration() {
        return 1 / (this.entity.maxActionPoints * this.entity.agility);
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
}

export class MoveAction extends Action {
    constructor() {
        super();
        this.path = [];
        this.apLimit = 0;
        this.cellSize = 0;
        this.pathIndex = 0;
        this.active = false;
        this.lerp = null;
    }

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
        eventSystem.publish("entity:move:start");
    }

    end() {
        const lastTile = this.path[this.pathIndex - 1];
        this.entity.actionPoints -= lastTile.totalCost;
        this.active = false;
        this.pathIndex = 0;
        this.entity.moving = false;
        this.entity.publish("move:end"); // Tells entity to recalculate its position variables.
        this.entity.publish("action:end", { entity: this.entity }); // Tells player it is ready to execute another action.
        eventSystem.publish("entity:move:end", { entity: this.entity }); // Tells the movement has ended.
    }

    moveTo(targetCell) {
        const endPos = {
            x: targetCell.col * this.cellSize + this.cellSize / 2,
            y: targetCell.row * this.cellSize + this.cellSize / 2
        };

        this.lerp = new Lerp(this.entity.center, endPos, this.entity.center.clone(), this.defaultLerpDuration).start();
    }

    update(dt) {
        if (!this.active) return true;

        if (this.lerp && this.lerp.active) {
            this.lerp.update(dt);
            if (!this.lerp.active) {
                eventSystem.publish("entity:move");
                this.pathIndex++;
            }
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
    }
}

export class MeleeAttackAction extends Action {
    constructor() {
        super();
        this.active = false;
        this.lerp = null;
    }

    selection(args = {}) {
        const range = args.range || this.args?.range || 1;
        const alignment = args.alignment || this.args?.alignment || "none";
        return {
            target: { type: "entity", amount: 1, range, alignment, showTargetAura: true }
        };
    }

    getTitle() { return "Attack"; }

    getDescription() {
        return `Cost:${this.args.cost}.\nRange:${this.args.range}.\nVisual dash attack.`;
    }

    init(entity, selection, args) {
        super.init(entity, selection, args);
        this.target = selection.target[0];
        return this;
    }

    start() {
        if (this.entity.actionPoints < (this.args?.cost || 1)) {
            this.end();
            return;
        }

        this.entity.actionPoints -= this.args.cost || 1;
        this.active = true;
        this.stage = 0;
        this.startingPosition = this.entity.center.clone();

        const dist = {
            x: (this.entity.center.x - this.target.center.x) * 0.5,
            y: (this.entity.center.y - this.target.center.y) * 0.5
        };
        const endPos = {
            x: this.target.center.x + dist.x,
            y: this.target.center.y + dist.y
        };

        this.lerp = new Lerp(this.entity.center, endPos, this.entity.center.clone(), this.defaultLerpDuration);
        this.lerp.lerper = (t) => t * t;
        this.lerp.start();

        eventSystem.publish("action:dash:start", { entity: this.entity });
    }

    end() {
        this.active = false;
    }

    update(dt) {
        if (!this.active) return true;

        if (this.lerp && this.lerp.active) {
            this.lerp.update(dt);

            if (!this.lerp.active) {
                if (this.stage === 0) {
                    eventSystem.publish("action:dash:intermediate", { entity: this.entity });

                    this.stage = 1;
                    this.lerp = new Lerp(this.entity.center, this.startingPosition, this.entity.center.clone(), this.defaultLerpDuration);
                    this.lerp.lerper = (t) => t * t;
                    this.lerp.start();
                } else if (this.stage === 1) {
                    this.end();
                }
            }
        }
        return false;
    }
}

export class RangedAttackAction extends Action {
    constructor() { super(); }

    selection(args) {
        const safeArgs = args || this.args || {};
        const range = safeArgs.range || 1;
        const alignment = safeArgs.alignment || "any";
        return {
            target: { type: "entity", amount: 1, range, alignment, showTargetAura: true }
        };
    }

    getTitle() { return "Take aim"; }

    getDescription() {
        return `Cost:${this.args.cost}.\nRange:${this.args.range}.\nVisual ranged attack.`;
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
            this.end();
            return;
        }

        this.entity.actionPoints -= this.args.cost || 1;
        this.startingPosition = this.entity.center.clone();
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
        this.projectile.rotation = Math.atan2(this.distance.y, this.distance.x) + Math.PI / 2;

        const kickbackEnd = {
            x: this.entity.center.x - this.distance.x * this.kickback,
            y: this.entity.center.y - this.distance.y * this.kickback
        };

        this.entityLerp = new Lerp(this.entity.center, kickbackEnd, this.entity.center.clone(), this.defaultLerpDuration).start();
        this.projectileLerp = null;

        this.active = true;
        this.stage = 0;
    }

    end() {
        this.active = false;
    }

    onProjectileHit() {
        eventSystem.publish("action:ranged:intermediate", { entity: this.entity });
    }

    update(dt) {
        if (!this.active) return true;

        if (this.entityLerp && this.entityLerp.active) {
            this.entityLerp.update(dt);

            if (!this.entityLerp.active && this.stage === 0) {
                eventSystem.publish("action:ranged:start", { entity: this.entity });
                app.entities.push(this.projectile);

                const distMag = Math.sqrt(this.distance.x ** 2 + this.distance.y ** 2);
                const projEnd = { x: this.target.center.x, y: this.target.center.y };

                this.projectileLerp = new Lerp(this.projectile.center, projEnd, this.projectile.center.clone(), distMag / this.projectileSpeed);
                this.projectileLerp.lerper = (t) => t ** 2;
                this.projectileLerp.start();

                this.entityLerp = new Lerp(this.entity.center, this.startingPosition, this.entity.center.clone(), this.defaultLerpDuration).start();
                this.stage = 1;
            }
        }

        if (this.projectileLerp && this.projectileLerp.active) {
            this.projectileLerp.update(dt);

            if (!this.projectileLerp.active) {
                this.onProjectileHit();

                const index = app.entities.indexOf(this.projectile);
                if (index > -1) app.entities.splice(index, 1);
            }
        }

        if ((!this.entityLerp || !this.entityLerp.active) && this.stage === 1 && (!this.projectileLerp || !this.projectileLerp.active)) {
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
            target: { type: "cell", amount: 1, range, showTargetAura: true, showBlastAura: true, blastRadius: radius }
        };
    }

    getTitle() { return "Blast"; }

    getDescription() {
        return `Cost:${this.args.cost}.\nRange:${this.args.range}.\nVisual AoE attack to an area.`;
    }

    init(entity, selection, args) {
        this.entity = entity;
        const target = selection?.target?.[0];
        let targetCell = (target && target.col !== undefined && target.row !== undefined) ? target : (target?.cell);

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

    onProjectileHit() {
        eventSystem.publish("action:area:intermediate", {
            entity: this.entity,
            impactCell: this.impactCell,
            radius: this.radius
        });
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
