import {eventSystem} from "./eventSystem.js";

export class Sound {
    constructor() {
        this.subscriptions = [];
        eventSystem.subscribe("entity:sound",this.chooseWhichSoundToPlay );
    }


    chooseWhichSoundToPlay = (data) => {
        switch (data.eventAction) {
            case "move":
                console.log(`I am ${data.entityName} and I am moving! Play move sound`);
                break;
                default:
                    break;
        }
    };




    destroy() {
        for (const [eventName, handler] of this.subscriptions) {
            eventSystem.unsubscribe(eventName, handler);
        }
        this.subscriptions = [];
    }

}

