from fastapi import APIRouter

from api.models.news import ManualIngestResult, NewsIngestPayload, NormalizedNewsEvent
from api.services.news_ingester import ingest_manual_event, normalize_payload

router = APIRouter(tags=["news"])


@router.post("/news/events/manual", response_model=ManualIngestResult)
async def create_manual_event(payload: NewsIngestPayload) -> ManualIngestResult:
    return ingest_manual_event(payload)


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
