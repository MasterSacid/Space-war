import { Coordinate } from "./utils.js";

export class Viewport {
    constructor(canvas, coordinate = new Coordinate(0, 0)) {
        this.canvas = canvas;
        this.center = new Coordinate(canvas.width / 2, canvas.height / 2);
        this.ctx = this.canvas.getContext('2d');
        this.coordinate = coordinate;
        this.zoom = 1;
    }

    screenToWorld(screenX, screenY) {
        const bound = this.canvas.getBoundingClientRect();
        const canvasX = (screenX - bound.left) * (this.canvas.width / bound.width);
        const canvasY = (screenY - bound.top) * (this.canvas.height / bound.height);

        return {
            x: canvasX + this.coordinate.x - this.center.x,
            y: canvasY + this.coordinate.y - this.center.y
        }
    }

    reset() {
        this.ctx.restore();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save(); // Canvasin translation, scale, rotation degerlerini kaydeder. Pixel verisinin onemi yoktur.
    }

    transform() {
        this.ctx.translate(this.center.x, this.center.y); // Zoom icin esit scale edebilmek icin ortaya gelir.
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-this.coordinate.x, -this.coordinate.y); // Son olarak istenilen kooordinata gelir.
    }
}
