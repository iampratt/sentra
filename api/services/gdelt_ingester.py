from datetime import UTC, datetime
from time import sleep
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
GDELT_QUERY_PROFILES: tuple[dict[str, str], ...] = (
    {
        "query": GDELT_HIGH_SIGNAL_QUERY,
        "mode": "ArtList",
        "format": "json",
        "maxrecords": "40",
        "timespan": "6h",
        "sort": "DateDesc",
    },
    {
        "query": GDELT_HIGH_SIGNAL_QUERY,
        "mode": "ArtList",
        "format": "json",
        "maxrecords": "20",
        "timespan": "3h",
        "sort": "DateDesc",
    },
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


def _fetch_gdelt_articles() -> tuple[list[dict], str, str | None]:
    last_error: str | None = None

    with httpx.Client(
        timeout=httpx.Timeout(connect=8.0, read=12.0, write=12.0, pool=12.0),
        follow_redirects=True,
        headers={"User-Agent": "news-dashboard-gdelt-ingester/0.1"},
        http2=False,
    ) as client:
        for profile in GDELT_QUERY_PROFILES:
            query_url = f"{GDELT_DOC_API_URL}?{urlencode(profile)}"

            for attempt in range(2):
                try:
                    response = client.get(GDELT_DOC_API_URL, params=profile)
                    response.raise_for_status()
                    payload = response.json()
                    articles = payload.get("articles", [])
                    return articles, query_url, None
                except httpx.HTTPError as error:
                    last_error = f"profile={profile['timespan']}/{profile['maxrecords']} attempt={attempt + 1}: {error}"
                    if attempt == 0:
                        sleep(1.0)
                except Exception as error:
                    last_error = f"profile={profile['timespan']}/{profile['maxrecords']} attempt={attempt + 1}: {error}"
                    if attempt == 0:
                        sleep(1.0)

    fallback_url = f"{GDELT_DOC_API_URL}?{urlencode(GDELT_QUERY_PROFILES[-1])}"
    return [], fallback_url, last_error


def ingest_gdelt_events() -> GdeltIngestRunResult:
    inserted = 0
    duplicates = 0
    failed = 0
    articles, query_url, error_message = _fetch_gdelt_articles()

    if error_message and not articles:
        failed = 1
    else:
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
