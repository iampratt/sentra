import json
from abc import ABC, abstractmethod

from groq import Groq

from api.config import get_settings
from api.models.analysis import AnalysisEventPayload, AnalysisRunResult, SymbolImpactAnalysis


class AnalysisProvider(ABC):
    @abstractmethod
    def analyze_event(self, payload: AnalysisEventPayload) -> AnalysisRunResult:
        raise NotImplementedError


class GroqAnalysisProvider(AnalysisProvider):
    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile") -> None:
        self.client = Groq(api_key=api_key)
        self.model = model

    def analyze_event(self, payload: AnalysisEventPayload) -> AnalysisRunResult:
        if not payload.linked_symbols:
            return AnalysisRunResult(
                provider="groq",
                model=self.model,
                event_id=payload.event_id,
                impacts=[],
                provider_status="ok",
            )

        prompt = {
            "event": payload.model_dump(mode="json"),
            "task": (
                "Return strict JSON with key 'impacts'. Each impact must include ticker, exchange, market, "
                "sentiment(Bullish|Bearish|Neutral), direction(Up|Down|Mixed), magnitude(Low|Medium|High), "
                "confidence(0..1), time_horizon(intraday|1-3d|3-7d|1-2w), rationale."
            ),
        }

        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a financial event analysis model. Output valid JSON only."},
                {"role": "user", "content": json.dumps(prompt)},
            ],
        )

        content = response.choices[0].message.content or '{"impacts":[]}'
        parsed = json.loads(content)
        impacts = [SymbolImpactAnalysis.model_validate(item) for item in parsed.get("impacts", [])]

        return AnalysisRunResult(
            provider="groq",
            model=self.model,
            event_id=payload.event_id,
            impacts=impacts,
            provider_status="ok",
        )


class StubAnalysisProvider(AnalysisProvider):
    def analyze_event(self, payload: AnalysisEventPayload) -> AnalysisRunResult:
        return AnalysisRunResult(
            provider="stub",
            model="local-stub",
            event_id=payload.event_id,
            impacts=[],
            provider_status="stubbed",
            error="No analysis provider configured.",
        )


def get_analysis_provider() -> AnalysisProvider:
    settings = get_settings()
    if settings.groq_api_key:
        return GroqAnalysisProvider(api_key=settings.groq_api_key)
    return StubAnalysisProvider()
