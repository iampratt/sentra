from fastapi import FastAPI


app = FastAPI(
    title="Global News & Stock Impact Dashboard API",
    version="0.1.0",
    description="Backend service for news ingestion, analysis, and stock impact workflows.",
)


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "news-dashboard-api",
    }
