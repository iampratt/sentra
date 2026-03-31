from datetime import datetime

from pydantic import BaseModel


class StockPriceContext(BaseModel):
    ticker: str
    exchange: str
    market: str
    currency: str | None = None
    provider_symbol: str
    last_close: float | None = None
    previous_close: float | None = None
    change_percent: float | None = None
    last_trading_at: datetime | None = None
    sentiment: str | None = None
    direction: str | None = None
    magnitude: str | None = None
    confidence: float | None = None
    time_horizon: str | None = None
    rationale: str | None = None
    analysis_version: int | None = None
    status: str
    error: str | None = None


class EventPriceContextResult(BaseModel):
    event_id: str
    symbols: list[StockPriceContext]
