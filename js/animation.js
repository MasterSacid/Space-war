import { eventSystem } from "./eventSystem.js";

export class AnimationSet {
    constructor({ flipped = false, scaleX = 1, scaleY, offsetX = 0, offsetY = 0 } = {}) {
        this.animations = {};
        this.pendingLoads = [];
        this.flipped = flipped;
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        this.offsetX = offsetX;
        this.offsetY = offsetY
        this.isLocked = false;
    }

    addAnimation(name, { imageUrl, frameCount, frameDuration = 0.125, offsetX = 0, offsetY = 0 }) {
        const image = new Image();
        const animation = {
            image,
            frameWidth: null,
            frameHeight: null,
            frameCount,
            frameDuration,
            offsetX,
            offsetY,
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
            sh: anim.frameHeight,
            offsetX: this.offsetX + anim.offsetX,
            offsetY: this.offsetY + anim.offsetY
        };
    }
}

export class AnimationPlayer {
    constructor(entity, animationSet, { defaultAnimation = "idle", cellSize } = {}) {
        this.entity = entity;
        this.animationSet = animationSet;
        this.defaultAnimation = defaultAnimation;
        this.cellSize = cellSize;

        this.currentName = defaultAnimation;
        this.currentFrame = 0;
        this.elapsed = 0;
        this.loop = true;
        this.onEnd = null;

        this.subscriptions = [];

        eventSystem.subscribe("entity:idle", this.handleIdle);
        eventSystem.subscribe("entity:move:start", this.handleMove);
        eventSystem.subscribe("entity:move:end", this.handleMoveEnd);
        eventSystem.subscribe("entity:attack", this.handleAttack);
        eventSystem.subscribe("entity:damaged", this.handleHurt);
        eventSystem.subscribe("entity:death", this.handleDeath);
    }

    handleIdle = (data) => {
        if (!data || data.entity !== this.entity) return;
        if (this.isLocked) return;
        this.play(this.defaultAnimation, { loop: true });
    };
    handleMove = (data) => {
        if (!data || data.entity !== this.entity) return;
        if (this.isLocked) return;
        this.play("run", { loop: true });
    };

    handleMoveEnd = (data) => {
        if (this.isLocked) return;
        if (!data || data.entity !== this.entity) return;
        this.play(this.defaultAnimation, { loop: true });
    };

    handleAttack = (data) => {
        if (!data || data.entity !== this.entity) return;

        this.isLocked = true;

        this.play("attack", {
            loop: false,
            onEnd: () => {
                this.isLocked = false;
                this.play(this.defaultAnimation, { loop: true });
            },
        });
    };

    handleHurt = (data) => {
        if (!data || data.entity !== this.entity) return;

        this.isLocked = true;

        this.play("hurt", {
            loop: false,
            onEnd: () => {
                this.isLocked = false;
                this.play(this.defaultAnimation, { loop: true });
            },
        });
    };

    handleDeath = (data) => {
        if (!data || data.entity !== this.entity) return;
        this.isLocked = true;

        this.play("death", {
            loop: false,
        });
    };

    play(name, { loop = true, onEnd = null } = {}) {
        console.log(`Playing: ${name} for ${this.entity.resourceName}`);
        if (!this.animationSet.has(name)) return;
        if (this.currentName === name && this.loop && loop) return;

        this.currentName = name;
        this.currentFrame = 0;
        this.elapsed = 0;
        this.loop = loop;
        this.onEnd = onEnd;
    }

    update(dt) {
        const meta = this.animationSet.getMeta(this.currentName);
        if (!meta || !meta.loaded) return;

        this.elapsed += dt;
        const frameIndex = Math.floor(this.elapsed / meta.frameDuration);

        if (this.loop) {
            this.currentFrame = frameIndex % meta.frameCount;
        } else if (frameIndex >= meta.frameCount) {
            this.currentFrame = meta.frameCount - 1;

            const onEnd = this.onEnd;
            this.onEnd = null;

            if (onEnd) onEnd();
        } else {
            this.currentFrame = frameIndex;
        }
    }

    draw(ctx) {
        const frame = this.animationSet.getFrame(this.currentName, this.currentFrame);
        if (!frame) return;

        const scaleX = this.animationSet.scaleX;
        const scaleY = this.animationSet.scaleY;
        const dw = this.entity.width * scaleX;
        const dh = this.entity.height * scaleY;

        const dx = (this.entity.center.x - dw / 2) + (frame.offsetX);
        const cellBottom = this.entity.center.y + this.cellSize / 2;
        const dy = (cellBottom - dh) + (frame.offsetY);

        const facingLeft = (this.entity.facing ?? 1) < 0;
        const shouldFlip = this.animationSet.flipped !== facingLeft;

        ctx.save();
        if (shouldFlip) {
            ctx.translate(this.entity.center.x, this.entity.center.y);
            ctx.scale(-1, 1);
            ctx.translate(-this.entity.center.x, -this.entity.center.y);
        }
        ctx.drawImage(frame.image, frame.sx, frame.sy, frame.sw, frame.sh, dx, dy, dw, dh);
        ctx.restore();
    }

    destroy() {
        for (const [eventName, handler] of this.subscriptions) {
            eventSystem.unsubscribe(eventName, handler);
        }
        this.subscriptions = [];
    }
}

export function createAnimationCatalogue() {

    const bloodWitch = new AnimationSet({ flipped: true, scaleX: 4.5, scaleY: 4.5, offsetY: 64 });
    bloodWitch.addAnimation("idle", { imageUrl: "./animations/charachters/blood_wizard/wizard_idle.png", frameCount: 10 });
    bloodWitch.addAnimation("run", { imageUrl: "./animations/charachters/blood_wizard/wizard_run.png", frameCount: 8 });
    bloodWitch.addAnimation("attack", { imageUrl: "./animations/charachters/blood_wizard/wizard_attack.png", frameCount: 13 });
    bloodWitch.addAnimation("death", { imageUrl: "./animations/charachters/blood_wizard/wizard_death.png", frameCount: 18 });
    bloodWitch.addAnimation("hurt", { imageUrl: "./animations/charachters/blood_wizard/wizard_hurt.png", frameCount: 3 });

    const skeleton = new AnimationSet({ flipped: true, scaleX: 3, scaleY: 2.25 });
    skeleton.addAnimation("idle", { imageUrl: "./animations/charachters/skeleton/skeleton_idle.png", frameCount: 8 });
    skeleton.addAnimation("run", { imageUrl: "./animations/charachters/skeleton/skeleton_walk.png", frameCount: 10 });
    skeleton.addAnimation("attack", { imageUrl: "./animations/charachters/skeleton/skeleton_attack.png", frameCount: 10 });
    skeleton.addAnimation("death", { imageUrl: "./animations/charachters/skeleton/skeleton_die.png", frameCount: 13 });
    skeleton.addAnimation("hurt", { imageUrl: "./animations/charachters/skeleton/skeleton_hurt.png", frameCount: 5 });

    const slime = new AnimationSet({ flipped: true, scaleX: 5, scaleY: 5, offsetY: 96 });
    slime.addAnimation("idle", { imageUrl: "./animations/charachters/slime/slime_idle.png", frameCount: 6 });
    slime.addAnimation("run", { imageUrl: "./animations/charachters/slime/slime_run.png", frameCount: 8 });
    slime.addAnimation("attack", { imageUrl: "./animations/charachters/slime/slime_attack.png", frameCount: 8 });
    slime.addAnimation("death", { imageUrl: "./animations/charachters/slime/slime_death.png", frameCount: 10 });
    slime.addAnimation("hurt", { imageUrl: "./animations/charachters/slime/slime_hurt.png", frameCount: 4 });

    const cyborg = new AnimationSet({ flipped: false, scaleX: 1.8, scaleY: 1.8, offsetX: 16 });
    cyborg.addAnimation("idle", { imageUrl: "./animations/charachters/cyborg/cyborg_idle.png", frameCount: 4 });
    cyborg.addAnimation("run", { imageUrl: "./animations/charachters/cyborg/cyborg_run.png", frameCount: 6 });
    cyborg.addAnimation("attack", { imageUrl: "./animations/charachters/cyborg/cyborg_attack.png", frameCount: 6 });
    cyborg.addAnimation("death", { imageUrl: "./animations/charachters/cyborg/cyborg_death.png", frameCount: 6 });
    cyborg.addAnimation("hurt", { imageUrl: "./animations/charachters/cyborg/cyborg_hurt.png", frameCount: 2 });

    const spearWoman = new AnimationSet({ flipped: false, scaleX: 3.8, scaleY: 3.8, offsetY: 24, offsetX: 16 });
    spearWoman.addAnimation("attack", { imageUrl: "./animations/charachters/spearwoman/woman_attack.png", frameCount: 22, frameDuration: 0.08 });
    spearWoman.addAnimation("idle", { imageUrl: "./animations/charachters/spearwoman/woman_idle.png", frameCount: 8 });
    spearWoman.addAnimation("run", { imageUrl: "./animations/charachters/spearwoman/woman_run.png", frameCount: 8 });
    spearWoman.addAnimation("death", { imageUrl: "./animations/charachters/spearwoman/woman_death.png", frameCount: 9 });
    spearWoman.addAnimation("hurt", { imageUrl: "./animations/charachters/spearwoman/woman_hurt.png", frameCount: 4 });

    const magician = new AnimationSet({ flipped: false, scaleX: 3, scaleY: 3 });
    magician.addAnimation("idle", { imageUrl: "./animations/charachters/magician/magician_idle.png", frameCount: 8 });
    magician.addAnimation("attack", { imageUrl: "./animations/charachters/magician/magician_attack.png", frameCount: 7, frameDuration: 0.08 });
    magician.addAnimation("death", { imageUrl: "./animations/charachters/magician/magician_death.png", frameCount: 4 });
    magician.addAnimation("hurt", { imageUrl: "./animations/charachters/magician/magician_hurt.png", frameCount: 4 });
    magician.addAnimation("run", { imageUrl: "./animations/charachters/magician/magician_run.png", frameCount: 8 });



    return {
        sets: {
            "blood-witch": bloodWitch,
            "skeleton": skeleton,
            "slime": slime,
            "cyborg": cyborg,
            "spear-woman": spearWoman,
            "magician": magician
        },
        ready: () => Promise.all(
            [bloodWitch.ready(),
            skeleton.ready(),
            slime.ready(),
            cyborg.ready(),
            spearWoman.ready(),
            magician.ready()
            ]),
    };
}
