# Copilot / AI Coding Agent Instructions

Purpose: give immediate, actionable context so an AI coding agent can be productive in this repository.

Big picture
- Monorepo with three main runtime pieces:
  - Django backend: code lives in `backend/` (entry: [backend/manage.py](backend/manage.py)).
  - React frontend (Vite): in `frontend/` (entry and scripts in [frontend/package.json](frontend/package.json)).
  - Node microservice for PDFs: `pdf_service/` (see [pdf_service/src/server.js](pdf_service/src/server.js) and [pdf_service/S3_UPLOAD_GUIDE.md](pdf_service/S3_UPLOAD_GUIDE.md)).
  - Orchestration: `docker-compose.yml` for full-stack local runs and `start-services.ps1` helper for Windows.

Key architecture & integration points
- Async tasks: Celery configured in [backend/inzighted/celery.py](backend/inzighted/celery.py). Start workers from `backend/` with `celery -A inzighted worker -l info`.
- Uploads and storage: `uploads/` and `staticfiles/` used by Django; `pdf_service` contains S3-related code and a guide.
- Graph and analytics code: heavy domain logic under [backend/exam/graph_utils/](backend/exam/graph_utils/) — useful examples: `create_graph.py`, `retrieve_*` modules.
- Data ingestion: CSV/seed scripts follow `populate_*` naming in [backend/exam/ingestions/](backend/exam/ingestions/) (e.g., `populate_analysis.py`).
- LLM-related helpers: look in [backend/exam/llm_call/](backend/exam/llm_call/) for decorators and call patterns used across generators.

Developer workflows (how to run & test)
- Backend (local, Windows):
  - Create venv and install: `python -m venv .venv && .venv\Scripts\activate && pip install -r backend/requirements.txt`
  - DB migrations + run: `cd backend && python manage.py migrate && python manage.py runserver`
  - Tests: `cd backend && python manage.py test` (or `pytest backend/` if pytest installed).
- Frontend:
  - `cd frontend && npm install && npm run dev` (Vite dev server). Build: `npm run build`.
- PDF microservice:
  - `cd pdf_service && npm install && npm start` (see package.json for exact script).
- Full stack with Docker: `docker-compose up --build` from repo root. On Windows the `start-services.ps1` script may be helpful.

Project-specific conventions and patterns
- Naming: ingestion scripts are `populate_*`; tests are `test_*.py`; domain helpers use descriptive snake_case (see `graph_utils` files).
- Modular domain layers: high-level orchestration in `exam/insight/` and `exam/graph_utils/`; prefer adding new analysis logic under these folders rather than scattering business rules in views.
- LLM helpers: follow patterns in `llm_call/` (use existing decorators for consistent rate-limiting, logging and error handling).
- Data flow: ingestion -> models (in `backend/exam/models/`) -> graph_utils -> insight generators -> frontend APIs.

Files to inspect first (quick tour)
- [backend/manage.py](backend/manage.py)
- [backend/inzighted/settings.py](backend/inzighted/settings.py)
- [backend/inzighted/urls.py](backend/inzighted/urls.py)
- [backend/exam/graph_utils/create_graph.py](backend/exam/graph_utils/create_graph.py)
- [backend/exam/ingestions/populate_analysis.py](backend/exam/ingestions/populate_analysis.py)
- [backend/exam/llm_call/decorators.py](backend/exam/llm_call/decorators.py)
- [frontend/package.json](frontend/package.json)
- [pdf_service/S3_UPLOAD_GUIDE.md](pdf_service/S3_UPLOAD_GUIDE.md)
- [docker-compose.yml](docker-compose.yml)

When submitting changes or generating code
- Prefer minimal, focused edits. Most business logic belongs in `backend/exam/*` or `backend/inzighted/*`.
- When adding endpoints, update `backend/inzighted/urls.py` and wire views under `backend/exam/views/`.
- For async work, prefer Celery tasks and declare them in `exam/services/` or `inzighted/celery.py` patterns.

What this agent cannot assume
- No guaranteed local DB or environment — prefer to document commands and rely on `docker-compose` for full-stack reproducibility.
- Do not assume external credentials (S3, DB). Refer to `pdf_service/S3_UPLOAD_GUIDE.md` and `backend/inzighted/settings.py` for expected env vars.

If something is unclear
- Ask a short, targeted question referencing a file (e.g., "Which DB does `settings.py` point to in dev?").

Ready for feedback: tell me which sections you want expanded or any internal conventions I missed.
