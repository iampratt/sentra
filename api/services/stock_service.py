from datetime import UTC, datetime

import yfinance as yf
from psycopg import connect
from psycopg.rows import dict_row

from api.config import get_settings
from api.models.stock import EventPriceContextResult, StockPriceContext

YAHOO_SUFFIX_BY_EXCHANGE: dict[str, str] = {
    "ASX": ".AX",
    "KRX": ".KS",
    "LSE": ".L",
    "OMXC": ".CO",
    "XETRA": ".DE",
}
CACHE_TTL_MINUTES = 30
ERROR_CACHE_TTL_MINUTES = 5


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
                status="ok",
            )
        except Exception as error:
            results[provider_symbol] = StockPriceContext(
                ticker=ticker,
                exchange=exchange,
                market=market,
                currency=currency,
                provider_symbol=provider_symbol,
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
                  s.ticker,
                  s.exchange,
                  s.market,
                  s.currency
                from event_symbol_impacts esi
                inner join symbols s on s.id = esi.symbol_id
                where esi.event_id::text = %s
                order by s.market asc, s.exchange asc, s.ticker asc
                """,
                (event_id,),
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

        connection.commit()

    return EventPriceContextResult(
        event_id=event_id,
        symbols=[
            *cached_or_pending,
            *fetched_map.values(),
        ],
    )
