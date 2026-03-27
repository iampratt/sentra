from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


SourceType = Literal["rss", "api", "scrape", "manual"]
IngestStatus = Literal["inserted", "duplicate"]
DuplicateReason = Literal["canonical_url", "content_hash"]


class NewsLocation(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude for map placement.")
    lng: float = Field(..., ge=-180, le=180, description="Longitude for map placement.")


class NewsIngestPayload(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Port disruption forces reroute review for Red Sea cargo lanes",
                "source": "Global Shipping Desk",
                "source_type": "manual",
                "canonical_url": "https://example.com/red-sea-reroute-review",
                "published_at": "2026-03-25T08:20:00Z",
                "summary": "Insurers and operators are reassessing freight exposure after a new shipping disruption alert.",
                "raw_content": "Operators are reviewing route exposure and freight pricing after a regional shipping disruption alert.",
                "region": "Middle East & Africa",
                "country": "Egypt",
                "language": "en",
                "tags": ["shipping", "energy", "logistics"],
                "location": {"lat": 27.2579, "lng": 33.8116},
            }
        }
    )

    title: str = Field(..., min_length=10, max_length=300)
    source: str = Field(..., min_length=2, max_length=120)
    source_type: SourceType
    canonical_url: HttpUrl
    published_at: datetime
    summary: str = Field(..., min_length=20, max_length=2000)
    raw_content: str = Field(..., min_length=20)
    region: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=120)
    language: str = Field(default="en", min_length=2, max_length=12)
    tags: list[str] = Field(default_factory=list, max_length=12)
    location: NewsLocation | None = None


class NormalizedNewsEvent(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "preview-port-disruption-forces-reroute-review-for-red-sea-cargo-lanes",
                "title": "Port disruption forces reroute review for Red Sea cargo lanes",
                "source": "Global Shipping Desk",
                "source_type": "manual",
                "canonical_url": "https://example.com/red-sea-reroute-review",
                "published_at": "2026-03-25T08:20:00Z",
                "summary": "Insurers and operators are reassessing freight exposure after a new shipping disruption alert.",
                "raw_content": "Operators are reviewing route exposure and freight pricing after a regional shipping disruption alert.",
                "region": "Middle East & Africa",
                "country": "Egypt",
                "location_lat": 27.2579,
                "location_lng": 33.8116,
                "language": "en",
                "tags": ["shipping", "energy", "logistics"],
            }
        }
    )

    id: str = Field(..., min_length=3, max_length=200)
    title: str
    source: str
    source_type: SourceType
    canonical_url: HttpUrl
    published_at: datetime
    summary: str
    raw_content: str
    region: str | None = None
    country: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    language: str
    tags: list[str] = Field(default_factory=list)


class ManualIngestResult(BaseModel):
    status: IngestStatus
    duplicate_reason: DuplicateReason | None = None
    event: NormalizedNewsEvent


class RssSourceRunResult(BaseModel):
    feed_url: HttpUrl
    source: str
    inserted: int
    duplicates: int
    failed: int
    error: str | None = None


class RssIngestRunResult(BaseModel):
    sources: list[RssSourceRunResult]
    inserted: int
    duplicates: int
    failed: int
