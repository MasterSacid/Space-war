class Window {
    constructor(canvas, width = 100, height = 100, x = 0, y = 0) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
        this.fullscreen = false;
        this.visible = false;
        if (this.height == canvas.height && this.width == canvas.width) {
            this.fullscreen = true;
        }
    }

    draw() {
        if (this.visible) this.show();
    }

    update() {
        throw new Error(this.constructor.name + " should implement update()");
    }

    show() {
        throw new Error(this.constructor.name + " should implement show()");
    }
}

export class MainMenu extends Window {
    constructor(canvas) {
        super(canvas, canvas.width, canvas.height, 0, 0);
    }

    update() { }

    show() {
        this.ctx.fillStyle = "white";
        this.ctx.textAlign = "center";
        this.ctx.font = "50px Monoton";
        this.ctx.fillText("HIDE  US  G8000", this.width / 2, this.height / 8, this.width);
    }

}

export class SpaceScene extends Window {
    constructor(canvas) {
        super(canvas, canvas.width, canvas.height, 0, 0);
        this.backcanvas = document.createElement("canvas");
        this.backctx = this.backcanvas.getContext("2d");

        const dimension = Math.ceil(Math.sqrt(this.canvas.width ** 2 + this.canvas.height ** 2));

        this.backcanvas.width = dimension;
        this.backcanvas.height = dimension;

        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;

        this.starDensity = 0.0005;
        this.starCount = 0;
        this.calculateStarCount();

        this.bgZ = 0;

        this.stars = [];

        this.generateSpace();
    }

    generateSpace() {
        for (let i = 0; i < this.starCount; i++) {
            const star = { x: (Math.random() - 0.5) * this.canvas.width, y: (Math.random() - 0.5) * this.canvas.height, z: Math.random() };
            this.stars.push(star);
        }

        this.backctx.translate(this.centerX / 2 + this.canvas.width / 2, this.centerY + this.canvas.height / 2);
    }

    show() {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = "white";
        this.stars.forEach(star => {
            const zdis = star.z - this.bgZ;
            if (zdis < 0) {
                star.z = this.bgZ + 1.5;
                star.x = (Math.random() - 0.5) * this.canvas.width * 2;
                star.y = (Math.random() - 0.5) * this.canvas.height * 2;
            }
            const size = Math.min(20, 1 / zdis);

            this.ctx.fillRect(this.centerX + star.x / zdis, this.centerY + star.y / zdis, size, size);
        });
    }

    update(dt) {
        this.bgZ += 0.1 * dt;
        //this.bgX -= 10 * dt;
        //this.bgY -= 10 * dt;

        if (this.bgX > this.backcanvas.width / 2 || this.bgX < 0)
            this.bgX = (this.backcanvas.width - this.canvas.width) / 2;
        if (this.bgY > this.backcanvas.height / 2 || this.bgY < 0)
            this.bgY = (this.backcanvas.height - this.canvas.height) / 2;
    }

    calculateStarCount() {
        this.starCount = Math.round(this.backcanvas.width * this.backcanvas.height * this.starDensity);
    }
}
