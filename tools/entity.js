export class Entity {
    constructor(position, scale, entityType, color) {
        this.position = position;
        this.scale = scale;
        this.entityType = entityType; //String tipinde
        this.color = color;
    }

    move(dx, dy) {
        this.position.x += dx;
        this.position.y += dy;
    }


    spawnEntity(canvasContext) {
        canvasContext.fillStyle = this.color;
        canvasContext.fillRect(this.position.x, this.position.y, this.scale.width, this.scale.height);
    }
}

export class InputManager {
    constructor() {
        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);
    }

    handleInput(entity, speed = 3) {
        if (entity.entityType !== "player") return;

        let dx = 0;
        let dy = 0;

        if (this.keys['ArrowUp']) dy -= 1;
        if (this.keys['ArrowDown']) dy += 1;
        if (this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['ArrowRight']) dx += 1;

        //Capraz giderken cok hizli. O yuzden normalize ediyoruz
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
            dx = (dx / length) * speed;
            dy = (dy / length) * speed;
        }

        entity.move(dx, dy);
    }
}
