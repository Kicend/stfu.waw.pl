var socket = getSocketInstance();

function createRoom() {
    socket.emit("create_room");
};

function checkPreviousRoomExist() {
    socket.emit("check_previous_room");
};

socket.on("get_room_id", function(msg) {
    pathname = window.location.href;
    startIndex = pathname.indexOf("game") + 5;
    room_id = pathname.substring(startIndex);
    if(room_id != msg["room_id"]) {
        window.location.pathname = "/game/" + msg["room_id"];
    };
});

checkPreviousRoomExist();
