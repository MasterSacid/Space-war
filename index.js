class App {
    start() {
        //initial setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    loop(currentTime) {
        // we use delta time to calculate updates regardless of what fps we get
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Make updates based on time how much times has passed
        this.update(deltaTime);
        // Make the drawings based on the updates
        this.draw();

        // keep the animation going by requesting another animation frame
        requestAnimationFrame((time) => this.loop(time));
    }


    update(dt) {
        //clear canvas every frame in the beginning
        this.clearCanvas();
    }

    draw() {
        this.ctx.fillRect(this.canvas.width / 4, this.canvas.height / 4, this.canvas.width / 2, this.canvas.height / 2);
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}


const app = new App();
app.start();
requestAnimationFrame((time) => app.loop(time))
