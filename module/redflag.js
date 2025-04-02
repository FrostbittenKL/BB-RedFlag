Hooks.once('init', () => {
    console.log("BrettspielBayern | Red Flag module loaded");
    
    // Define the module settings
    game.settings.register("bb-redflag", "alertSound", { // play alert sound, if sound file is configured
        name: game.i18n.localize("RED_FLAG.SettAlertSoundName"),
        hint: game.i18n.localize("RED_FLAG.SettAlertSoundHint"),
        scope: "world",
        config: true,
        type: String,
        default: "", // Default is an empty string, meaning no sound
        filePicker: {
            types: ["audio"],
            extensions: [".mp3", ".wav", ".ogg", ".m4a"]
        }
    });
    game.settings.register("bb-redflag", "anonMode", { // anonymous raising of red flag 
        name: game.i18n.localize("RED_FLAG.SettAnonModeName"),
        hint: game.i18n.localize("RED_FLAG.SettAnonModeHint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
});

Hooks.once('ready', () => {
    if (!game.socket) {
        console.error("BrettspielBayern | ❌ game.socket is still undefined! Foundry might not be fully loaded.");
    } 
    else {
        console.debug("BrettspielBayern | ✅ Foundry socket system initialized!");

        game.socket.on("module.bb-redflag", (data) => {
            handleRedFlagEvent(data);
        });

        console.debug("BrettspielBayern | ✅ Red Flag socket listener added successfully.");
    }
});

// Hook into scene control buttons
Hooks.on("getSceneControlButtons", addRedFlagButton);

function addRedFlagButton(controls) {
    let tokenControls = controls.find(c => c.name === "token");
    if (tokenControls && !tokenControls.tools.some(t => t.name === "red-flag")) {
        tokenControls.tools.push({
            name: "red-flag",
            title: game.i18n.localize("RED_FLAG.ButtonTitle"),
            icon: "fas fa-flag",
            button: true,
            onClick: () => {
                new Dialog({
                    title: game.i18n.localize("RED_FLAG.DialogTitle"),
                    content: `<p>${game.i18n.localize("RED_FLAG.DialogContent")}</p>`,
                    buttons: {
                        yes: {
                            label: game.i18n.localize("RED_FLAG.YES"),
                            callback: () => {
                                raiseRedFlag();
                            }
                        },
                        no: {
                            label: game.i18n.localize("RED_FLAG.NO")
                        }
                    }
                }).render(true);
            }
        });
    }
}

// function to raise the red flag and notify other clients
function raiseRedFlag() {
    const isAnonMode = game.settings.get("bb-redflag", "anonMode");
    let messageText = "";

    // generate red flag message
    if (true === isAnonMode) {
        messageText = game.i18n.format("RED_FLAG.RedFlagAnonMessage");
    }
    else {
        messageText = game.i18n.format("RED_FLAG.RedFlagMessage", {
            userName: game.user.name
        });

        // Send message to the chat with names enabled
        ChatMessage.create({
            content: messageText,
            whisper: [] // Empty array to send to everyone
        });
    }

    // Send the notification event to other clients
    game.socket.emit("module.bb-redflag", { message: messageText, anonMode: isAnonMode });
    // Pretend the emitter was called
    handleRedFlagEvent({ message: messageText, anonMode: isAnonMode });
}

// function for each client to handle the red flag
function handleRedFlagEvent(data) {
    console.debug("BrettspielBayern | 🔴 Red Flag notification received:", data);
    // Send UI notification
    ui.notifications.info(data.message, { permanent: true });

    // when in anonymous mode, the chat message needs to be sent from GM
    if (data.anonMode && game.user.isGM) {
        ChatMessage.create({
            content: data.message,
            speaker: { alias: "System" },
            user: game.user,
            whisper: [] // Empty array to send to everyone
        });
    }

    // Retrieve the configured sound file from settings
    const soundFile = game.settings.get("bb-redflag", "alertSound");
                                
    // Play alert sound
    if (soundFile && soundFile.trim() !== "") {
        AudioHelper.play({
            src: soundFile,
            volume: 1.0,
            loop: false
        }, false); // false means play sound only locally
    }
}