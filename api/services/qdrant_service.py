import uuid

from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models
from psycopg import connect
from psycopg.rows import dict_row

from api.config import get_settings
from api.models.vector import (
    EventEmbeddingUpsertPayload,
    EventEmbeddingUpsertResult,
    RelatedEventResult,
    RelatedEventsResponse,
    VectorHealthResult,
)

COLLECTION_NAME = "news_event_embeddings"
VECTOR_SIZE = 384
DISTANCE = qdrant_models.Distance.COSINE


def get_qdrant_client() -> QdrantClient:
    settings = get_settings()
    return QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)


def ensure_event_embedding_collection() -> None:
    client = get_qdrant_client()
    collections = client.get_collections().collections
    if any(collection.name == COLLECTION_NAME for collection in collections):
        return

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=qdrant_models.VectorParams(size=VECTOR_SIZE, distance=DISTANCE),
    )


def get_vector_health() -> VectorHealthResult:
    ensure_event_embedding_collection()
    return VectorHealthResult(
        ok=True,
        collection=COLLECTION_NAME,
        vector_size=VECTOR_SIZE,
        distance=DISTANCE.value,
    )


def upsert_event_embedding(event_id: str, payload: EventEmbeddingUpsertPayload) -> EventEmbeddingUpsertResult:
    if len(payload.embedding) != VECTOR_SIZE:
        raise ValueError(f"Embedding length must be exactly {VECTOR_SIZE} for the current collection.")

    event_row = get_event_embedding_record(event_id)
    if not event_row:
        raise ValueError(f"Event not found: {event_id}")

    ensure_event_embedding_collection()
    point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{event_id}:{payload.content_type}"))
    source_text = payload.source_text or event_row["summary"] or event_row["title"]

    client = get_qdrant_client()
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            qdrant_models.PointStruct(
                id=point_id,
                vector=payload.embedding,
                payload={
                    "event_id": event_row["event_id"],
                    "content_type": payload.content_type,
                    "title": event_row["title"],
                    "summary": event_row["summary"],
                    "canonical_url": event_row["canonical_url"],
                    "published_at": event_row["published_at"].isoformat() if event_row["published_at"] else None,
                    "region": event_row["region"],
                    "country": event_row["country"],
                    "location_lat": event_row["location_lat"],
                    "location_lng": event_row["location_lng"],
                    "source_text": source_text,
                },
            )
        ],
    )

    return EventEmbeddingUpsertResult(
        event_id=event_row["event_id"],
        point_id=point_id,
        collection=COLLECTION_NAME,
        vector_size=len(payload.embedding),
        content_type=payload.content_type,
        status="upserted",
    )


def get_event_embedding_record(event_id: str) -> dict | None:
    settings = get_settings()

    with connect(settings.database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                select
                  id::text as event_id,
                  title,
                  summary,
                  raw_content,
                  canonical_url,
                  published_at,
                  region,
                  country,
                  location_lat,
                  location_lng
                from news_events
                where id::text = %s
                limit 1
                """,
                (event_id,),
            )
            return cursor.fetchone()


def list_recent_event_ids(limit: int = 10) -> list[str]:
    settings = get_settings()

    with connect(settings.database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                select id::text as event_id
                from news_events
                order by published_at desc
                limit %s
                """,
                (limit,),
            )
            rows = cursor.fetchall()

    return [row["event_id"] for row in rows]


def get_related_events(event_id: str, content_type: str = "summary", limit: int = 5) -> RelatedEventsResponse:
    ensure_event_embedding_collection()
    point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{event_id}:{content_type}"))
    client = get_qdrant_client()

    search_results = client.search(
        collection_name=COLLECTION_NAME,
        query_filter=qdrant_models.Filter(
            must=[
                qdrant_models.FieldCondition(
                    key="content_type",
                    match=qdrant_models.MatchValue(value=content_type),
                )
            ],
            must_not=[
                qdrant_models.FieldCondition(
                    key="event_id",
                    match=qdrant_models.MatchValue(value=event_id),
                )
            ],
        ),
        query_vector=client.retrieve(
            collection_name=COLLECTION_NAME,
            ids=[point_id],
            with_vectors=True,
        )[0].vector,
        with_payload=True,
        limit=limit,
    )

    related_events: list[RelatedEventResult] = []
    for item in search_results:
        payload = item.payload or {}
        related_events.append(
            RelatedEventResult(
                event_id=str(payload.get("event_id", "")),
                point_id=str(item.id),
                score=float(item.score),
                title=str(payload.get("title", "Untitled event")),
                summary=payload.get("summary"),
                canonical_url=payload.get("canonical_url"),
                published_at=payload.get("published_at"),
                region=payload.get("region"),
                country=payload.get("country"),
                content_type=str(payload.get("content_type", content_type)),
            )
        )

    return RelatedEventsResponse(
        event_id=event_id,
        content_type=content_type,
        limit=limit,
        related_events=related_events,
    )
