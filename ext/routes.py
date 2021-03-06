from flask import Blueprint, render_template, request, redirect, flash, url_for
from flask_login import current_user, login_user, logout_user, login_required
from datetime import datetime
from ext import models
from ext.auth import UserModel, db
from ext.token import generate_confirmation_token, confirm_token
from ext.email import send_email
from ext.decorators import check_confirmed, admin_privileges
from controllers.cr.edit_registry import edit_registry_controller

routes = Blueprint("routes", __name__, template_folder="templates")

@routes.route("/", methods=["GET", "POST"])
@routes.route("/index", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect("/dashboard")

    if request.method == "POST":
        email = request.form["email"]
        user = UserModel.query.filter_by(email=email).first()
        if user is not None and user.check_password(request.form["password"]):
            login_user(user)
            return redirect("/dashboard")
        elif user is None and request.form["password"] is not None:
            flash("Nie ma takiego adresu email w bazie! Czy chcesz się zarejestrować?")

    return render_template("index.html")


@routes.route("/dashboard")
@login_required
@check_confirmed
def dashboard():
    return render_template("dashboard.html")


@routes.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect("/unconfirmed")

    if request.method == "POST":
        email = request.form["email"]
        username = request.form["username"]
        password = request.form["password"]
        repeat_password = request.form["repeat_password"]

        if repeat_password != password and repeat_password is not None:
            flash("Hasła nie są identyczne!")

        else:
            if UserModel.query.filter_by(email=email).first():
                return "Ten adres email jest już używany!"

            # noinspection PyArgumentList
            user = UserModel(email=email, username=username)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()

            token = generate_confirmation_token(user.email)
            confirm_url = url_for("routes.confirm_email", token=token, _external=True)
            html = render_template("user/activate.html", confirm_url=confirm_url)
            subject = "Potwierdź rejestrację konta"
            send_email(user.email, subject, html)

            flash("Mail weryfikujący został wysłany na twoją skrzynkę.", "success")
            login_user(user)
            return redirect("/unconfirmed")

    return render_template("register.html")


@routes.route("/confirm/<token>")
@login_required
def confirm_email(token):
    email = None
    try:
        email = confirm_token(token)
    except:
        flash("Link weryfikacyjny jest nieprawidłowy lub przedawnił się!", "danger")

    user = UserModel.query.filter_by(email=email).first_or_404()
    if user.confirmed:
        flash("Konto jest już potwierdzone. Proszę o zalogowanie się.", "success")
    else:
        user.confirmed = True
        user.confirmed_on = datetime.now()
        db.session.add(user)
        db.session.commit()
        flash("Konto zostało potwierdzone.", "success")

    return redirect("/dashboard")


@routes.route("/resend")
@login_required
def resend_confirmation():
    token = generate_confirmation_token(current_user.email)
    confirm_url = url_for("routes.confirm_email", token=token, _external=True)
    html = render_template("user/activate.html", confirm_url=confirm_url)
    subject = "Potwierdź rejestrację konta"
    send_email(current_user.email, subject, html)
    flash("Nowy mail aktywacyjny został wysłany.", "success")

    return redirect(url_for("routes.unconfirmed"))


@routes.route("/unconfirmed")
@login_required
def unconfirmed():
    if current_user.confirmed:
        return redirect("/dashboard")
    flash("Proszę potwierdź swój adres email", "warning")

    return render_template("user/unconfirmed.html")


@routes.route("/logout")
def logout():
    logout_user()
    return redirect("/")

# Netopol routes
@routes.route("/game/<game_name>_lobby", methods=["GET", "POST"])
@login_required
def game_lobby(game_name):
    return render_template("{}/{}_lobby.html".format(game_name, game_name))


@routes.route("/game/netopol/<board_id>")
@login_required
def netopol_game(board_id):
    colors = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "brown", "grey", "white"]
    return render_template("netopol/netopol_session.html", board_id=board_id, slots=colors)


@routes.route("/game")
@login_required
def games():
    return render_template("games.html")


@routes.route("/game/<game_name>/event/error")
def game_error(game_name):
    return render_template("game_404.html", game_name=game_name.capitalize())


@routes.route("/game/<game_name>/event/kicked")
def game_kicked(game_name):
    return render_template("game_kicked.html", game_name=game_name.capitalize())

# Central registry routes
@routes.route("/cr")
@login_required
def central_registry():
    registries = models.RegistryModel.query.order_by(models.RegistryModel.registry_name).all()
    return render_template("cr/cr_index.html", registries=registries)


@routes.route("/cr/add_registry", methods=["GET", "POST"])
@login_required
@admin_privileges
def registry_add():
    if request.method == "POST":
        registry_name = request.form["registry_name"]
        try:
            registry_private = request.form["registry_private"]
        except KeyError:
            registry_private = False

        if models.RegistryModel.query.filter_by(registry_name=registry_name).first():
            return "Rejestr o tej nazwie istnieje!"

        registry = models.RegistryModel(current_user.user_id, registry_name, bool(registry_private))
        db.session.add(registry)
        db.session.commit()
        return redirect("/cr")

    return render_template("cr/add_registry.html")


@routes.route("/cr/registry/<registry_id>")
@login_required
def registry_view(registry_id):
    registry = models.RegistryModel.query.filter_by(registry_id=registry_id).first()
    return render_template("cr/registry_view.html", registry=registry)


@routes.route("/cr/edit/registry/<registry_id>", methods=["POST"])
@login_required
def edit_registry(registry_id):
    edit_registry_controller(registry_id)
    return redirect(f"/cr/registry/{registry_id}")


@routes.route("/game/memory")
@login_required
def memory_game():
    return render_template("memory/memory.html")

# Kanos routes
@routes.route("/kanos")
@login_required
def kanos():
    return render_template("kanos/kanos_lobby.html")

# Account management routes
@routes.route("/account/settings")
@login_required
def account_settings():
    return render_template("account/settings.html")
