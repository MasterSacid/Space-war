export class EventSystem {
    constructor() {
        this.events = new Map();
    }

    subscribe(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }
        this.events.get(eventName).add(callback);
    }

    unsubscribe(eventName, callback) {
        this.events.get(eventName)?.delete(callback);
    }

    publish(eventName, ...args) {
        const listeners = this.events.get(eventName);
        if (!listeners) return;
        for (const callback of [...listeners]) {
            callback(...args);
        }
    }
}


export const eventSystem = new EventSystem();
