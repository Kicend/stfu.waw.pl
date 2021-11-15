from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from json import load

db = SQLAlchemy()

with open("db/database_map.json", "r") as f:
    db_properties = load(f)

class RegistryModel(db.Model):
    __tablename__ = "registries"

    registry_id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, nullable=False)
    registry_name = db.Column(db.String(64), nullable=False)
    private = db.Column(db.Boolean, nullable=False, default=False)
    created_on = db.Column(db.DateTime, nullable=False, default=datetime.utcnow())
    permissions = db.relationship("RegistryPermissionModel", lazy=True)
    records = db.relationship("RegistryLeaderBoardRecordModel", lazy=True)

    def __init__(self, owner_id, registry_name, private):
        self.owner_id = owner_id
        self.registry_name = registry_name
        self.private = private

    def get_id(self):
        return self.registry_id

    def set_owner_id(self, owner_id):
        self.owner_id = owner_id

    def set_registry_name(self, registry_name):
        self.registry_name = registry_name

    def set_private_setting(self, state):
        self.private = state

class RegistryPermissionModel(db.Model):
    __tablename__ = "registries_permissions"

    permission_id = db.Column(db.Integer, primary_key=True)
    registry_id = db.Column(db.Integer, db.ForeignKey("registries.registry_id"), nullable=False)
    user_id = db.Column(db.Integer, nullable=False)
    permission_name = db.Column(db.String(64), nullable=False)
    permission_state = db.Column(db.Boolean, nullable=False, default=False)

    def __init__(self, registry_id, permission_name, permission_state):
        self.registry_id = registry_id
        self.permission_name = permission_name
        self.permission_state = permission_state

    def get_id(self):
        return self.permission_id

    def set_registry_id(self, registry_id):
        self.registry_id = registry_id

    def set_permission_state(self, state):
        self.permission_state = state

class RegistryLeaderBoardRecordModel(db.Model):
    __tablename__ = "registries_records"

    record_id = db.Column(db.Integer, primary_key=True)
    registry_id = db.Column(db.Integer, db.ForeignKey("registries.registry_id"), nullable=False)
    name = db.Column(db.String, nullable=False)
    first_place_counter = db.Column(db.Integer, nullable=False, default=0)
    second_place_counter = db.Column(db.Integer, nullable=False, default=0)
    third_place_counter = db.Column(db.Integer, nullable=False, default=0)
    number_of_games = db.Column(db.Integer, nullable=False, default=0)

    def __init__(self, registry_id, name, first_place_counter, second_place_counter, third_place_counter,
                 number_of_games):
        self.registry_id = registry_id
        self.name = name
        self.first_place_counter = first_place_counter
        self.second_place_counter = second_place_counter
        self.third_place_counter = third_place_counter
        self.number_of_games = number_of_games

    def get_id(self):
        return self.record_id

    def set_registry_id(self, registry_id):
        self.registry_id = registry_id

    def set_name(self, name):
        self.name = name

    def set_first_place_counter(self, first_place_counter):
        self.first_place_counter = first_place_counter

    def set_second_place_counter(self, second_place_counter):
        self.second_place_counter = second_place_counter

    def set_third_place_counter(self, third_place_counter):
        self.third_place_counter = third_place_counter

    def set_number_of_games(self, number_of_games):
        self.number_of_games = number_of_games

class RoleModel(db.Model):
    __tablename__ = "roles"

    role_id = db.Column(db.Integer, primary_key=True)
    role_name = db.Column(db.String(32), nullable=False)
    role_userRoles_relationship = db.relationship("UserRolesModel", lazy=True)

    def __init__(self, role_name):
        self.role_name = role_name

    def get_id(self):
        return self.role_id

    def set_role_name(self, role_name):
        self.role_name = role_name

class UserRolesModel(db.Model):
    __tablename__ = "users_roles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.role_id"), nullable=False)

    def __init__(self, user_id, role_id):
        self.user_id = user_id
        self.role_id = role_id

    def get_id(self):
        return self.id

    def set_user_id(self, user_id):
        self.user_id = user_id

    def set_role_id(self, role_id):
        self.role_id = role_id
