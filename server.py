from flask import Flask, request
from flask_login import current_user
from flask_socketio import SocketIO, emit, join_room, leave_room
from json import load
from ext.auth import db, login
from ext.routes import routes
from ext.email import mail
from netopol.netopol import Netopol

with open("db/secret.json", "r") as f:
    secrets = load(f)

app = Flask(__name__)
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax"
)
login.init_app(app)
login.login_view = "routes.login"

for key, secret in secrets.items():
    app.config[key] = secret

app.register_blueprint(routes)
mail.init_app(app)
db.init_app(app)
socketio = SocketIO(app, logger=True, engineio_logger=True, manage_session=False)

@app.before_first_request
def create_table():
    db.create_all()

@app.after_request
def add_header(response):
    response.headers["X-XSS-Protection"] = "0"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

sessions_id_pool = list(range(1, 100))
online_users_list = []
sessions_list = {}
players_rooms = {}
users_socket_id = {}

@socketio.on("online")
def online_event():
    if current_user.username not in online_users_list:
        online_users_list.append(current_user.username)
    emit("online_users_list", {"online_users": online_users_list}, broadcast=True)


@socketio.on("connect")
def connect_event():
    if current_user.username not in users_socket_id:
        users_socket_id[current_user.username] = request.sid


@socketio.on("disconnect")
def disconnect_event():
    if current_user.username in online_users_list:
        del online_users_list[online_users_list.index(current_user.username)]
    if current_user.username in users_socket_id:
        del users_socket_id[current_user.username]
    emit("online_users_list", {"online_users": online_users_list}, broadcast=True)


@socketio.on("request_sessions_list")
def request_sessions_list():
    visible_sessions_list = []
    for session_id, session in sessions_list.items():
        if session.visible:
            visible_sessions_list.append(session_id)
    emit("get_sessions_list", {"sessions_list": visible_sessions_list})


@socketio.on("create_room")
def create_room_event():
    room_id = None
    if current_user.username not in players_rooms:
        if sessions_id_pool:
            room_id = sessions_id_pool.pop(0)
        join_room(room_id)
        sessions_list[room_id] = Netopol(room_id, current_user.username)
        game_instance = sessions_list[room_id]
        game_instance.players_list.append(current_user.username)
        players_rooms[current_user.username] = room_id
        emit("get_room_id", {"room_id": room_id})


@socketio.on("join_room")
def join_room_event(data):
    try:
        game_instance = sessions_list[int(data["room_id"])]
        if not game_instance.private or current_user.username in game_instance.players_list:
            if current_user.username not in players_rooms:
                room_id = int(data["room_id"])
                join_room(room_id)
                players_rooms[current_user.username] = room_id
                emit("get_room_id", {"room_id": room_id})
            else:
                if data["room_id"] != players_rooms[current_user.username]:
                    players_rooms[current_user.username] = int(data["room_id"])
                join_room(players_rooms[current_user.username])
                emit("get_room_id", {"room_id": players_rooms[current_user.username]})

            if sessions_list[int(data["room_id"])] is not None:
                game_instance = sessions_list[int(data["room_id"])]
                if current_user.username not in game_instance.players_list:
                    game_instance.players_list.append(current_user.username)
                if current_user.username == game_instance.op:
                    operator_status = True
                else:
                    operator_status = False
                emit("join_room_success")
                emit("get_players_list", {"online_players": game_instance.players_list,
                                          "operator_status": operator_status})
        else:
            emit("join_room_error")
    except KeyError:
        emit("join_room_error")


@socketio.on("leave_room")
def leave_room_event():
    slots = None
    if current_user.username in players_rooms:
        room_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[room_id]
        leave_room(room_id)
        del players_rooms[current_user.username]
        del game_instance.players_list[game_instance.players_list.index(current_user.username)]
        if current_user.username in game_instance.players_seats.values():
            players = list(game_instance.players_seats.values())
            game_instance.players_seats[players.index(current_user.username)+1] = "--"
            slots = game_instance.players_seats
        if not game_instance.players_list:
            del sessions_list[int(room_id)]
            sessions_id_pool.append(room_id)
        else:
            emit("get_slots", {"slots": slots}, broadcast=True)


@socketio.on("check_previous_room")
def check_previous_room_event():
    if current_user.username in players_rooms:
        emit("get_room_id", {"room_id": players_rooms[current_user.username]})


@socketio.on("request_slots")
def request_slots_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        slots = game_instance.players_seats
        emit("get_slots", {"slots": slots})


@socketio.on("take_slot")
def take_slot_event(data):
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        slots = game_instance.players_seats
        slot = int(data["slot_id"][5:])
        players_list = game_instance.players_list
        if slot in slots.keys() and slots[slot] == "--" and current_user.username in players_list and \
                current_user.username not in slots.values() and slot <= game_instance.max_slots:
            slots[slot] = current_user.username
            emit("get_slots", {"slots": slots}, broadcast=True)
        elif slot in slots.keys() and slots[slot] == "--" and current_user.username in players_list and \
                current_user.username in slots.values() and slot <= game_instance.max_slots:
            players = list(slots.values())
            slots[players.index(current_user.username)+1] = "--"
            slots[slot] = current_user.username
            emit("get_slots", {"slots": slots}, broadcast=True)


@socketio.on("kick_from_slot")
def kick_from_slot_event(data):
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if current_user.username == game_instance.op:
            slots = game_instance.players_seats
            slot = int(data["slot_id"][10:])
            slots[slot] = "--"
            emit("get_slots", {"slots": slots}, broadcast=True)


@socketio.on("request_operator_username")
def request_operator_username_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        op = game_instance.op
        if current_user.username == op:
            operator_status = True
        else:
            operator_status = False
        emit("get_operator_username", {"operator_username": op, "operator_status": operator_status})


@socketio.on("is_operator")
def is_operator_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if current_user.username == game_instance.op:
            emit("get_operator_info", {"operator_status": True})
        else:
            emit("get_operator_info", {"operator_status": False})


@socketio.on("request_settings")
def request_settings_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        settings = {
            "private": game_instance.private,
            "visible": game_instance.visible,
            "time": "15",
            "max_slots": game_instance.max_slots
        }

        emit("get_settings", {"settings": settings})


@socketio.on("request_players_list")
def request_players_list_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if current_user.username == game_instance.op:
            operator_status = True
        else:
            operator_status = False
        emit("get_players_list", {"online_players": game_instance.players_list, "operator_status": operator_status})


@socketio.on("change_settings")
def change_settings_event(data):
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if current_user.username == game_instance.op:
            new_settings = data["new_settings"]
            game_instance.private = new_settings["private"]
            game_instance.visible = new_settings["visible"]

            for slot in range(int(new_settings["max_slots"]), game_instance.max_slots+1):
                game_instance.players_seats[slot] = "--"

            game_instance.max_slots = int(new_settings["max_slots"])
            emit("get_settings", {"settings": new_settings}, broadcast=True)
            visible_sessions_list = []
            for session_id, session in sessions_list.items():
                if session.visible and session.private:
                    visible_sessions_list.append(f"{session_id}p")
                elif session.visible and session.private is False:
                    visible_sessions_list.append(session_id)
            emit("get_sessions_list", {"sessions_list": visible_sessions_list}, broadcast=True)


@socketio.on("kick_player")
def kick_player_event(data):
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if current_user.username == game_instance.op:
            del game_instance.players_list[game_instance.players_list.index(data["username"])]
            seats = list(game_instance.players_seats.values())
            if data["username"] in seats:
                game_instance.players_seats[seats.index(data["username"])+1] = "--"
            del players_rooms[data["username"]]
            leave_room(board_id, sid=users_socket_id[data["username"]])
            emit("get_kicked", room=users_socket_id[data["username"]])
            emit("get_players_list", {"online_players": game_instance.players_list, "operator_status": False},
                 broadcast=True)
            emit("get_players_list", {"online_players": game_instance.players_list, "operator_status": True})
            emit("get_slots", {"slots": game_instance.players_seats}, broadcast=True)


@socketio.on("request_properties_info")
def request_properties_info_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        emit("get_properties_info", {"properties_info": game_instance.properties_data})


@socketio.on("request_game_state")
def request_game_state_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        emit("get_game_state", {"game_state": game_instance.state})


@socketio.on("request_operator_options")
def request_operator_options_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if current_user.username == game_instance.op:
            emit("get_operator_options", {"operator_status": True})


@socketio.on("request_start_game")
def request_start_game_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        players = list(game_instance.players_seats.values())
        players_number = 10 - players.count("--")
        if current_user.username == game_instance.op and players_number == game_instance.max_slots:
            game_instance.state = "running"
            game_instance.start_game()
            sid = users_socket_id[game_instance.player_turn.nickname]
            emit("start_game_success", {"accounts": game_instance.accounts, "players_number": players_number},
                 broadcast=True)
            emit("get_turn", to=sid)
        elif players_number != game_instance.players_seats:
            emit("start_game_fail", {"error": "Nie wystarczająca liczba graczy!"})
        else:
            emit("start_game_fail", {"error": "Nie masz uprawnień, aby wykonać tę akcję!"})


@socketio.on("request_accounts")
def request_accounts_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running":
            emit("get_accounts", {"accounts": game_instance.accounts, "players_number": game_instance.max_slots})


@socketio.on("request_board_status")
def request_board_status_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running":
            emit("board_update", {"pawns_coordinates": game_instance.get_coordinates()})


@socketio.on("request_roll_dice")
def request_roll_dice_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username:
            game_instance.move(game_instance.player_turn)
            is_buyable = game_instance.is_buyable(game_instance.player_turn)
            if is_buyable:
                emit("ask_buy_property", {"property_buyable": True})
            elif is_buyable == "auction":
                emit("ask_buy_property", {"property_buyable": False})
            else:
                current_property = game_instance.properties_data[game_instance.player_turn.coordinates]
                if current_property["owner"] is not None and current_property["owner"] != "#1290":
                    game_instance.pay(game_instance.player_turn.seat, current_property["owner"][1:],
                                      current_property["rent_basic"])

                players = list(game_instance.players_seats.values())
                players_number = 10 - players.count("--")
                emit("get_accounts", {"accounts": game_instance.accounts, "players_number": players_number},
                     broadcast=True)
                emit("get_after_roll_dice")
            emit("board_update", {"pawns_coordinates": game_instance.get_coordinates()}, broadcast=True)


@socketio.on("request_buy_property")
def request_buy_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username:
            if game_instance.buy(game_instance.player_turn):
                players = list(game_instance.players_seats.values())
                players_number = 10 - players.count("--")
                emit("get_after_roll_dice")
                emit("get_accounts", {"accounts": game_instance.accounts, "players_number": players_number},
                     broadcast=True)
                emit("update_properties_info", {"properties_info": game_instance.properties_data}, broadcast=True)


@socketio.on("request_auction")
def request_auction_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username:
            pass


@socketio.on("request_end_turn")
def request_end_turn_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username:
            game_instance.end_turn()
            sid = users_socket_id[game_instance.player_turn.nickname]
            emit("get_end_turn")
            emit("get_turn", to=sid)


# TODO: Mechanizm gotowości graczy

if __name__ == "__main__":
    socketio.run(app, log_output=True)
