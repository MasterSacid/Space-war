import { Coordinate } from "./utils.js";

export class Entity {
    constructor(center = new Coordinate(0, 0), name = "Empty") {
        this.center = center;
        this.name = name;
        this.width = 50;
        this.height = 50;
        this.cell = { row: 0, col: 0 };
        this.reachRadius = 2;
        this.cellsInReach = [];
    }

    draw(ctx) {
        ctx.fillStyle = "red";
        ctx.fillRect(this.center.x - this.width / 2, this.center.y - this.height / 2, this.width, this.height);
        ctx.fillStyle = "black";
        ctx.fillText(this.name, this.center.x - this.width / 20 * this.name.length, this.center.y + this.width / 1.25, this.width);
        ctx.fillText(`${Math.ceil(this.center.x)}, ${Math.ceil(this.center.y)}`, this.center.x - this.width / 20 * this.name.length, this.center.y + this.width, this.width);
    }

    update(dt) {
    }
}

export class Player {
    constructor(canvas, entity = new Entity(new Coordinate(0, 0), "Player")) {
        this.canvas = canvas;
        this.entity = entity;
        this.keys = {};

        this.#addEventListeners();
    }


    #addEventListeners() {
        window.addEventListener("keydown", (e) => this.keys[e.key] = true);
        window.addEventListener("keyup", (e) => this.keys[e.key] = false);
    }

    update(dt) {
        if (!this.keys) return;
        if (this.keys['w']) this.entity.center.y -= 100 * dt;
        if (this.keys['a']) this.entity.center.x -= 100 * dt;
        if (this.keys['s']) this.entity.center.y += 100 * dt;
        if (this.keys['d']) this.entity.center.x += 100 * dt;
    }
}
