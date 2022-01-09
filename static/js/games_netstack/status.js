"use strict";
var socket = getSocketInstance();

socket.on("online_users_list", function(msg) {
    var online_users = document.getElementById("players_online_list");
    online_users.innerHTML = "";
    for(const username of msg["online_users"]) {
        const li = document.createElement("li");
        li.innerText = username;
        online_users.appendChild(li);
    };
});

socket.emit("online");
