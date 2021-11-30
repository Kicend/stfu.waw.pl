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
    def __init__(self, nickname, seat, account_start_balance):
        self.nickname = nickname
        self.seat = seat
        self.coordinates = "#0"
        self.last_coordinates = None
        self.doublet = False
        self.doublet_counter = 0
        self.in_jail = False
        self.sentence_turn = 0
        self.free_jail_card = False
        self.account = account_start_balance
        self.inventory = Inventory()


class Inventory:
    def __init__(self):
        self.fields = []
        self.cards = []
        self.fields_num_by_district = {}


class Netopol(Session):
    def __init__(self, board_id, op):
        super().__init__(board_id, op)
        self.max_slots = 6
        self.properties_data = self.load_properties()
        self.fields_list = self.count_fields_by_district()
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

    def count_fields_by_district(self):
        tmp = {}
        for value in self.properties_data.values():
            if value["district"] not in tmp.keys():
                tmp[value["district"]] = 1
            else:
                tmp[value["district"]] += 1

        return tmp

    @staticmethod
    def load_events():
        with open("netopol/data/events.json", "r", encoding="utf-8") as f:
            return load(f)

    def update_accounts(self, players: list):
        for player in players:
            self.accounts[player.seat] = player.account

    def get_coordinates(self):
        players_coordinates = {}

        for player in self.active_players:
            players_coordinates["#" + str(player.seat)] = [player.coordinates, player.last_coordinates]

        return players_coordinates

    def is_buyable(self, player: Player):
        if self.properties_data[player.coordinates]["owner"] is None and \
                self.properties_data[player.coordinates]["owner"] != "#1290":
            property_price = self.properties_data[player.coordinates]["price"]
            if player.account >= property_price > 0:
                return True
            else:
                return "auction"
        else:
            return False

    @staticmethod
    def is_player_pass_start(player: Player):
        if player.coordinates == "#0":
            return True
        else:
            actual_coordinates = int(player.coordinates[1:])
            last_coordinates = int(player.last_coordinates[1:])
            if actual_coordinates <= last_coordinates:
                return True
            else:
                return False

    def is_full_district(self, owner: Player, field: dict):
        district_name = field["district"]
        district_fields_num = self.fields_list[district_name]
        player_district_fields_num = owner.inventory.fields_num_by_district[district_name]
        if player_district_fields_num == district_fields_num:
            return True
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

    def move(self, player: Player, mode=0, field="#--", number=0):
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
            if field != "#--":
                player.coordinates = field
            else:
                player.coordinates = "#" + str(int(player.coordinates[1:]) + number)

            if player.last_coordinates == player.coordinates:
                player.last_coordinates = None

        if int(player.coordinates[1:]) > 39:
            coordinates = str(int(player.coordinates[1:]) - 40)
            player.coordinates = "#" + coordinates
            player.account += 200

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
        if player.account >= property_card["price"]:
            player.account -= property_card["price"]
            self.update_accounts([player])
            property_card["owner"] = "#" + str(player.seat)
            player.inventory.fields.append(player.coordinates)
            if property_card["district"] not in player.inventory.fields_num_by_district.keys():
                player.inventory.fields_num_by_district[property_card["district"]] = 1
            else:
                player.inventory.fields_num_by_district[property_card["district"]] += 1

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

                self.auction_winner.account -= self.auction_price
                property_card["owner"] = "#" + str(self.auction_winner.seat)
                self.auction_end()
            else:
                self.auction_player_turn = self.auction_participants[0]

        self.update_accounts([self.auction_winner])

    def auction_end(self):
        self.auction_field = None
        self.auction_participants = []
        self.auction_price = 0
        self.auction_player_turn = None
        self.auction_state = False

    def pay(self, sender: Player, recipient: Player, amount: int):
        field = self.properties_data[sender.coordinates]
        if self.is_full_district(recipient, field):
            amount *= 2
        if sender.account >= amount:
            sender.account -= amount
            recipient.account += amount
        else:
            pass  # Przekazanie do funkcji logs_frame w pliku render.js

        self.update_accounts([sender, recipient])

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
            player.account += event_card["value"]
        elif event_card["type"] == "pay":
            player.account -= event_card["value"]

        self.update_accounts([player])

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
                self.active_players.append(Player(player, seat, self.start_balance))

        if self.active_players:
            self.player_turn = choice(self.active_players)
