from pydantic import BaseModel, Field


class EventEmbeddingUpsertPayload(BaseModel):
    embedding: list[float] = Field(..., min_length=8)
    content_type: str = "summary"
    source_text: str | None = None


class EventEmbeddingUpsertResult(BaseModel):
    event_id: str
    point_id: str
    collection: str
    vector_size: int
    content_type: str
    status: str


class EventEmbeddingGeneratePayload(BaseModel):
    content_type: str = "summary"


class EventEmbeddingGenerateResult(BaseModel):
    event_id: str
    point_id: str
    collection: str
    vector_size: int
    content_type: str
    model_name: str
    status: str
    source_length: int


class BatchEventEmbeddingRequest(BaseModel):
    event_ids: list[str] = Field(default_factory=list)
    content_type: str = "summary"


class BatchEventEmbeddingItemResult(BaseModel):
    event_id: str
    status: str
    point_id: str | None = None
    error: str | None = None


class BatchEventEmbeddingResult(BaseModel):
    content_type: str
    model_name: str
    processed: int
    embedded: int
    failed: int
    results: list[BatchEventEmbeddingItemResult]


class RelatedEventResult(BaseModel):
    event_id: str
    point_id: str
    score: float
    title: str
    summary: str | None = None
    canonical_url: str | None = None
    published_at: str | None = None
    region: str | None = None
    country: str | None = None
    content_type: str


class RelatedEventsResponse(BaseModel):
    event_id: str
    content_type: str
    limit: int
    related_events: list[RelatedEventResult]


class VectorHealthResult(BaseModel):
    ok: bool
    collection: str
    vector_size: int
    distance: str
