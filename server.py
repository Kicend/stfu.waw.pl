from flask import Flask, render_template, request

from webbrowser import open

app = Flask(__name__)

sessions_list = {}


@app.route("/")
@app.route("/index.html", methods=["GET", "POST"])
def root():
    return render_template("index.html")


@app.route("/netopol_lobby.html", methods=["GET", "POST"])
def netopol_lobby():
    if request.method == "POST":
        pass
    return render_template("netopol/netopol_lobby.html", sessions=sessions_list)


@app.route("/game.html/<board_id>")
def game(board_id):
    return render_template("netopol/netopol_session.html", board_id=board_id)


if __name__ == "__main__":
    open("http://127.0.0.1:5000")
    app.run()
