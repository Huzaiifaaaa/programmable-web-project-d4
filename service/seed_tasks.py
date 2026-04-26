"""
Seed script — populates the database with predefined demo tasks.

Run once after setup:
    python seed_tasks.py
"""

from app import create_app
from extensions import db
from models import ScheduledTask

DEMO_TASKS = [
    {
        "task_name": "Daily greeting",
        "prompt": "Generate a short, friendly greeting message for the start of the day.",
        "model_key": "gemini-3-flash-preview",
        "interval_seconds": 86400
    },
    {
        "task_name": "Hourly AI tip",
        "prompt": "Share one practical tip for using AI tools more effectively in daily work.",
        "model_key": "gemini-2.0-flash",
        "interval_seconds": 3600
    },
    {
        "task_name": "Weekly summary prompt",
        "prompt": "Write a brief motivational summary for the end of a productive work week.",
        "model_key": "gemini-1.5-pro",
        "interval_seconds": 604800
    }
]


def seed():
    """Insert demo scheduled tasks if they don't already exist."""
    app = create_app()
    with app.app_context():
        for task_data in DEMO_TASKS:
            exists = ScheduledTask.query.filter_by(
                task_name=task_data["task_name"]
            ).first()
            if not exists:
                task = ScheduledTask(**task_data)
                db.session.add(task)
        db.session.commit()
        print(f"Seeded {len(DEMO_TASKS)} scheduled tasks.")


if __name__ == "__main__":
    seed()
    