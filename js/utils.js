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

export class Heap {
    constructor(comparator) {
        this.array = [];
        this.comparator = comparator;
    }

    insert(element) {
        this.array.push(element);
        this.#heapifyUp();
        return this;
    }

    extractMin() {
        if (this.array.length === 0) return null;
        if (this.array.length === 1) return this.array.pop();

        const min = this.array[0];

        this.array[0] = this.array.pop();
        this.#heapifyDown();

        return min;
    }

    #heapifyUp() {
        let i = this.array.length - 1;
        while (i > 0) {
            let parentIndex = Math.floor((i - 1) / 2);
            if (this.comparator(this.array[parentIndex], this.array[i])) {
                const temp = this.array[parentIndex];
                this.array[parentIndex] = this.array[i];
                this.array[i] = temp;
                i = parentIndex;
            } else {
                break;
            }
        }
    }

    #heapifyDown() {
        let i = 0;
        const length = this.array.length;

        while (true) {
            let chosen = i;
            let leftChildIndex = 2 * i + 1;
            let rightChildIndex = 2 * i + 2;

            if (leftChildIndex < length && this.comparator(this.array[chosen], this.array[leftChildIndex])) {
                chosen = leftChildIndex;
            }
            if (rightChildIndex < length && this.comparator(this.array[chosen], this.array[rightChildIndex])) {
                chosen = rightChildIndex;
            }

            if (chosen !== i) {
                const temp = this.array[chosen];
                this.array[chosen] = this.array[i];
                this.array[i] = temp;
                i = chosen;
            } else {
                break;
            }
        }
    }
}

export function lerp(p0, p1, t) {
    return p0 + (p1 - p0) * t;
}

const cellToKey = (cell) => `${cell.col},${cell.row}`;

function reconstructPath(goal, cameFrom) {
    const path = [goal];
    let currentKey = (cellToKey(goal));

    while (cameFrom.has(currentKey)) {
        const prev = cameFrom.get(currentKey);
        path.push(prev);
        currentKey = cellToKey(prev);
    }

    return path.reverse();
}

function manhattan(node, goal) {
    return Math.abs(node.col - goal.col) + Math.abs(node.row - goal.row);
}

export function astar(start, goal, getNeighbours, h = manhattan) {
    const candidates = new Heap((a, b) => a.fScore < b.fScore);

    start.fScore = h(start, goal);
    candidates.insert(start);

    const startKey = cellToKey(start);

    const gScores = new Map();
    const cameFrom = new Map();

    gScores.set(startKey, 0);

    while (candidates.array.length > 0) {
        const current = candidates.extractMin();

        if (current.col === goal.col && current.row === goal.row) {
            return reconstructPath(goal, cameFrom);
        }

        const neighbours = getNeighbours(current);
        for (const neighbour of neighbours) {
            const neighbourKey = cellToKey(neighbour);

            const neighbourCost = neighbour.cost ?? 1;
            const tentativeGScore = gScores.get(cellToKey(current)) + neighbourCost;

            const currentGScore = gScores.has(neighbourKey) ? gScores.get(neighbourKey) : Infinity;
            if (tentativeGScore < currentGScore) {
                gScores.set(neighbourKey, tentativeGScore)
                cameFrom.set(neighbourKey, current);

                const newNeighbour = { ...neighbour, fScore: tentativeGScore + h(neighbour, goal) };
                candidates.insert(newNeighbour);
            }
        }
    }

    return null;
}
