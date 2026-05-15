import { dijkstra, keyToCell, manhattan, Heap } from "./utils.js";
import { eventSystem } from "./eventSystem.js";

export class Combat {
    constructor(player, entities, grid) {
        this.player = player;
        this.map = grid;

        this.entities = new Set(entities);
        this.parties = new Map();

        this.roundCounter = 0;
        this.roundActive = false;
        this.combatActive = true;
        this.activeEntity = null;

        this.turnQueue = [];

        this.playersParty = this.player.entity.party;

        for (const entity of this.entities) {
            entity.subscribe("died", ({ entity }) => this.onDeath(entity));

            entity.subscribe("action:end", ({ entity }) => {
                if (entity.actionPoints > 0) {
                    this.actionLoop();
                } else {
                    this.processNextTurn();
                }
            });

            let list = this.parties.get(entity.party);
            if (!list) {
                list = new Set();
                this.parties.set(entity.party, list);
            }
            list.add(entity);
        }

        this.startRound();

        eventSystem.publish("combat:start");

        eventSystem.subscribe("player:played", () => {
            if (this.player.hasTurn) {
                if (this.player.entity.actionPoints > 0) {
                    console.log('has action points');
                    this.actionLoop();
                } else {
                    console.log('has no action points');
                    this.processNextTurn();
                }
            }
        });
    }

    startRound() {
        this.atRoundStart();
        this.turnQueue = [];

        for (const [partyKey, members] of this.parties) {
            for (const entity of members) {
                this.turnQueue.push(entity);
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

        const entity = this.turnQueue.shift();

        if (entity.status.has("dead")) {
            this.processNextTurn();
            return;
        }

        if (entity.status.has("incapacitated")) {
            let duration = entity.status.get("incapacitated");
            duration--;
            if (entity.turnsLeft <= 0) {
                entity.status.remove("incapacitated");
            } else {
                entity.status.set("incapacitated", duration);
            }
            this.processNextTurn();
            return;
        }

        if (entity.party === this.player.entity.party) {
            if (Math.random() < 1 / 3) {
                eventSystem.publish("entity:turn-start", { entity: entity })
            }
            this.player.entity = entity;
            this.player.viewport.coordinate = entity.center;
        }

        this.activeEntity = entity;

        this.actionLoop();
    }

    actionLoop() {
        const range = this.activeEntity.getReachRadius();
        this.activeEntity.dijkstraInfo = dijkstra(this.activeEntity.cell, range, (cell) => this.map.getAdjacentCells(cell));

        if (this.activeEntity === this.player.entity) {
            this.player.entity.showAura = true;
            this.player.hasAction = true;
            this.player.entity.publish("gainTurn");
        } else {
            this.activeEntity.publish("gainAction", { combat: this, map: this.map });
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

    onDeath(entity) {
        const partySet = this.parties.get(entity.party);
        eventSystem.publish("entity:death", { entity: entity });

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
                roundCount: this.roundCounter,
                winnerParty: this.parties.keys().next().value
            });
        }
    }

    atRoundStart() {
        this.roundCounter++;
        this.roundActive = true;

        for (const entity of this.entities) {
            entity.actionPoints = entity.maxActionPoints;
        }

        eventSystem.publish("combat:roundStart", { eventAction: "roundStart" });
    }

    atRoundEnd() {
        this.roundActive = false;

        eventSystem.publish("combat:roundEnd", { eventAction: "roundEnd", });
    }

    addEntity(entity) {
        this.entities.add(entity);
        const key = entity?.party ?? "none";
        let set = this.parties.get(key);
        if (!set) {
            this.parties.set(key, new Set([entity]))
            set = this.parties.get(key);
        };
        set.add(entity);
    }

    update() { }
}
