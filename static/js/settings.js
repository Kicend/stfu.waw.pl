window.addEventListener('load', (event) => {
    var privateSwitch = document.getElementById("is_private");
    privateSwitch.addEventListener("input", changePrivateValue);

    var soundSwitch = document.getElementById("is_sound");
    soundSwitch.addEventListener("input", changeSoundValue);
});

function changePrivateValue(e) {
    if(document.getElementById("is_private").checked == true) {
        // Websocket
    };
};