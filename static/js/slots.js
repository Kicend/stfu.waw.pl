var socket = getSocketInstance();

function takeSlot(slotId) {
    socket.emit("request_username");
    socket.once("get_username", function(msg) {
        username = msg["username"];
    });

};