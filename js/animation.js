export class AnimationSet {
    constructor({ flipped = false } = {}) {
        this.animations = {};
        this.pendingLoads = [];
        this.flipped = flipped;
    }
    addAnimation(name, { imageUrl, frameCount, frameDuration = 0.125 }) {
        const image = new Image();
        const animation = {
            image,
            frameWidth: null,
            frameHeight: null,
            frameCount,
            frameDuration,
            loaded: false
        };
        this.animations[name] = animation;

        const loadPromise = new Promise((resolve, reject) => {
            image.addEventListener("load", () => {
                //Foto yüklendiğinde fotoğraftan bilgileri çek
                animation.frameWidth = Math.floor(image.naturalWidth / frameCount);
                animation.frameHeight = image.naturalHeight;
                animation.loaded = true;
                resolve();
            }, { once: true });

            image.addEventListener("error", () => {
                reject(new Error(`Animation "${name}" image could not be loaded: ${imageUrl}`));
            }, { once: true });
        });

        this.pendingLoads.push(loadPromise);
        image.src = imageUrl;
    }

    ready() {
        return Promise.all(this.pendingLoads);
    }

    has(name) {
        return Object.prototype.hasOwnProperty.call(this.animations, name);
    }

    getMeta(name) {
        return this.animations[name] || null;
    }

    getFrame(animationName, frameIndex) {
        const anim = this.animations[animationName];
        if (!anim) {
            console.warn("Animation " + animationName + " not found");
            return null;
        }
        if (!anim.loaded) {
            console.warn("Animation " + animationName + " not loaded");
            return null;
        }
        return {
            image: anim.image,
            sx: (frameIndex % anim.frameCount) * anim.frameWidth, //offset koyarak framelerde ilerle
            sy: 0, //Tek satır var o yüzden doğrudan 0 diye girdim
            sw: anim.frameWidth,
            sh: anim.frameHeight
        };
    }
}

export class AnimationPlayer {
    constructor(animationSet, initialState = "idle") {
        this.set = animationSet;
        this.requestedState = null;
        this.state = null;
        this.frameIndex = 0;
        this.elapsed = 0;
        this.warnedMissing = new Set();
        this.play(initialState);
    }

    play(stateName) {
        if (this.requestedState === stateName) return;
        this.requestedState = stateName;

        let target = stateName;
        if (!this.set.has(stateName)) {
            if (!this.warnedMissing.has(stateName)) {
                console.warn(`Animation "${stateName}" not in set; falling back to "idle"`);
                this.warnedMissing.add(stateName);
            }
            target = "idle";
        }

        if (this.state === target) return;
        this.state = target;
        this.frameIndex = 0;
        this.elapsed = 0;
    }

    update(dt) {
        const meta = this.set.getMeta(this.state);
        if (!meta || !meta.loaded) return;

        this.elapsed += dt;
        while (this.elapsed >= meta.frameDuration) {
            this.elapsed -= meta.frameDuration;
            this.frameIndex = (this.frameIndex + 1) % meta.frameCount;
        }
    }

    draw(ctx, centerX, centerY, cellSize, facing = 1) {
        const frame = this.set.getFrame(this.state, this.frameIndex);
        if (!frame) return;

        const scale = Math.min(cellSize / frame.sw, cellSize / frame.sh);
        const drawW = frame.sw * scale;
        const drawH = frame.sh * scale;

        ctx.save();
        const mirror = (facing < 0) !== this.set.flipped;
        if (mirror) {
            ctx.translate(centerX, centerY);
            ctx.scale(-1, 1);
            ctx.translate(-centerX, -centerY);
        }
        ctx.drawImage(
            frame.image,
            frame.sx, frame.sy, frame.sw, frame.sh,
            centerX - drawW / 2, centerY - drawH / 2, drawW, drawH
        );
        ctx.restore();
    }
}
