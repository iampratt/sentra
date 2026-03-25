from psycopg import connect
from psycopg.rows import dict_row

from api.config import get_settings
from api.models.news import NewsIngestPayload, NormalizedNewsEvent


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


def ingest_manual_event(payload: NewsIngestPayload) -> NormalizedNewsEvent:
    settings = get_settings()
    source_slug = _slugify(payload.source)

    with connect(settings.database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
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
                  %s, %s, %s, %s, %s, %s,
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
                  location_lng
                """,
                (
                    source_id,
                    payload.title,
                    payload.summary,
                    payload.raw_content,
                    str(payload.canonical_url),
                    payload.published_at,
                    payload.region,
                    payload.country,
                    payload.location.lat if payload.location else None,
                    payload.location.lng if payload.location else None,
                    None,
                    None,
                    None,
                    None,
                ),
            )
            row = cursor.fetchone()

        connection.commit()

    return NormalizedNewsEvent(
        id=row["id"],
        title=row["title"],
        source=payload.source,
        source_type=payload.source_type,
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
