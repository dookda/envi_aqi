"""
Health check endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import httpx
from loguru import logger

from db import get_db
from config import settings

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Comprehensive health check"""
    status = {
        "status": "healthy",
        "components": {
            "api": "healthy",
            "database": "unknown",
            "ollama": "unknown"
        }
    }
    
    # Check database
    try:
        await db.execute(text("SELECT 1"))
        status["components"]["database"] = "healthy"
    except Exception as e:
        status["components"]["database"] = f"unhealthy: {str(e)}"
        status["status"] = "degraded"
    
    # Check Ollama
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.ollama_base_url}/api/tags",
                timeout=5.0
            )
            if response.status_code == 200:
                status["components"]["ollama"] = "healthy"
                models = response.json().get("models", [])
                status["components"]["ollama_models"] = [m.get("name") for m in models]
            else:
                status["components"]["ollama"] = f"unhealthy: HTTP {response.status_code}"
                status["status"] = "degraded"
    except Exception as e:
        status["components"]["ollama"] = f"unhealthy: {str(e)}"
        status["status"] = "degraded"
    
    return status


@router.get("/ready")
async def readiness_check():
    """Simple readiness check for container orchestration"""
    return {"ready": True}
