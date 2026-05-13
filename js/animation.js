import { eventSystem } from "./eventSystem.js";

export class AnimationSet {
    constructor({ flipped = false, scale = 1 } = {}) {
        this.animations = {};
        this.pendingLoads = [];
        this.flipped = flipped;
        this.scale = scale;
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

        eventSystem.subscribe("entity:move", this.handleMove);
        eventSystem.subscribe("entity:meleeAttack", this.handleMelee);
        eventSystem.subscribe("entity:idle", this.handleIdle);

        this.subscriptions.push(
            ["entity:move", this.handleMove],
            ["entity:meleeAttack", this.handleMelee],
            ["entity:idle", this.handleIdle],
        );
    }

    handleMove = (data) => {
        if (!data || data.entityName !== this.entity.name) return;
        this.play("run", { loop: true });
    };

    handleMelee = (data) => {
        if (!data || data.entityName !== this.entity.name) return;
        this.play("punch", {
            loop: false,
            onEnd: () => this.play(this.defaultAnimation, { loop: true }),
        });
    };

    handleIdle = (data) => {
        if (!data || data.entityName !== this.entity.name) return;
        this.play(this.defaultAnimation, { loop: true });
    };

    play(name, { loop = true, onEnd = null } = {}) {
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
            const onEnd = this.onEnd;
            this.onEnd = null;
            this.loop = true;
            if (onEnd) onEnd();
        } else {
            this.currentFrame = frameIndex;
        }
    }

    draw(ctx) {
        const frame = this.animationSet.getFrame(this.currentName, this.currentFrame);
        if (!frame) return;

        const scale = this.animationSet.scale;
        const dw = this.entity.width * scale;
        const dh = this.entity.height * scale;
        const dx = this.entity.center.x - dw / 2;
        const cellBottom = this.entity.center.y + this.cellSize / 2;
        const dy = cellBottom - dh;

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
    //Object keys özelliği kullandığım için sonlarına mutlaka AnimationSet diye ekle, karışır yoksa kodlarken
    const spaceGuy = new AnimationSet();
    spaceGuy.addAnimation("idle", { imageUrl: "./img/animations/Biker_idle.png", frameCount: 4 });
    spaceGuy.addAnimation("run",  { imageUrl: "./img/animations/Biker_run.png",  frameCount: 6 });

    const streetBro = new AnimationSet({scale:2});
    streetBro.addAnimation("idle",  { imageUrl: "./img/animations/Enemy_idle.png",  frameCount: 4 });
    streetBro.addAnimation("run",   { imageUrl: "./img/animations/Enemy_run.png",   frameCount: 4 });
    streetBro.addAnimation("punch", { imageUrl: "./img/animations/Enemy_punch.png", frameCount: 3 });


    const wizard = new AnimationSet({ scale: 4.5 });
    wizard.addAnimation("idle",{imageUrl:"./img/animations/wizard_idle.png",  frameCount: 10 });
    wizard.addAnimation("run",{imageUrl:"./img/animations/wizard_run.png",  frameCount: 8 });

    return {
        sets: { "SpaceGuy": spaceGuy, "StreetBro": streetBro, "Wizard": wizard },
        ready: () => Promise.all([spaceGuy.ready(), streetBro.ready(),wizard.ready()]),
    };
}
