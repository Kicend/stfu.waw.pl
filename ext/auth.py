from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin, LoginManager
from datetime import datetime

login = LoginManager()
db = SQLAlchemy()

class UserModel(UserMixin, db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(48), unique=True, nullable=False)
    username = db.Column(db.String(16), unique=True, nullable=False)
    password_hash = db.Column(db.String(), nullable=False)
    registered_on = db.Column(db.DateTime, nullable=False)
    admin = db.Column(db.Boolean, nullable=False, default=False)
    confirmed = db.Column(db.Boolean, nullable=False, default=False)
    confirmed_on = db.Column(db.DateTime, nullable=True, default=None)

    def __init__(self, email, username, confirmed=False, admin=False, confirmed_on=None):
        self.email = email
        self.username = username
        self.registered_on = datetime.now()
        self.confirmed = confirmed
        self.admin = admin
        self.confirmed_on = confirmed_on

    def get_id(self):
        return self.user_id

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


@login.user_loader
def load_user(user_id):
    return UserModel.query.get(int(user_id))
