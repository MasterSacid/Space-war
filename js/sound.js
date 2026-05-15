import { eventSystem } from "./eventSystem.js";

export class Sound {
    constructor() {
        this.subscriptions = [];
        this.audioCache = new Map(); // path -> Audio

        this.soundCatalogue = {
            move: [
                "./sounds/movement/movement1.wav",
                "./sounds/movement/movement2.wav",
                "./sounds/movement/movement3.wav",
                "./sounds/movement/movement4.wav",
                "./sounds/movement/movement5.wav",
            ],
            dialogue: {
                "spear-woman": {
                    greeting: [
                        "./sounds/dialogue/woman/confirmation_9_karen.wav",
                        "./sounds/dialogue/woman/greeting_5_karen.wav",
                        "./sounds/dialogue/woman/greeting_10_karen.wav",
                    ],
                    refusal: [
                        "./sounds/dialogue/woman/refusal_5_karen.wav",
                        "./sounds/dialogue/woman/refusal_3_karen.wav",
                        "./sounds/dialogue/woman/refusal_8_karen.wav",
                    ],
                    hurt: [
                        "./sounds/dialogue/woman/damage_7_karen.wav",
                        "./sounds/dialogue/woman/damage_6_karen.wav",
                    ],
                    death: ["./sounds/dialogue/woman/death_4_karen.wav"],
                },
                "magician": {
                    greeting: [
                        "./sounds/dialogue/magician/confirmation_1_ian.wav",
                        "./sounds/dialogue/magician/greeting_4_ian.wav",
                        "./sounds/dialogue/magician/greeting_10_ian.wav",
                    ],
                    refusal: [
                        "./sounds/dialogue/magician/refusal_5_ian.wav",
                        "./sounds/dialogue/magician/refusal_3_ian.wav",
                        "./sounds/dialogue/magician/refusal_9_ian.wav",
                    ],
                    hurt: [
                        "./sounds/dialogue/magician/damage_4_ian.wav",
                        "./sounds/dialogue/magician/damage_2_ian.wav",
                    ],
                    death: ["./sounds/dialogue/magician/death_2_ian.wav"],
                },
                "cyborg": {
                    greeting: [
                        "./sounds/dialogue/captain/completion_4_sean.wav",
                        "./sounds/dialogue/captain/greeting_4_sean.wav",
                        "./sounds/dialogue/captain/greeting_9_sean.wav",
                    ],
                    refusal: [
                        "./sounds/dialogue/captain/refusal_1_sean.wav",
                        "./sounds/dialogue/captain/refusal_3_sean.wav",
                        "./sounds/dialogue/captain/refusal_5_sean.wav",
                    ],
                    hurt: [
                        "./sounds/dialogue/captain/damage_3_sean.wav",
                        "./sounds/dialogue/captain/damage_6_sean.wav",
                    ],
                    death: ["./sounds/dialogue/captain/death_2_sean.wav"],
                },
            },

            CameraWoosh: [
                "./sounds/additional/camera_woosh_1.wav",
                "./sounds/additional/camera_woosh_2.wav",
                "./sounds/additional/camera_woosh_3.wav",
                "./sounds/additional/camera_woosh_4.wav",
                "./sounds/additional/camera_woosh_5.wav",
                "./sounds/additional/camera_woosh_6.wav",
            ],

            UISounds: {
                select: [
                    "./sounds/additional/ui_confirm_1.wav",
                    "./sounds/additional/se_cursormove.wav",
                ],
                deselect: [
                    "./sounds/additional/ui_deselect.wav",
                ]
            },

            Spell: {
                "blood-witch": [
                    "./sounds/Spell/bloodwitch/attack_1.wav",
                    "./sounds/Spell/bloodwitch/attack_2.wav",
                ],
                cyborg: [
                    "./sounds/Spell/cyborg/attack_1.wav",
                    "./sounds/Spell/cyborg/attack_2.wav",
                    "./sounds/Spell/cyborg/attack_3.wav",
                ],
                magician: [
                    "./sounds/Spell/magician/attack_1.wav",
                    "./sounds/Spell/magician/attack_2.wav",
                    "./sounds/Spell/magician/attack_3.wav",
                ],
                skeleton: [
                    "./sounds/Spell/Skeleton/attack_1.wav",
                    "./sounds/Spell/Skeleton/attack_2.wav",
                    "./sounds/Spell/Skeleton/attack_3.wav",
                ],
                slime: [
                    "./sounds/Spell/slime/slime_attack_1.wav",
                    "./sounds/Spell/slime/slime_attack_2.wav",
                ],
                "spear-woman": [
                    "./sounds/Spell/speerwoman/attack_1.wav",
                    "./sounds/Spell/speerwoman/attack_2.wav",
                ],
            }
        };

        this.musicCatalogue = {
            main: new Audio("./sounds/bgm.wav"),
        };
        for (const track of Object.values(this.musicCatalogue)) {
            track.loop = true;
        }
        this.currentMusic = null;


        this.subscribe("entity:move", this.handleMovement);

        // Dialog Events
        this.subscribe("entity:turn-start", this.handleTurnStart);
        this.subscribe("entity:action-blocked", this.handleActionBlocked);
        this.subscribe("entity:damaged", this.handleDamaged);
        this.subscribe("entity:death", this.handleDied);
        this.subscribe("camera:move", this.handleCameraMovement);
        this.subscribe("player:select", this.handleUISelect);
        this.subscribe("entity:attack", this.handleAttack);

        // Publish formats:
        // eventSystem.publish("entity:move",           { entityName: "..." });
        // eventSystem.publish("entity:turn-start",     { entityName: "SpearWoman" });
        // eventSystem.publish("entity:action-blocked", { entityName: "Magician"   });
        // eventSystem.publish("entity:damaged",        { entityName: "Captain"    });
        // eventSystem.publish("entity:died",           { entityName: "SpearWoman" });
    }

    subscribe(eventName, handler) {
        eventSystem.subscribe(eventName, handler);
        this.subscriptions.push([eventName, handler]);
    }

    // Path'i Audio nesnesine çevirir, ilk seferde yaratır ve cache'ler
    getAudio(path) {
        let audio = this.audioCache.get(path);
        if (!audio) {
            audio = new Audio(path);
            this.audioCache.set(path, audio);
        }
        return audio;
    }

    // --- Handlers ---
    handleMovement = () => this.playSound("move");
    handleTurnStart = ({ entity }) => this.playSound(["dialogue", entity.type, "greeting"], 0.4);
    handleActionBlocked = ({ entity }) => this.playSound(["dialogue", entity.type, "refusal"], 0.4);
    handleDamaged = ({ entity }) => this.playSound(["dialogue", entity.type, "hurt"], 0.4);
    handleDied = ({ entity }) => this.playSound(["dialogue", entity.type, "death"], 0.4);
    handleAttack = () => ({ entity }) => this.playSound(["Spell", entity.type]);
    handleCameraMovement = () => this.playSound("CameraWoosh");
    handleUISelect = ({ index }) => {
        if (index >= 0) {
            this.playSound(["UISounds", "select"]);
            console.log("select");
        } else {
            this.playSound(["UISounds", "deselect"]);
            console.log("deselect");
        }
    };

    playSound(path, volume = 0.1) {
        const keys = Array.isArray(path) ? path : [path];

        let node = this.soundCatalogue;
        for (const key of keys) {
            node = node?.[key];
        }

        if (!node) {
            console.log(`Ses ${keys.join(".")} bulunamadi`);
            return;
        }

        const list = Array.isArray(node) ? node : [node];
        if (list.length === 0) return;

        const pickedPath = list[Math.floor(Math.random() * list.length)];
        const audio = this.getAudio(pickedPath);

        const instance = audio.cloneNode();
        instance.volume = volume;
        instance.play().catch(() => { });
    }

    playMusic(name, volume = 0.3) {
        const track = this.musicCatalogue[name];
        if (!track) {
            console.log(`Muzik ${name} bulunamadi`);
            return;
        }
        this.stopMusic();
        track.volume = volume;
        track.play().catch(() => { });
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
        this.audioCache.clear();
    }
}
