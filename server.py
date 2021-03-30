import webbrowser
from flask import Flask
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

sessions_id_pool = list(range(1, 100))
online_users_list = []
sessions_list = {}
players_rooms = {}

@socketio.on("online")
def online_event():
    if current_user.username not in online_users_list:
        online_users_list.append(current_user.username)
    emit("online_users_list", {"online_users": online_users_list}, broadcast=True)


@socketio.on("disconnect")
def disconnect_event():
    if current_user.username in online_users_list:
        del online_users_list[online_users_list.index(current_user.username)]
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
                emit("join_room_success")
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


@socketio.on("request_operator_username")
def request_operator_username_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        op = game_instance.op
        emit("get_operator_username", {"operator_username": op})


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


if __name__ == "__main__":
    webbrowser.open("http://127.0.0.1:5000")
    socketio.run(app, log_output=True)
