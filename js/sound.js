import { eventSystem } from "./eventSystem.js";

export class Sound {
    constructor() {
        this.subscriptions = [];

        this.soundCatalogue = {
            move: [
                new Audio("./sounds/movement/metal1.ogg"),
                new Audio("./sounds/movement/metal2.ogg"),
                new Audio("./sounds/movement/metal3.ogg"),
                new Audio("./sounds/movement/metal4.ogg"),
                new Audio("./sounds/movement/metal5.ogg")
            ],
            dialogue: {
                SpearWoman: {
                    //Tur sırası bie gelince söylenir
                    greeting:[
                        new Audio("./sounds/dialogue/woman/confirmation_9_karen.wav"),
                        new Audio("./sounds/dialogue/woman/greeting_5_karen.wav"),
                        new Audio("./sounds/dialogue/woman/greeting_10_karen.wav")
                    ],
                    //Eylem yapılamazsa
                    refusal:[
                        new Audio("./sounds/dialogue/woman/refusal_5_karen.wav"),
                        new Audio("./sounds/dialogue/woman/refusal_3_karen.wav"),
                        new Audio("./sounds/dialogue/woman/refusal_8_karen.wav")
                    ],
                    //Hasar yersen
                    hurt:[
                        new Audio("./sounds/dialogue/woman/damage_7_karen.wav"),
                        new Audio("./sounds/dialogue/woman/damage_6_karen.wav")
                    ],
                    //Ölünce
                    death: [new Audio("./sounds/dialogue/woman/death_4_karen.wav")]
                },
                Magician:{
                    greeting:[
                        new Audio("./sounds/dialogue/magician/confirmation_1_ian.wav"),
                        new Audio("./sounds/dialogue/magician/greeting_4_ian.wav"),
                        new Audio("./sounds/dialogue/magician/greeting_10_ian.wav")
                    ],
                    refusal:[
                        new Audio("./sounds/dialogue/magician/refusal_5_ian.wav"),
                        new Audio("./sounds/dialogue/magician/refusal_3_ian.wav"),
                        new Audio("./sounds/dialogue/magician/refusal_9_ian.wav")
                    ],
                    hurt:[
                        new Audio("./sounds/dialogue/magician/damage_4_ian.wav"),
                        new Audio("./sounds/dialogue/magician/damage_2_ian.wav"),

                    ],
                    death:[
                        new Audio("./sounds/dialogue/magician/death_2_ian.wav")
                    ]
                },

                Captain:{
                    greeting:[
                        new Audio("./sounds/dialogue/captain/completion_4_sean.wav"),
                        new Audio("./sounds/dialogue/captain/greeting_4_sean.wav"),
                        new Audio("./sounds/dialogue/captain/greeting_9_sean.wav")
                    ],
                    refusal:[
                        new Audio("./sounds/dialogue/captain/refusal_1_sean.wav"),
                        new Audio("./sounds/dialogue/captain/refusal_3_sean.wav"),
                        new Audio("./sounds/dialogue/captain/refusal_5_sean.wav")
                    ],
                    hurt:[
                        new Audio("./sounds/dialogue/captain/damage_3_sean.wav"),
                        new Audio("./sounds/dialogue/captain/damage_6_sean.wav")
                    ],
                    death:[
                        new Audio("./sounds/dialogue/captain/death_2_sean.wav")
                    ]
                }
            }
        };

        this.musicCatalogue = {
            main: new Audio("./sounds/bgm.wav"),
        };
        for (const track of Object.values(this.musicCatalogue)) {
            track.loop = true;
        }
        this.currentMusic = null;

        eventSystem.subscribe("entity:move", this.handleMovement);
        eventSystem.subscribe("entity:turn", this.handleDialogue);

        this.subscriptions.push(
            ["entity:move", this.handleMovement]
        );
    }

    handleMovement = (data) => {
        this.playSound("move");
    };

    handleDialogue = (data) => {
        if (data.eventAction !== "dialogue") return;
        this.playDialogue(data.entityName, data.dialogueType);
    };

    //eventSystem.publish("entity:turn", {
    //     eventAction: "dialogue",
    //     entityName: "SpearWoman",
    //     dialogueType: "greeting",
    // });

    //Bu formatta publish etmen lazım

    playDialogue(entityName, dialogueType, volume = 0.4) {
        const characterLines = this.soundCatalogue.dialogue[entityName];
        if (!characterLines) {
            console.log(`Karakter ${entityName} icin diyalog yok`);
            return;
        }

        const lines = characterLines[dialogueType];
        if (!lines || lines.length === 0) {
            console.log(`${entityName} icin ${dialogueType} diyalogu yok`);
            return;
        }

        const picked = lines[Math.floor(Math.random() * lines.length)];
        const instance = picked.cloneNode();
        instance.volume = volume;
        instance.play().catch(() => {});
    }

    playSound(name,volume = 0.1) {
        const sound = this.soundCatalogue[name];
        if (!sound) {
            console.log(`Ses ${name} bulunamadi`);
            return;
        }

        const picked = Array.isArray(sound)
            ? sound[Math.floor(Math.random() * sound.length)]
            : sound;

        const instance = picked.cloneNode();
        instance.volume = volume;
        instance.play().catch(() => {});
    }

    playMusic(name, volume = 0.3) {
        const track = this.musicCatalogue[name];
        if (!track) {
            console.log(`Muzik ${name} bulunamadi`);
            return;
        }

        this.stopMusic();

        track.volume = volume;
        track.play().catch(() => {});
        this.currentMusic = track;
    }

    stopMusic() {
        if (!this.currentMusic) return;
        this.currentMusic.pause();
        this.currentMusic.currentTime = 0;
        this.currentMusic = null;
    }

    setMusicVolume(volume) {
        if (!this.currentMusic) return;
        this.currentMusic.volume = volume;
    }

    destroy() {
        this.stopMusic();
        for (const [eventName, handler] of this.subscriptions) {
            eventSystem.unsubscribe(eventName, handler);
        }
        this.subscriptions = [];
    }
}