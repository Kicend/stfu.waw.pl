from time import time

class Session:
    def __init__(self, board_id, op, game_name, max_slots):
        self.board_id = board_id
        self.op = op
        self.game_name = game_name
        self.created_at = time()
        self.private = False
        self.visible = False
        self.max_slots = 2
        self.players_seats = dict.fromkeys([i for i in range(1, max_slots + 1)], "--")
        self.players_list = []
        self.active_players = []
        self.state = "preparing"
