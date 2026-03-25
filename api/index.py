from fastapi import FastAPI

from api.config import get_settings

settings = get_settings()

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
        "environment": settings.app_env,
    }


@app.get("/health/config")
async def config_check() -> dict[str, str | int]:
    return {
        "app_env": settings.app_env,
        "app_host": settings.app_host,
        "app_port": settings.app_port,
        "database_url": settings.database_url,
        "qdrant_url": settings.qdrant_url,
    }
