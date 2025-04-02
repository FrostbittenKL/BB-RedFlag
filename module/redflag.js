Hooks.once('init', () => {
    console.log("BrettspielBayern | Red Flag module loaded");
    
    // Define the module settings
    game.settings.register("bb-redflag", "alertSound", {
        name: game.i18n.localize("RED_FLAG.AlertSoundName"),
        hint: game.i18n.localize("RED_FLAG.AlertSoundHint"),
        scope: "world",
        config: true,
        type: String,
        default: "", // Default is an empty string, meaning no sound
        filePicker: {
            types: ["audio"],
            extensions: [".mp3", ".wav", ".ogg", ".m4a"]
        }
    });
});

Hooks.once('ready', () => {
    if (!game.socket) {
        console.error("BrettspielBayern | ❌ game.socket is still undefined! Foundry might not be fully loaded.");
    } 
    else {
        console.debug("BrettspielBayern | ✅ Foundry socket system initialized!");

        game.socket.on("module.bb-redflag", (data) => {
            handleNotificationEvent(data);
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
                                // Localized chat message
                                let messageText = game.i18n.format("RED_FLAG.RedFlagMessage", {
                                    userName: game.user.name
                                });

                                // Send localized message to the chat
                                ChatMessage.create({
                                    content: messageText,
                                    whisper: [] // Empty array to send to everyone
                                });

                                // Send the notification event
                                game.socket.emit("module.bb-redflag", { message: messageText });
                                // Pretend the emitter was called
                                handleNotificationEvent({ message: messageText });
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

function handleNotificationEvent(data) {
    console.debug("BrettspielBayern | 🔴 Red Flag notification received:", data);
    // Send UI notification
    ui.notifications.info(data.message, { permanent: true });

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