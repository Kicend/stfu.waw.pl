"use strict";
var socket = getSocketInstance();

window.onload = function () {
    var board = new fabric.Canvas("board_content", {width: window.innerWidth, height: window.innerHeight});
    board.selection = false;

    function resizeCanvas() {
        // const parentDivSize = document.querySelector("#board").getBoundingClientRect();
        board.setWidth(window.innerWidth);
        board.setHeight(window.innerHeight);
        board.renderAll();
    };

    var objects_list = {};
    var properties_info = {};
    var properties_types = ["start", "fate", "tax", "train", "jail", "infra", "parking", "police"];
    var buttons_names = {
                            "startGame": "Rozpocznij grę",
                            "endTurn": "Zakończ turę",
                            "rollDice": "Rzuć kostką",
                            "buyProperty": "Kup",
                            "auction": "Aukcja",
                            "auction_send_offer": "Podbij",
                            "auction_pass": "Pas",
                            "payBail": "Zapłać kaucję"
                        };
    var textboxes_names = ["auction_price"];
    var tabs_buttons_names = {
        "journal": "Dziennik",
        "trade": "Handel",
        "map_operations": "Operacje"
    }
    var pawns_list = {};
    var pawns_colors = {"#1": "#ff1111",
                        "#2": "#3333ff",
                        "#3": "#22cc22",
                        "#4": "#ffff00",
                        "#5": "#800080",
                        "#6": "#ffa500",
                        "#7": "#cc66dd",
                        "#8": "#8b4513",
                        "#9": "#808080",
                        "#10": "#ffffff"
                        };
    var pawn_stack = {};
    var names_to_display = {
                "name": "Nazwa",
                "owner": "Właściciel",
                "price": "Cena kupna",
                "rent_basic": "Czynsz",
                "rent_level_1": "Czynsz za 1 domek",
                "rent_level_2": "Czynsz za 2 domki",
                "rent_level_3": "Czynsz za 3 domki",
                "rent_level_4": "Czynsz za 4 domki",
                "rent_level_5": "Czynsz za hotel",
                "upgrade_price": "Cena kupna nieruchomości"
            };
    var logs_buffer = ["gracz #1 wszedł w pole #45 i złamał nogę i upadł na głupi ryj", "Arek gdzie karty do gwinta?", "tu brzoza tu brzoza, zaciągamy sieć"];

    var id = 0;
    var x = 10;
    var y = 10;
    var angle = 0;
    const width_corner = 100;
    const width_card = 50;

    /*
    var pawn = new fabric.Image.fromURL("../static/img/pawn_1.svg", function(img) {
        img.set({
            id: 1,
            width: 50,
            height: 50
        });
        board.add(img);
    });
    */

    /*
    fabric.loadSVGFromURL("../static/img/pawn_1.svg", function(objects, options) {
        var obj = fabric.util.groupSVGElements(objects, options);
        obj.scale(0.05);

        board.add(obj);
    })
    */

   var i = 1;

    while(i != 11) {
        var pawn = new fabric.Rect(
            {
                id: "#" + i,
                left: 10,
                top: 10,
                coordinates: "#0",
                color: pawns_colors["#" + i]
            }
        );
        pawns_list[pawn.id] = pawn;
        i++;
    };

    i = 1

    function logs_frame(messages) {
        for(let message in messages) {
            var message_text = new fabric.Text("+ " + messages[message],
                {
                    id: "message_" + message,
                    left: objects_list["mw_content"].left + 10,
                    top: objects_list["mw_content"].top + objects_list["mw_content"].height - (20 * i),
                    backgroundColor: "",
                    fill: "grey",
                    fontSize: 15,
                    fontWeight: "bold",
                    opacity: 1,
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    hasControls: false,
                    hasRotatingPoint: false,
                    hoverCursor: "....."
                }
            );
            
            objects_list[message_text.id] = message_text;
            board.add(message_text);
            board.sendToBack(message_text);
            board.bringForward(message_text);
            i++;
        }
    };

    function modifyStack(pawns_coordinates) {
        for(const [pawn, coordinates] of Object.entries(pawns_coordinates)) {
            if(coordinates[1] !== null) {
                pawn_stack[coordinates[1]].splice(pawn_stack[coordinates[1]].indexOf(pawn.substring(1)), 1);
                if(!pawn_stack[coordinates[0]].includes(pawn.substring(1))) {
                    pawn_stack[coordinates[0]].push(pawn.substring(1));
                };
            };
        };
    };

    function place_pawns(pawns_coordinates) {
        modifyStack(pawns_coordinates);
        var j = 0;
        for(const field in pawn_stack) {
            var stack = pawn_stack[field];
            if(["#0", "#10", "20", "#30"].includes(field)) {
                i = 1;
                j = 1;
                for(const pawn in stack) {
                    id = stack[pawn];
                    objects_list["pawn_" + id].left = objects_list[field].left - 100 + 10 * i;
                    objects_list["pawn_" + id].top = objects_list[field].top + 10 * j;
                    if(pawn > 0) {
                        objects_list["pawn_" + id].left += 10;
                    };
                    i++;
                    if(i == 6) {
                        i = 1;
                    };
                };
            } else {
                i = 1;
                j = 1;
                for(const pawn in stack) {
                    id = stack[pawn];

                    if(field.substring(1) >= 11 && field.substring(1) <= 19) {
                        objects_list["pawn_" + id].left = objects_list[field].left + 10 * i;
                        objects_list["pawn_" + id].top = objects_list[field].top - 50 + 15 + 10 * j;
                    } else if(field.substring(1) >= 21 && field.substring(1) <= 29) {
                        objects_list["pawn_" + id].left = objects_list[field].left + 10 * i;
                        objects_list["pawn_" + id].top = objects_list[field].top + 10 + 10 * j;
                    } else if(field.substring(1) >= 31 && field.substring(1) <= 39) {
                        objects_list["pawn_" + id].left = objects_list[field].left - 50 + 10 * i;
                        objects_list["pawn_" + id].top = objects_list[field].top + 10 * j;
                    } else {
                        objects_list["pawn_" + id].left = objects_list[field].left - 50 + 10 * i;
                        objects_list["pawn_" + id].top = objects_list[field].top - 100 + 15 + 10 * j;
                    };

                    if(pawn > 0 && i > 1) {
                        objects_list["pawn_" + id].left += 10;
                    };

                    if(j > 1) {
                        objects_list["pawn_" + id].top += 5;
                    };
                    i++;
                    if(i == 3) {
                        i = 1;
                        j++;
                    };
                };
            };
        };
    };

    function createBoard(pawns_coordinates) {
        i = 0;
        id = 0;
        x = 10;
        y = 10;
        angle = 0;

        while(i != 4) {
            var j = 0;
            if(i <= 1) {
                id = 10 * (i+2);
            } else {
                id = 10 * (i-2);
            };
            while(j != 10) {
                if(j == 0) {
                    var field_width = width_corner;
                } else {
                    field_width = width_card;
                };

                var property = new fabric.Rect(
                    {
                        id: "#" + id,
                        left: x,
                        top: y,
                        fill: "white",
                        width: field_width,
                        height: 100,
                        stroke: "black",
                        strokeWidth: 1,
                        angle: angle,
                        selectable: false,
                        evented: true,
                        lockMovementX: true,
                        lockMovementY: true,
                        hasControls: false,
                        hasRotatingPoint: false,
                        hoverCursor: "....."
                    }
                );

                if(i == 0) {
                    if(j == 0) {
                        x += 100;
                    } else {
                        x += 50;
                    };
                } else if(i == 1) {
                    angle = 90;
                    if(j == 0) {
                        x += 101;
                        y += 100;
                    } else {
                        y += 50;
                    };
                } else if(i == 2) {
                    angle = 180;
                    if(j == 0) {
                        x -= 100;
                        y += 101;
                    } else {
                        x -= 50;
                    };
                } else if(i == 3) {
                    angle = 270;
                    if(j == 0) {
                        x -= 101;
                        y -= 100;
                    } else {
                        y -= 50;
                    };
                };

                board.add(property);
                objects_list[property.id] = property;
                id++;
                j++;
            };
            i++;
        };

        var property_card = new fabric.Rect(
                        {
                            id: "property_card",
                            left: objects_list["#0"].left - 210,
                            top: objects_list["#0"].top - 160,
                            fill: "white",
                            width: 100,
                            height: 150,
                            stroke: "black",
                            strokeWidth: 1,
                            angle: 0,
                            opacity: 0,
                            selectable: false,
                            evented: false,
                            lockMovementX: true,
                            lockMovementY: true,
                            hasControls: false,
                            hasRotatingPoint: false,
                            hoverCursor: "....."
                        }
                    );

        objects_list[property_card.id] = property_card;
        board.add(property_card);

        i = 0;
        var moveX = 0;
        var moveY = 0;
        while(i != 4) {
            j = 0;
            id = 10 * i;
            angle = 0;
            if(i == 1) {
                angle = 90;
            } else if(i == 2) {
                angle = 180;
            } else if(i == 3) {
                angle = 270;
            };
            while(j != 10) {
                if(i == 0) {
                    moveX = field_width;
                    moveY = 100;
                } else if(i == 1) {
                    moveX = -field_width - 50;
                    moveY = 50;
                } else if(i == 2) {
                    moveX = field_width - 100;
                    moveY = -100;
                } else {
                    moveX = field_width + 50;
                    moveY = -50;
                };

                if(!properties_types.includes(properties_info["#" + id]["district"])) {
                    var property_icon = new fabric.Rect(
                                    {
                                        id: "property_icon_" + id,
                                        left: objects_list["#" + id].left - moveX,
                                        top: objects_list["#" + id].top - moveY,
                                        fill: properties_info["#" + id]["district"],
                                        width: field_width - 1,
                                        height: 20,
                                        stroke: "black",
                                        strokeWidth: 0,
                                        angle: angle,
                                        opacity: 1,
                                        selectable: false,
                                        evented: false,
                                        lockMovementX: true,
                                        lockMovementY: true,
                                        hasControls: false,
                                        hasRotatingPoint: false,
                                        hoverCursor: "....."
                                    }
                                );
                };

                if(property_icon !== undefined) {
                    board.add(property_icon);
                    objects_list[property_icon.id] = property_icon;
                };
                id++;
                j++;
            };
            i++;
        };

        i = 0
        for(const [key, value] of Object.entries(names_to_display)) {
            i++;
            var text = new fabric.Text(value + ": ",
                {
                    id: "text_" + key,
                    left: objects_list["property_card"].left + 5,
                    top: objects_list["property_card"].top + i * 10 + 30,
                    backgroundColor: "#FFFFFF",
                    fill: "#000000",
                    fontSize: 7,
                    fontWeight: "bold",
                    opacity: 0,
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    hasControls: false,
                    hasRotatingPoint: false,
                    hoverCursor: "....."
                }
            );

            board.add(text);
            objects_list[text.id] = text;
            board.bringToFront(text);
        };

        var property_district = new fabric.Rect(
                    {
                        id: "property_card_district",
                        left: objects_list["property_card"].left,
                        top: objects_list["property_card"].top,
                        fill: "#FFFFFF",
                        width: 101,
                        height: 20,
                        stroke: "black",
                        strokeWidth: 0,
                        angle: 0,
                        opacity: 0,
                        selectable: false,
                        evented: false,
                        lockMovementX: true,
                        lockMovementY: true,
                        hasControls: false,
                        hasRotatingPoint: false,
                        hoverCursor: "....."
                    }
        );

        board.add(property_district);
        objects_list[property_district.id] = property_district;

        i = 0;
        for(const color in pawns_colors) {
            i++;
            var pawn = new fabric.Rect(
                {
                    id: "pawn_" + i,
                    left: -100,
                    top: -100,
                    fill: pawns_colors[color],
                    width: 10,
                    height: 10,
                    stroke: "black",
                    strokeWidth: 1,
                    angle: 0,
                    opacity: 1,
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    hasControls: false,
                    hasRotatingPoint: false,
                    hoverCursor: "....."
                }
            );

            board.add(pawn);
            objects_list[pawn.id] = pawn;
        };

        var controlPanelBackground = new fabric.Rect(
            {
                id: "turn_cp_background",
                left: objects_list["#7"].left - 10,
                top: objects_list["#7"].top - 150,
                fill: "#000000",
                width: 200,
                height: 30,
                stroke: "white",
                strokeWidth: 1,
                angle: 0,
                opacity: 0,
                selectable: false,
                evented: false,
                lockMovementX: true,
                lockMovementY: true,
                hasControls: false,
                hasRotatingPoint: false,
                hoverCursor: "....."
            }
        );

        board.add(controlPanelBackground);
        objects_list[controlPanelBackground.id] = controlPanelBackground;

        for(const [key, value] of Object.entries(buttons_names)) {
            text = new fabric.Text(value,
                {
                    id: "text_" + key,
                    left: -300,
                    top: -300,
                    backgroundColor: "#000000",
                    fill: "#FFFFFF",
                    fontSize: 7,
                    fontWeight: "bold",
                    opacity: 0,
                    selectable: false,
                    evented: true,
                    lockMovementX: true,
                    lockMovementY: true,
                    hasControls: false,
                    hasRotatingPoint: false,
                    hoverCursor: "....."
                }
            );

            board.add(text);
            objects_list[text.id] = text;
        };

        textboxes_names.forEach(name => {
            var textbox = new fabric.Textbox("0",
                {
                    id: "textbox_" + name,
                    width: 40,
                    left: -300,
                    top: -300,
                    backgroundColor: "#ffffff",
                    fontSize: 9,
                    fixedWitdh: 40,
                    maxLines: 1,
                    opacity: 0,
                    selectable: true,
                    evented: true,
                    editable: true,
                    lockMovementX: true,
                    lockMovementY: true,
                    hasControls: false,
                    hasRotatingPoint: false,
                    hoverCursor: "....."
                }
            );
            
            board.add(textbox);
            objects_list[textbox.id] = textbox;
        });

        var managementWindow = new fabric.Rect(
            {
                id: "mw_main",
                left: objects_list["#20"].left + 110,
                top: objects_list["#20"].top + 110,
                fill: "#ffffff",
                width: 430,
                height: 350,
                stroke: "grey",
                strokeWidth: 1,
                angle: 0,
                opacity: 1,
                selectable: false,
                evented: false,
                lockMovementX: true,
                lockMovementY: true,
                hasControls: false,
                hasRotatingPoint: false,
                hoverCursor: "....."
            }
        );

        board.add(managementWindow);
        objects_list[managementWindow.id] = managementWindow;
        board.sendToBack(managementWindow);
        
        var i = 1;
        for(const [key, value] of Object.entries(tabs_buttons_names)) {
            var tabButton = new fabric.Text(value,
                {
                    id: "text_tab_" + key,
                    left: objects_list["#20"].left + (150 * i),
                    top: objects_list["#20"].top + 115,
                    fill: "#788086",
                    fontSize: 14,
                    fontWeight: "bold",
                    opacity: 1,
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    hasControls: false,
                    hasRotatingPoint: false,
                    hoverCursor: "....."
                }
            );

            board.add(tabButton);
            objects_list[tabButton.id] = tabButton;
            i++;
        }

        i = 0
        j = 1
        for(let k in tabs_buttons_names) {
            var width = 0;
            var shift = 143 * j;
            var opacity = 1;
            if(i == 0) {
                width = 144;
                shift--;
                opacity = 0;
            } else {
                width = 143;
            }
            var tabButtonBorder = new fabric.Rect(
                {
                    id: "tabButton_" + k,
                    left: objects_list["#20"].left + (shift - 32),
                    top: objects_list["#20"].top + 110,
                    fill: "",
                    width: width,
                    height: 30,
                    stroke: "grey",
                    strokeWidth: 1,
                    angle: 0,
                    opacity: opacity,
                    selectable: false,
                    evented: true,
                    lockMovementX: true,
                    lockMovementY: true,
                    hasControls: false,
                    hasRotatingPoint: false,
                    hoverCursor: "....."
                }
            )

            board.add(tabButtonBorder);
            objects_list[tabButtonBorder.id] = tabButtonBorder;
            j++;
            i++;
        }

        var managementWindowContent = new fabric.Rect(
            {
                id: "mw_content",
                left: objects_list["#20"].left + 110,
                top: objects_list["#20"].top + 145,
                fill: "",
                width: 430,
                height: 315,
                stroke: "",
                strokeWidth: 1,
                angle: 0,
                opacity: 1,
                selectable: false,
                evented: false,
                lockMovementX: true,
                lockMovementY: true,
                hasControls: false,
                hasRotatingPoint: false,
                hoverCursor: "....."
            }
        );

        board.add(managementWindowContent);
        objects_list[managementWindowContent.id] = managementWindowContent;
    };

    function resizeBoard() {
        board.setZoom(1.35);
        board.setWidth(window.innerWidth * board.getZoom());
        board.setHeight(window.innerHeight * board.getZoom());
    };

    function renderBoard(pawns_coordinates, turn=false, operator_status=false) {
        place_pawns(pawns_coordinates);

        if(operator_status === true) {
            objects_list["turn_cp_background"].opacity = 1;
            objects_list["text_startGame"].opacity = 1;
            objects_list["text_startGame"].left = objects_list["turn_cp_background"].left + 10;
            objects_list["text_startGame"].top = objects_list["turn_cp_background"].top + 10;
        };

        resizeBoard();
        board.renderAll();
    };

    function updateBalance(accounts, players_number) {
        var i = 1;
        while(i != players_number+1) {
            var balance = document.getElementById("balance_" + i);
            balance.innerHTML = "$" + accounts[i];
            i++;
        };
    };

    function enableButtons(buttons_list) {
        if(buttons_list === "all") {
            for(const button in buttons_names) {
                objects_list["text_" + button].opacity = 1;
                objects_list["text_" + button].evented = true;
                objects_list["text_" + button].left = objects_list["turn_cp_background"].left + 10;
                objects_list["text_" + button].top = objects_list["turn_cp_background"].top + 10;
            };
        } else {
            buttons_list.forEach(function(button) {
                objects_list[button].opacity = 1;
                objects_list[button].evented = true;
                objects_list[button].left = objects_list["turn_cp_background"].left + 10;
                objects_list[button].top = objects_list["turn_cp_background"].top + 10;
            });
        };
    };

    function disableButtons(buttons_list) {
         if(buttons_list === "all") {
                for(const button in buttons_names) {
                    objects_list["text_" + button].opacity = 0;
                    objects_list["text_" + button].evented = false;
                    objects_list["text_" + button].left = -300;
                    objects_list["text_" + button].top = -300;
                };
         } else {
            buttons_list.forEach(function(button) {
                objects_list[button].opacity = 0;
                objects_list[button].evented = false;
                objects_list[button].left = -300;
                objects_list[button].top = -300;
            });
        };
    };

    function enableTextboxes(textboxes_list) {
        if(textboxes_list === "all") {
            textboxes_names.forEach(name => {
                objects_list["textbox_" + name].opacity = 1;
                objects_list["textbox_" + name].editable = true;
                objects_list["textbox_" + name].left = objects_list["turn_cp_background"].left + 10;
                objects_list["textbox_" + name].top = objects_list["turn_cp_background"].top + 10;
            });
        } else {
            textboxes_list.forEach(function(textbox) {
                objects_list[textbox].opacity = 1;
                objects_list[textbox].editable = true;
                objects_list[textbox].left = objects_list["turn_cp_background"].left + 10;
                objects_list[textbox].top = objects_list["turn_cp_background"].top + 10;
            });
        };
    }

    function disableTextboxes(textboxes_list) {
        if(textboxes_list === "all") {
            textboxes_names.forEach(name => {
                objects_list["textbox_" + name].opacity = 0;
                objects_list["textbox_" + name].editable = false;
                objects_list["textbox_" + name].left = -300;
                objects_list["textbox_" + name].top = -300;
            });
        } else {
            textboxes_list.forEach(function(textbox) {
                objects_list[textbox].opacity = 0;
                objects_list[textbox].editable = false;
                objects_list[textbox].left = -300;
                objects_list[textbox].top = -300;
            });
        };
    }

    function gameStates(state) {
        objects_list["turn_cp_background"].opacity = 1;
        switch(state) {
            case "roll":
                enableButtons(["text_rollDice"]);
                break;
            case "buy":
                enableButtons(["text_buyProperty", "text_auction"]);
                objects_list["text_auction"].left = objects_list["turn_cp_background"].left + 30;
                objects_list["text_auction"].top = objects_list["turn_cp_background"].top + 10;
                break;
            case "jail":
                enableButtons["text_rollDice", "text_payBail"];
                objects_list["text_payBill"].left = objects_list["turn_cp_background"].left + 30;
                objects_list["text_payBill"].top = objects_list["turn_cp_background"].top + 10;
                break;
            case "after_roll":
                enableButtons(["text_endTurn"]);
                break;
        };

        resizeBoard();
    }

    window.addEventListener("resize", resizeBoard);

    socket.on("get_operator_options", function(msg) {
        if(msg["operator_status"] == true) {
            renderBoard({}, false, true);
        };
    });

    socket.on("board_update", function(msg) {
        var pawns_coordinates = msg["pawns_coordinates"];
        renderBoard(pawns_coordinates);
    });

    socket.on("get_properties_info", function(msg) {
        properties_info = msg["properties_info"];

        if(Object.keys(pawn_stack).length === 0) {
            for(const property_id in properties_info) {
                pawn_stack[property_id] = [];
            };
        };

        createBoard({});
        logs_frame(logs_buffer);
        window.onresize = resizeCanvas();
        resizeCanvas();
    });

    socket.on("update_properties_info", function(msg) {
        properties_info = msg["properties_info"];
    });

    socket.on("get_game_state", function(msg) {
        if(msg["game_state"] == "preparing") {
            socket.emit("request_operator_options");
        };
    });

    socket.on("get_accounts", function(msg) {
        updateBalance(msg["accounts"], msg["players_number"]);
    });

    socket.on("get_turn_state", function(msg) {
        gameStates(msg["state"]);
    });

    socket.on("start_game_success", function(msg) {
        disableButtons(["text_startGame"]);
        objects_list["turn_cp_background"].opacity = 0;
        updateBalance(msg["accounts"], msg["players_number"]);
        i = 1;

        while(i <= msg["players_number"]) {
            pawn_stack["#0"].push(i);
            i++;
        };

        renderBoard({}, false, false);
    });

    socket.on("start_game_fail", function(msg) {
        alert(msg["error"]);
    });

    socket.on("get_turn", function() {
        enableButtons(["text_rollDice"]);
        objects_list["turn_cp_background"].opacity = 1;
        resizeBoard();
    });

    socket.on("get_after_roll_dice", function() {
        disableButtons("all");
        disableTextboxes("all");
        enableButtons(["text_endTurn"]);
        objects_list["turn_cp_background"].opacity = 1;
        resizeBoard();
    });

    socket.on("ask_buy_property", function(msg) {
        disableButtons(["text_rollDice"]);
        if(msg["property_buyable"] === true) {
            enableButtons(["text_buyProperty", "text_auction"]);
            objects_list["text_auction"].left = objects_list["turn_cp_background"].left + 30;
            objects_list["text_auction"].top = objects_list["turn_cp_background"].top + 10;
        } else {
            enableButtons(["text_auction"]);
        };

        resizeBoard();
    });

    socket.on("get_auction_turn", function(msg) {
        disableButtons("all");
        enableButtons(["text_auction_send_offer", "text_auction_pass"]);
        enableTextboxes(["textbox_auction_price"]);
        objects_list["turn_cp_background"].opacity = 1;
        objects_list["textbox_auction_price"].left = objects_list["turn_cp_background"].left + 40;
        objects_list["textbox_auction_price"].top = objects_list["turn_cp_background"].top + 10;
        objects_list["textbox_auction_price"].text = msg["price"];
        objects_list["text_auction_pass"].left = objects_list["turn_cp_background"].left + 90;
        objects_list["text_auction_pass"].top = objects_list["turn_cp_background"].top + 10;
        resizeBoard();
    })

    socket.on("get_end_turn", function() {
        objects_list["text_endTurn"].opacity = 0;
        objects_list["text_endTurn"].evented = false;
        objects_list["text_endTurn"].left = -300;
        objects_list["text_endTurn"].top = -300;
        objects_list["turn_cp_background"].opacity = 0;
        resizeBoard();
    });

    board.on("mouse:over", function(e) {
        if(e.target !== null && e.target.id.includes("#") == true) {
            var info = {};

            info["name"] = properties_info[e.target.id]["name"];
            info["owner"] = properties_info[e.target.id]["owner"];
            info["district"] = properties_info[e.target.id]["district"];
            info["price"] = properties_info[e.target.id]["price"];
            info["rent_basic"] = properties_info[e.target.id]["rent_basic"];
            info["rent_level_1"] = properties_info[e.target.id]["rent_level_1"];
            info["rent_level_2"] = properties_info[e.target.id]["rent_level_2"];
            info["rent_level_3"] = properties_info[e.target.id]["rent_level_3"];
            info["rent_level_4"] = properties_info[e.target.id]["rent_level_4"];
            info["rent_level_5"] = properties_info[e.target.id]["rent_level_5"];
            info["upgrade_price"] = properties_info[e.target.id]["upgrade_price"];

            for(const [key, value] of Object.entries(info)) {
                if(key != "district") {
                    if(value === null) {
                       objects_list["text_" + key].text = names_to_display[key] + ": " + "--";
                    } else {
                       objects_list["text_" + key].text = names_to_display[key] + ": " + value;
                    };
                    objects_list["text_" + key].opacity = 1;
                } else {
                    objects_list["property_card_district"].set("fill", value);
                    objects_list["property_card_district"].opacity = 1;
                };
            };

            objects_list["property_card"].opacity = 1;
            board.renderAll();
        };
    });

    board.on("mouse:out", function(e) {
        objects_list["property_card"].opacity = 0;
        objects_list["property_card_district"].opacity = 0;

        for(const key in names_to_display) {
            objects_list["text_" + key].opacity = 0;
        };

        board.renderAll();
    });

    board.on("mouse:down", function(e) {
        if(e.target != null) {
            switch(e.target.id) {
                case "text_startGame":
                    socket.emit("request_start_game");
                    break;
                case "text_rollDice":
                    socket.emit("request_roll_dice");
                    break;
                case "text_endTurn":
                    socket.emit("request_end_turn");
                    break;
                case "text_buyProperty":
                    socket.emit("request_buy_property");
                    break;
                case "text_auction":
                    socket.emit("request_auction", {"foobar": -1});
                    break;
                case "text_auction_send_offer":
                    disableButtons("all");
                    disableTextboxes("all");
                    objects_list["turn_cp_background"].opacity = 0;
                    var textbox = objects_list["textbox_auction_price"];
                    socket.emit("request_auction", {"price": textbox.text});
                    break;
                case "text_auction_pass":
                    disableButtons("all");
                    disableTextboxes("all");
                    objects_list["turn_cp_background"].opacity = 0;
                    socket.emit("request_auction", {"price": 0});
                    break;
                case "text_payBail":
                    disableButtons("all");
                    disableTextboxes("all");
                    objects_list["turn_cp_background"].opacity = 0;
                    socket.emit("request_pay_bail");
                case "tabButton_journal":

            }
        };
    });

    /*
    board.on("text:edited", function(e) {
        var textbox = objects_list[e.target.id];
        if(target.text.length >= 5) {
            textbox.editable = false;
        };

        board.renderAll()
        resizeBoard();
    })
    */

    socket.emit("request_game_state");
    socket.emit("request_accounts");
    socket.emit("request_properties_info");
    socket.emit("request_board_status");
    socket.emit("request_turn_state");
    resizeBoard();
}