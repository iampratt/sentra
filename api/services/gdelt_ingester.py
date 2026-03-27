from datetime import UTC, datetime
from urllib.parse import urlencode

import httpx

from api.models.news import GdeltIngestRunResult, GdeltSourceRunResult, NewsIngestPayload
from api.services.news_ingester import ingest_news_event

GDELT_DOC_API_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
GDELT_HIGH_SIGNAL_QUERY = (
    '(theme:ECON_STOCKMARKET OR theme:ECON_TRADE OR theme:TAX_FNCACT OR '
    'theme:ENV_DISASTER OR theme:ARMEDCONFLICT OR theme:WB_1204_TRANSPORT OR '
    'theme:PROTEST OR theme:SANCTIONS)'
)


def _derive_status(inserted: int, duplicates: int, failed: int) -> str:
    if failed > 0 and inserted == 0 and duplicates == 0:
        return "failed"
    if failed > 0:
        return "partial_failure"
    return "success"


def _parse_gdelt_datetime(value: str | None) -> datetime:
    if not value:
        return datetime.now(UTC)

    try:
        return datetime.strptime(value, "%Y%m%d%H%M%S").replace(tzinfo=UTC)
    except ValueError:
        return datetime.now(UTC)


def ingest_gdelt_events() -> GdeltIngestRunResult:
    params = {
        "query": GDELT_HIGH_SIGNAL_QUERY,
        "mode": "ArtList",
        "format": "json",
        "maxrecords": "75",
        "timespan": "12h",
        "sort": "DateDesc",
    }
    query_url = f"{GDELT_DOC_API_URL}?{urlencode(params)}"

    inserted = 0
    duplicates = 0
    failed = 0
    error_message: str | None = None

    try:
        with httpx.Client(
            timeout=httpx.Timeout(connect=4.0, read=8.0, write=8.0, pool=8.0),
            follow_redirects=True,
            headers={"User-Agent": "news-dashboard-gdelt-ingester/0.1"},
        ) as client:
            response = client.get(GDELT_DOC_API_URL, params=params)
            response.raise_for_status()
            payload = response.json()

        articles = payload.get("articles", [])

        for article in articles:
            title = str(article.get("title", "")).strip()
            url = str(article.get("url", "")).strip()
            summary = str(article.get("seendate", "")).strip()
            raw_content = str(article.get("excerpt", "") or article.get("title", "")).strip()
            source_name = str(article.get("sourcecountry", "") or article.get("domain", "") or "GDELT").strip()

            if not title or not url:
                failed += 1
                continue

            normalized_summary = (
                str(article.get("excerpt", "")).strip()
                or f"GDELT article from {source_name} observed at {summary}."
            )
            if len(normalized_summary) < 20:
                normalized_summary = f"GDELT article from {source_name} covering a high-signal global event."

            payload_item = NewsIngestPayload(
                title=title,
                source=source_name,
                source_type="api",
                canonical_url=url,
                published_at=_parse_gdelt_datetime(article.get("seendate")),
                summary=normalized_summary,
                raw_content=raw_content if len(raw_content) >= 20 else normalized_summary,
                region=None,
                country=str(article.get("sourcecountry", "")).strip() or None,
                language=str(article.get("language", "") or "en"),
                tags=["gdelt", "high-signal"],
                location=None,
            )

            result = ingest_news_event(payload_item)
            if result.status == "inserted":
                inserted += 1
            else:
                duplicates += 1
    except httpx.HTTPError as error:
        failed += 1
        error_message = str(error)
    except Exception as error:
        failed += 1
        error_message = str(error)

    return GdeltIngestRunResult(
        run_id=None,
        status=_derive_status(inserted, duplicates, failed),
        sources=[
            GdeltSourceRunResult(
                query_url=query_url,
                source="GDELT DOC 2.0",
                inserted=inserted,
                duplicates=duplicates,
                failed=failed,
                error=error_message,
            )
        ],
        inserted=inserted,
        duplicates=duplicates,
        failed=failed,
    )
