from fastapi import APIRouter, HTTPException

from api.models.news import (
    GdeltIngestRunResult,
    IngestionRunListResult,
    ManualIngestResult,
    NewsIngestPayload,
    NormalizedNewsEvent,
    RssIngestRunResult,
)
from api.models.analysis import AnalysisEventPayload, AnalysisRunResult
from api.models.stock import EventPriceContextResult
from api.services.gdelt_ingester import ingest_gdelt_events
from api.services.analysis_provider import get_analysis_provider
from api.services.analysis_service import run_event_analysis
from api.services.ingestion_runs import list_recent_ingestion_runs, log_gdelt_ingestion_run, log_rss_ingestion_run
from api.services.news_ingester import ingest_manual_event, normalize_payload
from api.services.rss_ingester import ingest_rss_feeds
from api.services.stock_service import get_event_price_context

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


@router.get("/stocks/events/{event_id}/prices", response_model=EventPriceContextResult)
async def get_prices_for_event(event_id: str) -> EventPriceContextResult:
    return get_event_price_context(event_id)


@router.post("/analysis/providers/test", response_model=AnalysisRunResult)
async def test_analysis_provider(payload: AnalysisEventPayload) -> AnalysisRunResult:
    provider = get_analysis_provider()
    return provider.analyze_event(payload)


@router.post("/analysis/events/{event_id}/run", response_model=AnalysisRunResult)
async def analyze_event(event_id: str) -> AnalysisRunResult:
    try:
        return run_event_analysis(event_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Analysis failed: {error}") from error


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
