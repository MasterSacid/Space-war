export class Grid {
    constructor(cellSize = 64) {
        this.cellSize = cellSize;
        this.cells = {};
        this.hoveredCell = null; // { col, row }
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
        return this.cells[`${col},${row}`] ?? null;
    }

    setCell(col, row, data) {
        this.cells[`${col},${row}`] = data;
    }


    // Mouse ekran koordinatını dünya koordinatına çevirip hücreyi bul
    findHoveredCell(mouseX, mouseY, viewport) {
        const worldX = mouseX + viewport.coordinate.x - viewport.center.x;
        const worldY = mouseY + viewport.coordinate.y - viewport.center.y;
        this.hoveredCell = this.worldToCell(worldX, worldY);
    }

    getCellsInRadius(worldX, worldY, radius) {
        const cs = this.cellSize;
        const cellRadius = Math.ceil(radius / cs);
        const originCell = this.worldToCell(worldX, worldY);
        const result = [];

        for (let dc = -cellRadius; dc <= cellRadius; dc++) {
            for (let dr = -cellRadius; dr <= cellRadius; dr++) {
                const col = originCell.col + dc;
                const row = originCell.row + dr;

                // World position of this cell's CENTER
                const cx = col * cs + cs / 2;
                const cy = row * cs + cs / 2;

                const dx = cx - worldX;
                const dy = cy - worldY;

                if (Math.sqrt(dx * dx + dy * dy) <= radius) {
                    result.push({ col, row });
                }
            }
        }

        return result;
    }

    draw(ctx, viewport) {
        const cs = this.cellSize;

        // Dunya koordinatina gore hucre konumlarini bul
        const left   = viewport.coordinate.x - viewport.center.x;
        const top    = viewport.coordinate.y - viewport.center.y;
        const right  = viewport.coordinate.x + viewport.center.x;
        const bottom = viewport.coordinate.y + viewport.center.y;

        //Dunya koordinatina gore verilen hucreleri screen spacede ekrana koy
        const startCol = Math.floor(left   / cs);
        const startRow = Math.floor(top    / cs);
        const endCol   = Math.floor(right  / cs);
        const endRow   = Math.floor(bottom / cs);

        ctx.save();


        //Hovered cell i boya (Kirmizi renge) ileride bu koda range icinde mi degil mi diye checkler eklenecek
        if (this.hoveredCell) {
            const { x, y } = this.cellToWorld(this.hoveredCell.col, this.hoveredCell.row);
            ctx.fillStyle = "rgba(255, 0, 0, 0.35)";
            ctx.fillRect(x, y, cs, cs);
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

        ctx.restore();
    }

    drawEntityAuras(ctx, entities, radius = 128) {
        const cs = this.cellSize;
        for (const entity of entities) {
            const cells = this.getCellsInRadius(entity.center.x, entity.center.y, radius);
            ctx.fillStyle = "rgba(0, 100, 255, 0.25)";
            for (const { col, row } of cells) {
                ctx.fillRect(col * cs, row * cs, cs, cs);
            }
        }
    }

}