export class Tileset {
    constructor({ name, imageUrl, tileSize = 32, tilesPerRow = 10 }) {
        this.name = name;
        this.imageUrl = imageUrl;
        this.tileSize = tileSize;
        this.tilesPerRow = tilesPerRow;
        this.loaded = false;
        this.tileCount = 0;

        this.image = new Image();
        this.ready = new Promise((resolve, reject) => {
            this.image.addEventListener("load", () => {
                this.loaded = true;
                const rows = Math.floor(this.image.naturalHeight / this.tileSize);
                const cols = Math.floor(this.image.naturalWidth / this.tileSize);
                this.tileCount = rows * cols;
                resolve(this);
            }, { once: true });

            this.image.addEventListener("error", () => {
                reject(new Error(`Tileset could not be loaded: ${this.imageUrl}`));
            }, { once: true });
        });

        this.image.src = imageUrl;
    }

    getTileCoordsByIndex(index, tilesPerRow = this.tilesPerRow) {
        const sx = (index % tilesPerRow) * this.tileSize;
        const sy = Math.floor(index / tilesPerRow) * this.tileSize;
        return { sx, sy };
    }

    drawTile(ctx, index, x, y, width, height) {
        if (!this.loaded) return;

        const { sx, sy } = this.getTileCoordsByIndex(index);
        ctx.drawImage(
            this.image,
            sx,
            sy,
            this.tileSize,
            this.tileSize,
            x,
            y,
            width,
            height
        );
    }
}

export class TilePalette {
    constructor(container, { onSelect } = {}) {
        this.container = container;
        this.onSelect = onSelect;
        this.tilesets = [];
        this.selectedButton = null;
        this.selected = null;
    }

    addTileset(tileset) {
        this.tilesets.push(tileset);
        tileset.ready.then(() => this.render());
        this.render();
    }

    render() {
        const previousSelection = this.selected;
        this.selectedButton = null;
        this.container.replaceChildren();

        const toolRow = document.createElement("div");
        toolRow.className = "tile-tools";

        const eraserButton = document.createElement("button");
        eraserButton.type = "button";
        eraserButton.className = "tile-tool";
        eraserButton.textContent = "Sil";
        eraserButton.title = "Silgi";
        eraserButton.addEventListener("click", () => {
            this.select(eraserButton, { type: "eraser" });
        });
        if (previousSelection?.type === "eraser") {
            this.markSelected(eraserButton);
        }
        toolRow.appendChild(eraserButton);
        this.container.appendChild(toolRow);

        for (const tileset of this.tilesets) {
            const section = document.createElement("section");
            section.className = "tileset-section";

            const header = document.createElement("div");
            header.className = "tileset-header";
            header.textContent = tileset.name;
            section.appendChild(header);

            const grid = document.createElement("div");
            grid.className = "tile-grid";
            section.appendChild(grid);

            if (!tileset.loaded) {
                const loading = document.createElement("div");
                loading.className = "tile-loading";
                loading.textContent = "Yukleniyor";
                grid.appendChild(loading);
                this.container.appendChild(section);
                continue;
            }

            for (let i = 0; i < tileset.tileCount; i++) {
                const { sx, sy } = tileset.getTileCoordsByIndex(i);
                const selection = { type: "tile", tileset, tileIndex: i };
                const button = document.createElement("button");
                button.type = "button";
                button.className = "tile-option";
                button.title = `${tileset.name} #${i}`;
                button.style.backgroundImage = `url("${tileset.imageUrl}")`;
                button.style.backgroundPosition = `-${sx}px -${sy}px`;
                button.style.backgroundSize = `${tileset.image.naturalWidth}px ${tileset.image.naturalHeight}px`;
                button.addEventListener("click", () => {
                    this.select(button, selection);
                });
                grid.appendChild(button);

                if (this.isSameSelection(previousSelection, selection)) {
                    this.markSelected(button);
                }

                if (!previousSelection && !this.selected) {
                    this.select(button, selection);
                }
            }

            this.container.appendChild(section);
        }
    }

    select(button, selection) {
        this.markSelected(button);
        this.selected = selection;

        if (this.onSelect) {
            this.onSelect(selection);
        }
    }

    markSelected(button) {
        this.selectedButton?.classList.remove("is-selected");
        this.selectedButton = button;
        this.selectedButton.classList.add("is-selected");
    }

    isSameSelection(a, b) {
        if (!a || !b || a.type !== b.type) return false;
        if (a.type === "eraser") return true;
        return a.tileset === b.tileset && a.tileIndex === b.tileIndex;
    }
}
