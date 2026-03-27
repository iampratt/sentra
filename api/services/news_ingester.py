import hashlib

from psycopg import connect
from psycopg.rows import dict_row

from api.config import get_settings
from api.models.news import ManualIngestResult, NewsIngestPayload, NormalizedNewsEvent
from api.services.location_resolver import resolve_location


def _slugify(value: str) -> str:
    return "".join(character.lower() if character.isalnum() else "-" for character in value).strip("-")


def normalize_payload(payload: NewsIngestPayload) -> NormalizedNewsEvent:
    resolved_payload = resolve_location(payload)

    return NormalizedNewsEvent(
        id=f"preview-{_slugify(resolved_payload.title)}",
        title=resolved_payload.title,
        source=resolved_payload.source,
        source_type=resolved_payload.source_type,
        canonical_url=resolved_payload.canonical_url,
        published_at=resolved_payload.published_at,
        summary=resolved_payload.summary,
        raw_content=resolved_payload.raw_content,
        region=resolved_payload.region,
        country=resolved_payload.country,
        location_lat=resolved_payload.location.lat if resolved_payload.location else None,
        location_lng=resolved_payload.location.lng if resolved_payload.location else None,
        language=resolved_payload.language,
        tags=resolved_payload.tags,
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


def ingest_news_event(payload: NewsIngestPayload) -> ManualIngestResult:
    resolved_payload = resolve_location(payload)
    settings = get_settings()
    source_slug = _slugify(resolved_payload.source)
    content_hash = _content_hash(resolved_payload)

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
                (resolved_payload.source, resolved_payload.source_type, str(resolved_payload.canonical_url)),
            )
            existing_by_url = cursor.fetchone()

            if existing_by_url:
                return ManualIngestResult(
                    status="duplicate",
                    duplicate_reason="canonical_url",
                    event=_row_to_event(existing_by_url, resolved_payload),
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
                (resolved_payload.source, resolved_payload.source_type, content_hash),
            )
            existing_by_hash = cursor.fetchone()

            if existing_by_hash:
                return ManualIngestResult(
                    status="duplicate",
                    duplicate_reason="content_hash",
                    event=_row_to_event(existing_by_hash, resolved_payload),
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
                (source_slug, resolved_payload.source, resolved_payload.source_type, resolved_payload.country),
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
                    resolved_payload.title,
                    resolved_payload.summary,
                    resolved_payload.raw_content,
                    str(resolved_payload.canonical_url),
                    content_hash,
                    resolved_payload.published_at,
                    resolved_payload.region,
                    resolved_payload.country,
                    resolved_payload.location.lat if resolved_payload.location else None,
                    resolved_payload.location.lng if resolved_payload.location else None,
                    None,
                    None,
                    None,
                    None,
                    resolved_payload.source,
                    resolved_payload.source_type,
                ),
            )
            row = cursor.fetchone()

        connection.commit()

    return ManualIngestResult(
        status="inserted",
        duplicate_reason=None,
        event=_row_to_event(row, resolved_payload),
    )


def ingest_manual_event(payload: NewsIngestPayload) -> ManualIngestResult:
    return ingest_news_event(payload)
