# Global News & Stock Impact Dashboard

Incremental build of a personal-use intelligence dashboard for global news, stock impact analysis, and event visualization.

## Current status

This repository currently includes:
- Next.js root configuration and frontend dependency manifest
- FastAPI entrypoint with a health endpoint
- Agreed top-level project folders
- Example environment file

## Planned workflow

1. Implement one small part.
2. Manually test that part.
3. Commit only after acceptance.
4. Continue to the next part.

## Initial setup

### Frontend

```bash
pnpm install
```

### Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r api/requirements.txt
```

Run the API:

```bash
uvicorn api.index:app --reload
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

### Environment

```bash
cp .env.example .env.local
```

The frontend reads `NEXT_PUBLIC_*` values from `.env.local`. The backend also reads `.env.local`
from the repository root.

Frontend config values are surfaced on the placeholder page. Backend config values can be checked
at `/health/config`.

## Database connectivity check

The Next.js app includes a server-side Postgres connectivity probe:

```bash
curl http://localhost:3000/api/db/health
```

If `DATABASE_URL` is correct and Postgres is reachable, the route returns the current database and
schema. If not, it returns a readable connection failure message.
