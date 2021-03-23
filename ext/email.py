from flask_mail import Mail, Message
from json import load

mail = Mail()

with open("db/secret.json", "r") as f:
    sender = load(f)["MAIL_DEFAULT_SENDER"]

def send_email(to, subject, template):
    msg = Message(
        subject,
        recipients=[to],
        html=template,
        sender=sender
    )

    mail.send(msg)
