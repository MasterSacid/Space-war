import { Entity } from './entity.js';
import { Coordinate, lerp } from './utils.js';

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
        if (this.lerpProgress >= 1) {
            this.lerpProgress = 1;
            this.lerping = false;
            onComplete();
        }
        const t = this.lerper(this.lerpProgress);

        this.entity.center.x = lerp(this.lerpStart.x, this.lerpEnd.x, t);
        this.entity.center.y = lerp(this.lerpStart.y, this.lerpEnd.y, t);
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
        this.kickback = kickback;
        this.projectileSpeed = projectileSpeed;

        this.stage = 0;
        this.lerpDuration = this.entity.maxHealth / this.projectileSpeed;

        this.startingPosition = this.entity.center.clone();

        this.distance = { x: target.center.x - entity.center.x, y: target.center.y - entity.center.y };
        this.projectile = new Entity(
            this.entity.center.clone().add(new Coordinate(this.distance.x + entity.width / this.distance.x * 0.1, this.distance.y + entity.height / this.distance.y * 0.1)),
            `projectile of ${entity.name} targeting ${target.name}`
        );
        this.projectileLerpDuration = Math.sqrt(this.distance.x ** 2 + this.distance.y ** 2) / this.projectileSpeed;
        this.projectileLerping = false;
        this.projectileLerpingProgress = 0;
        this.projectileLerpStart = { x: this.projectile.center.x, y: this.projectile.center.y };
        this.projectileLerpEnd = { x: this.target.center.x, y: this.target.center.y };

        start();
    }

    dealDamage() {
        this.entity.actionPoints -= this.entity.attackCost;
        const damage = this.entity.getRangedDamage();
        target.health -= damage;
    }

    updateLerpProjectile(dt) {
        this.lerpingProjectile = true;
        this.lerpingProgressProjectile += dt;

        if (this.lerpingProgressProjectile >= 1) {
            this.lerpingProgressProjectile = 1;
            this.projectileLerping = false
        }

        this.projectile.center.x = lerp(this.projectileLerpStart.x, this.projectileLerpEnd.x, this.lerper(this.lerpingProgressProjectile));
        this.projectile.center.x = lerp(this.projectileLerpStart.x, this.projectileLerpEnd.y, this.lerper(this.lerpingProgressProjectile));
    }

    start() {
        this.active = true;
    }

    end() {
        this.active = false;
    }

    moveBack() {
        this.lerping = true;
        this.lerpStart = this.entity.center.clone();
        this.lerpEnd.x = this.entity.center.x - this.distance.x * this.kickback;
        this.lerpEnd.y = this.entity.center.y - this.distance.y * this.kickback;
    }

    moveToStart() {
        this.lerping = true;
        this.lerpStart = this.entity.center;
        this.lerpEnd = this.startingPosition;
    }

    update(dt) {
        if (this.active) {
            if (this.lerping) {
                this.updateLerp(dt, () => this.stage++);
            } else {
                if (this.stage == 0) {
                    this.moveBack();
                } else if (this.stage == 1) {
                    this.moveToStart();
                } else {
                    this.lerping = false;
                }
            }
            if (this.projectileLerping) {
                this.updateLerpProjectile(dt);
            } else {
                this.dealDamage();
                this.end();
            }
            return false;
        } else {
            return true;
        }
    }
}
