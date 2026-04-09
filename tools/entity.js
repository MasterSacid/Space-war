export class Entity {
    constructor(position, scale, entityType, color) {
        this.position = position; // pozisyon bir obje ve içinde x,y değerleri var (World Coord)
        this.scale = scale;      // scale bir obje ve içinde x,y değerleri var
        this.entityType = entityType; //String tipinde
        this.color = color;  //Renk olarak aynı
    }
    spawnEntity(canvasContext) {
        canvasContext.fillStyle = this.color;
        canvasContext.fillRect(this.position.x, this.position.y, this.scale.width, this.scale.height);
    }
}

