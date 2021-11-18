from functools import wraps
from flask import flash, redirect, url_for, render_template
from flask_login import current_user


def check_confirmed(func):
    @wraps(func)
    def decorated_function(*args, **kwargs):
        if current_user.confirmed is False:
            flash("Proszę potwiedź swój adres email", "warning")
            return redirect(url_for("routes.unconfirmed"))
        return func(*args, **kwargs)

    return decorated_function


def admin_privileges(func):
    @wraps(func)
    def decorated_function(*args, **kwargs):
        if current_user.admin is False:
            return render_template("admin_privileges.html")
        return func(*args, **kwargs)

    return decorated_function
