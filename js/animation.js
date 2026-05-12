import { Tileset } from "./tileset.js";


export class AnimationSet {
    constructor() {

    }




    getSpritesheetFrameByIndex(animationFrameIndex, animationFrameCount,frameWidth, frameHeight) {
        const sx = (index % tilesPerRow) * this.tileSize;
        const sy = Math.floor(index / tilesPerRow) * this.tileSize;
        return { sx, sy };
    }
}