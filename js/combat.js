import { dijkstra, keyToCell, manhattan, Heap } from "./utils.js";

export class Combat {
    constructor(player, entities, grid, bot) {
        this.player = player;
        this.entities = entities;
        this.map = grid;
        this.bot = bot;

        this.parties = new Map();
        this.roundCounter = 0;
        this.roundActive = false;
        this.combatActive = true;
        this.activeEntity = null;

        for (const entity of entities) {
            let list = this.parties.get(entity.party);
            if (!list) {
                list = [];
                this.parties.set(entity.party, list);
            }
            list.push(entity);
        }
        this.startRound();
    }

    atRoundStart() {
        this.roundCounter++;
        this.roundActive = true;

        for (const entity of this.entities) {
            entity.actionPoints = entity.maxActionPoints;
        }
    }

    atRoundEnd() {
        this.roundActive = false;
    }

    startRound() {
        this.atRoundStart();
        this.turnQueue = [];

        for (const [partyKey, members] of this.parties) {
            for (const entity of members) {
                if (entity?.status !== "incapacitated" && entity?.status !== "dead") {
                    this.turnQueue.push({ entity, partyKey });
                }
            }
        }

        this.processNextTurn();
    }

    processNextTurn() {
        if (this.parties.size <= 1) {
            this.combatActive = false;
            return;
        }

        if (this.turnQueue.length === 0) {
            this.atRoundEnd();
            this.startRound();
            return;
        }

        const { entity } = this.turnQueue.shift();
        this.activeEntity = entity;

        if (entity?.status === "incapacitated" || entity?.status === "dead") {
            this.processNextTurn();
            return;
        }

        console.log('turn of ' + entity.name);
        entity.dijkstraInfo = dijkstra(entity.cell, entity.actionPoints, (cell) => this.map.getAdjacentCells(cell));

        entity.hasTurn = true;
        if (entity === this.player.entity) {
            this.player.entity.showAura = true;
        } else {
            this.bot.handleEntity(entity);
        }
    }

    filterEntitiesBy(comparator) {
        const heap = new Heap(comparator);
        for (const entity of this.entities) {
            heap.insert(entity);
        }
        return heap;
    }

    update() {
        if (this.activeEntity.hasTurn == false) {
            this.processNextTurn();
        }
    }
}

export class Bot {
    constructor(entities, grid) {
        this.entities = entities;
        this.grid = grid;
    }

    handleEntity(entity) {
        const keysArray = Array.from(entity.dijkstraInfo.keys());
        const targetCellKey = keysArray[Math.floor(Math.random() * keysArray.length)];
        const targetCell = keyToCell(targetCellKey);
        entity.startTraversing(targetCell, this.grid.cellSize, 0);
    }

    update() { }
}
