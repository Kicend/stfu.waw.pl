"use strict";
var socket = getSocketInstance();

function createRoom() {
    socket.emit("create_room");
};

function joinRoom() {
    socket.emit("join_room");
};

function leaveRoom() {
    socket.emit("leave_room")
    window.location.pathname = "/netopol_lobby";
};

function checkPreviousRoomExist() {
    socket.emit("check_previous_room");
};

socket.on("get_room_id", function(msg) {
    var pathname = window.location.href;
    var startIndex = pathname.indexOf("game") + 5;
    var room_id = pathname.substring(startIndex);
    if(room_id != msg["room_id"]) {
        window.location.pathname = "/game/" + msg["room_id"];
    };
});

socket.on("get_sessions_list", function(msg) {
    var sessions_list = document.getElementById("sessions");
    sessions_list.innerHTML = "";
    for(let session of msg["sessions_list"]) {
        session = String(session);
        const li = document.createElement("li");
        const a = document.createElement("a");
        if(session.includes("p")) {
            var endIndex = session.indexOf("p");
            a.textContent = "#" + session.substring(0, endIndex) + "🔒︎";
            a.setAttribute("href", "/game/" + session.substring(0, endIndex));
        }
        else {
            a.textContent = "#" + session;
            a.setAttribute("href", "/game/" + session);
        };
        li.append(a);
        sessions_list.appendChild(li);
    };
});

checkPreviousRoomExist();
socket.emit("request_sessions_list");
