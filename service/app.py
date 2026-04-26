"""
Automated AI Interaction Service — Flask application factory.

Creates and configures the Flask app, database, CORS, scheduler,
and registers all API blueprints.
"""

import os
import logging
from flask import Flask
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

from extensions import db
from routes import bp

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s"
)

scheduler = BackgroundScheduler()


def create_app():
    """
    Create and configure the Flask application.

    Returns:
        Flask: The configured application instance.
    """
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///autoservice.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    db.init_app(app)

    app.register_blueprint(bp)

    with app.app_context():
        db.create_all()
        _start_scheduler(app)

    return app


def _start_scheduler(app):
    """
    Start the background scheduler for periodic tasks.
    Loads all active scheduled tasks from the database on startup.
    """
    from models import ScheduledTask
    from runner import run_scheduled_task

    if scheduler.running:
        return

    tasks = ScheduledTask.query.filter_by(is_active=True).all()
    for task in tasks:
        scheduler.add_job(
            func=run_scheduled_task,
            args=[task.id],
            trigger="interval",
            seconds=task.interval_seconds,
            id=f"scheduled_{task.id}",
            replace_existing=True
        )

    scheduler.start()
    logging.getLogger(__name__).info(
        "Scheduler started with %d active tasks.", len(tasks)
    )