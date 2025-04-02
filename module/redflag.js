Hooks.once('init', () => {
    console.log("BrettspielBayern | Red Flag module loaded");
    
    // Define the module settings:
    // play alert sound, if sound file is configured
    game.settings.register("bb-redflag", "alertSound", {
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
    // add an optional reason
    game.settings.register("bb-redflag", "reasonFeature", { 
        name: game.i18n.localize("RED_FLAG.SettReasonFeatureName"),
        hint: game.i18n.localize("RED_FLAG.SettReasonFeatureHint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });
    // anonymous raising of red flag 
    game.settings.register("bb-redflag", "anonMode", {
        name: game.i18n.localize("RED_FLAG.SettAnonModeName"),
        hint: game.i18n.localize("RED_FLAG.SettAnonModeHint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
});

Hooks.once('ready', () => {
    // use websocket API to handle events from other clients/server
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

// function to add the Red Flag button to the token control column
function addRedFlagButton(controls) {
    let tokenControls = controls.find(c => c.name === "token");
    if (tokenControls && !tokenControls.tools.some(t => t.name === "red-flag")) {
        tokenControls.tools.push({
            name: "red-flag",
            title: game.i18n.localize("RED_FLAG.ButtonTitle"),
            icon: "fas fa-flag",
            button: true,
            onClick: () => {
                const isReasonFeature = game.settings.get("bb-redflag", "reasonFeature");
                let dialogContent;
                if (!isReasonFeature) {
                    dialogContent = `<p>${game.i18n.localize("RED_FLAG.DialogContent")} </p>`;
                }
                else {
                    dialogContent = `
                        <p>${game.i18n.localize("RED_FLAG.DialogContent")}</p>
                        <p>${game.i18n.localize("RED_FLAG.DialogContentReason")}:</p>
                        <form>
                            <div class="form-group">
                                <textarea id="taRedFlagReason" name="reason" rows="2" style="width: 100%;" 
                                placeholder="${game.i18n.localize("RED_FLAG.DialogContentReasonPlaceholder")}"></textarea>
                            </div>
                        </form>
                    `;
                }
                new Dialog({
                    title: game.i18n.localize("RED_FLAG.DialogTitle"),
                    content: dialogContent,
                    buttons: {
                        yes: {
                            label: game.i18n.localize("RED_FLAG.ButtonYes"),
                            callback: (html) => {
                                let reason;
                                if(game.settings.get("bb-redflag", "reasonFeature")) {
                                    reason = html.find("#taRedFlagReason").val().trim();
                                }
                                raiseRedFlag(reason);
                            }
                        },
                        no: {
                            label: game.i18n.localize("RED_FLAG.ButtonNo")
                        }
                    }
                }).render(true);
            }
        });
    }
}

// function to raise the red flag and notify other clients
function raiseRedFlag(flagReason) {
    const isAnonMode = game.settings.get("bb-redflag", "anonMode");
    
    // generate red flag message
    let messageText = "";
    if (!isAnonMode) {
        messageText = game.i18n.format("RED_FLAG.RedFlagMessage", {
            userName: game.user.name
        });
    }
    else {
        messageText = game.i18n.format("RED_FLAG.RedFlagAnonMessage");
    }
        
    // Send message to the chat with names enabled
    if(!isAnonMode) {
        let chatContent = messageText;
        if (flagReason) {
            chatContent = messageText + "<br><br>" + game.i18n.localize("RED_FLAG.RedFlagReason") + ": " + flagReason;
        }
        ChatMessage.create({
            content: chatContent,
            whisper: [] // Empty array to send to everyone
        });
    }
    
    // Send the notification event to other clients
    game.socket.emit("module.bb-redflag", { message: messageText, reason: flagReason, anonMode: isAnonMode });
    // Pretend the emitter was called
    handleRedFlagEvent({ message: messageText, reason: flagReason, anonMode: isAnonMode });
}

// function for each client to handle the red flag
function handleRedFlagEvent(data) {
    console.debug("BrettspielBayern | 🔴 Red Flag notification received:", data);
    // Send UI notification
    ui.notifications.info(data.message, { permanent: true });

    // when in anonymous mode, the chat message needs to be sent from GM
    if (data.anonMode && game.user.isGM) {
        let chatContent = data.message;
        if (data.reason) {
            chatContent = data.message + "<br><br>" + game.i18n.localize("RED_FLAG.RedFlagReason") + ": " + data.reason;
        }
        let speakerAlias = game.i18n.localize("RED_FLAG.RedFlagAnonAlias");
        ChatMessage.create({
            content: chatContent,
            speaker: { alias: speakerAlias },
            user: game.user,
            whisper: [] // Empty array to send to everyone
        });
    }

    // Play alert sound
    const soundFile = game.settings.get("bb-redflag", "alertSound");
    if (soundFile && soundFile.trim() !== "") {
        AudioHelper.play({
            src: soundFile,
            volume: 1.0,
            loop: false
        }, false); // false means play sound only locally
    }
}