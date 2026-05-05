class Tileset {
    constructor(tilesetName,tilesetPath,tileSize,tilesPerRow) {
        this.tilesetName = tilesetName;
        this.tilesetPath = tilesetPath;
        this.tileSize = tileSize;
        this.tilesPerRow = tilesPerRow;
        this.tiles = new Map();
    }

    getTileCoordsByIndex(index, tilesPerRow = this.tilesPerRow) {
        const sx = (index % tilesPerRow) * this.tileSize;
        const sy = Math.floor(index / tilesPerRow) * this.tileSize;
        return { sx, sy };
    }

    setTileNameByIndex(index, tileName) {
        this.tiles.set(tileName, this.getTileCoordsByIndex(index));
    }



    getTile(tileName) {
        return this.tiles.get(tileName);
    }
    drawTile

}

class mapEngineer {

}




