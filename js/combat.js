import { dijkstra, keyToCell } from "./utils.js";

export class Combat {
    constructor(player, entities, grid) {
        this.player = player;
        this.parties = new Map();
        this.roundCounter = 0;
        this.roundActive = false;
        this.combatActive = true;
        this.map = grid;
        for (const entity of entities) {
            let list = this.parties.get(entity.party);
            if (!list) {
                list = [];
                this.parties.set(entity.party, list);
            }
            list.push(entity);
        }
    }

    roundStart() {
        this.roundCounter++;
        this.roundActive = true;
    }

    roundEnd() {
        this.roundActive = false;
    }

    round = async () => {
        this.roundStart();
        for (const [partyKey, members] of this.parties) {
            for (const entity of members) {
                if (entity?.status == "incapacitated" || entity?.status == "dead") continue;
                entity.dijkstraInfo = dijkstra(entity.cell, entity.reachRadius, (cell) => this.map.getAdjacentCells(cell));
                if (this.player.entity === entity) {
                    await new Promise((resolve) => this.player.actionResolve = resolve);
                } else {
                    await new Promise((resolve) => entity.actionResolve = resolve);
                }

                if (this.parties.size <= 1) {
                    this.combatActive = false;
                    return;
                }
            }
        }
        this.roundEnd();
    }

    update = async () => {
        if (this.combatActive) {
            while (this.parties.size > 1 && !this.roundActive) {
                await this.round();
            }
        }
    }
}

export class Bot {
    constructor(combat, partyKey, grid) {
        this.combat = combat;
        this.party = combat.parties.get(partyKey);
        this.grid = grid;
        this.deciding = false;
    }

    async update(dt) {
        if (!this.deciding) {
            this.deciding = true;
            for (const entity of this.party) {
                if (entity.actionResolve != null) {
                    const keysArray = Array.from(entity.dijkstraInfo.keys());
                    const targetCellKey = keysArray[Math.floor(Math.random() * keysArray.length)];
                    const targetCell = keyToCell(targetCellKey);

                    const startCol = entity.cell.col;
                    const startRow = entity.cell.row;

                    const isMovingToNewCell = (startCol !== targetCell.col || startRow !== targetCell.row);

                    if (isMovingToNewCell) {
                        this.grid.appendCell(targetCell.col, targetCell.row, { occupied: true, entity: entity });
                    }

                    await entity.takePathTo(this.grid.cellSize, targetCell);

                    if (isMovingToNewCell) {
                        this.grid.appendCell(startCol, startRow, { occupied: false, entity: null });
                    }

                    entity.actionResolve();
                    entity.actionResolve = null;
                }
            }
            this.deciding = false;
        }
    }
}




