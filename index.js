class App {
    start() {
        //initial setup
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');


        //At the end of setup get into the main loop
        setInterval(() => this.update(), 1000 / 60); // ~60fps
    }

    update() {
        //clear canvas every frame in the beginning
        this.clearCanvas();

    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}



const app = new App();
app.start();
app.update();
