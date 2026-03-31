from typing import Literal

from pydantic import BaseModel, Field


AnalysisDirection = Literal["Up", "Down", "Mixed"]
AnalysisSentiment = Literal["Bullish", "Bearish", "Neutral"]
AnalysisMagnitude = Literal["Low", "Medium", "High"]
AnalysisTimeHorizon = Literal["intraday", "1-3d", "3-7d", "1-2w"]


class AnalysisCandidateSymbol(BaseModel):
    ticker: str
    exchange: str
    market: str
    company_name: str


class AnalysisEventPayload(BaseModel):
    event_id: str
    title: str
    summary: str
    category: str | None = None
    region: str | None = None
    country: str | None = None
    linked_symbols: list[AnalysisCandidateSymbol] = Field(default_factory=list)


class SymbolImpactAnalysis(BaseModel):
    ticker: str
    exchange: str
    market: str
    sentiment: AnalysisSentiment
    direction: AnalysisDirection
    magnitude: AnalysisMagnitude
    confidence: float = Field(..., ge=0, le=1)
    time_horizon: AnalysisTimeHorizon
    rationale: str


class AnalysisRunResult(BaseModel):
    provider: str
    model: str
    event_id: str
    analysis_run_id: str | None = None
    analysis_version: int | None = None
    impacts: list[SymbolImpactAnalysis]
    provider_status: str
    error: str | None = None
