var socket = getSocketInstance();

function takeSlot(slotId) {
    socket.emit("take_slot", {"slot_id": slotId});
};

socket.on("get_slots", function(msg) {
    console.log(msg);
    for(var slot in msg["slots"]) {
        slotHTML = document.getElementById("slot_" + slot);
        slotHTML.value = msg["slots"][slot];
    };
});

socket.on("join_room_success", function() {
    socket.emit("request_slots");
});

socket.on("join_room_error", function() {
    window.location.pathname = "/game/error";
});

pathname = window.location.href;
startIndex = pathname.indexOf("game") + 5;
room_id = pathname.substring(startIndex);
socket.emit("join_room", {"room_id": room_id});
