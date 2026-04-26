"""
API routes for the Automated AI Interaction Service.

Exposes endpoints for running tasks, batches, model comparisons,
scheduled tasks, and retrieving results.
"""

from flask import Blueprint, jsonify, request
from extensions import db
from models import TaskResult, ScheduledTask
from runner import (
    run_single_task,
    run_batch,
    compare_models,
    AVAILABLE_MODELS
)

bp = Blueprint("api", __name__, url_prefix="/api/v1")


# ── Health check ─────────────────────────────────────────────

@bp.route("/health", methods=["GET"])
def health():
    """Return service health status."""
    return jsonify({"status": "ok", "service": "probot-autoservice"}), 200


# ── Models ───────────────────────────────────────────────────

@bp.route("/models", methods=["GET"])
def list_models():
    """Return list of available AI models."""
    return jsonify({"models": AVAILABLE_MODELS}), 200


# ── Single task ──────────────────────────────────────────────

@bp.route("/run/task", methods=["POST"])
def run_task():
    """
    Run a single automated prompt against a specified model.

    Request body:
        task_name (str): Name for this task.
        prompt (str): Message to send to the AI.
        model_key (str): Gemini model key (optional, defaults to first model).

    Returns:
        201: Task result object.
        400: Missing required fields.
    """
    data = request.get_json()
    if not data or not data.get("prompt"):
        return jsonify({"error": "prompt is required"}), 400

    result = run_single_task(
        task_name=data.get("task_name", "Manual Task"),
        prompt=data["prompt"],
        model_key=data.get("model_key", AVAILABLE_MODELS[0])
    )
    return jsonify({"result": result.to_dict()}), 201


# ── Batch run ─────────────────────────────────────────────────

@bp.route("/run/batch", methods=["POST"])
def run_batch_endpoint():
    """
    Run a batch of tasks against the ProBot API.

    Request body:
        tasks (list): List of task objects, each with:
            - task_name (str)
            - prompt (str, required)
            - model_key (str, optional)

    Returns:
        201: Batch ID and list of results.
        400: Missing or invalid tasks list.
    """
    data = request.get_json()
    tasks = data.get("tasks") if data else None
    if not tasks or not isinstance(tasks, list):
        return jsonify({"error": "tasks must be a non-empty list"}), 400

    for i, task in enumerate(tasks):
        if not task.get("prompt"):
            return jsonify({"error": f"Task at index {i} is missing a prompt"}), 400

    batch_id, results = run_batch(tasks)
    return jsonify({
        "batch_id": batch_id,
        "count": len(results),
        "results": [r.to_dict() for r in results]
    }), 201


# ── Model comparison ─────────────────────────────────────────

@bp.route("/models/compare", methods=["POST"])
def compare_models_endpoint():
    """
    Run the same prompt across multiple models and compare results.

    Request body:
        prompt (str): The prompt to evaluate.
        models (list): List of model keys (optional, defaults to all models).

    Returns:
        201: Batch ID and list of results per model.
        400: Missing prompt.
    """
    data = request.get_json()
    if not data or not data.get("prompt"):
        return jsonify({"error": "prompt is required"}), 400

    models = data.get("models", AVAILABLE_MODELS)
    batch_id, results = compare_models(
        prompt=data["prompt"],
        models=models
    )
    return jsonify({
        "batch_id": batch_id,
        "prompt": data["prompt"],
        "models_compared": models,
        "results": [r.to_dict() for r in results]
    }), 201


# ── Results ──────────────────────────────────────────────────

@bp.route("/results", methods=["GET"])
def list_results():
    """
    Retrieve all task results, with optional filters.

    Query params:
        status (str): Filter by status (completed, error, running).
        model_key (str): Filter by model.
        batch_id (str): Filter by batch ID.
        limit (int): Max results to return (default 50).

    Returns:
        200: List of result objects.
    """
    query = TaskResult.query

    status = request.args.get("status")
    model_key = request.args.get("model_key")
    batch_id = request.args.get("batch_id")
    limit = int(request.args.get("limit", 50))

    if status:
        query = query.filter_by(status=status)
    if model_key:
        query = query.filter_by(model_key=model_key)
    if batch_id:
        query = query.filter_by(batch_id=batch_id)

    results = query.order_by(TaskResult.created_at.desc()).limit(limit).all()
    return jsonify({
        "count": len(results),
        "results": [r.to_dict() for r in results]
    }), 200


@bp.route("/results/<int:result_id>", methods=["GET"])
def get_result(result_id):
    """
    Retrieve a specific task result by ID.

    Returns:
        200: Result object.
        404: Result not found.
    """
    result = db.session.get(TaskResult, result_id)
    if not result:
        return jsonify({"error": "Result not found"}), 404
    return jsonify({"result": result.to_dict()}), 200


@bp.route("/results/<int:result_id>", methods=["DELETE"])
def delete_result(result_id):
    """
    Delete a task result by ID.

    Returns:
        200: Deletion confirmed.
        404: Result not found.
    """
    result = db.session.get(TaskResult, result_id)
    if not result:
        return jsonify({"error": "Result not found"}), 404
    db.session.delete(result)
    db.session.commit()
    return jsonify({"message": "Result deleted", "id": result_id}), 200


# ── Scheduled tasks ──────────────────────────────────────────

@bp.route("/scheduled", methods=["GET"])
def list_scheduled():
    """Return all scheduled task configurations."""
    tasks = ScheduledTask.query.all()
    return jsonify({
        "count": len(tasks),
        "tasks": [t.to_dict() for t in tasks]
    }), 200


@bp.route("/scheduled", methods=["POST"])
def create_scheduled():
    """
    Create a new scheduled task.

    Request body:
        task_name (str): Name for this task.
        prompt (str): Prompt to send on each run.
        model_key (str): Model to use.
        interval_seconds (int): How often to run (default 3600).

    Returns:
        201: Created scheduled task.
        400: Missing required fields.
    """
    data = request.get_json()
    if not data or not data.get("prompt"):
        return jsonify({"error": "prompt is required"}), 400

    task = ScheduledTask(
        task_name=data.get("task_name", "Scheduled Task"),
        prompt=data["prompt"],
        model_key=data.get("model_key", AVAILABLE_MODELS[0]),
        interval_seconds=data.get("interval_seconds", 3600),
        is_active=True
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({"task": task.to_dict()}), 201


@bp.route("/scheduled/<int:task_id>", methods=["DELETE"])
def delete_scheduled(task_id):
    """
    Delete a scheduled task by ID.

    Returns:
        200: Deletion confirmed.
        404: Task not found.
    """
    task = db.session.get(ScheduledTask, task_id)
    if not task:
        return jsonify({"error": "Scheduled task not found"}), 404
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Scheduled task deleted", "id": task_id}), 200