from datetime import datetime

from pydantic import BaseModel


class LatestAnalysisSummary(BaseModel):
    analysis_run_id: str | None = None
    analysis_version: int | None = None
    provider: str | None = None
    model: str | None = None
    provider_status: str | None = None
    error: str | None = None
    state: str
    impacted_symbols: int = 0
    low_confidence_symbols: int = 0


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
    latest_analysis: LatestAnalysisSummary
    symbols: list[StockPriceContext]
