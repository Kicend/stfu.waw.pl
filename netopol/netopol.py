from json import load
from random import randrange, choice, shuffle
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
        self.events = self.load_events()
        self.events_cards_stack = [i for i in range(0, 3)]
        self.player_turn = None
        self.player_turn_state = None
        self.auction_state = False
        self.auction_player_turn = None
        self.auction_participants = []
        self.auction_field = None
        self.auction_price = 0
        self.auction_winner = None

    @staticmethod
    def load_properties():
        with open("netopol/data/properties.json", "r", encoding="utf-8") as f:
            return load(f)

    @staticmethod
    def load_events():
        with open("netopol/data/events.json", "r", encoding="utf-8") as f:
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

    # TODO: Dokończyć
    def is_player_pass_start(self, player: Player):
        if player.coordinates == "#0":
            return True
        elif player.last_coordinates:
            pass

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
            if player.doublet:
                player.doublet_counter += 1
                if player.doublet_counter == 3:
                    player.in_jail = True
                    player.coordinates = "#10"
            else:
                player.doublet_counter = 0

            if player.coordinates == "#30":
                self.jail(player, 0)
            elif player.coordinates in ("#2", "#7", "#17", "#22", "#33", "#36"):
                self.fate(player)
        else:
            player.last_coordinates = player.coordinates
            player.coordinates = "#" + str(int(player.coordinates[1:]) + number)

            if player.last_coordinates == player.coordinates:
                player.last_coordinates = None

        if int(player.coordinates[1:]) > 39:
            coordinates = str(int(player.coordinates[1:]) - 40)
            player.coordinates = "#" + coordinates
            self.accounts[player.seat] += 200

    def jail(self, player: Player, mode: int = 0, sentence_length: int = 3):
        if mode == 0:
            player.in_jail = True
            player.sentence_turn = sentence_length
            player.coordinates = "#10"
        else:
            dices = self.roll()
            player.doublet = dices[1]
            if player.doublet:
                player.in_jail = False
                player.coordinates = "#" + str(int(player.coordinates[1:]) + dices[0])
            else:
                player.sentence_turn -= 1
                if player.sentence_turn == 0:
                    player.in_jail = False
                    player.coordinates = "#" + str(int(player.coordinates[1:]) + dices[0])

    def buy(self, player: Player):
        property_card = self.properties_data[player.coordinates]
        player_account = self.accounts[player.seat]
        if player_account >= property_card["price"]:
            self.accounts[player.seat] -= property_card["price"]
            property_card["owner"] = "#" + str(player.seat)
            return True
        else:
            return False

    def auction_start(self):
        player = self.player_turn
        self.auction_field = player.coordinates
        self.auction_participants = self.active_players.copy()
        del self.auction_participants[self.auction_participants.index(player)]
        self.auction_participants.insert(0, player)
        self.auction_player_turn = player
        self.auction_state = True

    def auction(self, price: int):
        current_player = self.auction_participants.pop(0)
        if price > 0 and price > self.auction_price:
            self.auction_winner = current_player
            self.auction_price = price
            self.auction_participants.append(current_player)
            self.auction_player_turn = self.auction_participants[0]
        else:
            if len(self.auction_participants) == 1:
                property_card = self.properties_data[self.auction_field]
                if self.auction_winner is None:
                    self.auction_winner = self.auction_participants[0]

                self.accounts[self.auction_winner.seat] -= self.auction_price
                property_card["owner"] = "#" + str(self.auction_winner.seat)
                self.auction_end()
            else:
                self.auction_player_turn = self.auction_participants[0]

    def auction_end(self):
        self.auction_field = None
        self.auction_participants = []
        self.auction_price = 0
        self.auction_player_turn = None
        self.auction_state = False

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

    def fate(self, player: Player):
        event_card = self.events_cards_stack.pop(0)
        self.events_cards_stack.append(event_card)
        event_card = self.events["#" + str(event_card)]
        if event_card["type"] == "teleport":
            player.coordinates = event_card["coordinates"]
        elif event_card["type"] == "income":
            player_account = self.accounts[player.seat]
            player_account += event_card["value"]
        elif event_card["type"] == "pay":
            player_account = self.accounts[player.seat]
            player_account -= event_card["value"]

    def end_turn(self):
        current_player = self.player_turn
        current_player_index = self.active_players.index(current_player)
        next_player_index = current_player_index + 1
        if next_player_index >= len(self.active_players):
            next_player_index = 0
        self.player_turn = self.active_players[next_player_index]
        self.player_turn_state = "roll"

    def start_game(self):
        shuffle(self.events_cards_stack)
        for seat, player in self.players_seats.items():
            if player != "--":
                self.active_players.append(Player(player, seat))

        if self.active_players:
            self.player_turn = choice(self.active_players)
