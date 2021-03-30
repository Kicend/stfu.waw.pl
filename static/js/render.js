"use strict";
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
                coordinates: "#0",
                color: pawns_colors["#" + i]
            }
        );
        pawns_list[pawn.id] = pawn;
        i++;
    };

    function logs_frame(message) {

    };

    function drawBoard(pawns_coordinates) {
        i = 0;

        while(i != 4) {
            var j = 0;
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
                        evented: false,
                        lockMovementX: true,
                        lockMovementY: true,
                        hasControls: false,
                        hasRotatingPoint: false
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
            }
            i++;
        }
        
        i = 0;

        while(i != pawns_coordinates.length) {
            
        }
    };


    drawBoard();
    window.onresize = resizeCanvas;
    resizeCanvas()
}
