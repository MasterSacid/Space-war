import { eventSystem } from "./eventSystem.js";

export class Sound {
    constructor() {
        this.subscriptions = [];

        this.sounds = {
            move: new Audio("./sounds/low.wav"),
        };

        eventSystem.subscribe("entity:sound", this.chooseWhichSoundToPlay);

        this.subscriptions.push(["entity:sound", this.chooseWhichSoundToPlay]);
    }

    chooseWhichSoundToPlay = (data) => {
        switch (data.eventAction) {
            case "move":
                this.playSound("move");
                break;
            default:
                break;
        }
    };

    playSound(name) {
        const sound = this.sounds[name];
        if (!sound) return;
        const instance = sound.cloneNode();
        instance.volume = sound.volume;
        instance.play().catch(() => {});
    }

    destroy() {
        for (const [eventName, handler] of this.subscriptions) {
            eventSystem.unsubscribe(eventName, handler);
        }
        this.subscriptions = [];
    }
}