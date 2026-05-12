import { sleep } from "./utils.js";

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

        this.smallMode = false;
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
    }

    calculateStarCount() {
        this.starCount = Math.round(this.canvas.width * this.canvas.height * this.starDensity);
    }
}

export class StatusPane extends Window {
    constructor(canvas) {
        super(canvas, canvas.width / 4, canvas.height, 0, 0);
        this.container = document.getElementById("statusPane");
        this.G8000 = document.getElementById("G8000");
    }

    async G8000Online() {
        this.G8000.style.background = "radial-gradient(circle at center, #cccc99 var(--inner-radius), #000000 40%,yellow 50%, #778787 80%)"
        await sleep(600)
        this.G8000.classList.remove("is-blinking");
    }
    G8000Offline() {
        this.G8000.style.background = "radial-gradient(circle at center, black var(--inner-radius),yellow 70%, #778787 80%)"
        this.G8000.classList.add("is-blinking");
    }


    on() {
        this.container.style.display = "flex"
        this.visible = true;
    }

    off() {
        this.container.style.display = "none"
        this.visible = false;
    }

    show() {
    }

    update(dt) {
    }
}

export class TerminalPane extends Window {
    constructor(canvas) {
        super(canvas, canvas.width / 3, canvas.height, canvas.width * 2 / 3, 0);
        this.container = document.getElementById("terminalPane");
        this.container.style.display = "none";
        this.pendingText = [];
    }

    on() {
        this.container.style.display = "flex"
    }

    off() {
        this.container.style.display = "none"
    }


    addText(string, letterPerSec, complete) {
        const textElement = document.createElement("div");
        this.container.appendChild(textElement);
        if (letterPerSec <= 0) {
            textElement.textContent = string;
        } else {
            this.pendingText.push({ str: string, letterPerSec: letterPerSec, current: 0, progress: 0, element: textElement, onComplete: complete });
        }
    }

    show() {
    }

    update(dt) {
        for (let i = this.pendingText.length - 1; i >= 0; i--) {
            const text = this.pendingText[i];
            const timePerLetter = 1 / text.letterPerSec;

            text.progress += dt;

            let charsToAppend = "";

            while (text.progress > timePerLetter) {
                charsToAppend += text.str.at(text.current);
                text.current++;
                text.progress -= timePerLetter;

                if (text.current >= text.str.length) {
                    if (text.onComplete) text.onComplete();
                    this.pendingText.splice(i, 1);
                    break;
                }
            }

            if (charsToAppend.length > 0) {
                text.element.textContent += charsToAppend;
            }
        }
    }
}

export class dialogPane extends Window {
    constructor(canvas) {
        super(canvas);
        this.container = document.getElementById("dialogPane");
        this.container.style.display = "none";
        this.dialogIdCounter = 0;
    }

    on() {
        this.container.style.display = "flex";
    }

    off() {
        this.container.style.display = "none";
    }

    addDialog(title, description, select = "select", cb, onSelect) {
        const dialogHTML = `
            <div id="dialog-${this.dialogIdCounter}" class="dialogDecision">
                <div class="dialogHeader">${title}</div>
                <div class="dialogDescription">${description}</div>
                <div class="dialogButton">${select}</div>
            </div>
        `;

        this.container.insertAdjacentHTML("beforeend", dialogHTML);

        const newDialog = this.container.querySelector(`#dialog-${this.dialogIdCounter}`);

        newDialog.querySelector('.dialogHeader').textContent = title;
        newDialog.querySelector('.dialogDescription').textContent = description;
        newDialog.querySelector('.dialogButton').textContent = select;

        newDialog.querySelector('.dialogButton').addEventListener("click", () => {
            if (cb) cb();
            if (onSelect) onSelect();
            this.clear();
        });

        this.dialogIdCounter++
    }

    clear() {
        this.container.innerHTML = "";
    }
}

export class CardPane extends Window {
    constructor(canvas) {
        super(canvas);
        this.container = document.getElementById("cardPane");
        this.container.style.display = "flex";
        this.dialogIdCounter = 0;

        this.selectedCardIndex;

        const cards = this.container.querySelectorAll(".card");

        cards.forEach((card, i) => {
            card.addEventListener("mousedown", (e) => {
                let noAdd = false;
                if (this.selectedCardIndex == i) {
                    this.selectedCardIndex = -1;
                    noAdd = true;
                } else {
                    this.selectedCardIndex = i;
                }

                cards.forEach((c, j) => {
                    c.classList.remove("selected-card");

                    if (j === this.selectedCardIndex && !noAdd) {
                        c.classList.add("selected-card");
                    }
                });
            });
        });
    }


    on() {
        this.container.style.display = "flex";
    }

    off() {
        this.container.style.display = "none";
    }

}
