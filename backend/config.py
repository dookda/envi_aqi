"""
Application Configuration
"""

from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True
    
    # Database
    database_url: str = "postgresql://aqi_user:aqi_password@localhost:5432/aqi_database"
    
    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    
    # Ollama Configuration
    ollama_base_url: str = "http://ollama:11434"
    ollama_model: str = "llama3.2"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_timeout: int = 180  # 3 minutes for slow LLM responses
    
    # Chat Configuration
    max_context_messages: int = 10
    max_tokens: int = 2048
    temperature: float = 0.7
    
    # RAG Configuration
    embedding_dimension: int = 768
    top_k_results: int = 5
    similarity_threshold: float = 0.7
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
