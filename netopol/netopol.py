from json import load
from random import randrange

class Player:
    def __init__(self, nickname):
        self.nickname = nickname
        self.coordinates = "#0"
        self.is_op = False


class Netopol:
    def __init__(self, board_id, op):
        self.board_id = board_id
        self.op = op
        self.private = False
        self.max_slots = 6
        self.properties_data = self.load_properties()
        self.players_seats = {1: "--", 2: "--", 3: "--", 4: "--", 5: "--",
                              6: "--", 7: "--", 8: "--", 9: "--", 10: "--"}
        self.players_list = []
        self.active_players = []
        self.start_balance = 1500
        self.accounts = dict.fromkeys([i for i in range(1, 11)], self.start_balance)

    @staticmethod
    def load_properties():
        with open("netopol/data/properties.json", "r") as f:
            return load(f)

    @staticmethod
    def roll():
        number = randrange(1, 13)
        return number

    def event(self, e: str):
        pass

    def get_property_info(self, coordinates: str):
        property_info = self.properties_data[coordinates]
        if property_info["district"] == "fate":
            self.event("fate")
        elif property_info["district"] == "tax":
            self.event("tax")
        elif property_info["district"] == "police":
            self.event("police")
        else:
            self.event("property")

    def move(self, player: Player, mode=0, number=0):
        if mode == 0:
            dices = self.roll()
            player.coordinates = "#" + str((int(player.coordinates[1:]) + dices))
        else:
            player.coordinates = "#" + str((int(player.coordinates[1:]) + number))
        self.prepare_for_render()

    def pay(self, sender: int, recipient: int, amount: int):
        if self.accounts[sender] >= amount:
            self.accounts[sender] -= amount
            self.accounts[recipient] += amount
        else:
            pass  # Przekazanie do funkcji logs_frame w pliku render.js

    def trade_request(self, sender: int, recipient: int, player_1_items: dict, player_2_items: int):
        pass

    def trade(self, player_1: int, player_2: int, player_1_items: dict, player_2_items: dict, result: bool):
        pass

    def prepare_for_render(self):
        pass

netopol = Netopol(1, "test")
