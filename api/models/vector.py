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


class VectorHealthResult(BaseModel):
    ok: bool
    collection: str
    vector_size: int
    distance: str
