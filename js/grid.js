export class Grid {
    constructor(cellSize = 64) {
        this.cellSize = cellSize;
        this.cells = {};
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
}