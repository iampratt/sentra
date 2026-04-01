import logging
from functools import lru_cache

from sentence_transformers import SentenceTransformer

from api.models.vector import (
    BatchEventEmbeddingItemResult,
    BatchEventEmbeddingRequest,
    BatchEventEmbeddingResult,
    EventEmbeddingGeneratePayload,
    EventEmbeddingGenerateResult,
    EventEmbeddingUpsertPayload,
)
from api.services.qdrant_service import VECTOR_SIZE, get_event_embedding_record, list_recent_event_ids, upsert_event_embedding

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

logger = logging.getLogger(__name__)


@lru_cache
def get_embedding_model() -> SentenceTransformer:
    return SentenceTransformer(EMBEDDING_MODEL_NAME)


def _source_text_from_event(event_row: dict, content_type: str) -> str:
    if content_type == "raw_content":
        source_text = event_row.get("raw_content") or event_row.get("summary") or event_row.get("title")
    else:
        source_text = event_row.get("summary") or event_row.get("raw_content") or event_row.get("title")

    if not source_text:
        raise ValueError(f"Event {event_row['event_id']} has no usable text for embedding.")

    return str(source_text).strip()


def embed_event(event_id: str, payload: EventEmbeddingGeneratePayload) -> EventEmbeddingGenerateResult:
    event_row = get_event_embedding_record(event_id)
    if not event_row:
        raise ValueError(f"Event not found: {event_id}")

    source_text = _source_text_from_event(event_row, payload.content_type)
    model = get_embedding_model()
    vector = model.encode(source_text, normalize_embeddings=True).tolist()

    if len(vector) != VECTOR_SIZE:
        raise ValueError(
            f"Embedding model returned {len(vector)} dimensions, expected {VECTOR_SIZE}."
        )

    result = upsert_event_embedding(
        event_id,
        EventEmbeddingUpsertPayload(
            embedding=vector,
            content_type=payload.content_type,
            source_text=source_text,
        ),
    )

    return EventEmbeddingGenerateResult(
        event_id=result.event_id,
        point_id=result.point_id,
        collection=result.collection,
        vector_size=result.vector_size,
        content_type=result.content_type,
        model_name=EMBEDDING_MODEL_NAME,
        status="embedded",
        source_length=len(source_text),
    )


def embed_recent_events(limit: int, payload: BatchEventEmbeddingRequest) -> BatchEventEmbeddingResult:
    event_ids = payload.event_ids or list_recent_event_ids(limit=limit)
    results: list[BatchEventEmbeddingItemResult] = []

    for event_id in event_ids:
        try:
            embedded = embed_event(event_id, EventEmbeddingGeneratePayload(content_type=payload.content_type))
            results.append(
                BatchEventEmbeddingItemResult(
                    event_id=event_id,
                    status="embedded",
                    point_id=embedded.point_id,
                )
            )
        except Exception as error:
            logger.exception("Failed to embed event %s", event_id)
            results.append(
                BatchEventEmbeddingItemResult(
                    event_id=event_id,
                    status="failed",
                    error=str(error),
                )
            )

    embedded_count = sum(1 for item in results if item.status == "embedded")
    failed_count = sum(1 for item in results if item.status == "failed")

    return BatchEventEmbeddingResult(
        content_type=payload.content_type,
        model_name=EMBEDDING_MODEL_NAME,
        processed=len(results),
        embedded=embedded_count,
        failed=failed_count,
        results=results,
    )
