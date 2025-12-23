# Inzighted — tamilnadu_version_b2b

Minimal monorepo README: quick reference for developers and AI coding agents.

Overview
- Monorepo containing three main runtime pieces:
  - Backend: Django app in `backend/` (entry: `backend/manage.py`).
  - Frontend: React (Vite) in `frontend/`.
  - PDF microservice: Node service in `pdf_service/`.
  - Compose-based local orchestration: `docker-compose.yml`.

Quick start (Windows)
- Backend (venv):
```
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py runserver
```
- Frontend (Vite):
```
cd frontend
npm install
npm run dev
```
- PDF microservice:
```
cd pdf_service
npm install
npm start
```
- Full stack with Docker:
```
docker-compose up --build
```

Testing
- Backend tests: `cd backend && python manage.py test` (or `pytest backend/`).

Important folders & files
- `backend/` — Django project and app code. Key files: `backend/manage.py`, `backend/inzighted/settings.py`, `backend/inzighted/urls.py`.
- `backend/exam/graph_utils/` — core analytics and graph code (e.g., `create_graph.py`).
- `backend/exam/ingestions/` — seed scripts named `populate_*`.
- `backend/exam/llm_call/` — LLM helper decorators and patterns.
- `frontend/` — React + Vite app; see `frontend/package.json` for scripts.
- `pdf_service/` — Node service that uploads/generates PDFs; see `pdf_service/S3_UPLOAD_GUIDE.md` for S3 integration steps.
- `uploads/` and `staticfiles/` — runtime artifacts used by Django.

Conventions & notes for contributors
- Place analysis/business logic under `backend/exam/*` (e.g., `graph_utils`, `insight`).
- Ingestion scripts follow `populate_*` naming and can be executed from `backend/`.
- For async/background work use Celery (configured in `backend/inzighted/celery.py`).
- Do not commit secrets; environment variables for DB/S3 are expected and documented in relevant files.

If you are an AI coding agent
- See `.github/copilot-instructions.md` for a concise agent-specific guide and pointers to files and commands.

Need more detail?
- Tell me which section to expand: architecture, run/debug commands, CI, or examples.
