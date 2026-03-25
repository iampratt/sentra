import hashlib

from psycopg import connect
from psycopg.rows import dict_row

from api.config import get_settings
from api.models.news import ManualIngestResult, NewsIngestPayload, NormalizedNewsEvent


def _slugify(value: str) -> str:
    return "".join(character.lower() if character.isalnum() else "-" for character in value).strip("-")


def normalize_payload(payload: NewsIngestPayload) -> NormalizedNewsEvent:
    return NormalizedNewsEvent(
        id=f"preview-{_slugify(payload.title)}",
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


def _content_hash(payload: NewsIngestPayload) -> str:
    digest_input = "||".join(
        [
            payload.title.strip().lower(),
            payload.summary.strip().lower(),
            payload.raw_content.strip().lower(),
        ]
    )
    return hashlib.sha256(digest_input.encode("utf-8")).hexdigest()


def _row_to_event(row: dict, payload: NewsIngestPayload) -> NormalizedNewsEvent:
    return NormalizedNewsEvent(
        id=row["id"],
        title=row["title"],
        source=row["source_name"],
        source_type=row["source_type"],
        canonical_url=row["canonical_url"],
        published_at=row["published_at"],
        summary=row["summary"] or "",
        raw_content=row["raw_content"] or "",
        region=row["region"],
        country=row["country"],
        location_lat=row["location_lat"],
        location_lng=row["location_lng"],
        language=payload.language,
        tags=payload.tags,
    )


def ingest_manual_event(payload: NewsIngestPayload) -> ManualIngestResult:
    settings = get_settings()
    source_slug = _slugify(payload.source)
    content_hash = _content_hash(payload)

    with connect(settings.database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                select
                  e.id::text as id,
                  e.title,
                  e.summary,
                  e.raw_content,
                  e.canonical_url,
                  e.published_at,
                  e.region,
                  e.country,
                  e.location_lat,
                  e.location_lng,
                  coalesce(s.name, %s) as source_name,
                  coalesce(s.source_type, %s) as source_type
                from news_events e
                left join news_sources s on s.id = e.source_id
                where e.canonical_url = %s
                limit 1
                """,
                (payload.source, payload.source_type, str(payload.canonical_url)),
            )
            existing_by_url = cursor.fetchone()

            if existing_by_url:
                return ManualIngestResult(
                    status="duplicate",
                    duplicate_reason="canonical_url",
                    event=_row_to_event(existing_by_url, payload),
                )

            cursor.execute(
                """
                select
                  e.id::text as id,
                  e.title,
                  e.summary,
                  e.raw_content,
                  e.canonical_url,
                  e.published_at,
                  e.region,
                  e.country,
                  e.location_lat,
                  e.location_lng,
                  coalesce(s.name, %s) as source_name,
                  coalesce(s.source_type, %s) as source_type
                from news_events e
                left join news_sources s on s.id = e.source_id
                where e.content_hash = %s
                limit 1
                """,
                (payload.source, payload.source_type, content_hash),
            )
            existing_by_hash = cursor.fetchone()

            if existing_by_hash:
                return ManualIngestResult(
                    status="duplicate",
                    duplicate_reason="content_hash",
                    event=_row_to_event(existing_by_hash, payload),
                )

            cursor.execute(
                """
                insert into news_sources (slug, name, source_type, country)
                values (%s, %s, %s, %s)
                on conflict (slug) do update
                set name = excluded.name,
                    source_type = excluded.source_type,
                    country = excluded.country,
                    updated_at = now()
                returning id
                """,
                (source_slug, payload.source, payload.source_type, payload.country),
            )
            source_id = cursor.fetchone()["id"]

            cursor.execute(
                """
                insert into news_events (
                  source_id,
                  title,
                  summary,
                  raw_content,
                  canonical_url,
                  content_hash,
                  published_at,
                  region,
                  country,
                  location_lat,
                  location_lng,
                  severity,
                  sentiment,
                  category,
                  impact_window
                )
                values (
                  %s, %s, %s, %s, %s, %s, %s,
                  %s, %s, %s, %s, %s, %s, %s, %s
                )
                returning
                  id::text as id,
                  title,
                  summary,
                  raw_content,
                  canonical_url,
                  published_at,
                  region,
                  country,
                  location_lat,
                  location_lng,
                  %s as source_name,
                  %s as source_type
                """,
                (
                    source_id,
                    payload.title,
                    payload.summary,
                    payload.raw_content,
                    str(payload.canonical_url),
                    content_hash,
                    payload.published_at,
                    payload.region,
                    payload.country,
                    payload.location.lat if payload.location else None,
                    payload.location.lng if payload.location else None,
                    None,
                    None,
                    None,
                    None,
                    payload.source,
                    payload.source_type,
                ),
            )
            row = cursor.fetchone()

        connection.commit()

    return ManualIngestResult(
        status="inserted",
        duplicate_reason=None,
        event=_row_to_event(row, payload),
    )
