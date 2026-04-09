class App {
    start() {
        //initial setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    update(currentTime) {
        // we use delta time to calculate updates regardless of what fps we get
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.clearCanvas();
        // Make drawings

        // keep the animation going by requesting another animation frame
        requestAnimationFrame((time) => this.loop(time));
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}


const app = new App();
app.start();
requestAnimationFrame((time) => app.update(time))
