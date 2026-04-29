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
        this.container = document.getElementById("mainMenu");
        this.playBtn = document.getElementById("playButton");
    }

    on() {
        this.container.style.display = "flex";
        this.visible = true;
    }

    off() {
        this.container.style.display = "none";
        this.visible = false;
    }

    update() { }

    show() { }
}

export class SpaceScene extends Window {
    constructor(canvas) {
        super(canvas, canvas.width, canvas.height, 0, 0);

        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;

        this.starDensity = 0.001;
        this.starCount = 0;
        this.calculateStarCount();

        this.bgZ = 0;

        this.stars = [];

        this.smallMode = true;
        this.visible = true;
        this.generateSpace();
    }

    generateSpace() {
        for (let i = 0; i < this.starCount; i++) {
            const star = { x: (Math.random() - 0.5) * this.canvas.width, y: (Math.random() - 0.5) * this.canvas.height, z: Math.random() };
            this.stars.push(star);
        }
    }

    show() {
        let width = this.canvas.width;
        let x = 0;
        if (this.smallMode) {
            x = this.canvas.width / 4;
            width = this.canvas.width * 5 / 12;
        }
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(x, 0, width, this.canvas.height);

        this.ctx.fillStyle = "white";
        this.stars.forEach(star => {
            const zdis = star.z - this.bgZ;
            if (zdis < 0) {
                star.z = this.bgZ + 1 + Math.random();
                star.x = (Math.random() - 0.5) * this.canvas.width * 2;
                star.y = (Math.random() - 0.5) * this.canvas.height * 2;
            }
            const size = Math.min(20, 1.25 / zdis);

            this.ctx.fillRect(this.centerX + star.x / zdis, this.centerY + star.y / zdis, size, size);
        });
    }

    update(dt) {
        this.bgZ += 0.1 * dt;
        //this.bgX -= 10 * dt;
        //this.bgY -= 10 * dt;
    }

    calculateStarCount() {
        this.starCount = Math.round(this.canvas.width * this.canvas.height * this.starDensity);
    }
}

export class StatusPane extends Window {
    constructor(canvas) {
        super(canvas, canvas.width / 4, canvas.height, 0, 0);
        this.visible = true;
    }

    show() {
    }

    update() { }
}

export class TerminalPane extends Window {
    constructor(canvas) {
        super(canvas, canvas.width / 3, canvas.height, canvas.width * 2 / 3, 0);
        this.visible = true;
        this.container = document.getElementById("terminalPane");
        this.pendingText = [];
        this.addText("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", 10);
        this.addText("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", 20);
        this.addText("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", 30);
        console.log(this.pendingText);
    }

    addText(string, letterPerSec) {
        const textElement = document.createElement("div");
        this.container.appendChild(textElement);
        if (letterPerSec <= 0) {
            textElement.textContent = string;
        } else {
            this.pendingText.push({ str: string, letterPerSec: letterPerSec, current: 0, progress: 0, element: textElement });
        }
    }

    show() {
    }

    update(dt) {
        for (let i = 0; i < this.pendingText.length; i++) {
            const text = this.pendingText[i];

            text.progress += dt;

            while (text.progress > 1 / text.letterPerSec) {
                text.element.textContent += text.str.at(text.current);
                text.current++;
                if (text.current >= text.str.length) {
                    this.pendingText.splice(i, 1);
                    --i;
                    break;
                }
                text.progress -= 1 / text.letterPerSec;
            }
        }
    }
}
