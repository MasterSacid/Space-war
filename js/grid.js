import { dijkstra, keyToCell, cellToKey } from "./utils.js";

export class Grid {
    constructor(cellSize = 64, player) {
        this.cellSize = cellSize;
        this.cells = {};
        this.paintedTiles = new Map();
        this.hoveredCell = null; // { col, row }
        this.player = player;
        this.trackedEntities = [];
    }

    // Dünya koordinatından hücre indeksine
    worldToCell(worldX, worldY) {
        return {
            col: Math.floor(worldX / this.cellSize),
            row: Math.floor(worldY / this.cellSize),
        };
    }

    // Hücre indeksinden dünya koordinatına
    cellToWorld(col, row) {
        return {
            x: col * this.cellSize,
            y: row * this.cellSize,
        };
    }

    getCell(col, row) {
        return this.cells[cellToKey({ col: col, row: row })] ?? null;
    }

    getAdjacentCells(cell) {
        return [
            { ...this.getCell(cell.col + 1, cell.row), col: cell.col + 1, row: cell.row },
            { ...this.getCell(cell.col - 1, cell.row), col: cell.col - 1, row: cell.row },
            { ...this.getCell(cell.col, cell.row + 1), col: cell.col, row: cell.row + 1 },
            { ...this.getCell(cell.col, cell.row - 1), col: cell.col, row: cell.row - 1 },
        ];
    }


    setCell(col, row, data) {
        this.cells[cellToKey({ col: col, row: row })] = data;
    }

    appendCell(col, row, data) {
        const cellData = this.getCell(col, row);
        this.setCell(col, row, { ...cellData, ...data });
    }

    //Bu fonksyion paintedTiles mapine tile bilgisini kaydediyor
    paintTile(col, row, tileset, tileIndex) {
        this.paintedTiles.set(cellToKey({ col: col, row: row }), { col, row, tileset, tileIndex });
    }

    clearTile(col, row) {
        this.paintedTiles.delete(cellToKey({ col: col, row: row }));
    }

    //JSON dosyasina yazmak icin map imizi parcaliyoruz
    exportPaintedTiles() {
        return Array.from(this.paintedTiles.values()).map((tile) => ({
            col: tile.col,
            row: tile.row,
            tileset: tile.tileset.name,
            tileIndex: tile.tileIndex
        }));
    }

    //Export edilmis tile listesini paintTiles icine yukleme islemini yapar
    importPaintedTiles(tiles, getTilesetByName) {
        this.paintedTiles.clear();

        for (const tile of tiles) {
            const tileset = getTilesetByName(tile.tileset);
            if (!tileset) continue;

            this.paintTile(tile.col, tile.row, tileset, tile.tileIndex);
        }
    }


    // Mouse ekran koordinatını dünya koordinatına çevirip hücreyi bul
    findHoveredCell(worldX, worldY) {
        this.hoveredCell = this.worldToCell(worldX, worldY);
    }

    getCellsInRadius(worldX, worldY, cellRadius = 1) {
        const centerCell = this.worldToCell(worldX, worldY);
        const result = [];

        for (let dc = -Math.floor(cellRadius); dc <= Math.ceil(cellRadius); dc++) {
            for (let dr = -Math.floor(cellRadius); dr <= Math.ceil(cellRadius); dr++) {
                const col = centerCell.col + dc;
                const row = centerCell.row + dr;

                const cellDist = Math.sqrt(dr ** 2 + dc ** 2);
                if (cellDist <= cellRadius) {
                    result.push({ col, row });
                }
            }
        }

        return result;
    }

    draw(ctx, viewport) {
        const cs = this.cellSize;

        // Dunya koordinatina gore hucre konumlarini bul
        const left = viewport.coordinate.x - viewport.center.x;
        const top = viewport.coordinate.y - viewport.center.y;
        const right = viewport.coordinate.x + viewport.center.x;
        const bottom = viewport.coordinate.y + viewport.center.y;

        //Dunya koordinatina gore verilen hucreleri screen spacede ekrana koy
        const startCol = Math.floor(left / cs);
        const startRow = Math.floor(top / cs);
        const endCol = Math.floor(right / cs);
        const endRow = Math.floor(bottom / cs);

        ctx.save();

        this.drawPaintedTiles(ctx, startCol, startRow, endCol, endRow);

        if (this.hoveredCell) {
            let inRange = this.player.entity.isCellInReach(this.hoveredCell);
            const { x, y } = this.cellToWorld(this.hoveredCell.col, this.hoveredCell.row);
            if (inRange) {
                ctx.fillStyle = "rgba(0, 255, 0, 0.35)";
                ctx.fillRect(x, y, cs, cs);
            } else {
                ctx.fillStyle = "rgba(255, 0, 0, 0.35)";
                ctx.fillRect(x, y, cs, cs);
            }
        }


        //--------- Cell Cizme ----------
        ctx.strokeStyle = "#3a7a3a";
        ctx.lineWidth = 1;

        // Dikey çizgiler
        for (let col = startCol; col <= endCol + 1; col++) {
            const x = col * cs;
            ctx.beginPath();
            ctx.moveTo(x, startRow * cs);
            ctx.lineTo(x, (endRow + 1) * cs);
            ctx.stroke();
        }

        // Yatay çizgiler
        for (let row = startRow; row <= endRow + 1; row++) {
            const y = row * cs;
            ctx.beginPath();
            ctx.moveTo(startCol * cs, y);
            ctx.lineTo((endCol + 1) * cs, y);
            ctx.stroke();
        }

        for (const entity of this.trackedEntities) {
            if (entity.showAura) {
                this.drawEntityAura(ctx, entity);
            }
        }

        //ctx.fillStyle = "rgba(0,0,0,0.5)";
        //for (let i = -20; i < 20; i++) {
        //    for (let j = -20; j < 20; j++) {
        //        if (this.getCell(i, j)?.occupied) {
        //            ctx.fillRect(i * this.cellSize, j * this.cellSize, this.cellSize, this.cellSize);
        //        }
        //    }
        //}


        ctx.restore();
    }

    drawPaintedTiles(ctx, startCol, startRow, endCol, endRow) {
        ctx.imageSmoothingEnabled = false;
        //Gorunmeyen tile lari cizme ve atla
        for (const tile of this.paintedTiles.values()) {
            if (
                tile.col < startCol ||
                tile.col > endCol ||
                tile.row < startRow ||
                tile.row > endRow
            ) {
                continue;
            }

            tile.tileset.drawTile(
                ctx,
                tile.tileIndex,
                tile.col * this.cellSize,
                tile.row * this.cellSize,
                this.cellSize,
                this.cellSize
            );
        }
    }

    // Erisilebilir kayitli hucreleri cizer.
    drawEntityAura(ctx, entity) {
        ctx.fillStyle = "rgba(50,90,255,0.3)";
        for (const cellStr of entity.dijkstraInfo.keys()) {
            const cell = keyToCell(cellStr);
            ctx.fillRect(cell.col * this.cellSize, cell.row * this.cellSize, this.cellSize, this.cellSize);
        }
    }

    update(dt) {
        for (const entity of this.trackedEntities) {
            if (entity.dirty) {
                entity.dirty = false;
                if (entity.previousCell) {
                    this.appendCell(entity.previousCell.col, entity.previousCell.row, { occupied: false, entity: null });
                }
                this.appendCell(entity.cell.col, entity.cell.row, { occupied: true, entity: entity });
            }
        }
    }
}
