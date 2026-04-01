from psycopg import connect
from psycopg.rows import dict_row

from api.config import get_settings
from api.models.analysis import AnalysisCandidateSymbol, AnalysisContextEvent, AnalysisEventPayload, AnalysisRunResult
from api.services.analysis_provider import get_analysis_provider
from api.services.qdrant_service import get_related_events


def run_event_analysis(event_id: str) -> AnalysisRunResult:
    settings = get_settings()

    with connect(settings.database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                select
                  e.id::text as event_id,
                  e.title,
                  coalesce(e.summary, '') as summary,
                  e.category,
                  e.region,
                  e.country
                from news_events e
                where e.id::text = %s
                limit 1
                """,
                (event_id,),
            )
            event_row = cursor.fetchone()

            if not event_row:
                raise ValueError(f"Event not found: {event_id}")

            cursor.execute(
                """
                select
                  s.ticker,
                  s.exchange,
                  s.market,
                  s.id::text as symbol_id,
                  c.name as company_name
                from event_symbol_impacts esi
                inner join symbols s on s.id = esi.symbol_id
                inner join companies c on c.id = s.company_id
                where esi.event_id::text = %s
                order by s.market asc, s.exchange asc, s.ticker asc
                """,
                (event_id,),
            )
            symbol_rows = cursor.fetchall()

            payload = AnalysisEventPayload(
                event_id=event_row["event_id"],
                title=event_row["title"],
                summary=event_row["summary"],
                category=event_row["category"],
                region=event_row["region"],
                country=event_row["country"],
                linked_symbols=[
                    AnalysisCandidateSymbol(
                        ticker=row["ticker"],
                        exchange=row["exchange"],
                        market=row["market"],
                        company_name=row["company_name"],
                    )
                    for row in symbol_rows
                ],
                related_events=[],
            )

            try:
                related_response = get_related_events(event_id=event_id, content_type="summary", limit=5)
                payload.related_events = [
                    AnalysisContextEvent(
                        event_id=item.event_id,
                        point_id=item.point_id,
                        title=item.title,
                        summary=item.summary,
                        canonical_url=item.canonical_url,
                        region=item.region,
                        country=item.country,
                        published_at=item.published_at,
                        content_type=item.content_type,
                        score=item.score,
                    )
                    for item in related_response.related_events
                ]
            except Exception:
                payload.related_events = []

            provider = get_analysis_provider()
            result = provider.analyze_event(payload)

            cursor.execute(
                """
                update analysis_runs
                set is_active = false,
                    updated_at = now()
                where event_id::text = %s
                  and is_active = true
                """,
                (event_id,),
            )

            cursor.execute(
                """
                select coalesce(max(analysis_version), 0) + 1 as next_version
                from analysis_runs
                where event_id::text = %s
                """,
                (event_id,),
            )
            version_row = cursor.fetchone()
            next_version = int(version_row["next_version"]) if version_row else 1

            cursor.execute(
                """
                insert into analysis_runs (
                  event_id,
                  analysis_version,
                  provider,
                  model,
                  provider_status,
                  error,
                  is_active,
                  created_at,
                  updated_at
                )
                values (%s, %s, %s, %s, %s, %s, true, now(), now())
                returning id::text as analysis_run_id
                """,
                (
                    event_id,
                    next_version,
                    result.provider,
                    result.model,
                    result.provider_status,
                    result.error,
                ),
            )
            analysis_run_row = cursor.fetchone()
            analysis_run_id = analysis_run_row["analysis_run_id"] if analysis_run_row else None

            symbol_id_map = {(row["ticker"], row["exchange"]): row["symbol_id"] for row in symbol_rows}

            for related_event in result.related_events_used:
                if not analysis_run_id:
                    continue

                cursor.execute(
                    """
                    insert into analysis_related_events (
                      analysis_run_id,
                      related_event_id,
                      point_id,
                      content_type,
                      score,
                      title,
                      summary,
                      canonical_url,
                      published_at,
                      region,
                      country,
                      created_at
                    )
                    select
                      %s,
                      e.id,
                      %s,
                      %s,
                      %s,
                      %s,
                      %s,
                      e.canonical_url,
                      e.published_at,
                      %s,
                      %s,
                      now()
                    from news_events e
                    where e.id::text = %s
                    on conflict (analysis_run_id, related_event_id, content_type) do update
                    set score = excluded.score,
                        title = excluded.title,
                        summary = excluded.summary,
                        canonical_url = excluded.canonical_url,
                        published_at = excluded.published_at,
                        region = excluded.region,
                        country = excluded.country
                    """,
                    (
                        analysis_run_id,
                        related_event.point_id,
                        related_event.content_type,
                        related_event.score,
                        related_event.title,
                        related_event.summary,
                        related_event.region,
                        related_event.country,
                        related_event.event_id,
                    ),
                )

            for impact in result.impacts:
                symbol_id = symbol_id_map.get((impact.ticker, impact.exchange))
                if not symbol_id or not analysis_run_id:
                    continue

                cursor.execute(
                    """
                    insert into analysis_impacts (
                      analysis_run_id,
                      symbol_id,
                      sentiment,
                      direction,
                      magnitude,
                      confidence,
                      time_horizon,
                      rationale,
                      created_at,
                      updated_at
                    )
                    values (%s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                    on conflict (analysis_run_id, symbol_id) do update
                    set sentiment = excluded.sentiment,
                        direction = excluded.direction,
                        magnitude = excluded.magnitude,
                        confidence = excluded.confidence,
                        time_horizon = excluded.time_horizon,
                        rationale = excluded.rationale,
                        updated_at = now()
                    """,
                    (
                        analysis_run_id,
                        symbol_id,
                        impact.sentiment,
                        impact.direction,
                        impact.magnitude,
                        impact.confidence,
                        impact.time_horizon,
                        impact.rationale,
                    ),
                )

        connection.commit()

    return result.model_copy(
        update={
            "analysis_run_id": analysis_run_id,
            "analysis_version": next_version,
        }
    )
