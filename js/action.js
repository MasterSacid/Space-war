import { lerp } from './utils.js';

export class MoveAction {
    constructor(entity, path, apLimit, cellSize) {
        this.entity = entity;
        this.path = path;
        this.apLimit = apLimit;
        this.cellSize = cellSize;

        this.lerping = false;
        this.lerpDuration = 0.5 / (this.entity.maxActionPoints * this.entity.agility);
        this.lerpProgress = 0;
        this.lerpEnd = { x: 0, y: 0 };
        this.lerpStart = { x: 0, y: 0 };

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
                this.lerpProgress += dt / this.lerpDuration;
                if (this.lerpProgress >= 1) {
                    this.lerpProgress = 1;
                    this.lerping = false;
                    this.pathIndex++;
                }

                const easeout = 1 - (1 - this.lerpProgress) * (1 - this.lerpProgress);

                this.entity.center.x = lerp(this.lerpStart.x, this.lerpEnd.x, easeout);
                this.entity.center.y = lerp(this.lerpStart.y, this.lerpEnd.y, easeout);
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
        return true;
    }
}
