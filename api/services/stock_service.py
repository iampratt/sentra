from datetime import UTC, datetime

import yfinance as yf
from psycopg import connect
from psycopg.rows import dict_row

from api.config import get_settings
from api.models.stock import AnalysisReference, EventPriceContextResult, LatestAnalysisSummary, StockPriceContext

YAHOO_SUFFIX_BY_EXCHANGE: dict[str, str] = {
    "ASX": ".AX",
    "KRX": ".KS",
    "LSE": ".L",
    "OMXC": ".CO",
    "XETRA": ".DE",
}
CACHE_TTL_MINUTES = 30
ERROR_CACHE_TTL_MINUTES = 5
LOW_CONFIDENCE_THRESHOLD = 0.6


def _provider_symbol(ticker: str, exchange: str) -> str:
    suffix = YAHOO_SUFFIX_BY_EXCHANGE.get(exchange.upper(), "")
    return f"{ticker}{suffix}"


def _fetch_price_context_batch(requests: list[dict[str, str | None]]) -> dict[str, StockPriceContext]:
    provider_symbols = [request["provider_symbol"] for request in requests]
    results: dict[str, StockPriceContext] = {}

    try:
        history = yf.download(
            tickers=" ".join(provider_symbols),
            period="5d",
            interval="1d",
            auto_adjust=False,
            progress=False,
            threads=False,
            group_by="ticker",
        )
    except Exception as error:
        for request in requests:
            provider_symbol = str(request["provider_symbol"])
            results[provider_symbol] = StockPriceContext(
                ticker=str(request["ticker"]),
                exchange=str(request["exchange"]),
                market=str(request["market"]),
                currency=request["currency"],
                provider_symbol=provider_symbol,
                sentiment=None,
                direction=None,
                magnitude=None,
                confidence=None,
                time_horizon=None,
                rationale=None,
                status="error",
                error=str(error),
            )
        return results

    for request in requests:
        provider_symbol = str(request["provider_symbol"])
        ticker = str(request["ticker"])
        exchange = str(request["exchange"])
        market = str(request["market"])
        currency = request["currency"]

        try:
            ticker_frame = history if len(provider_symbols) == 1 else history[provider_symbol]
            closes = ticker_frame["Close"].dropna()

            if closes.empty:
                results[provider_symbol] = StockPriceContext(
                    ticker=ticker,
                    exchange=exchange,
                    market=market,
                    currency=currency,
                    provider_symbol=provider_symbol,
                    sentiment=None,
                    direction=None,
                    magnitude=None,
                    confidence=None,
                    time_horizon=None,
                    rationale=None,
                    status="unavailable",
                    error="No recent close prices returned by provider.",
                )
                continue

            last_close = float(closes.iloc[-1])
            previous_close = float(closes.iloc[-2]) if len(closes) > 1 else None
            change_percent = None
            if previous_close and previous_close != 0:
                change_percent = ((last_close - previous_close) / previous_close) * 100

            last_index = closes.index[-1]
            last_trading_at = last_index.to_pydatetime() if hasattr(last_index, "to_pydatetime") else datetime.now(UTC)

            results[provider_symbol] = StockPriceContext(
                ticker=ticker,
                exchange=exchange,
                market=market,
                currency=currency,
                provider_symbol=provider_symbol,
                last_close=last_close,
                previous_close=previous_close,
                change_percent=change_percent,
                last_trading_at=last_trading_at,
                sentiment=None,
                direction=None,
                magnitude=None,
                confidence=None,
                time_horizon=None,
                rationale=None,
                status="ok",
            )
        except Exception as error:
            results[provider_symbol] = StockPriceContext(
                ticker=ticker,
                exchange=exchange,
                market=market,
                currency=currency,
                provider_symbol=provider_symbol,
                sentiment=None,
                direction=None,
                magnitude=None,
                confidence=None,
                time_horizon=None,
                rationale=None,
                status="error",
                error=str(error),
            )

    return results


def _load_cached_context(cursor, provider_symbol: str) -> StockPriceContext | None:
    cursor.execute(
        """
        select
          ticker,
          exchange,
          market,
          currency,
          provider_symbol,
          last_close,
          previous_close,
          change_percent,
          last_trading_at,
          status,
          error,
          fetched_at
        from stock_price_cache
        where provider_symbol = %s
        limit 1
        """,
        (provider_symbol,),
    )
    row = cursor.fetchone()
    if not row:
        return None

    fetched_at = row["fetched_at"]
    ttl_minutes = ERROR_CACHE_TTL_MINUTES if row["status"] == "error" else CACHE_TTL_MINUTES
    is_fresh = fetched_at and (datetime.now(UTC) - fetched_at).total_seconds() < ttl_minutes * 60

    if not is_fresh:
        return None

    return StockPriceContext(
        ticker=row["ticker"],
        exchange=row["exchange"],
        market=row["market"],
        currency=row["currency"],
        provider_symbol=row["provider_symbol"],
        last_close=row["last_close"],
        previous_close=row["previous_close"],
        change_percent=row["change_percent"],
        last_trading_at=row["last_trading_at"],
        sentiment=None,
        direction=None,
        magnitude=None,
        confidence=None,
        time_horizon=None,
        rationale=None,
        status=row["status"],
        error=row["error"],
    )


def _store_cached_context(cursor, context: StockPriceContext) -> None:
    cursor.execute(
        """
        insert into stock_price_cache (
          provider_symbol,
          ticker,
          exchange,
          market,
          currency,
          last_close,
          previous_close,
          change_percent,
          last_trading_at,
          status,
          error,
          fetched_at,
          updated_at
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
        on conflict (provider_symbol) do update
        set ticker = excluded.ticker,
            exchange = excluded.exchange,
            market = excluded.market,
            currency = excluded.currency,
            last_close = excluded.last_close,
            previous_close = excluded.previous_close,
            change_percent = excluded.change_percent,
            last_trading_at = excluded.last_trading_at,
            status = excluded.status,
            error = excluded.error,
            fetched_at = now(),
            updated_at = now()
        """,
        (
            context.provider_symbol,
            context.ticker,
            context.exchange,
            context.market,
            context.currency,
            context.last_close,
            context.previous_close,
            context.change_percent,
            context.last_trading_at,
            context.status,
            context.error,
        ),
    )


def get_event_price_context(event_id: str) -> EventPriceContextResult:
    settings = get_settings()

    with connect(settings.database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                select
                  id::text as analysis_run_id,
                  analysis_version,
                  provider,
                  model,
                  provider_status,
                  error
                from analysis_runs
                where event_id::text = %s
                  and is_active = true
                order by analysis_version desc, created_at desc
                limit 1
                """,
                (event_id,),
            )
            latest_analysis_row = cursor.fetchone()

            supporting_references: list[AnalysisReference] = []
            if latest_analysis_row:
                cursor.execute(
                    """
                    select
                      are.related_event_id::text as event_id,
                      are.point_id,
                      are.score,
                      are.title,
                      are.summary,
                      are.canonical_url,
                      are.published_at::text as published_at,
                      are.region,
                      are.country,
                      are.content_type
                    from analysis_related_events are
                    where are.analysis_run_id::text = %s
                    order by are.score desc, are.created_at asc
                    """,
                    (latest_analysis_row["analysis_run_id"],),
                )
                reference_rows = cursor.fetchall()
                supporting_references = [
                    AnalysisReference(
                        event_id=row["event_id"],
                        point_id=row["point_id"],
                        score=float(row["score"]),
                        title=row["title"],
                        summary=row["summary"],
                        canonical_url=row["canonical_url"],
                        published_at=row["published_at"],
                        region=row["region"],
                        country=row["country"],
                        content_type=row["content_type"],
                    )
                    for row in reference_rows
                ]

            cursor.execute(
                """
                select
                  s.ticker,
                  s.exchange,
                  s.market,
                  s.currency,
                  %s::integer as analysis_version,
                  ai.sentiment,
                  ai.direction,
                  ai.magnitude,
                  ai.confidence,
                  ai.time_horizon,
                  ai.rationale
                from event_symbol_impacts esi
                inner join symbols s on s.id = esi.symbol_id
                left join analysis_impacts ai
                  on ai.analysis_run_id = %s::uuid
                 and ai.symbol_id = s.id
                where esi.event_id::text = %s
                order by s.market asc, s.exchange asc, s.ticker asc
                """,
                (
                    latest_analysis_row["analysis_version"] if latest_analysis_row else None,
                    latest_analysis_row["analysis_run_id"] if latest_analysis_row else None,
                    event_id,
                ),
            )
            rows = cursor.fetchall()

            cached_or_pending: list[StockPriceContext] = []
            fetch_requests: list[dict[str, str | None]] = []

            for row in rows:
                provider_symbol = _provider_symbol(row["ticker"], row["exchange"])
                cached = _load_cached_context(cursor, provider_symbol)
                if cached:
                    cached_or_pending.append(cached)
                    continue

                fetch_requests.append(
                    {
                        "ticker": row["ticker"],
                        "exchange": row["exchange"],
                        "market": row["market"],
                        "currency": row["currency"],
                        "provider_symbol": provider_symbol,
                    }
                )

            fetched_map = _fetch_price_context_batch(fetch_requests) if fetch_requests else {}
            for context in fetched_map.values():
                _store_cached_context(cursor, context)

            symbols: list[StockPriceContext] = []
            merged_contexts = {context.provider_symbol: context for context in [*cached_or_pending, *fetched_map.values()]}

            for row in rows:
                provider_symbol = _provider_symbol(row["ticker"], row["exchange"])
                base_context = merged_contexts.get(provider_symbol)
                if not base_context:
                    continue

                symbols.append(
                    base_context.model_copy(
                        update={
                            "sentiment": row["sentiment"],
                            "direction": row["direction"],
                            "magnitude": row["magnitude"],
                            "confidence": float(row["confidence"]) if row["confidence"] is not None else None,
                            "time_horizon": row["time_horizon"],
                            "rationale": row["rationale"],
                            "analysis_version": int(row["analysis_version"]) if row["analysis_version"] is not None else None,
                        }
                    )
                )

        connection.commit()

    impacted_symbols = sum(1 for symbol in symbols if symbol.direction is not None)
    low_confidence_symbols = sum(
        1
        for symbol in symbols
        if symbol.confidence is not None and symbol.confidence < LOW_CONFIDENCE_THRESHOLD
    )

    if latest_analysis_row is None:
        latest_analysis = LatestAnalysisSummary(
            state="not_run",
            impacted_symbols=impacted_symbols,
            low_confidence_symbols=low_confidence_symbols,
        )
    else:
        provider_status = latest_analysis_row["provider_status"]
        if provider_status != "ok":
            state = "failed"
        elif impacted_symbols == 0:
            state = "no_impact"
        elif impacted_symbols > 0 and impacted_symbols == low_confidence_symbols:
            state = "low_confidence"
        else:
            state = "ok"

        latest_analysis = LatestAnalysisSummary(
            analysis_run_id=latest_analysis_row["analysis_run_id"],
            analysis_version=int(latest_analysis_row["analysis_version"]),
            provider=latest_analysis_row["provider"],
            model=latest_analysis_row["model"],
            provider_status=provider_status,
            error=latest_analysis_row["error"],
            state=state,
            impacted_symbols=impacted_symbols,
            low_confidence_symbols=low_confidence_symbols,
            supporting_references=supporting_references,
        )

    return EventPriceContextResult(
        event_id=event_id,
        latest_analysis=latest_analysis,
        symbols=symbols,
    )
