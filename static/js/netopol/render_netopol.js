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
    var properties_types = ["start", "fate", "tax", "train", "jail", "infra", "parking", "police"]
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

    function logs_frame(message) {

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
        };

        var property_district = new fabric.Rect(
                    {
                        id: "property_card_district",
                        left: objects_list["property_card"].left,
                        top: objects_list["property_card"].top,
                        fill: "#FFFFFF",
                        width: 100,
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
    };

    function renderBoard(pawns_coordinates) {
        if(pawns_coordinates.length > 0) {
            i = 0;
            while(i != pawns_coordinates.length) {

            };
        };

        board.renderAll();
    };

    socket.on("board_update", function(msg) {
        var pawns_coordinates = msg["pawns_coordinates"];
        drawBoard(pawns_coordinates);
    });

    socket.on("get_properties_info", function(msg) {
        properties_info = msg["properties_info"];
        createBoard({});
        window.onresize = resizeCanvas;
        resizeCanvas()
    });

    board.on("mouse:over", function(e) {
        if(e.target !== null) {
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

    socket.emit("request_properties_info");
}