from flask import Flask, request
from flask_login import current_user
from flask_socketio import SocketIO, emit, join_room, leave_room
from json import load
from ext.auth import db, login
from ext.routes import routes
from ext.email import mail
from games.netopol.netopol import Netopol

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
built_in_rooms = ("netopol_lobby", "gwent_lobby")
sessions_list = {}
players_rooms = {}
users_socket_id = {}

@socketio.on("online")
def online_event():
    if current_user.username not in online_users_list:
        online_users_list.append(current_user.username)
        join_room("netopol_lobby")
    emit("online_users_list", {"online_users": online_users_list}, to="netopol_lobby")


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
    emit("online_users_list", {"online_users": online_users_list}, to="netopol_lobby")


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
        sessions_list[room_id] = Netopol(room_id, current_user.username, "netopol", 10)
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
            emit("get_slots", {"slots": slots}, to=room_id)


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
            emit("get_slots", {"slots": slots}, to=board_id)
        elif slot in slots.keys() and slots[slot] == "--" and current_user.username in players_list and \
                current_user.username in slots.values() and slot <= game_instance.max_slots:
            players = list(slots.values())
            slots[players.index(current_user.username)+1] = "--"
            slots[slot] = current_user.username
            emit("get_slots", {"slots": slots}, to=board_id)


@socketio.on("kick_from_slot")
def kick_from_slot_event(data):
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if current_user.username == game_instance.op:
            slots = game_instance.players_seats
            slot = int(data["slot_id"][10:])
            slots[slot] = "--"
            emit("get_slots", {"slots": slots}, to=board_id)


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
            emit("get_settings", {"settings": new_settings}, to=board_id)
            visible_sessions_list = []
            for session_id, session in sessions_list.items():
                if session.visible and session.private:
                    visible_sessions_list.append(f"{session_id}p")
                elif session.visible and session.private is False:
                    visible_sessions_list.append(session_id)
            emit("get_sessions_list", {"sessions_list": visible_sessions_list}, to="netopol_lobby")


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
            emit("get_kicked", sid=users_socket_id[data["username"]])
            emit("get_players_list", {"online_players": game_instance.players_list, "operator_status": False},
                 to=board_id)
            emit("get_players_list", {"online_players": game_instance.players_list, "operator_status": True})
            emit("get_slots", {"slots": game_instance.players_seats}, to=board_id)


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
        if game_instance.state == "preparing":
            emit("get_game_state", {"game_state": game_instance.state})
        else:
            nicknames = list(game_instance.players_seats.values())
            slot_id = nicknames.index(current_user.username) + 1
            emit("get_game_state", {"game_state": game_instance.state, "slot_id": slot_id})


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
                 to=board_id)
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


@socketio.on("request_turn_state")
def request_turn_state():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running":
            if current_user.username == game_instance.player_turn.nickname and game_instance.auction_state is False:
                emit("get_turn_state", {"state": game_instance.player_turn_state})
            elif current_user.username == game_instance.auction_player_turn.nickname and game_instance.auction_state:
                emit("get_auction_turn", {"price": str(game_instance.auction_price)})


@socketio.on("request_messages")
def request_messages():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running":
            emit("get_messages", {"messages": game_instance.journal[0:10]})


@socketio.on("request_offer_sent_status")
def request_offer_sent_status():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running":
            if game_instance.trade_offer is not None:
                if game_instance.trade_offer["player_1"].nickname == current_user.username:
                    emit("get_offer_sent_status", {"offer_sent_status": True})
                else:
                    emit("get_offer_sent_status", {"offer_sent_status": False})


@socketio.on("request_offer")
def request_offer():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.trade_recipient == current_user.username:
            trade_offer = game_instance.trade_offer.copy()
            trade_offer["player_1_id"] = trade_offer["player_1"].seat
            trade_offer["player_2_id"] = trade_offer["player_2"].seat
            del trade_offer["player_1"]
            del trade_offer["player_2"]
            emit("get_offer", {"offer": trade_offer})


@socketio.on("request_roll_dice")
def request_roll_dice_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username:
            if game_instance.player_turn_state == "roll":
                game_instance.move(game_instance.player_turn)
                emit("get_messages", {"messages": game_instance.journal[0]}, to=board_id)
                is_buyable = game_instance.is_buyable(game_instance.player_turn)
                game_instance.player_turn_state = "buy"
                if is_buyable:
                    emit("ask_buy_property", {"property_buyable": True})
                elif is_buyable == "auction":
                    emit("ask_buy_property", {"property_buyable": False})
                else:
                    current_property = game_instance.properties_data[game_instance.player_turn.coordinates]
                    if current_property["owner"] is not None and current_property["owner"] != "BANK" and \
                            game_instance.player_turn != game_instance.get_player(int(current_property["owner"][1:])):
                        owner = game_instance.get_player(int(current_property["owner"][1:]))
                        game_instance.pay(game_instance.player_turn, owner, current_property["district"])
                        emit("get_messages", {"messages": game_instance.journal[0]}, to=board_id)

                    players = list(game_instance.players_seats.values())
                    players_number = 10 - players.count("--")
                    emit("get_accounts", {"accounts": game_instance.accounts, "players_number": players_number},
                         to=board_id)
                    if current_property["district"] == "tax" and current_property["rent_level_1"] != 0:
                        game_instance.player_turn_state = "tax"
                        emit("ask_tax_form")
                    elif game_instance.player_turn.doublet and game_instance.player_turn.in_jail is False:
                        game_instance.player_turn_state = "roll"
                        emit("get_turn")
                    else:
                        game_instance.player_turn_state = "after_roll"
                        emit("get_after_roll_dice")
            else:
                game_instance.jail(game_instance.player_turn, mode=1)
                game_instance.player_turn_state = "after_roll"
                emit("get_after_roll_dice")

            emit("board_update", {"pawns_coordinates": game_instance.get_coordinates()}, to=board_id)


@socketio.on("request_buy_property")
def request_buy_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username and \
                game_instance.player_turn_state == "buy":
            if game_instance.buy(game_instance.player_turn):
                players = list(game_instance.players_seats.values())
                players_number = 10 - players.count("--")
                game_instance.player_turn_state = "after_roll"
                emit("get_messages", {"messages": game_instance.journal[0]}, to=board_id)
                emit("get_after_roll_dice")
                emit("get_accounts", {"accounts": game_instance.accounts, "players_number": players_number},
                     to=board_id)
                emit("update_properties_info", {"properties_info": game_instance.properties_data}, to=board_id)


@socketio.on("request_auction")
def request_auction_event(data):
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username \
                and game_instance.auction_state is False and game_instance.player_turn_state == "buy":
            game_instance.auction_start()
            sid = users_socket_id[game_instance.auction_player_turn.nickname]
            emit("get_messages", {"messages": game_instance.journal[0]}, to=board_id)
            emit("get_auction_turn", {"price": str(game_instance.auction_price)}, to=sid)
        elif game_instance.state == "running" and game_instance.auction_player_turn.nickname == current_user.username \
                and game_instance.auction_state is True:
            try:
                game_instance.auction(int(data["price"]))
                if int(data["price"]) == 0:
                    emit("get_messages", {"messages": [game_instance.journal[0], game_instance.journal[1]]},
                         to=board_id)
                else:
                    emit("get_messages", {"messages": game_instance.journal[0]}, to=board_id)
            except ValueError:
                pass
            if game_instance.auction_state:
                sid = users_socket_id[game_instance.auction_player_turn.nickname]
                emit("get_auction_turn", {"price": str(game_instance.auction_price)}, to=sid)
            else:
                players = list(game_instance.players_seats.values())
                players_number = 10 - players.count("--")
                sid = users_socket_id[game_instance.player_turn.nickname]
                game_instance.player_turn_state = "after_roll"
                emit("get_after_roll_dice", to=sid)
                emit("get_accounts", {"accounts": game_instance.accounts, "players_number": players_number},
                     to=board_id)
                emit("update_properties_info", {"properties_info": game_instance.properties_data}, to=board_id)


@socketio.on("request_pay_bail")
def request_pay_bail_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username \
                and game_instance.player_turn.in_jail is True and game_instance.player_turn_state == "jail":
            game_instance.pay_bail(game_instance.player_turn)
            players = list(game_instance.players_seats.values())
            players_number = 10 - players.count("--")
            game_instance.player_turn_state = "roll"
            emit("get_accounts", {"accounts": game_instance.accounts, "players_number": players_number},
                 to=board_id)
            emit("get_turn")


@socketio.on("request_pay_tax")
def request_pay_tax_event(data):
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username \
                and game_instance.player_turn_state == "tax":
            game_instance.tax(game_instance.player_turn, data["type"])
            players = list(game_instance.players_seats.values())
            players_number = 10 - players.count("--")
            game_instance.player_turn_state = "after_roll"
            emit("get_accounts", {"accounts": game_instance.accounts, "players_number": players_number},
                 to=board_id)
            emit("get_after_roll_dice")


@socketio.on("request_trade_send_offer")
def request_trade_send_offer(data):
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username \
                and game_instance.player_turn.in_jail is False and game_instance.player_turn_state != "jail":
            if game_instance.is_valid_offer(int(data["player_1_id"]), int(data["player_2_id"]), data["player_1_items"],
                                            data["player_2_items"]):
                sid_sender = users_socket_id[game_instance.player_turn.nickname]
                sid_recipient = users_socket_id[game_instance.players[int(data["player_2_id"])].nickname]
                emit("get_messages", {"messages": game_instance.journal[0]}, to=board_id)
                emit("get_send_offer_success", to=sid_sender)
                emit("get_offer", {"offer": data}, to=sid_recipient)


@socketio.on("request_trade_accept_offer")
def request_trade_accept_offer():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.trade_recipient == current_user.username \
            and game_instance.trade_offer is not None and game_instance.player_turn.in_jail is False and \
                game_instance.player_turn_state != "jail":
            players = list(game_instance.players_seats.values())
            players_number = 10 - players.count("--")
            sid_sender = users_socket_id[game_instance.player_turn.nickname]
            sid_recipient = users_socket_id[game_instance.trade_recipient]
            game_instance.trade()
            emit("get_messages", {"messages": game_instance.journal[0]}, to=board_id)
            emit("get_accounts", {"accounts": game_instance.accounts, "players_number": players_number},
                 to=board_id)
            emit("update_properties_info", {"properties_info": game_instance.properties_data}, to=board_id)
            emit("get_offer_sent_status", {"offer_sent_status": False}, to=sid_sender)
            emit("get_after_trade", to=sid_recipient)


@socketio.on("request_trade_discard_offer")
def request_trade_discard_offer():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.trade_recipient == current_user.username \
            and game_instance.trade_offer is not None and game_instance.player_turn.in_jail is False and \
                game_instance.player_turn_state != "jail":
            sid_sender = users_socket_id[game_instance.player_turn.nickname]
            sid_recipient = users_socket_id[game_instance.trade_recipient]
            game_instance.trade_discard()
            emit("get_messages", {"messages": game_instance.journal[0]}, to=board_id)
            emit("get_offer_sent_status", {"offer_sent_status": False}, to=sid_sender)
            emit("get_after_trade", to=sid_recipient)


@socketio.on("request_pledge")
def request_pledge_event(data):
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username:
            if game_instance.pledge(data["property"]):
                players = list(game_instance.players_seats.values())
                players_number = 10 - players.count("--")
                emit("get_messages", {"messages": game_instance.journal[0]}, to=board_id)
                emit("get_accounts", {"accounts": game_instance.accounts, "players_number": players_number},
                     to=board_id)
                emit("get_pledge", {"property": data["property"]}, to=board_id)


@socketio.on("request_pledge_buyout")
def request_pledge_buyout_event(data):
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username \
                and game_instance.player_turn.in_jail is False and game_instance.player_turn_state != "jail":
            if game_instance.pledge_buyout(data["property"]):
                players = list(game_instance.players_seats.values())
                players_number = 10 - players.count("--")
                emit("get_messages", {"messages": game_instance.journal[0]}, to=board_id)
                emit("get_accounts", {"accounts": game_instance.accounts, "players_number": players_number},
                     to=board_id)
                emit("get_pledge_buyout", {"property": data["property"]}, to=board_id)


@socketio.on("request_buy_building")
def request_buy_building_event(data):
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username \
                and game_instance.player_turn.in_jail is False and game_instance.player_turn_state != "jail":
            if game_instance.buy_building(data["property"]):
                players = list(game_instance.players_seats.values())
                players_number = 10 - players.count("--")
                emit("get_messages", {"messages": game_instance.journal[0]}, to=board_id)
                emit("get_accounts", {"accounts": game_instance.accounts, "players_number": players_number},
                     to=board_id)
                emit("get_buy_building", {"property": data["property"], "buildings_level":
                     game_instance.properties_buildings[data["property"]]}, to=board_id)


@socketio.on("request_sell_building")
def request_sell_building_event(data):
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username:
            if game_instance.sell_building(data["property"]):
                players = list(game_instance.players_seats.values())
                players_number = 10 - players.count("--")
                emit("get_messages", {"messages": game_instance.journal[0]}, to=board_id)
                emit("get_accounts", {"accounts": game_instance.accounts, "players_number": players_number},
                     to=board_id)
                emit("get_sell_building", {"property": data["property"], "buildings_level":
                     game_instance.properties_buildings[data["property"]] + 1}, to=board_id)


@socketio.on("request_end_turn")
def request_end_turn_event():
    if current_user.username in players_rooms:
        board_id = int(players_rooms[current_user.username])
        game_instance = sessions_list[board_id]
        if game_instance.state == "running" and game_instance.player_turn.nickname == current_user.username and \
                game_instance.player_turn_state == "after_roll":
            game_instance.end_turn()
            sid = users_socket_id[game_instance.player_turn.nickname]
            emit("get_end_turn")
            emit("get_turn_state", {"state": game_instance.player_turn_state}, to=sid)


# TODO: Mechanizm gotowości graczy

if __name__ == "__main__":
    socketio.run(app, log_output=True)
