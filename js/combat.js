import { dijkstra, keyToCell, manhattan, Heap } from "./utils.js";

export class Combat {
    constructor(player, entities, grid, bot) {
        this.player = player;
        this.map = grid;
        this.bot = bot;

        this.entities = new Set(entities);
        this.parties = new Map();

        this.roundCounter = 0;
        this.roundActive = false;
        this.combatActive = true;
        this.activeEntity = null;

        for (const entity of this.entities) {
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

        this.actionLoop(entity);
    }

    actionLoop(entity) {
        const range = entity.getReachRadius();
        entity.dijkstraInfo = dijkstra(entity.cell, range, (cell) => this.map.getAdjacentCells(cell));

        entity.hasTurn = true;
        if (entity === this.player.entity) {
            this.player.entity.showAura = true;
        } else {
            this.bot.handleEntity(this, entity);
        }
    }

    filterEntitiesBy(comparator, partyFilter, entityFilter) {
        const filteredByParty = partyFilter(this.parties);
        const filteredParties = filteredByParty.flatMap(party => [...party]);
        const filteredByEntity = entityFilter(filteredParties);
        const heap = new Heap(comparator);
        for (const entity of filteredByEntity) {
            heap.insert(entity);
        }
        return heap;
    }

    update() {
        if (this.activeEntity.hasTurn == false) {
            this.activeEntity.showAura = false;
            this.activeEntity = null;
            this.processNextTurn();
        } else {
            if (this.activeEntity.isIdle()) {
                if (this.activeEntity === this.player.entity) {
                    if (this.player.hasPlayed) {
                        this.actionLoop(this.activeEntity);
                        this.player.hasPlayed = false;
                    }
                } else {
                    this.actionLoop(this.activeEntity);
                }
            }
        }
    }
}

export class Bot {
    constructor(entities, grid) {
        this.entities = entities;
        this.grid = grid;
    }

    handleEntity(combat, entity) {
        entity.takeAction(combat, this.grid);
    }

    update() { }
}
