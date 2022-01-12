"use strict";
var socket = getSocketInstance();
var gamesRoutes = {
    "netopol": "netopol_lobby",
    "gwent": "gwent_lobby"
};
var gameName = null;

function createRoom() {
    socket.emit("create_room");
};

function joinRoom() {
    socket.emit("join_room");
};

function leaveRoom() {
    socket.emit("leave_room")
    window.location.pathname = "/game/" + gamesRoutes[gameName];
};

function checkPreviousRoomExist() {
    socket.emit("check_previous_room");
};

socket.on("get_room_id", function(msg) {
    var pathname = window.location.href;
    var startIndex = pathname.indexOf(gameName) + gameName.length + 1;
    var room_id = pathname.substring(startIndex);
    if(room_id != msg["room_id"]) {
        window.location.pathname = "/game/" + gameName + "/" + msg["room_id"];
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
            a.setAttribute("href", "/game/" + gameName + session.substring(0, endIndex));
        }
        else {
            a.textContent = "#" + session;
            a.setAttribute("href", "/game/" + gameName + "/" + session);
        };
        li.append(a);
        sessions_list.appendChild(li);
    };
});

checkPreviousRoomExist();
if(window.location.href.includes("lobby")) {
    var pathname = window.location.href;
    var startIndex = pathname.indexOf("game") + 5;
    var endIndex = pathname.indexOf("_");
    gameName = pathname.substring(startIndex, endIndex);
    socket.emit("request_sessions_list");
} else {
    var pathname = window.location.href;
    var startIndex = pathname.indexOf("game") + 5;
    var endIndex = pathname.indexOf("/", startIndex);
    gameName = pathname.substring(startIndex, endIndex);
};
