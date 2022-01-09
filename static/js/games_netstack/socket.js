"use strict";
var socket = io.connect("https://stfu.waw.pl");

function getSocketInstance() {
    return socket;
};
