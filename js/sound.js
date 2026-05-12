import { eventSystem } from "./eventSystem.js";

export class Sound {
    constructor() {
        this.subscriptions = [];

        this.soundCatalogue = {
            move: [
                new Audio("./sounds/metal1.ogg"),
                new Audio("./sounds/metal2.ogg"),
                new Audio("./sounds/metal3.ogg"),
                new Audio("./sounds/metal4.ogg"),
                new Audio("./sounds/metal5.ogg"),
            ],
        };

        eventSystem.subscribe("entity:move", this.handleEvent);

        this.subscriptions.push(
            ["entity:move", this.handleEvent]
        );
    }

    handleEvent = (data) => {
        switch (data.eventAction) {
            case "move":
                this.playSound("move");
                break;
            default:
                break;
        }
    };

    playSound(name,volume = 0.1) {
        const sound = this.soundCatalogue[name];
        if (!sound) {
            console.log(`Ses ${name} bulunamadi`);
        }

        const picked = Array.isArray(sound)
            ? sound[Math.floor(Math.random() * sound.length)]
            : sound;

        const instance = picked.cloneNode();
        instance.volume = volume;
        instance.play().catch(() => {});
    }

    destroy() {
        for (const [eventName, handler] of this.subscriptions) {
            eventSystem.unsubscribe(eventName, handler);
        }
        this.subscriptions = [];
    }
}