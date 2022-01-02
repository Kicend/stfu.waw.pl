"use strict";
var socket = getSocketInstance();
var maxPlayer = 10;
var mySlotID = 0;
var gameState = "";
var myTurn = false;

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
    var tradeUI_objects_list = [];
    var map_operationsUI_objects_list = [];
    var trade_my_properties_objects_list = [];
    var trade_colleague_properties_objects_list = [];
    var fieldsIconNames = ["fate", "jail", "parking", "power_station", "tax", "train", "waterworks"]
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
    var trade_buttons_names = {
        "trade_send_offer": "Wyślij ofertę",
        "trade_reset_offer": "Resetuj ofertę",
        "tradeOfferMode_accept_offer": "Akceptuj",
        "tradeOfferMode_discard_offer": "Odrzuć"
    };
    var textboxes_names = ["auction_price"];
    var trade_textboxes_names = ["my_money", "colleague_money"];
    var trade_text_values = ["Twoja oferta", "Oferta oponenta", "Gotówka:", "Gotówka:"];
    var map_operations_buttons_names = {
        "map_operations_pladge": "Oddawanie pod zastaw",
        "map_operations_buyout_pledge": "Wykupowanie spod zastawu",
        "map_operations_buy_buildings": "Kupowanie budynków",
        "map_operations_sell_buildings": "Sprzedawanie budynków"
    };
    var tabs_buttons_names = {
        "journal": "Dziennik",
        "trade": "Handel",
        "map_operations": "Operacje"
    };
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
    var logs_buffer = [];
    var current_tab = "journal";
    var trade_selected_player = 0;
    var trade_my_properties = [];
    var trade_colleague_properties = [];

    var id = 0;
    var x = 10;
    var y = 10;
    var angle = 0;
    const width_corner = 100;
    const width_card = 50;

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

    function logs_frame(messages) {
        if(current_tab == "journal") {
            var messages_counter = 0;
            i = 1;
            for(let message in messages) {
                if(messages[message].includes("\n")) {
                    messages_counter++;
                    i++;
                };

                if(messages_counter >= 16) {
                    break;
                };

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
                message_text.bringForward();
                messages_counter++;
                i++;
            }
        }
    };

    function clear_logs_frame() {
        for(const [key, messageText] of Object.entries(objects_list)) {
            if(key.includes("message_")) {
                board.remove(messageText);
                delete objects_list[key];
            }
        }

        board.renderAll();
    }

    function displayTradeProperties() {
        var properties_in_line_counter = 0;
        i = 1;
        for(let property in trade_my_properties) {
            var property_text = new fabric.Text(trade_my_properties[property],
                {
                    id: "trade_property_" + i,
                    left: objects_list["trade_line_1"].left + 10 + (i-1 * 20),
                    top: objects_list["trade_line_1"].top + objects_list["trade_line_1"].height,
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

            if(properties_in_line_counter > 5) {
                property_text.top += 50;
            };

            objects_list[property_text.id] = property_text;
            trade_my_properties_objects_list.push(property_text.id);
            board.add(property_text);
            properties_in_line_counter++;
            i++;
        }

        properties_in_line_counter = 0;
        i = 1;
        for(let property in trade_colleague_properties) {
            var property_text = new fabric.Text(trade_colleague_properties[property],
                {
                    id: "trade_property_c" + i,
                    left: objects_list["trade_line_2"].left + 10 + (i-1 * 20),
                    top: objects_list["trade_line_2"].top + objects_list["trade_line_2"].height,
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

            if(properties_in_line_counter > 5) {
                property_text.top += 50;
            };

            objects_list[property_text.id] = property_text;
            trade_colleague_properties_objects_list.push(property_text.id);
            board.add(property_text);
            properties_in_line_counter++;
            i++;
        }
    }

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

    function createTradeUI() {
        i = 0;
        var j = 0;
        var width = 15;
        for(const [key, value] of Object.entries(trade_buttons_names)) {
            var tradeUIButton = new fabric.Text(value,
                {
                    id: "text_" + key,
                    left: objects_list["mw_content"].left + 5 + (j * 90),
                    top: objects_list["mw_content"].top + 295,
                    fill: "#788086",
                    fontSize: 14,
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

            objects_list[tradeUIButton.id] = tradeUIButton;
            tradeUI_objects_list.push(tradeUIButton.id)
            board.add(tradeUIButton);
            i++;
            j++;
            if(j > 1) {
                j = 0;
            }
        }

        for(i = 1; i <= maxPlayer; i++) {
            var tradeUIPlayerButton = new fabric.Text("#" + i,
                {
                    id: "text_trade_player_" + i,
                    left: objects_list["mw_content"].left + 180 + (i * 22),
                    top: objects_list["mw_content"].top + 295,
                    fill: "#788086",
                    fontSize: 14,
                    fontWeight: "bold",
                    opacity: 0,
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    hasControls: false,
                    hasRotatingPoint: false,
                    hoverCursor: "pointer" 
                }
            );

            objects_list[tradeUIPlayerButton.id] = tradeUIPlayerButton;
            tradeUI_objects_list.push(tradeUIPlayerButton.id)
            board.add(tradeUIPlayerButton);
            tradeUIPlayerButton.moveTo(39);

            if(i == 10) {
                width = 22;
            }

            var tradeUIPlayerButtonBorder = new fabric.Rect(
                {
                    id: "textBorder_trade_player_" + i,
                    left: objects_list["mw_content"].left + 180 + (i * 22),
                    top: objects_list["mw_content"].top + 295,
                    fill: "",
                    width: width,
                    height: 15,
                    stroke: "grey",
                    strokeWidth: 1,
                    angle: 0,
                    opacity: 0,
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    hasControls: false,
                    hasRotatingPoint: false,
                    hoverCursor: "pointer"
                }
            )

            objects_list[tradeUIPlayerButtonBorder.id] = tradeUIPlayerButtonBorder;
            tradeUI_objects_list.push(tradeUIPlayerButtonBorder.id)
            board.add(tradeUIPlayerButtonBorder);
            tradeUIPlayerButtonBorder.moveTo(39);

            var selectedButtonBackground = new fabric.Rect(
                {
                    id: "textBackground_trade_" + i,
                    left: objects_list["mw_content"].left + 180 + (i * 22),
                    top: objects_list["mw_content"].top + 295,
                    fill: "#788086",
                    width: width,
                    height: 15,
                    stroke: "grey",
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
            )

            objects_list[selectedButtonBackground.id] = selectedButtonBackground;
            tradeUI_objects_list.push(selectedButtonBackground.id)
            board.add(selectedButtonBackground);
            selectedButtonBackground.moveTo(38);
        }

        var field_20_X = objects_list["#20"].left
        var field_20_Y = objects_list["#20"].top
        var linesCoords = [
            [field_20_X + 110, field_20_Y + 175, field_20_X + 540, field_20_Y + 175],
            [field_20_X + 110, field_20_Y + 410, field_20_X + 540, field_20_Y + 410],
            [field_20_X + 110, field_20_Y + 435, field_20_X + 540, field_20_Y + 435], 
            [field_20_X + 325, field_20_Y + 140, field_20_X + 325, field_20_Y + 435]
        ];
        i = 1;

        linesCoords.forEach(coords => {
            var line = new fabric.Line(coords,
                {
                    id: "trade_line_" + i,
                    fill: "#788086",
                    stroke: "#788086",
                    strokeWidth: 1,
                    opacity: 0,
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    hasControls: false,
                    hasRotatingPoint: false,
                    hoverCursor: "....."
                } 
            )
        
            objects_list[line.id] = line;
            tradeUI_objects_list.push(line.id)
            board.add(line);
            line.moveTo(39);
            i++;
        });

        var mw_content_X = objects_list["mw_content"].left;
        var mw_content_Y = objects_list["mw_content"].top;
        var tradeLine_1_X = objects_list["trade_line_3"].left;
        var tradeLine_1_Y = objects_list["trade_line_3"].top;
        var textTitlesCoords = [
            [mw_content_X + 75, mw_content_Y + 5],
            [mw_content_X + 275, mw_content_Y + 5],
            [tradeLine_1_X + 10, tradeLine_1_Y - 20],
            [tradeLine_1_X + 225, tradeLine_1_Y - 20]
        ];
        i = 1;

        trade_text_values.forEach(value => {
            var tradeText = new fabric.Text(value,
                {
                    id: "text_trade_title_" + i,
                    left: textTitlesCoords[i-1][0],
                    top: textTitlesCoords[i-1][1],
                    fill: "#788086",
                    fontSize: 14,
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
            
            objects_list[tradeText.id] = tradeText;
            tradeUI_objects_list.push(tradeText.id)
            board.add(tradeText);
            tradeText.moveTo(39);
            i++;
        });

        var textTradeTitle_3_X = objects_list["text_trade_title_3"].left;
        var textTradeTitle_3_Y = objects_list["text_trade_title_3"].top;
        var textTradeTitle_4_X = objects_list["text_trade_title_4"].left;
        var textTradeTitle_4_Y = objects_list["text_trade_title_4"].top;
        var tradeTextBoxesCoords = [
            [textTradeTitle_3_X + 65, textTradeTitle_3_Y + 0.75],
            [textTradeTitle_4_X + 65, textTradeTitle_4_Y + 0.75]
        ];
        i = 0;

        trade_textboxes_names.forEach(name => {
            var textbox = new fabric.Textbox("0",
                {
                    id: "textbox_" + name,
                    width: 40,
                    left: tradeTextBoxesCoords[i][0],
                    top: tradeTextBoxesCoords[i][1],
                    backgroundColor: "#ffffff",
                    fontSize: 13,
                    fixedWitdh: 40,
                    maxLines: 1,
                    opacity: 0,
                    selectable: true,
                    evented: false,
                    editable: true,
                    lockMovementX: true,
                    lockMovementY: true,
                    hasControls: false,
                    hasRotatingPoint: false,
                    hoverCursor: "....."
                }
            );

            objects_list[textbox.id] = textbox;
            tradeUI_objects_list.push(textbox.id)
            board.add(textbox);
            textbox.moveTo(39);
            i++
        });
    }

    function createMapOperationsUI() {
        i = 0;
        for(const [key, value] of Object.entries(map_operations_buttons_names)) {
            var map_operations_UIButton = new fabric.Text(value,
                {
                    id: "text_" + key,
                    left: objects_list["mw_content"].left + 135,
                    top: objects_list["mw_content"].top + 50 + (i * 40),
                    fill: "#788086",
                    fontSize: 14,
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

            objects_list[map_operations_UIButton.id] = map_operations_UIButton;
            map_operationsUI_objects_list.push(map_operations_UIButton.id)
            board.add(map_operations_UIButton);
            map_operations_UIButton.moveTo(39);
            i++;
        }

        var j = 0;
        for(i = 1; i <= Object.keys(map_operations_buttons_names).length; i++) {
            var map_operations_UIButtonBorder = new fabric.Rect(
                {
                    id: "textBorder_map_operations_" + i,
                    left: objects_list["mw_content"].left + 110,
                    top: objects_list["mw_content"].top + 40 + (j * 40),
                    fill: "",
                    width: 200,
                    height: 39,
                    stroke: "grey",
                    strokeWidth: 1,
                    angle: 0,
                    opacity: 0,
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    hasControls: false,
                    hasRotatingPoint: false,
                    hoverCursor: "pointer"
                }
            );

            objects_list[map_operations_UIButtonBorder.id] = map_operations_UIButtonBorder;
            map_operationsUI_objects_list.push(map_operations_UIButtonBorder.id)
            board.add(map_operations_UIButtonBorder);
            map_operations_UIButtonBorder.moveTo(39);

            var selectedButtonBackground = new fabric.Rect(
                {
                    id: "textBackground_map_operations_" + i,
                    left: objects_list["mw_content"].left + 110,
                    top: objects_list["mw_content"].top + 40 + (j * 40),
                    fill: "#788086",
                    width: 200,
                    height: 39,
                    stroke: "grey",
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
            )

            objects_list[selectedButtonBackground.id] = selectedButtonBackground;
            map_operationsUI_objects_list.push(selectedButtonBackground.id);
            board.add(selectedButtonBackground);
            selectedButtonBackground.moveTo(39);
            j++;
        }
    }

    function addFieldsIcons() {
        fieldsIconNames.forEach(name => {
            fabric.loadSVGFromURL("../static/img/netopol/fields/" + name + ".svg", function(objects, options) {
                var obj = fabric.util.groupSVGElements(objects, options);
                obj.scale(0.05);
        
                board.add(obj);
            })    
        });
    }

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
            text.bringToFront();
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
        managementWindow.sendToBack();
        
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

        createTradeUI();
        createMapOperationsUI();
        // addFieldsIcons();
    };

    function disableBankPropertiesEvent() {
        for(i = 0; i <= Object.keys(properties_info).length - 1; i++) {
            if(properties_info["#" + i]["owner"] == "BANK") {
                objects_list["#" + i].evented = false;
            };
        };
    }

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

    function clearWindowManagementContent(current_tab) {
        if(current_tab == "journal") {
            clear_logs_frame();
        } else if(current_tab == "trade") {
            tradeUI_objects_list.forEach(object => {
                objects_list[object].opacity = 0;
                objects_list[object].evented = false;
            });
            
            if(trade_selected_player != 0) {
                board.setActiveObject(objects_list["text_trade_player_" + trade_selected_player]);
                board.getActiveObject().set("fill", "#788086");
                trade_selected_player = 0;
            };
        } else {
            map_operationsUI_objects_list.forEach(object => {
                objects_list[object].opacity = 0;
                objects_list[object].evented = false;
            });
        };
    }

    function resetOfferWindow(reset) {
        var keyInclude = "trade_property_";
        if(reset == "full") {
            trade_my_properties = [];
            trade_my_properties_objects_list = [];
            trade_colleague_properties = [];
            trade_colleague_properties_objects_list = [];
        } else if(reset == "half") {
            keyInclude = "trade_property_c";
            trade_colleague_properties = [];
            trade_colleague_properties_objects_list = [];
        };

        for(const [key, propertyText] of Object.entries(objects_list)) {
            if(key.includes(keyInclude)) {
                board.remove(propertyText);
                delete objects_list[key];
            }
        }

        board.renderAll();
    }

    function tradeSelectPlayer(player_id) {
        player_id = Number(player_id);
        if(trade_selected_player != 0) {
            board.setActiveObject(objects_list["text_trade_player_" + trade_selected_player]);
            board.getActiveObject().set("fill", "#788086");

            board.setActiveObject(objects_list["textBorder_trade_player_" + trade_selected_player]);
            board.getActiveObject().set("stroke", "grey");

            objects_list["textBackground_trade_" + trade_selected_player].opacity = 0;
        };

        board.setActiveObject(objects_list["text_trade_player_" + player_id]);
        board.getActiveObject().set("fill", "#ffffff");

        board.setActiveObject(objects_list["textBorder_trade_player_" + player_id]);
        board.getActiveObject().set("stroke", "grey");

        objects_list["textBackground_trade_" + player_id].opacity = 1;

        trade_selected_player = player_id;
        trade_colleague_properties = [];
    }

    function displayJournalUI() {
        if(current_tab != "journal") {
            objects_list["tabButton_" + current_tab].opacity = 1;
            objects_list["tabButton_journal"].opacity = 0;
            current_tab = "journal";
            logs_frame(logs_buffer);
        };
    }

    function displayTradeUI() {
        if(current_tab != "trade") {
            objects_list["tabButton_" + current_tab].opacity = 1;
            objects_list["tabButton_trade"].opacity = 0;
            tradeUI_objects_list.forEach(object => {
                if(!object.includes("Background") && !object.includes("tradeOfferMode")) {
                    objects_list[object].opacity = 1;
                    if(!object.includes("title")) {
                        objects_list[object].evented = true;
                    }
                }
            });
            current_tab = "trade";
        }
    }

    function displayMapOperationsUI() {
        if(current_tab != "map_operations") {
            objects_list["tabButton_" + current_tab].opacity = 1;
            objects_list["tabButton_map_operations"].opacity = 0;
            map_operationsUI_objects_list.forEach(object => {
                if(!object.includes("Background")) {
                    objects_list[object].opacity = 1;
                    objects_list[object].evented = true;
                }
            });
            current_tab = "map_operations";
        }
    }

    function displayOfferUI() {
        objects_list["tabButton_trade"].opacity = 0;
        objects_list["tabButton_map_operations"].opacity = 1;
        objects_list["tabButton_journal"].opacity = 1;

        displayTradeUI();
        objects_list["trade_send_offer"].opacity = 0;
        objects_list["trade_send_offer"].evented = false;
        objects_list["trade_reset_offer"].opacity = 0;
        objects_list["trade_reset_offer"].evented = false;
        
        tradeUI_objects_list.forEach(object => {
            if(object.includes("text_trade_player") || object.includes("textBorder_trade_player")) {
                objects_list[object].opacity = 0;
                objects_list[object].evented = false;
            }
        });
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
        disableBankPropertiesEvent();
        logs_frame(logs_buffer);
        window.onresize = resizeCanvas();
        resizeCanvas();
    });

    socket.on("update_properties_info", function(msg) {
        properties_info = msg["properties_info"];
    });

    socket.on("get_game_state", function(msg) {
        gameState = msg["game_state"];
        if(msg["game_state"] == "preparing") {
            socket.emit("request_operator_options");
        } else {
            mySlotID = msg["slot_id"];
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
        socket.emit("request_game_state");
    });

    socket.on("start_game_fail", function(msg) {
        alert(msg["error"]);
    });

    socket.on("get_turn", function() {
        myTurn = true;
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
        myTurn = false;
        objects_list["text_endTurn"].opacity = 0;
        objects_list["text_endTurn"].evented = false;
        objects_list["text_endTurn"].left = -300;
        objects_list["text_endTurn"].top = -300;
        objects_list["turn_cp_background"].opacity = 0;
        resizeBoard();
    });

    socket.on("get_messages", function(msg) {
        var tab = [];
        if(typeof(msg["messages"]) === "string") {
            tab = logs_buffer;
            tab.splice(0, 0, msg["messages"]);
        } else {
            tab = msg["messages"].concat(logs_buffer);
        }

        logs_buffer = tab;
        clear_logs_frame();
        logs_frame(logs_buffer);
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
            console.log(e.target.id);
            if(!e.target.id.includes("#") && !e.target.id.includes("trade_player")) {
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
                        if(current_tab != "journal") {
                            clearWindowManagementContent(current_tab);
                            displayJournalUI();
                        }
                        break;
                    case "tabButton_trade":
                        if(current_tab != "trade") {
                            clearWindowManagementContent(current_tab);
                            displayTradeUI();
                        }
                        break;
                    case "tabButton_map_operations":
                        if(current_tab != "map_operations") {
                            clearWindowManagementContent(current_tab);
                            displayMapOperationsUI();
                        }
                        break;
                    case "text_trade_send_offer":
                        break;
                    case "text_trade_reset_offer":
                        resetOfferWindow(reset);
                        break;
                }
            } else if(e.target.id.includes("#") && gameState === "running") {
                var property_info = properties_info[e.target.id];
                if(property_info["owner"] == "#" + mySlotID) {
                    if(!trade_my_properties.includes(e.target.id)) {
                        trade_my_properties.push(e.target.id);
                    } else {
                        i = trade_my_properties.indexOf(e.target.id);
                        trade_my_properties.splice(i);
                    };
                } else if(property_info["owner"] == "#" + trade_selected_player) {
                    if(!trade_colleague_properties.includes(e.target.id)) {
                        trade_colleague_properties.push(e.target.id);
                    } else {
                        i = trade_colleague_properties.indexOf(e.target.id);
                        trade_colleague_properties.splice(i);
                    };
                }

                resetOfferWindow();
                displayTradeProperties();
            } else if(e.target.id.includes("text_trade_player") && gameState === "running") {
                var player_id = e.target.text.substring(1); 
                tradeSelectPlayer(player_id);
                trade_selected_player = player_id;
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
    socket.emit("request_messages");
    resizeBoard();
}