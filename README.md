# Inzighted — Tamil Nadu B2B

AI-powered educational analytics platform for Tamil Nadu schools. Provides role-based dashboards with AI-generated SWOT analysis, performance insights, checkpoints, and WhatsApp notifications for educators, students, and institution managers.

---

## Monorepo Structure

```
├── backend/          Django 5.1 + DRF (Python 3.11)
├── frontend/         React 19 + Vite 6 + Tailwind CSS
├── pdf_service/      Node.js + Puppeteer PDF microservice
├── nginx/            Reverse proxy config
├── docker-compose.yml
└── docs/             Feature & deployment documentation
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 5.1, DRF, Python 3.11 |
| Frontend | React 19, Vite 6, Tailwind 3.4, TanStack Query 5 |
| Primary DB | PostgreSQL |
| Graph DB | Neo4j (knowledge graph writes during ingestion) |
| Task Queue | Celery 5.3 + Redis 7 |
| PDF Service | Node.js + Puppeteer + Ghostscript |
| Auth | JWT (simplejwt), role-based (Student / Educator / Manager / Admin) |
| LLM | Google Gemini, Mistral AI, LangChain |
| Storage | AWS S3 (django-storages + boto3) |
| Monitoring | Sentry, structured logging |

---

## Quick Start

### Full stack (Docker)

```bash
docker-compose up --build
```

- Frontend: `http://localhost` (nginx)
- API: `http://localhost/api/`
- PDF service: `http://localhost/pdf/`

### Local development (Windows)

**Backend:**
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py runserver
```

**Celery worker** (separate terminal, from repo root):
```bash
.venv\Scripts\activate
celery -A inzighted worker -l info --workdir backend
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**PDF service:**
```bash
cd pdf_service
npm install
npm start
```

On Windows, `start-services.ps1` can start all services from a single script.

---

## Key Directories

| Path | Purpose |
|------|---------|
| `backend/exam/models/` | 20 ORM models (student, educator, result, swot, checkpoints, etc.) |
| `backend/exam/views/` | API endpoints by role (auth, student, educator, institution, whatsapp, upload) |
| `backend/exam/services/` | Celery tasks (whatsapp, checkpoint, misconception, PDF trigger) |
| `backend/exam/graph_utils/` | Neo4j graph creation + PostgreSQL SWOT/metrics queries |
| `backend/exam/insight/` | SWOT, checkpoint, performance insight generators |
| `backend/exam/llm_call/` | LLM call wrappers and prompt logic |
| `backend/exam/ingestions/` | Seed scripts (`populate_*`) |
| `backend/inzighted/` | Django project config (settings, urls, celery, logging) |
| `frontend/src/auth/` | Login/register pages per role |
| `frontend/src/dashboards/` | Role-specific dashboards (student, educator, institution) |
| `frontend/src/components/` | Shared UI (Radix, Magic UI, WhatsApp components) |
| `frontend/src/hooks/` | Custom React hooks |
| `pdf_service/src/` | PDF controller, service, compression, S3 upload |

---

## Environment Variables

Copy and fill in:
- `.env.save` → `.env` (backend + general)
- `.env.whatsapp.example` → `.env` (WhatsApp credentials)
- `pdf_service/.env.docker` (AWS S3 credentials for PDF service)

Key variables:

```bash
# Database
DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD

# Redis/Celery
REDIS_HOST / REDIS_PORT

# AWS S3
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_STORAGE_BUCKET_NAME / AWS_REGION

# LLM APIs
GOOGLE_API_KEY / MISTRAL_API_KEY

# WhatsApp (see docs/features/whatsapp.md)
WHATSAPP_ENABLED / WHATSAPP_TOKEN / WHATSAPP_PHONE_ID / WHATSAPP_APP_SECRET

# Feature flags (all default false)
ENABLE_CHECKPOINTS / ENABLE_CUMULATIVE_CHECKPOINTS / ENABLE_MISCONCEPTION_INFERENCE
```

---

## Docker Services

| Service | Description | Port |
|---------|-------------|------|
| `nginx` | Reverse proxy + static files | 80 (public) |
| `app` | Django + Gunicorn (3 workers, 4 threads) | 8000 (internal) |
| `worker` | Celery worker (3 concurrency) | — |
| `broker` | Redis 7 | 6379 (internal) |
| `pdf_service` | Node.js PDF generator | 8080 (internal, via `/pdf/`) |

---

## Testing

```bash
# Backend
cd backend && python manage.py test
# or: pytest backend/

# Frontend
cd frontend && npm run build   # type-check via Vite
```

---

## Documentation

All feature and deployment docs are in `docs/`:

```
docs/
├── features/
│   ├── whatsapp.md               WhatsApp opt-in, activation, notifications
│   ├── report-card.md            Student report card feature
│   ├── checkpoints.md            AI checkpoint generation (test-wise + cumulative)
│   ├── misconception-inference.md  LLM misconception detection
│   └── answer-key-validation.md  CSV upload validation rules
├── architecture/
│   ├── postgresql-migration.md   Neo4j → PostgreSQL migration (complete)
│   └── react-query-plan.md       Frontend caching migration plan
└── deployment/
    ├── whatsapp-production.md    WhatsApp production checklist
    └── pdf-service.md            PDF service deployment + S3 + compression
```

For AI coding agent context, see `.github/copilot-instructions.md`.
