import { Entity } from './entity.js';
import { Coordinate, lerp, manhattan } from './utils.js';
import { app } from './index.js';

class Action {
    constructor(entity) {
        this.entity = entity;
        this.lerping = false;
        this.lerpDuration = 0.5 / (this.entity.maxActionPoints * this.entity.agility);
        this.lerpProgress = 0;
        this.lerpEnd = { x: 0, y: 0 };
        this.lerpStart = { x: 0, y: 0 };
        this.lerper = (t) => 1 - (1 - t) * (1 - t);
    }

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

export class MoveAction extends Action {
    constructor(entity, path, apLimit, cellSize) {
        super(entity);
        this.path = path;
        this.apLimit = apLimit;
        this.cellSize = cellSize;

        this.pathIndex = 0;

        this.active = false;
        this.start();
    }

    start() {
        this.entity.moving = true;
        this.active = true;
        this.pathIndex = 1;
    }

    end() {
        const lastTile = this.path[this.pathIndex - 1];
        this.entity.actionPoints -= lastTile.totalCost;

        this.active = false;
        this.pathIndex = 0;
        this.entity.moving = false;
        console.log(this.entity.name, 'finished path');
    }

    moveTo(targetCell) {
        this.lerpEnd.x = targetCell.col * this.cellSize + this.cellSize / 2;
        this.lerpEnd.y = targetCell.row * this.cellSize + this.cellSize / 2;
        this.lerpStart = this.entity.center.clone();
        this.lerpProgress = 0;
        this.lerping = true;
    }

    update(dt) {
        if (this.active) {
            if (this.lerping) {
                this.updateLerp(dt, () => this.pathIndex++);
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
    constructor(entity, targetEntity) {
        super(entity);
        this.target = targetEntity;

        this.active = false;

        this.lerper = (t) => t * t;

        this.startingPosition = this.entity.center.clone();
        this.stage = 0;

        this.start();
    }

    start() {
        this.active = true;
    }

    end() {
        this.active = false;
    }

    moveToTarget() {
        const dist = { x: (this.entity.center.x - this.target.center.x) * 0.5, y: (this.entity.center.y - this.target.center.y) * 0.5 };
        const endPos = { x: this.target.center.x + dist.x, y: this.target.center.y + dist.y };
        this.lerpStart = this.entity.center.clone();
        this.lerpEnd = endPos;
        this.lerping = true;
        this.lerpProgress = 0;
    }

    moveBack() {
        this.lerpStart = this.entity.center.clone();
        this.lerpEnd = this.startingPosition;
        this.lerping = true;
        this.lerpProgress = 0;
    }

    dealDamage() {
        this.entity.actionPoints -= this.entity.attackCost;
        const damage = this.entity.getAttackDamage();
        this.target.health -= damage;
    }

    update(dt) {
        if (this.active) {
            if (this.lerping) {
                this.updateLerp(dt, () => this.stage++);
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
    constructor(entity, target, kickback, projectileSpeed) {
        super(entity);
        this.target = target;
        this.kickback = kickback;
        this.projectileSpeed = projectileSpeed;

        this.stage = 0;
        this.startingPosition = this.entity.center.clone();

        this.lerperProjectile = (t) => t ** 2;

        this.distance = { x: target.center.x - entity.center.x, y: target.center.y - entity.center.y };
        const distMag = Math.sqrt(this.distance.x ** 2 + this.distance.y ** 2);
        const dir = {
            x: distMag > 0 ? this.distance.x / distMag : 0,
            y: distMag > 0 ? this.distance.y / distMag : 0
        };

        // Spawn slightly outside the entity, pointing toward the target
        const spawn = {
            x: this.entity.center.x + (dir.x * this.entity.width * 0.6),
            y: this.entity.center.y + (dir.y * this.entity.height * 0.6)
        };

        this.projectile = new Entity(new Coordinate(spawn.x, spawn.y), "projectile");
        this.projectileLerpDuration = distMag / this.projectileSpeed;
        this.projectileLerping = false;
        this.projectileLerpingProgress = 0;
        this.projectileLerpStart = { x: spawn.x, y: spawn.y };
        this.projectileLerpEnd = { x: this.target.center.x, y: this.target.center.y };

        this.start();
    }

    dealDamage() {
        this.entity.actionPoints -= this.entity.attackCost;
        const damage = this.entity.getRangedDamage();
        this.target.health -= damage;
        console.log(`${this.entity.name} has dealt ${damage} to ${this.target.name}`);
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

    start() {
        this.active = true;
        this.moveBack();
    }

    end() {
        this.active = false;
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
    constructor(entity, target, kickback, projectileSpeed, radius) {

        const targetX = target.center ? target.center.x : target.x;
        const targetY = target.center ? target.center.y : target.y;

        const dummyTarget = new Entity(new Coordinate(targetX, targetY), "dummyTarget");

        super(entity, dummyTarget, kickback || 0, projectileSpeed);

        this.radius = radius;

        this.impactCell = target.cell ? target.cell : target;
    }

    dealDamage() {
        this.entity.actionPoints -= this.entity.attackCost;
        const damage = this.entity.getAreaDamage();

        app.entities.forEach((e) => {
            if (!e.cell || e.health === undefined) return;

            const distance = manhattan(e.cell, this.impactCell);

            if (distance <= this.radius) {
                e.health -= damage;
                console.log(`Area damage of ${damage} dealt to ${e.name}`);
            }
        });
    }
}
