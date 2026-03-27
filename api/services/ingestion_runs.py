import json
from datetime import UTC, datetime

from psycopg import connect
from psycopg.rows import dict_row

from api.config import get_settings
from api.models.news import IngestionRunListResult, IngestionRunRecord, RssIngestRunResult


def _derive_run_status(result: RssIngestRunResult) -> str:
    if result.failed > 0 and result.inserted == 0 and result.duplicates == 0:
        return "failed"
    if result.failed > 0:
        return "partial_failure"
    return "success"


def log_rss_ingestion_run(result: RssIngestRunResult) -> str:
    settings = get_settings()
    completed_at = datetime.now(UTC)
    status = _derive_run_status(result)

    with connect(settings.database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                insert into ingestion_runs (
                  source_type,
                  trigger_type,
                  status,
                  inserted_count,
                  duplicate_count,
                  failed_count,
                  sources_count,
                  details,
                  completed_at
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                returning id::text as id
                """,
                (
                    "rss",
                    "manual",
                    status,
                    result.inserted,
                    result.duplicates,
                    result.failed,
                    len(result.sources),
                    json.dumps([source.model_dump(mode="json") for source in result.sources]),
                    completed_at,
                ),
            )
            row = cursor.fetchone()
        connection.commit()

    return row["id"]


def list_recent_ingestion_runs(limit: int = 10) -> IngestionRunListResult:
    settings = get_settings()

    with connect(settings.database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                select
                  id::text as id,
                  source_type,
                  trigger_type,
                  status,
                  inserted_count,
                  duplicate_count,
                  failed_count,
                  sources_count,
                  started_at,
                  completed_at
                from ingestion_runs
                order by started_at desc
                limit %s
                """,
                (limit,),
            )
            rows = cursor.fetchall()

    return IngestionRunListResult(
        runs=[
            IngestionRunRecord(
                id=row["id"],
                source_type=row["source_type"],
                trigger_type=row["trigger_type"],
                status=row["status"],
                inserted_count=row["inserted_count"],
                duplicate_count=row["duplicate_count"],
                failed_count=row["failed_count"],
                sources_count=row["sources_count"],
                started_at=row["started_at"],
                completed_at=row["completed_at"],
            )
            for row in rows
        ]
    )
