import webbrowser
from flask import Flask
from flask_login import current_user
from flask_socketio import SocketIO, emit, join_room, leave_room, rooms
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
    if current_user.username in players_rooms:
        del players_rooms[current_user.username]
    emit("online_users_list", {"online_users": online_users_list}, broadcast=True)


@socketio.on("disconnect")
def disconnect_event():
    if current_user.username in online_users_list:
        del online_users_list[online_users_list.index(current_user.username)]
    emit("online_users_list", {"online_users": online_users_list}, broadcast=True)


@socketio.on("create_room")
def create_room_event():
    room_id = None
    if current_user.username not in players_rooms:
        if sessions_id_pool:
            room_id = sessions_id_pool.pop(0)
        join_room(room_id)
        sessions_list[room_id] = Netopol(room_id, current_user.username)
        emit("get_room_id", {"room_id": room_id})
        players_rooms[current_user.username] = room_id


@socketio.on("join_room")
def join_room_event():
    room_id = None
    if current_user.username not in players_rooms:
        # TODO: Przydzielanie room_id z id pokoju do, którego dołącza gracz
        if sessions_id_pool:
            room_id = sessions_id_pool.pop(0)
        join_room(room_id)
        emit("get_room_id", {"room_id": room_id})
        players_rooms[current_user.username] = room_id
    else:
        join_room(players_rooms[current_user.username])
        emit("get_room_id", {"room_id": players_rooms[current_user.username]})


@socketio.on("check_previous_room")
def check_previous_room_event():
    if current_user.username in players_rooms:
        emit("get_room_id", {"room_id": players_rooms[current_user.username]})


@socketio.on("request_username")
def get_username_event():
    emit("get_username", {"username": current_user.username})


@socketio.on("take_slot")
def take_slot_event():
    pass


if __name__ == "__main__":
    webbrowser.open("http://127.0.0.1:5000")
    socketio.run(app, log_output=True)
