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
            const temp = this.array[parentIndex];
            if (this.comparator(this.array[i], this.array[parentIndex])) {
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

            if (leftChildIndex < length && this.comparator(this.array[leftChildIndex], this.array[chosen])) {
                chosen = leftChildIndex;
            }
            if (rightChildIndex < length && this.comparator(this.array[rightChildIndex], this.array[chosen])) {
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

export const cellToKey = (cell) => `${cell.col},${cell.row}`;

export function keyToCell(key) {
    const array = key.split(',');
    return { col: parseInt(array[0]), row: parseInt(array[1]) };
}

export function reconstructPath(goal, backtrack) {
    const path = [goal];
    let currentKey = cellToKey(goal);

    while (backtrack.get(currentKey)?.previous != null) {
        const prev = backtrack.get(currentKey).previous;
        path.push(prev);
        currentKey = cellToKey(prev);
    }

    return path.reverse();
}

export function manhattan(node, goal) {
    return Math.abs(node.col - goal.col) + Math.abs(node.row - goal.row);
}

export function astar(start, goal, getNeighbours, h = manhattan) {
    start.occupied = start.occupied ?? false;
    start.cost = start.cost ?? 1;

    const candidates = new Heap((a, b) => a.fScore < b.fScore);

    start.fScore = h(start, goal);
    candidates.insert(start);

    const startKey = cellToKey(start);

    const visits = new Map();
    visits.set(startKey, { gScore: 0, previous: null });

    while (candidates.array.length > 0) {
        const current = candidates.extractMin();

        if (current.col === goal.col && current.row === goal.row) {
            return reconstructPath(goal, visits);
        }

        const neighbours = getNeighbours(current);
        for (const neighbour of neighbours) {
            const neighbourKey = cellToKey(neighbour);

            neighbour.cost = cell.cost ?? 1;
            neighbour.occupied = cell.occupied ?? false;

            if (neighbour.occupied) neighbour.cost = Infinity;
            const neighbourCost = neighbour.cost ?? 1;
            const tentativeGScore = (visits.get(cellToKey(current))?.previous ?? 0) + neighbourCost;

            const currentGScore = visits.has(neighbourKey)?.previous ? visits.get(neighbourKey).previous : Infinity;
            if (tentativeGScore < currentGScore) {
                visits.set(neighbourKey, { tentativeGScore: tentativeGScore, previous: current });

                const newNeighbour = { ...neighbour, fScore: tentativeGScore + h(neighbour, goal) };
                candidates.insert(newNeighbour);
            }
        }
    }

    return null;
}

export function dijkstra(start, range, getNeighbours) {
    start.occupied = start.occupied ?? false;
    start.cost = start.cost ?? 1;
    start.totalCost = 0;
    start.previous = null;
    const candidates = new Heap((a, b) => a.totalCost < b.totalCost);

    const backtrack = new Map();

    const startKey = cellToKey(start);
    candidates.insert(start);
    backtrack.set(startKey, { totalCost: 0, previous: null });

    while (candidates.array.length > 0) {
        const current = candidates.extractMin();
        if (current.totalCost >= range) continue;

        const currentKey = cellToKey(current);
        if (current.totalCost > backtrack.get(currentKey).totalCost) continue;

        for (const cell of getNeighbours(current)) {
            const neighbourKey = cellToKey(cell);

            cell.cost = cell.cost ?? 1;
            cell.occupied = cell.occupied ?? false;

            let neighbourCost = cell.cost;
            neighbourCost = cell.occupied ? Infinity : neighbourCost;

            const newTotalCost = backtrack.get(currentKey).totalCost + neighbourCost;
            const oldTotalCost = backtrack.get(neighbourKey)?.totalCost ?? Infinity;
            if (newTotalCost < oldTotalCost) {
                backtrack.set(neighbourKey, { totalCost: newTotalCost, previous: current, cost: neighbourCost });

                const newNeighbour = { ...cell, totalCost: newTotalCost, previous: current, cost: neighbourCost };
                candidates.insert(newNeighbour);
            }
        }
    }

    return backtrack;
}


export function screenToCell(grid, viewport, x, y) {
    const pos = viewport.screenToWorld(x, y);
    return grid.worldToCell(pos.x, pos.y);
}
