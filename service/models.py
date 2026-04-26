"""
Database models for the Automated AI Interaction Service.

Stores task results, batch runs, and model comparison data locally in SQLite.
"""

from datetime import datetime, timezone
from extensions import db


class TaskResult(db.Model):
    """Stores the result of a single automated task run."""

    __tablename__ = "task_results"

    id = db.Column(db.Integer, primary_key=True)
    task_name = db.Column(db.String(255), nullable=False)
    prompt = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text, nullable=True)
    model_key = db.Column(db.String(100), nullable=False)
    chat_key = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(50), default="pending")
    error = db.Column(db.Text, nullable=True)
    response_time_ms = db.Column(db.Integer, nullable=True)
    batch_id = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        """Serialize to dictionary for JSON responses."""
        return {
            "id": self.id,
            "task_name": self.task_name,
            "prompt": self.prompt,
            "response": self.response,
            "model_key": self.model_key,
            "chat_key": self.chat_key,
            "status": self.status,
            "error": self.error,
            "response_time_ms": self.response_time_ms,
            "batch_id": self.batch_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class ScheduledTask(db.Model):
    """Stores scheduled task configurations."""

    __tablename__ = "scheduled_tasks"

    id = db.Column(db.Integer, primary_key=True)
    task_name = db.Column(db.String(255), nullable=False)
    prompt = db.Column(db.Text, nullable=False)
    model_key = db.Column(db.String(100), nullable=False)
    interval_seconds = db.Column(db.Integer, default=3600)
    is_active = db.Column(db.Boolean, default=True)
    last_run_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        """Serialize to dictionary for JSON responses."""
        return {
            "id": self.id,
            "task_name": self.task_name,
            "prompt": self.prompt,
            "model_key": self.model_key,
            "interval_seconds": self.interval_seconds,
            "is_active": self.is_active,
            "last_run_at": self.last_run_at.isoformat() if self.last_run_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }