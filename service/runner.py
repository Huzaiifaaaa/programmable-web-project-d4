"""
Task runner.

Core logic for executing automated tasks against the ProBot API.
Handles single tasks, batch runs, and model comparisons.
"""

import uuid
import time
import logging
from datetime import datetime, timezone

from extensions import db
from models import TaskResult, ScheduledTask
from probot_client import ProbotClient

logger = logging.getLogger(__name__)

AVAILABLE_MODELS = [
    "gemini-3-flash-preview",
    "gemini-2.0-flash",
    "gemini-1.5-pro"
]

# Shared client instance — authenticated once and reused.
_client = ProbotClient()


def get_client():
    """Return an authenticated ProBot client, re-authenticating if needed."""
    if not _client.token:
        _client.register_service_account()
        _client.authenticate()
    return _client


def run_single_task(task_name, prompt, model_key, batch_id=None):
    """
    Run a single prompt against a specified model.

    Creates a temporary chat, sends the prompt, records the result,
    and cleans up the chat afterwards.

    Args:
        task_name (str): Human-readable name for this task.
        prompt (str): The message to send to the AI.
        model_key (str): Gemini model key to use.
        batch_id (str): Optional batch identifier for grouping results.

    Returns:
        TaskResult: The saved result object.
    """
    client = get_client()
    result = TaskResult(
        task_name=task_name,
        prompt=prompt,
        model_key=model_key,
        batch_id=batch_id,
        status="running"
    )
    db.session.add(result)
    db.session.commit()

    chat = client.create_chat()
    if not chat:
        result.status = "error"
        result.error = "Failed to create chat with ProBot API."
        db.session.commit()
        return result

    result.chat_key = chat.get("chat_key")

    start_time = time.time()
    conversation = client.send_message(result.chat_key, prompt, model_key)
    elapsed_ms = int((time.time() - start_time) * 1000)

    if conversation:
        result.response = conversation.get("response", "")
        result.response_time_ms = elapsed_ms
        result.status = "completed"
        logger.info("Task '%s' completed in %dms", task_name, elapsed_ms)
    else:
        result.status = "error"
        result.error = "No response received from ProBot API."
        logger.error("Task '%s' failed — no response.", task_name)

    client.delete_chat(result.chat_key)
    db.session.commit()
    return result


def run_batch(tasks):
    """
    Run a batch of tasks sequentially.

    Args:
        tasks (list): List of dicts with keys: task_name, prompt, model_key.

    Returns:
        tuple: (batch_id, list of TaskResult objects)
    """
    batch_id = str(uuid.uuid4())
    results = []
    for task in tasks:
        result = run_single_task(
            task_name=task.get("task_name", "Unnamed Task"),
            prompt=task["prompt"],
            model_key=task.get("model_key", AVAILABLE_MODELS[0]),
            batch_id=batch_id
        )
        results.append(result)
    return batch_id, results


def compare_models(prompt, models=None):
    """
    Run the same prompt across multiple models and return a comparison.

    Args:
        prompt (str): The prompt to send to each model.
        models (list): List of model keys. Defaults to all available models.

    Returns:
        tuple: (batch_id, list of TaskResult objects)
    """
    if not models:
        models = AVAILABLE_MODELS

    tasks = [
        {
            "task_name": f"Model comparison — {model}",
            "prompt": prompt,
            "model_key": model
        }
        for model in models
    ]
    return run_batch(tasks)


def run_scheduled_task(task_id):
    """
    Execute a scheduled task by its database ID.

    Args:
        task_id (int): The ID of the ScheduledTask to run.
    """
    from autoservice.app import create_app
    app = create_app()
    with app.app_context():
        task = db.session.get(ScheduledTask, task_id)
        if not task or not task.is_active:
            return
        logger.info("Running scheduled task: %s", task.task_name)
        run_single_task(
            task_name=task.task_name,
            prompt=task.prompt,
            model_key=task.model_key
        )
        task.last_run_at = datetime.now(timezone.utc)
        db.session.commit()