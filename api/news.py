from fastapi import APIRouter

from api.models.news import NewsIngestPayload, NormalizedNewsEvent

router = APIRouter(prefix="/news/contracts", tags=["news-contracts"])


def _slugify_title(value: str) -> str:
    return "".join(character.lower() if character.isalnum() else "-" for character in value).strip("-")


def _normalize_payload(payload: NewsIngestPayload) -> NormalizedNewsEvent:
    return NormalizedNewsEvent(
        id=f"preview-{_slugify_title(payload.title)}",
        title=payload.title,
        source=payload.source,
        source_type=payload.source_type,
        canonical_url=payload.canonical_url,
        published_at=payload.published_at,
        summary=payload.summary,
        raw_content=payload.raw_content,
        region=payload.region,
        country=payload.country,
        location_lat=payload.location.lat if payload.location else None,
        location_lng=payload.location.lng if payload.location else None,
        language=payload.language,
        tags=payload.tags,
    )


@router.get("/examples")
async def contract_examples() -> dict[str, dict]:
    request_example = NewsIngestPayload.model_validate(NewsIngestPayload.model_config["json_schema_extra"]["example"])
    normalized_example = _normalize_payload(request_example)

    return {
        "ingest_request": request_example.model_dump(mode="json"),
        "normalized_event": normalized_example.model_dump(mode="json"),
    }


@router.post("/validate-request", response_model=NewsIngestPayload)
async def validate_request(payload: NewsIngestPayload) -> NewsIngestPayload:
    return payload


@router.post("/normalize-preview", response_model=NormalizedNewsEvent)
async def normalize_preview(payload: NewsIngestPayload) -> NormalizedNewsEvent:
    return _normalize_payload(payload)
