import webbrowser
from flask import Flask
from json import load
from ext.auth import db, login
from ext.routes import routes
from ext.email import mail

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
@app.before_first_request
def create_table():
    db.create_all()


if __name__ == "__main__":
    webbrowser.open("http://127.0.0.1:5000")
    app.run()
