"use strict";

function valueToBoolean(checkboxId) {
    var checkbox = document.getElementById(checkboxId);

    if (checkbox.value == "on") {
        checkbox.value = "True";
    } else {
        checkbox.value = "False";
    }
}
