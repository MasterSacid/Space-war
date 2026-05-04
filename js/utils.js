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

    set(x, y) {
        this.x = x;
        this.y = y;
    }
}

class MinHeap {
    constructor() {
        this.array = new Array();
    }

    insert(element) {
        if (!this.array.length) {

        }
    }
}

function calcDist(x0, y0, x1, y1) {
    return Math.sqrt((x0 - x1) ** 2 + (y0 - y1) ** 2);
}

export function lerp(p0, p1, t) {
    return p0 + (p1 - p0) * t;
}

export function Astar(start, goal) {
    const neighbors = new MinHeap();
}
