import os
import smtplib
from email.message import EmailMessage

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")


def send_otp_email(to_email: str, otp: str, name: str = "") -> bool:
    try:
        if not EMAIL_USER or not EMAIL_PASSWORD:
            print("Email credentials missing")
            return False

        msg = EmailMessage()
        msg["From"] = EMAIL_USER
        msg["To"] = to_email
        msg["Subject"] = "Your OTP for Crop Suitability"

        msg.set_content(
            f"""
Hello {name or "User"},

Your OTP is: {otp}

This OTP is valid for a short time.
Do not share it with anyone.

Thanks,
Crop Suitability Team
"""
        )

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.send_message(msg)

        return True

    except Exception as e:
        print("Email send failed:", e)
        return False