"use strict";
var socket = getSocketInstance();

function getRoomId() {
    var pathname = window.location.href;
    var startIndex = pathname.indexOf("game") + 5;
    var room_id = pathname.substring(startIndex);

    return room_id;
};

function takeSlot(slotId) {
    socket.emit("take_slot", {"slot_id": slotId});
};

function changeSettings() {
    var settings = {};
    settings["private"] = document.getElementById("is_private").checked;
    settings["visible"] = document.getElementById("is_visible").checked;
    settings["time"] = document.getElementById("time").value;
    settings["max_slots"] = document.getElementById("players_number").value;
    socket.emit("change_settings", {"new_settings": settings});
};

socket.on("get_slots", function(msg) {
    for(var slot in msg["slots"]) {
        var slotHTML = document.getElementById("slot_" + slot);
        slotHTML.value = msg["slots"][slot];
    };
});

socket.on("get_operator_username", function(msg) {
    var operatorHTML = document.getElementById("operator_username");
    operatorHTML.innerHTML = "op: " + msg["operator_username"];
});

socket.on("get_operator_info", function(msg) {
    if(msg["operator_status"] != true) {
        var private_button = document.getElementById("is_private");
        var visible_button = document.getElementById("is_visible");
        var time_select = document.getElementById("time");
        var players_number_select = document.getElementById("players_number");
        private_button.disabled = true;
        visible_button.disabled = true;
        time_select.disabled = true;
        players_number_select.disabled = true;
    };
});

socket.on("get_settings", function(msg) {
    var settings = msg["settings"];
    document.getElementById("is_private").checked = settings["private"];
    document.getElementById("is_visible").checked = settings["visible"];
    document.getElementById("time").value = settings["time"];
    document.getElementById("players_number").value = settings["max_slots"];

    for(let i = 3; i <= 10; i++) {
        var slot = document.getElementById("slot_" + i);
        if(i <= settings["max_slots"]) {
            slot.disabled = false;
        }
        else {
            slot.value = "--";
            slot.disabled = true;
        };
    };
});

socket.on("join_room_success", function() {
    socket.emit("request_slots");
});

socket.on("join_room_error", function() {
    window.location.pathname = "/game/error";
});

socket.emit("join_room", {"room_id": getRoomId()});
socket.emit("request_settings");
socket.emit("request_operator_username");
socket.emit("is_operator");
