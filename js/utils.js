export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export class Coordinate {

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    clone() {
        return new Coordinate(this.x, this.y);
    }

    scale(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    add(coordinate = new Coordinate(0, 0)) {
        this.x += coordinate.x;
        this.y += coordinate.y;
        return this;
    }
}
