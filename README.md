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

## Initial schema

The initial SQL schema lives at:

`db/migrations/001_initial_schema.sql`

Apply it with:

```bash
pnpm install
pnpm db:migrate
```

This creates the Part 13 tables:
- `news_sources`
- `news_events`
- `companies`
- `symbols`
- `event_symbol_impacts`

## Seed mock events

Part 14 adds a seed path that inserts the current mock dashboard events into Postgres:

```bash
pnpm db:seed:events
pnpm db:check:events
```

The frontend still reads hardcoded mock data in this part. The database seed is only for verification
and to prepare for the next part.

## FastAPI news contracts

Part 16 adds validated request and normalized output contracts:

```bash
curl http://127.0.0.1:8000/news/contracts/examples
```

Contract endpoints:
- `POST /news/contracts/validate-request`
- `POST /news/contracts/normalize-preview`

## Manual event ingest

Part 17 adds a manual ingest endpoint that writes one validated article into Postgres:

`POST /news/events/manual`

After posting a valid payload, refresh the frontend dashboard and the new event should appear in the
event stream.

Part 18 adds duplicate detection for manual ingest:
- canonical URL dedupe
- content-hash dedupe

Apply the Part 18 migration before testing duplicate behavior:

```bash
pnpm db:migrate:dedupe
```

## RSS ingest

Part 19 adds a starter RSS ingestion trigger:

`POST /news/ingest/rss`

It pulls a small set of world-news feeds, stores new items in Postgres, and reports inserted,
duplicate, and failed counts per source.

Part 20 adds persisted ingestion run logging:

```bash
pnpm db:migrate:ingestion-runs
curl http://127.0.0.1:8000/news/ingest/runs
```

Each run now stores:
- overall status
- inserted / duplicate / failed counts
- number of sources processed

## GDELT ingest

Part 21 adds a GDELT DOC 2.0 ingestion trigger:

`POST /news/ingest/gdelt`

It uses GDELT DOC `ArtList` JSON output with a focused high-signal query and stores the resulting
articles in the same normalized event model as RSS.

## Location normalization

Part 22 improves map plotting by resolving coordinates during ingest:
- explicit payload coordinates are preserved
- country names map to known coordinates
- article text is scanned for common country and capital-city cues
- region defaults are used only when a better location is unavailable

## Symbol universe

Part 23 adds a curated tracked-symbol universe seed across multiple markets:

```bash
pnpm db:seed:symbols
pnpm db:check:symbols
```

This seeds:
- `companies`
- `symbols`

The initial universe is intentionally small and global so we can build linkage and pricing on top of
it without trying to cover every ticker immediately.

## Event-to-symbol linking

Part 24 adds the first deterministic event-to-symbol linker:

```bash
pnpm db:link:event-symbols
pnpm db:check:event-symbols
```

This pass uses simple keyword and company rules against the curated symbol universe and stores links
in `event_symbol_impacts`. It is intentionally rule-based only: no LLM and no pricing context yet.

## Stock price context

Part 25 adds a stock price service backed by `yfinance` for linked symbols:

`GET /stocks/events/{event_id}/prices`

It returns recent close-price context for symbols already linked to an event and degrades gracefully
when a provider symbol is unavailable or the upstream request fails.

## Analysis provider abstraction

Part 27 adds a Groq-first analysis provider abstraction with a test endpoint:

`POST /analysis/providers/test`

This does not persist analysis results yet. It only proves that the provider layer can accept an
event plus candidate symbols and return structured symbol-impact output.

## Manual event analysis

Part 28 adds a manual event-analysis run endpoint:

`POST /analysis/events/{event_id}/run`

It analyzes a stored event against its linked symbols and makes the latest signal fields available
to the dashboard.

## Analysis history

Part 29 moves analysis persistence into separate versioned tables:

```bash
pnpm db:migrate:analysis-history
```

Each event analysis now creates:
- one `analysis_runs` record
- one or more `analysis_impacts` records

Only the latest active run is read back into the dashboard, so rerunning analysis creates history
without overwriting older analysis results.

## Vector DB integration

Part 31 adds Qdrant collection scaffolding and a manual event-vector upsert path:

- `GET /vectors/health`
- `POST /vectors/events/{event_id}/upsert`

This part creates or verifies the `news_event_embeddings` collection and lets you write an
embedding for a stored event, but it does not generate embeddings automatically yet.

`POST /analysis/events/{event_id}/run`

For now, analysis results are written back into the existing `event_symbol_impacts` rows so the
dashboard can render prediction fields immediately. Part 29 will separate this into versioned
analysis history.
