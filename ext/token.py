from itsdangerous import URLSafeTimedSerializer
from json import load

with open("db/secret.json", "r") as f:
    secrets = load(f)


def generate_confirmation_token(email):
    serializer = URLSafeTimedSerializer(secrets["SECRET_KEY"])
    return serializer.dumps(email, salt=secrets["SECURITY_PASSWORD_SALT"])


def confirm_token(token, expiration=3600):
    serializer = URLSafeTimedSerializer(secrets["SECRET_KEY"])
    try:
        email = serializer.loads(
            token,
            salt=secrets["SECURITY_PASSWORD_SALT"],
            max_age=expiration
        )
    except:
        return False

    return email
