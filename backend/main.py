"""
AQI Chat AI - FastAPI Backend
Local AI-powered assistant for Air Quality Index historical data
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from config import settings
from db.database import init_db, close_db
from routers import chat, aqi, stations, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle manager"""
    logger.info("🚀 Starting AQI Chat AI Backend...")
    
    # Initialize database connection
    await init_db()
    logger.info("✅ Database connection established")
    
    yield
    
    # Cleanup
    await close_db()
    logger.info("👋 Shutting down AQI Chat AI Backend")


# Create FastAPI application
app = FastAPI(
    title="AQI Chat AI",
    description="Local AI-powered assistant for Air Quality Index historical data analysis",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
origins = settings.cors_origins.split(",") if settings.cors_origins else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.debug else "An unexpected error occurred"
        }
    )


# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat AI"])
app.include_router(aqi.router, prefix="/api/v1/aqi", tags=["AQI Data"])
app.include_router(stations.router, prefix="/api/v1/stations", tags=["Stations"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "AQI Chat AI",
        "version": "1.0.0",
        "description": "Local AI-powered assistant for Air Quality Index data",
        "docs": "/docs",
        "health": "/health",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )
