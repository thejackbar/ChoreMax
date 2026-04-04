"""Simple async email sending via SMTP."""

import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from config import settings


def _send_sync(to: str, subject: str, html: str):
    """Send email synchronously (called in thread pool)."""
    if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASS]):
        return

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.SMTP_USER
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.send_message(msg)


async def send_email(to: str, subject: str, html: str):
    """Send email without blocking the request."""
    try:
        await asyncio.get_event_loop().run_in_executor(None, _send_sync, to, subject, html)
    except Exception as e:
        print(f"[email] Failed to send to {to}: {e}")


async def notify_waitlist_signup(name: str, email: str, feature: str):
    """Notify admin about a new waitlist signup."""
    if not settings.NOTIFY_EMAIL:
        return

    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #c4724e;">New Waitlist Signup!</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #666;">Name</td>
                <td style="padding: 8px 0;">{name}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #666;">Email</td>
                <td style="padding: 8px 0;"><a href="mailto:{email}">{email}</a></td>
            </tr>
            <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #666;">Interested in</td>
                <td style="padding: 8px 0;">{feature}</td>
            </tr>
        </table>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 13px;">ChoreMax Waitlist Notification</p>
    </div>
    """

    await send_email(settings.NOTIFY_EMAIL, f"ChoreMax Waitlist: {name} signed up!", html)
