"""
Chat AI Router
Handles chat interactions with the local AI for AQI data queries
"""

import json
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field
from loguru import logger

from db import get_db
from config import settings
from services.ollama_service import ollama_service
from services.aqi_query_service import aqi_query_service

router = APIRouter()


# System prompts
SYSTEM_PROMPT = """You are AQI Assistant (ผู้ช่วย AQI), an expert AI assistant specialized in Air Quality Index (AQI) data analysis for Thailand. You help users understand historical air quality data, pollution levels, and their health implications.

## Your Capabilities:
1. **Data Analysis**: Analyze AQI measurements, PM2.5, PM10, O3, CO, NO2, SO2 levels
2. **Location Awareness**: Knowledge of Thai provinces and monitoring stations
3. **Time-based Analysis**: Compare data across different time periods
4. **Health Guidance**: Explain AQI levels and health recommendations
5. **Bilingual Support**: Respond in Thai or English based on user's language

## AQI Level Reference:
- 0-50 (Green): Good - Air quality is satisfactory
- 51-100 (Yellow): Moderate - Acceptable, some concern for sensitive individuals
- 101-150 (Orange): Unhealthy for Sensitive Groups - May affect sensitive people
- 151-200 (Red): Unhealthy - Everyone may begin to experience health effects
- 201-300 (Purple): Very Unhealthy - Health alert for everyone
- 301-500 (Maroon): Hazardous - Health emergency

## Guidelines:
- Always base your answers on the provided data context
- If data is not available, clearly state this
- Provide specific numbers and dates when available
- Explain technical terms in simple language
- Add health recommendations when AQI is unhealthy
- Be concise but informative

## Response Format:
- Use clear headings and bullet points
- Highlight concerning values
- Include relevant context about the data period
- Suggest follow-up questions if appropriate"""


class ChatMessage(BaseModel):
    """Chat message model"""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Chat request model"""
    message: str = Field(..., description="User message")
    session_id: Optional[str] = Field(None, description="Chat session ID for context")
    include_context: bool = Field(True, description="Include AQI data context")
    stream: bool = Field(False, description="Stream the response")


class ChatResponse(BaseModel):
    """Chat response model"""
    session_id: str
    message: str
    context_used: Optional[dict] = None
    chart_data: Optional[dict] = Field(None, description="Chart data for visualization if requested")
    timestamp: str


class ChatSession(BaseModel):
    """Chat session model"""
    id: str
    name: Optional[str]
    created_at: str
    message_count: int


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message to the AI assistant and get a response.
    
    The assistant uses RAG (Retrieval-Augmented Generation) to fetch relevant 
    AQI data based on your query before generating a response.
    """
    
    # Get or create session ID
    session_id = request.session_id or str(uuid.uuid4())
    
    # Get conversation history if session exists
    history = await _get_session_history(db, session_id, limit=settings.max_context_messages)
    
    # Retrieve relevant AQI data context
    context = None
    context_text = ""
    
    if request.include_context:
        try:
            context = await aqi_query_service.get_relevant_data(request.message, db)
            context_text = aqi_query_service.format_context_for_llm(context)
            logger.debug(f"Retrieved context: {context.get('intent')}")
        except Exception as e:
            logger.error(f"Failed to retrieve context: {e}")
    
    # Detect if user wants a chart
    chart_keywords = ['chart', 'graph', 'plot', 'trend', 'visualize', 'visualization', 'show me', 
                      'กราฟ', 'แผนภูมิ', 'แนวโน้ม', 'แสดง']
    wants_chart = any(kw in request.message.lower() for kw in chart_keywords)
    
    # Build the prompt with context
    chart_instruction = ""
    if wants_chart:
        chart_instruction = "\n\nNote: A chart will be displayed alongside your response. Please describe the data trends you observe."
    
    enhanced_prompt = f"""
{context_text}

## User Question:
{request.message}

Please answer based on the data provided above. If the data doesn't contain relevant information, say so clearly.{chart_instruction}
"""
    
    # Build message history for chat
    messages = history + [{"role": "user", "content": enhanced_prompt}]
    
    # Generate response
    try:
        response = await ollama_service.chat(
            messages=messages,
            system_prompt=SYSTEM_PROMPT,
            temperature=settings.temperature,
            max_tokens=settings.max_tokens
        )
    except Exception as e:
        logger.error(f"Chat generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")
    
    # Prepare chart data if requested and context has data
    chart_data = None
    if wants_chart and context:
        chart_data = _prepare_chart_data(context, request.message)
    
    # Save messages to database
    await _save_message(db, session_id, "user", request.message, context)
    await _save_message(db, session_id, "assistant", response, None)
    
    return ChatResponse(
        session_id=session_id,
        message=response,
        context_used=context if context else None,
        chart_data=chart_data,
        timestamp=datetime.utcnow().isoformat()
    )


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Stream a chat response from the AI assistant.
    
    Returns a Server-Sent Events stream of response tokens.
    """
    
    session_id = request.session_id or str(uuid.uuid4())
    
    # Get conversation history
    history = await _get_session_history(db, session_id, limit=settings.max_context_messages)
    
    # Retrieve context
    context = None
    context_text = ""
    
    if request.include_context:
        try:
            context = await aqi_query_service.get_relevant_data(request.message, db)
            context_text = aqi_query_service.format_context_for_llm(context)
        except Exception as e:
            logger.error(f"Failed to retrieve context: {e}")
    
    # Build enhanced prompt
    enhanced_prompt = f"""
{context_text}

## User Question:
{request.message}

Please answer based on the data provided above.
"""
    
    messages = history + [{"role": "user", "content": enhanced_prompt}]
    
    async def generate():
        full_response = ""
        try:
            async for chunk in ollama_service.chat_stream(
                messages=messages,
                system_prompt=SYSTEM_PROMPT,
                temperature=settings.temperature,
                max_tokens=settings.max_tokens
            ):
                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            
            # Save messages after streaming completes
            await _save_message(db, session_id, "user", request.message, context)
            await _save_message(db, session_id, "assistant", full_response, None)
            
            yield f"data: {json.dumps({'done': True, 'session_id': session_id})}\n\n"
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )


@router.get("/sessions", response_model=List[ChatSession])
async def get_sessions(
    limit: int = Query(default=10, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get list of chat sessions"""
    
    query = """
        SELECT 
            cs.id,
            cs.session_name,
            cs.created_at,
            COUNT(cm.id) as message_count
        FROM chat_sessions cs
        LEFT JOIN chat_messages cm ON cs.id = cm.session_id
        GROUP BY cs.id, cs.session_name, cs.created_at
        ORDER BY cs.updated_at DESC
        LIMIT :limit
    """
    
    result = await db.execute(text(query), {"limit": limit})
    rows = result.fetchall()
    
    return [
        ChatSession(
            id=str(row[0]),
            name=row[1],
            created_at=row[2].isoformat() if row[2] else None,
            message_count=row[3] or 0
        )
        for row in rows
    ]


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    limit: int = Query(default=50, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get messages from a specific session"""
    
    query = """
        SELECT role, content, context_data, created_at
        FROM chat_messages
        WHERE session_id = :session_id
        ORDER BY created_at ASC
        LIMIT :limit
    """
    
    result = await db.execute(text(query), {"session_id": session_id, "limit": limit})
    rows = result.fetchall()
    
    return [
        {
            "role": row[0],
            "content": row[1],
            "context": row[2],
            "timestamp": row[3].isoformat() if row[3] else None
        }
        for row in rows
    ]


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat session and its messages"""
    
    await db.execute(
        text("DELETE FROM chat_sessions WHERE id = :session_id"),
        {"session_id": session_id}
    )
    await db.commit()
    
    return {"message": "Session deleted", "session_id": session_id}


@router.get("/models")
async def get_available_models():
    """Get list of available Ollama models"""
    
    models = await ollama_service.get_available_models()
    return {
        "current_model": settings.ollama_model,
        "embed_model": settings.ollama_embed_model,
        "available_models": models
    }


@router.post("/models/pull")
async def pull_model(model_name: str):
    """Pull a new Ollama model"""
    
    success = await ollama_service.pull_model(model_name)
    
    if success:
        return {"message": f"Model {model_name} pulled successfully"}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to pull model {model_name}")


# Helper functions

async def _get_session_history(
    db: AsyncSession,
    session_id: str,
    limit: int = 10
) -> List[dict]:
    """Get conversation history for a session"""
    
    query = """
        SELECT role, content
        FROM chat_messages
        WHERE session_id = :session_id
        ORDER BY created_at DESC
        LIMIT :limit
    """
    
    result = await db.execute(text(query), {"session_id": session_id, "limit": limit})
    rows = result.fetchall()
    
    # Reverse to get chronological order
    return [{"role": row[0], "content": row[1]} for row in reversed(rows)]


async def _save_message(
    db: AsyncSession,
    session_id: str,
    role: str,
    content: str,
    context: Optional[dict]
):
    """Save a message to the database"""
    
    try:
        # Ensure session exists
        session_check = await db.execute(
            text("SELECT id FROM chat_sessions WHERE id = :session_id"),
            {"session_id": session_id}
        )
        
        if not session_check.fetchone():
            # Create new session
            await db.execute(
                text("""
                    INSERT INTO chat_sessions (id, session_name, created_at, updated_at)
                    VALUES (:session_id, :name, NOW(), NOW())
                """),
                {"session_id": session_id, "name": f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}"}
            )
        else:
            # Update session timestamp
            await db.execute(
                text("UPDATE chat_sessions SET updated_at = NOW() WHERE id = :session_id"),
                {"session_id": session_id}
            )
        
        # Insert message
        await db.execute(
            text("""
                INSERT INTO chat_messages (session_id, role, content, context_data, created_at)
                VALUES (:session_id, :role, :content, :context, NOW())
            """),
            {
                "session_id": session_id,
                "role": role,
                "content": content,
                "context": json.dumps(context) if context else None
            }
        )
        
        await db.commit()
        
    except Exception as e:
        logger.error(f"Failed to save message: {e}")
        await db.rollback()


def _prepare_chart_data(context: dict, user_message: str) -> Optional[dict]:
    """Prepare chart data from the context for visualization"""
    
    if not context:
        return None
    
    intent = context.get("intent", "")
    raw_data = context.get("data", [])
    
    # Handle nested data structure - data might be a dict with a 'data' key or a list
    if isinstance(raw_data, dict):
        # Data might be nested like {"type": "trend", "data": [...]}
        if "data" in raw_data:
            data = raw_data.get("data", [])
        else:
            # It's a single dict, wrap it in a list
            data = [raw_data]
    else:
        data = raw_data if isinstance(raw_data, list) else []
    
    if not data:
        return None
    
    # Determine chart type based on intent and keywords
    chart_type = "line"  # Default to line chart
    message_lower = user_message.lower()
    if any(kw in message_lower for kw in ['compare', 'comparison', 'เปรียบเทียบ', 'vs']):
        chart_type = "bar"
    elif any(kw in message_lower for kw in ['distribution', 'breakdown', 'การกระจาย']):
        chart_type = "bar"
    elif any(kw in message_lower for kw in ['trend', 'history', 'แนวโน้ม', 'ประวัติ', 'time']):
        chart_type = "line"
    
    try:
        # Get data type from raw_data if it's a dict
        data_type = raw_data.get("type", "") if isinstance(raw_data, dict) else ""
        
        # Prepare chart data based on context type
        if intent == "current" or data_type == "current":
            # Bar chart for current AQI readings
            readings = raw_data.get("readings", []) if isinstance(raw_data, dict) else []
            if readings:
                chart_data = {
                    "type": "bar",
                    "title": "Current AQI by Station",
                    "xAxisLabel": "Station",
                    "yAxisLabel": "AQI",
                    "data": [
                        {
                            "name": r.get("station", "Unknown")[:15],
                            "AQI": r.get("aqi") or 0,
                            "PM2.5": r.get("pm25") or 0
                        }
                        for r in readings[:10]
                    ]
                }
                return chart_data if chart_data["data"] else None
        
        elif intent == "trend" or data_type == "trend":
            # Line chart for trend data
            daily_data = raw_data.get("daily_data", []) if isinstance(raw_data, dict) else []
            if daily_data:
                chart_data = {
                    "type": "line",
                    "title": f"AQI Trend ({raw_data.get('period', '')})",
                    "xAxisLabel": "Date",
                    "yAxisLabel": "Value",
                    "data": [
                        {
                            "date": d.get("date", "")[:10],
                            "AQI": d.get("avg_aqi") or 0,
                            "PM2.5": d.get("avg_pm25") or 0
                        }
                        for d in daily_data[:30]
                    ]
                }
                return chart_data if chart_data["data"] else None
        
        elif intent == "history" or data_type == "history":
            # Line chart for historical summary
            summary = raw_data.get("summary", []) if isinstance(raw_data, dict) else []
            if summary:
                # Group by date for aggregation
                date_data = {}
                for entry in summary:
                    date_key = entry.get("date", "")
                    if date_key not in date_data:
                        date_data[date_key] = {"aqi_sum": 0, "pm25_sum": 0, "count": 0}
                    date_data[date_key]["aqi_sum"] += entry.get("avg_aqi") or 0
                    date_data[date_key]["pm25_sum"] += entry.get("avg_pm25") or 0
                    date_data[date_key]["count"] += 1
                
                chart_data = {
                    "type": "line",
                    "title": f"Historical AQI ({raw_data.get('period', '')})",
                    "xAxisLabel": "Date",
                    "yAxisLabel": "Value",
                    "data": [
                        {
                            "date": date_key[:10],
                            "AQI": round(vals["aqi_sum"] / vals["count"], 1) if vals["count"] > 0 else 0,
                            "PM2.5": round(vals["pm25_sum"] / vals["count"], 1) if vals["count"] > 0 else 0
                        }
                        for date_key, vals in sorted(date_data.items())[:30]
                    ]
                }
                return chart_data if chart_data["data"] else None
        
        elif intent == "compare" or data_type == "comparison":
            # Bar chart for province comparison
            provinces = raw_data.get("provinces", []) if isinstance(raw_data, dict) else []
            if provinces:
                chart_data = {
                    "type": "bar",
                    "title": f"Province Comparison ({raw_data.get('period', '')})",
                    "xAxisLabel": "Province",
                    "yAxisLabel": "AQI",
                    "data": [
                        {
                            "name": p.get("province", "Unknown")[:15],
                            "AQI": p.get("avg_aqi") or 0,
                            "PM2.5": p.get("avg_pm25") or 0
                        }
                        for p in provinces[:10]
                    ]
                }
                return chart_data if chart_data["data"] else None
        
        elif intent == "statistics" or data_type == "statistics":
            # Bar chart for statistics
            aqi_data = raw_data.get("aqi", {}) if isinstance(raw_data, dict) else {}
            pm25_data = raw_data.get("pm25", {}) if isinstance(raw_data, dict) else {}
            chart_data = {
                "type": "bar",
                "title": f"Statistics Summary ({raw_data.get('period', '')})",
                "xAxisLabel": "Metric",
                "yAxisLabel": "Value",
                "data": [
                    {"name": "Avg AQI", "AQI": aqi_data.get("average") or 0},
                    {"name": "Max AQI", "AQI": aqi_data.get("max") or 0},
                    {"name": "Avg PM2.5", "PM2.5": pm25_data.get("average") or 0},
                    {"name": "Max PM2.5", "PM2.5": pm25_data.get("max") or 0}
                ]
            }
            return chart_data
        
        # Default: try to create a simple chart from available data
        if data and isinstance(data[0], dict):
            # Check if data has date-like field for line chart
            sample = data[0]
            if any(key in sample for key in ["date", "measured_at", "timestamp"]):
                chart_data = {
                    "type": "line",
                    "title": "AQI Data",
                    "xAxisLabel": "Time",
                    "yAxisLabel": "Value",
                    "data": []
                }
                for item in data[:30]:
                    date_str = item.get("date") or item.get("measured_at") or ""
                    date_label = str(date_str)[:10] if date_str else ""
                    chart_data["data"].append({
                        "date": date_label,
                        "AQI": item.get("aqi") or item.get("aqi_avg") or 0,
                        "PM2.5": item.get("pm25") or item.get("pm25_avg") or 0
                    })
                chart_data["data"].sort(key=lambda x: x.get("date", ""))
                return chart_data if chart_data["data"] else None
            else:
                # Bar chart for other data
                chart_data = {
                    "type": "bar",
                    "title": "AQI Data",
                    "xAxisLabel": "Item",
                    "yAxisLabel": "Value",
                    "data": []
                }
                for i, item in enumerate(data[:10]):
                    name = item.get("station_name") or item.get("name") or f"Item {i+1}"
                    chart_data["data"].append({
                        "name": str(name)[:20],
                        "AQI": item.get("aqi") or item.get("aqi_avg") or 0,
                        "PM2.5": item.get("pm25") or item.get("pm25_avg") or 0
                    })
                return chart_data if chart_data["data"] else None
    
    except Exception as e:
        logger.error(f"Failed to prepare chart data: {e}")
        return None
    
    return None

