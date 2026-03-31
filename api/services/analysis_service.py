from psycopg import connect
from psycopg.rows import dict_row

from api.config import get_settings
from api.models.analysis import AnalysisCandidateSymbol, AnalysisEventPayload, AnalysisRunResult
from api.services.analysis_provider import get_analysis_provider


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
            )

            provider = get_analysis_provider()
            result = provider.analyze_event(payload)

            for impact in result.impacts:
                cursor.execute(
                    """
                    update event_symbol_impacts esi
                    set
                      sentiment = %s,
                      direction = %s,
                      magnitude = %s,
                      confidence = %s,
                      time_horizon = %s,
                      rationale = %s
                    from symbols s
                    where esi.symbol_id = s.id
                      and esi.event_id::text = %s
                      and s.ticker = %s
                      and s.exchange = %s
                    """,
                    (
                        impact.sentiment,
                        impact.direction,
                        impact.magnitude,
                        impact.confidence,
                        impact.time_horizon,
                        impact.rationale,
                        event_id,
                        impact.ticker,
                        impact.exchange,
                    ),
                )

        connection.commit()

    return result
