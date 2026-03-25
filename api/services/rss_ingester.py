from datetime import UTC, datetime
from urllib.parse import urlparse

import feedparser

from api.models.news import NewsIngestPayload, RssIngestRunResult, RssSourceRunResult
from api.services.news_ingester import ingest_news_event

STARTER_RSS_FEEDS: tuple[str, ...] = (
    "https://feeds.reuters.com/reuters/worldNews",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
)


def _feed_source_name(feed_url: str, parsed_feed: feedparser.FeedParserDict) -> str:
    title = getattr(parsed_feed.feed, "title", None)
    if title:
        return str(title)

    host = urlparse(feed_url).netloc.replace("www.", "")
    return host or "Unknown RSS Source"


def _entry_summary(entry: feedparser.FeedParserDict) -> str:
    summary = getattr(entry, "summary", None) or getattr(entry, "description", None) or ""
    return str(summary).strip()


def _entry_published_at(entry: feedparser.FeedParserDict) -> datetime:
    published_parsed = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if published_parsed:
        return datetime(*published_parsed[:6], tzinfo=UTC)
    return datetime.now(UTC)


def _entry_tags(entry: feedparser.FeedParserDict) -> list[str]:
    tags = getattr(entry, "tags", None) or []
    values: list[str] = []

    for item in tags:
        term = getattr(item, "term", None)
        if term:
            values.append(str(term))

    return values[:12]


def ingest_rss_feeds() -> RssIngestRunResult:
    source_results: list[RssSourceRunResult] = []
    total_inserted = 0
    total_duplicates = 0
    total_failed = 0

    for feed_url in STARTER_RSS_FEEDS:
        parsed = feedparser.parse(feed_url)
        source_name = _feed_source_name(feed_url, parsed)
        inserted = 0
        duplicates = 0
        failed = 0

        for entry in parsed.entries:
            title = str(getattr(entry, "title", "")).strip()
            link = str(getattr(entry, "link", "")).strip()
            summary = _entry_summary(entry)

            if not title or not link or len(summary) < 20:
                failed += 1
                continue

            payload = NewsIngestPayload(
                title=title,
                source=source_name,
                source_type="rss",
                canonical_url=link,
                published_at=_entry_published_at(entry),
                summary=summary,
                raw_content=summary,
                region=None,
                country=None,
                language=str(getattr(entry, "language", "en") or "en"),
                tags=_entry_tags(entry),
                location=None,
            )

            result = ingest_news_event(payload)
            if result.status == "inserted":
                inserted += 1
            else:
                duplicates += 1

        source_results.append(
            RssSourceRunResult(
                feed_url=feed_url,
                source=source_name,
                inserted=inserted,
                duplicates=duplicates,
                failed=failed,
            )
        )
        total_inserted += inserted
        total_duplicates += duplicates
        total_failed += failed

    return RssIngestRunResult(
        sources=source_results,
        inserted=total_inserted,
        duplicates=total_duplicates,
        failed=total_failed,
    )
