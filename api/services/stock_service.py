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


def _provider_symbol(ticker: str, exchange: str) -> str:
    suffix = YAHOO_SUFFIX_BY_EXCHANGE.get(exchange.upper(), "")
    return f"{ticker}{suffix}"


def _fetch_price_context(ticker: str, exchange: str, market: str, currency: str | None) -> StockPriceContext:
    provider_symbol = _provider_symbol(ticker, exchange)

    try:
        history = yf.Ticker(provider_symbol).history(period="5d", interval="1d", auto_adjust=False)

        if history.empty or len(history.index) == 0:
          return StockPriceContext(
              ticker=ticker,
              exchange=exchange,
              market=market,
              currency=currency,
              provider_symbol=provider_symbol,
              status="unavailable",
              error="No recent price history returned by provider.",
          )

        closes = history["Close"].dropna()
        if closes.empty:
            return StockPriceContext(
                ticker=ticker,
                exchange=exchange,
                market=market,
                currency=currency,
                provider_symbol=provider_symbol,
                status="unavailable",
                error="Provider response did not include close prices.",
            )

        last_close = float(closes.iloc[-1])
        previous_close = float(closes.iloc[-2]) if len(closes) > 1 else None
        change_percent = None
        if previous_close and previous_close != 0:
            change_percent = ((last_close - previous_close) / previous_close) * 100

        last_index = closes.index[-1]
        last_trading_at = (
            last_index.to_pydatetime() if hasattr(last_index, "to_pydatetime") else datetime.now(UTC)
        )

        return StockPriceContext(
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
        return StockPriceContext(
            ticker=ticker,
            exchange=exchange,
            market=market,
            currency=currency,
            provider_symbol=provider_symbol,
            status="error",
            error=str(error),
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

    return EventPriceContextResult(
        event_id=event_id,
        symbols=[
            _fetch_price_context(
                ticker=row["ticker"],
                exchange=row["exchange"],
                market=row["market"],
                currency=row["currency"],
            )
            for row in rows
        ],
    )
