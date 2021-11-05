from json import load
from random import randrange, choice
from time import time

class Session:
    def __init__(self, board_id, op):
        self.board_id = board_id
        self.op = op
        self.created_at = time()
        self.private = False
        self.visible = False
        self.max_slots = 2
        self.players_seats = dict.fromkeys([i for i in range(1, 11)], "--")
        self.players_list = []
        self.active_players = []
        self.state = "preparing"


class Player:
    def __init__(self, nickname, seat):
        self.nickname = nickname
        self.seat = seat
        self.coordinates = "#0"
        self.last_coordinates = None
        self.doublet = False
        self.doublet_counter = 0
        self.in_jail = False
        self.sentence_turn = 0
        self.free_jail_card = False


class Netopol(Session):
    def __init__(self, board_id, op):
        super().__init__(board_id, op)
        self.max_slots = 6
        self.properties_data = self.load_properties()
        self.start_balance = 1500
        self.accounts = dict.fromkeys([i for i in range(1, 11)], self.start_balance)
        self.player_turn = None

    @staticmethod
    def load_properties():
        with open("netopol/data/properties.json", "r") as f:
            return load(f)

    def get_coordinates(self):
        players_coordinates = {}

        for player in self.active_players:
            players_coordinates["#" + str(player.seat)] = [player.coordinates, player.last_coordinates]

        return players_coordinates

    def is_buyable(self, player: Player):
        if self.properties_data[player.coordinates]["owner"] is None and \
                self.properties_data[player.coordinates]["owner"] != "#1290":
            property_price = self.properties_data[player.coordinates]["price"]
            player_account = self.accounts[player.seat]
            if player_account >= property_price > 0:
                return True
            else:
                return "auction"
        else:
            return False

    @staticmethod
    def roll():
        dice_1 = randrange(1, 7)
        dice_2 = randrange(1, 7)
        if dice_1 == dice_2:
            return [dice_1+dice_2, True]
        else:
            return [dice_1+dice_2, False]

    def move(self, player: Player, mode=0, number=0):
        if mode == 0:
            dices = self.roll()
            player.last_coordinates = player.coordinates
            player.coordinates = "#" + str(int(player.coordinates[1:]) + dices[0])
            player.doublet = dices[1]
            player.doublet_counter += 1
        else:
            player.last_coordinates = player.coordinates
            player.coordinates = "#" + str(int(player.coordinates[1:]) + number)

            if player.last_coordinates == player.coordinates:
                player.last_coordinates = None

        if int(player.coordinates[1:]) > 39:
            coordinates = str(int(player.coordinates[1:]) - 40)
            player.coordinates = "#" + coordinates
            self.accounts[player.seat] += 200

    def buy(self, player: Player):
        property_card = self.properties_data[player.coordinates]
        player_account = self.accounts[player.seat]
        if player_account >= property_card["price"]:
            self.accounts[player.seat] -= property_card["price"]
            property_card["owner"] = "#" + str(player.seat)
            return True
        else:
            return False

    def pay(self, sender: int, recipient: int, amount: int):
        if self.accounts[sender] >= amount:
            self.accounts[sender] -= amount
            self.accounts[recipient] += amount
        else:
            pass  # Przekazanie do funkcji logs_frame w pliku render.js

    def trade_request(self, sender: int, recipient: int, player_1_items: dict, player_2_items: dict):
        pass

    def trade(self, player_1: int, player_2: int, player_1_items: dict, player_2_items: dict, result: bool):
        pass

    def end_turn(self):
        current_player = self.player_turn
        current_player_index = self.active_players.index(current_player)
        next_player_index = current_player_index + 1
        if next_player_index >= len(self.active_players):
            next_player_index = 0
        self.player_turn = self.active_players[next_player_index]

    def start_game(self):
        for seat, player in self.players_seats.items():
            if player != "--":
                self.active_players.append(Player(player, seat))

        if self.active_players:
            self.player_turn = choice(self.active_players)
