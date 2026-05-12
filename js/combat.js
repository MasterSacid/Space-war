import { dijkstra, keyToCell, manhattan, Heap } from "./utils.js";
import { eventSystem } from "./eventSystem.js";

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
            entity.subscribe("died", ({ entity }) => this.onDeath(entity));
            let list = this.parties.get(entity.party);
            if (!list) {
                list = new Set();
                this.parties.set(entity.party, list);
            }
            list.add(entity);
        }
        this.startRound();
        eventSystem.publish("combat:start", { eventAction: "combatStart" });
    }

    atRoundStart() {
        this.roundCounter++;
        this.roundActive = true;

        for (const entity of this.entities) {
            entity.actionPoints = entity.maxActionPoints;
        }

        eventSystem.publish("combat:roundStart", { eventAction: "roundStart", });
    }

    atRoundEnd() {
        this.roundActive = false;

        eventSystem.publish("combat:roundEnd", { eventAction: "roundEnd", });
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
        if (!this.combatActive) return;

        if (this.turnQueue.length === 0) {
            this.atRoundEnd();
            this.startRound();
            return;
        }

        const { entity } = this.turnQueue.shift();
        this.activeEntity = entity;
        if (entity === this.player.entity) {
            this.player.hasTurn = true;
        } else {
            entity.publish("gainTurn", { combat: this, map: this.map });
        }

        this.actionLoop(entity);
    }

    onDeath(entity) {
        const partySet = this.parties.get(entity.party);
        if (partySet) {
            partySet.delete(entity);
            if (partySet.size === 0) {
                this.parties.delete(entity.party);
            }
        }

        this.entities.delete(entity);

        if (this.parties.size <= 1) {
            this.combatActive = false;
            console.log("Combat has ended.");
            eventSystem.publish("combat:end", {
                roundCount: this.roundCounter
            });
        }
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

    update() { }
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
