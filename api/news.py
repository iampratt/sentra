from fastapi import APIRouter

from api.models.news import (
    GdeltIngestRunResult,
    IngestionRunListResult,
    ManualIngestResult,
    NewsIngestPayload,
    NormalizedNewsEvent,
    RssIngestRunResult,
)
from api.services.gdelt_ingester import ingest_gdelt_events
from api.services.ingestion_runs import list_recent_ingestion_runs, log_gdelt_ingestion_run, log_rss_ingestion_run
from api.services.news_ingester import ingest_manual_event, normalize_payload
from api.services.rss_ingester import ingest_rss_feeds

router = APIRouter(tags=["news"])


@router.post("/news/events/manual", response_model=ManualIngestResult)
async def create_manual_event(payload: NewsIngestPayload) -> ManualIngestResult:
    return ingest_manual_event(payload)


@router.post("/news/ingest/rss", response_model=RssIngestRunResult)
async def ingest_rss() -> RssIngestRunResult:
    result = ingest_rss_feeds()
    run_id = log_rss_ingestion_run(result)
    return result.model_copy(update={"run_id": run_id})


@router.post("/news/ingest/gdelt", response_model=GdeltIngestRunResult)
async def ingest_gdelt() -> GdeltIngestRunResult:
    result = ingest_gdelt_events()
    run_id = log_gdelt_ingestion_run(result)
    return result.model_copy(update={"run_id": run_id})


@router.get("/news/ingest/runs", response_model=IngestionRunListResult)
async def get_ingestion_runs() -> IngestionRunListResult:
    return list_recent_ingestion_runs()


@router.get("/news/contracts/examples")
async def contract_examples() -> dict[str, dict]:
    request_example = NewsIngestPayload.model_validate(NewsIngestPayload.model_config["json_schema_extra"]["example"])
    normalized_example = normalize_payload(request_example)

    return {
        "ingest_request": request_example.model_dump(mode="json"),
        "normalized_event": normalized_example.model_dump(mode="json"),
    }


@router.post("/news/contracts/validate-request", response_model=NewsIngestPayload)
async def validate_request(payload: NewsIngestPayload) -> NewsIngestPayload:
    return payload


@router.post("/news/contracts/normalize-preview", response_model=NormalizedNewsEvent)
async def normalize_preview(payload: NewsIngestPayload) -> NormalizedNewsEvent:
    return normalize_payload(payload)
