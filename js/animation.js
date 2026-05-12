export class AnimationSet {
    constructor() {
        this.animations = {};
        this.pendingLoads = [];
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

