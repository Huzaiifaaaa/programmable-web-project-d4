# ProBot Automated AI Interaction Service
**PWP SPRING 2026 — Auxiliary Service**

> A standalone Flask REST API that programmatically consumes the ProBot API to run automated tasks, batch prompt evaluations, model comparisons, and scheduled AI interactions — without any direct user involvement.

### Group Information
* **Student 1:** Muhammad Huzaifa (Muhammad.Huzaifa@student.oulu.fi)
* **Student 2:** Safi Shah (Safi.Shah@student.oulu.fi)
* **Student 3:** Zhenfei Sun (Zhenfei.Sun@student.oulu.fi)

---

## 1. Idea and Justification

### What the service does

The Automated AI Interaction Service is a backend service that programmatically interacts with the ProBot API without any direct user involvement. It can:

- **Run single automated tasks** — submit a predefined prompt to a specified model and store the result
- **Run batch tasks** — execute multiple prompts across different models in one request
- **Compare AI models** — send the same prompt to multiple Gemini models and return a side-by-side comparison of responses and response times
- **Schedule recurring tasks** — define tasks that run automatically at a specified interval using a background scheduler
- **Store and query results** — all task results are persisted locally in SQLite and queryable via REST endpoints

### Why this service is necessary

**Why not just do this directly on the ProBot API server?**

1. **Separation of concerns** — The ProBot API is designed for interactive user-driven conversations. Running batch jobs, scheduled tasks, and model evaluation pipelines directly on the API server would mix two fundamentally different use cases in the same codebase.

2. **Resource isolation** — Batch and scheduled tasks can be computationally heavy. Running them on the API server could degrade performance for interactive users. This service runs independently on its own process and port.

3. **Independent data storage** — Task results, comparison data, and scheduling configurations are stored locally in this service's own database — not in the ProBot API's database. This avoids polluting the main API's data with automated test data.

4. **Demonstrates API as a platform** — The ProBot API is not just an interactive chat interface. This service proves the API can serve as a backend platform for other services and automated integrations — a key property of well-designed REST APIs.

5. **Model evaluation is not a user feature** — Comparing Gemini models across the same prompt is an engineering/evaluation concern, not something end users do interactively. It belongs in a separate tool.

---

## 2. Overview

The service acts as an **automated client** of the ProBot API. It authenticates itself using a dedicated service account, creates temporary chat sessions programmatically, submits messages, retrieves responses, and stores the results.

```
┌─────────────────────────────────────────────────────────┐
│         Automated AI Interaction Service                 │
│                      :6000                              │
│                                                         │
│  ┌─────────────┐    ┌───────────┐    ┌──────────────┐  │
│  │  REST API   │───▶│  Runner   │───▶│ ProBot Client│  │
│  │  (Flask)    │    │  (tasks)  │    │  (requests)  │  │
│  └─────────────┘    └─────┬─────┘    └──────┬───────┘  │
│                           │                  │          │
│  ┌─────────────┐    ┌─────▼─────┐           │          │
│  │  Scheduler  │───▶│  SQLite   │           │          │
│  │ (APScheduler│    │  (results)│           │          │
│  └─────────────┘    └───────────┘           │          │
└──────────────────────────────────────────────┼──────────┘
                                               ▼
                                    ┌─────────────────────┐
                                    │   ProBot REST API   │
                                    │      :5000          │
                                    │  /api/v1/login/     │
                                    │  /api/v1/chats/     │
                                    │  /api/v1/chats/*/   │
                                    │    messages/        │
                                    └─────────────────────┘
```

### ProBot API endpoints consumed

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/v1/signup/` | Register the service account on first run |
| `POST` | `/api/v1/login/` | Authenticate and obtain JWT |
| `POST` | `/api/v1/chats/` | Create a temporary chat for each task |
| `POST` | `/api/v1/chats/<key>/messages/` | Submit the task prompt |
| `GET` | `/api/v1/chats/<key>/messages/` | Retrieve conversation data |
| `DELETE` | `/api/v1/chats/<key>/` | Clean up after each task |

---

## 3. Communication Diagram

```
  ┌──────────────┐          ┌───────────────────────┐          ┌──────────────────┐
  │  API Client  │          │  AutoService (:6000)   │          │  ProBot (:5000)  │
  │ (curl/React) │          │                        │          │                  │
  └──────┬───────┘          └───────────┬────────────┘          └────────┬─────────┘
         │                              │                                  │
         │  POST /api/v1/run/task       │                                  │
         │ ────────────────────────────▶│                                  │
         │  (REST/HTTP/JSON)            │  POST /api/v1/login/             │
         │                              │ ────────────────────────────────▶│
         │                              │  ◀── 200 {token}  (REST/HTTP)   │
         │                              │                                  │
         │                              │  POST /api/v1/chats/             │
         │                              │ ────────────────────────────────▶│
         │                              │  ◀── 201 {chat_key} (REST/HTTP) │
         │                              │                                  │
         │                              │  POST /chats/<key>/messages/     │
         │                              │ ────────────────────────────────▶│
         │                              │  ◀── 201 {response} (REST/HTTP) │
         │                              │                                  │
         │                              │  DELETE /api/v1/chats/<key>/     │
         │                              │ ────────────────────────────────▶│
         │                              │  ◀── 200 OK       (REST/HTTP)   │
         │                              │                                  │
         │  ◀── 201 {result}            │  [stores result in SQLite]       │
         │  (REST/HTTP/JSON)            │                                  │
         │                              │                                  │
```

**Communication types:**
- Client ↔ AutoService: **REST over HTTP**, JSON request/response bodies
- AutoService ↔ ProBot API: **REST over HTTP**, JSON, Bearer JWT authentication
- AutoService ↔ SQLite: **SQLAlchemy ORM**, local file I/O

---

## 4. API Design

The service exposes a **REST API** over HTTP on port 6000. REST was chosen because:
- It matches the architecture of the ProBot API, making the system consistent
- It is stateless, simple to test with curl, and easy to integrate with the React client
- All data is exchanged as JSON, which is universally supported

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Service health check |
| `GET` | `/api/v1/models` | List available AI models |
| `POST` | `/api/v1/run/task` | Run a single task |
| `POST` | `/api/v1/run/batch` | Run a batch of tasks |
| `POST` | `/api/v1/models/compare` | Compare models on the same prompt |
| `GET` | `/api/v1/results` | List all results (with filters) |
| `GET` | `/api/v1/results/<id>` | Get a specific result |
| `DELETE` | `/api/v1/results/<id>` | Delete a result |
| `GET` | `/api/v1/scheduled` | List scheduled tasks |
| `POST` | `/api/v1/scheduled` | Create a scheduled task |
| `DELETE` | `/api/v1/scheduled/<id>` | Delete a scheduled task |

### Request / Response format

**POST /api/v1/run/task**
```json
// Request
{
  "task_name": "Sentiment test",
  "prompt": "Explain what makes a good API design.",
  "model_key": "gemini-3-flash-preview"
}

// Response 201
{
  "result": {
    "id": 1,
    "task_name": "Sentiment test",
    "prompt": "Explain what makes a good API design.",
    "response": "A good API design is...",
    "model_key": "gemini-3-flash-preview",
    "status": "completed",
    "response_time_ms": 1423,
    "created_at": "2026-04-26T10:00:00"
  }
}
```

**POST /api/v1/models/compare**
```json
// Request
{
  "prompt": "What is the capital of Finland?",
  "models": ["gemini-3-flash-preview", "gemini-2.0-flash"]
}

// Response 201
{
  "batch_id": "uuid-...",
  "prompt": "What is the capital of Finland?",
  "models_compared": ["gemini-3-flash-preview", "gemini-2.0-flash"],
  "results": [
    { "model_key": "gemini-3-flash-preview", "response": "Helsinki.", "response_time_ms": 800 },
    { "model_key": "gemini-2.0-flash", "response": "The capital of Finland is Helsinki.", "response_time_ms": 1100 }
  ]
}
```

---

## 5. Installation and Setup

### Prerequisites

- Python 3.9+
- ProBot API running at `http://localhost:5000` or 'https://pwpapi.cloverta.top/'
- A registered user account on ProBot for the service (handled automatically)

### Step 1 — Clone the repository

```bash
git clone https://github.com/Huzaiifaaaa/programmable-web-project-d4.git
cd service
```

### Step 2 — Create virtual environment

```bash
python3.11 -m venv venv
source venv/bin/activate
```

### Step 3 — Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4 — Configure environment

```bash
cp .env.example .env
nano .env
```

```env
PROBOT_API_URL=http://localhost:5000/api/v1
PROBOT_EMAIL=autoservice@probot.fi
PROBOT_PASSWORD=your-secure-password
PORT=6000
APP_ENV=development
```

### Step 5 — Seed demo tasks (optional)

```bash
python seed_tasks.py
```

---

## 6. Running the Service

```bash
python run.py
```

The service starts at `http://localhost:6000`.

On first run, it will automatically:
1. Register the service account with ProBot (`PROBOT_EMAIL`)
2. Authenticate and obtain a JWT token
3. Start the background scheduler for any active scheduled tasks

---

## 7. Sample Requests

### Health check
```bash
curl http://localhost:6000/api/v1/health
```

### Run a single task
```bash
curl -X POST http://localhost:6000/api/v1/run/task \
  -H "Content-Type: application/json" \
  -d '{"task_name": "Test", "prompt": "What is 2+2?", "model_key": "gemini-3-flash-preview"}'
```

### Run a batch
```bash
curl -X POST http://localhost:6000/api/v1/run/batch \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {"task_name": "Task 1", "prompt": "What is Python?", "model_key": "gemini-3-flash-preview"},
      {"task_name": "Task 2", "prompt": "What is Flask?", "model_key": "gemini-2.0-flash"}
    ]
  }'
```

### Compare models
```bash
curl -X POST http://localhost:6000/api/v1/models/compare \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain REST APIs in one sentence."}'
```

### Get all results
```bash
curl http://localhost:6000/api/v1/results
curl "http://localhost:6000/api/v1/results?status=completed&model_key=gemini-3-flash-preview"
```

### Create a scheduled task
```bash
curl -X POST http://localhost:6000/api/v1/scheduled \
  -H "Content-Type: application/json" \
  -d '{
    "task_name": "Hourly tip",
    "prompt": "Give me a productivity tip.",
    "model_key": "gemini-3-flash-preview",
    "interval_seconds": 3600
  }'
```

---

### Key design decisions

**`probot_client.py`** — All communication with ProBot is isolated in one class. This makes it easy to swap the ProBot API URL or add token refresh logic without touching the rest of the codebase.

**`runner.py`** — Task execution logic is fully separated from the HTTP layer. `run_single_task()`, `run_batch()`, and `compare_models()` can be called from both API routes and the scheduler.

**`APScheduler`** — A background thread scheduler that runs alongside Flask. Scheduled tasks are loaded from the database on startup, so they survive service restarts.

**Temporary chats** — Each task creates a fresh chat session, sends the prompt, stores the result, and immediately deletes the chat. This keeps the ProBot API clean and avoids accumulating test data.

---

## 9. Code Quality and Linting

This project uses **PyLint** for code quality checks.

```bash
pylint service/
```

All functions are documented with docstrings. Maximum line length is 100 characters.