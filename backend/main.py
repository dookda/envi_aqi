from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
from datetime import datetime
import os
from lstm_gap_filler import fill_air_quality_gaps, TENSORFLOW_AVAILABLE

# Import new AI services
try:
    from enhanced_lstm_model import EnhancedLSTMModel, fill_air_quality_gaps_enhanced
    from anomaly_detector import AnomalyDetector, detect_anomalies
    from chatbot_service import AirQualityChatbot, create_chatbot
    ENHANCED_AI_AVAILABLE = True
    CHATBOT_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Enhanced AI services not available: {e}")
    ENHANCED_AI_AVAILABLE = False
    CHATBOT_AVAILABLE = False

app = FastAPI(title="Air4Thai API Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class AirQualityRequest(BaseModel):
    stationID: str
    param: str
    startDate: str
    endDate: str

class Station(BaseModel):
    id: str
    name: str
    lat: float
    lon: float

class Parameter(BaseModel):
    id: str
    name: str
    unit: str
    color: str

class GapFillRequest(BaseModel):
    data: List[Dict[str, Any]]
    value_column: str = "PM25"
    sequence_length: int = 24

class EnhancedGapFillRequest(BaseModel):
    data: List[Dict[str, Any]]
    value_column: str = "PM25"
    sequence_length: int = 24
    model_name: str = "enhanced_lstm_pm25"

class AnomalyDetectionRequest(BaseModel):
    data: List[Dict[str, Any]]
    value_column: str = "PM25"
    param_type: str = "PM25"

class ChatbotRequest(BaseModel):
    query: str
    data: Optional[List[Dict[str, Any]]] = None
    param: str = "PM25"
    station: str = "the station"
    backend: str = "rule-based"

# Air4Thai API endpoint
AIR4THAI_BASE_URL = "http://air4thai.com/forweb/getHistoryData.php"

@app.get("/")
async def root():
    return {"message": "Air4Thai API Backend", "version": "1.0.0"}

@app.post("/enviapi/air-quality")
async def get_air_quality_data(request: AirQualityRequest):
    """
    Fetch air quality data from Air4Thai API
    """
    try:
        params = {
            "stationID": request.stationID,
            "param": request.param,
            "type": "hr",
            "sdate": request.startDate,
            "edate": request.endDate,
            "stime": "00",
            "etime": "23"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(AIR4THAI_BASE_URL, params=params)
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data from Air4Thai: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/enviapi/stations", response_model=List[Station])
async def get_stations():
    """
    Get list of monitoring stations
    """
    return [
        {"id": "01t", "name": "Bang Khen, Bangkok", "lat": 13.8267, "lon": 100.6105},
        {"id": "02t", "name": "Bang Khun Thian, Bangkok", "lat": 13.6447, "lon": 100.4225},
        {"id": "03t", "name": "Bang Na, Bangkok", "lat": 13.6683, "lon": 100.6039},
        {"id": "04t", "name": "Boom Rung Muang, Bangkok", "lat": 13.7486, "lon": 100.5092},
        {"id": "05t", "name": "Chom Thong, Bangkok", "lat": 13.6803, "lon": 100.4372},
        {"id": "50t", "name": "Chiang Mai", "lat": 18.7883, "lon": 98.9853},
        {"id": "52t", "name": "Lampang", "lat": 18.2886, "lon": 99.4919},
        {"id": "54t", "name": "Lamphun", "lat": 18.5744, "lon": 99.0083},
    ]

@app.get("/enviapi/parameters", response_model=List[Parameter])
async def get_parameters():
    """
    Get available parameters for air quality measurement
    """
    return [
        {"id": "PM25", "name": "PM2.5", "unit": "μg/m³", "color": "#ff6b6b"},
        {"id": "PM10", "name": "PM10", "unit": "μg/m³", "color": "#4ecdc4"},
        {"id": "O3", "name": "Ozone (O3)", "unit": "ppb", "color": "#45b7d1"},
        {"id": "CO", "name": "Carbon Monoxide (CO)", "unit": "ppm", "color": "#f9ca24"},
        {"id": "NO2", "name": "Nitrogen Dioxide (NO2)", "unit": "ppb", "color": "#95afc0"},
        {"id": "SO2", "name": "Sulfur Dioxide (SO2)", "unit": "ppb", "color": "#eb4d4b"}
    ]

@app.post("/enviapi/fill-gaps")
async def fill_gaps(request: GapFillRequest):
    """
    Fill gaps in air quality data using LSTM model (Example 1: Random 25% pattern)

    This endpoint uses the LSTM model from Complete_AirQuality_DeepLearning.ipynb
    to fill missing values in time series data.

    Request body:
    - data: List of data points with DATETIMEDATA and value fields
    - value_column: Column name containing values (default: PM25)
    - sequence_length: LSTM sequence length (default: 24 hours)

    Returns:
    - Filled data with additional fields:
      - filled_value: Original or predicted value
      - predicted_value: LSTM prediction
      - was_gap: Boolean indicating if value was filled
      - gap_filled: Same as was_gap
    """
    if not TENSORFLOW_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="TensorFlow not available. Install dependencies: pip install tensorflow scikit-learn pandas numpy"
        )

    try:
        # Fill gaps using LSTM
        filled_data = fill_air_quality_gaps(
            request.data,
            value_column=request.value_column,
            sequence_length=request.sequence_length
        )

        return {
            "success": True,
            "data": filled_data,
            "message": f"Gap filling complete using LSTM (Example 1 model)",
            "tensorflow_available": TENSORFLOW_AVAILABLE
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error filling gaps: {str(e)}")

@app.post("/enviapi/air-quality-with-gaps-filled")
async def get_air_quality_with_gaps_filled(request: AirQualityRequest):
    """
    Fetch air quality data and automatically fill any gaps using LSTM

    This is a convenience endpoint that combines data fetching and gap filling.
    """
    if not TENSORFLOW_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="TensorFlow not available. Gap filling disabled."
        )

    try:
        # Fetch data from Air4Thai
        params = {
            "stationID": request.stationID,
            "param": request.param,
            "type": "hr",
            "sdate": request.startDate,
            "edate": request.endDate,
            "stime": "00",
            "etime": "23"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(AIR4THAI_BASE_URL, params=params)
            response.raise_for_status()
            api_response = response.json()

        # Extract data
        if api_response.get('result') == 'OK' and 'stations' in api_response:
            station_data = api_response['stations'][0]['data']

            # Fill gaps
            filled_data = fill_air_quality_gaps(
                station_data,
                value_column=request.param,
                sequence_length=24
            )

            return {
                "result": "OK",
                "stations": [{
                    "data": filled_data
                }],
                "gaps_filled": True,
                "original_response": api_response
            }
        else:
            return api_response

    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/enviapi/enhanced-gap-filling")
async def enhanced_gap_filling(request: EnhancedGapFillRequest):
    """
    Fill gaps using Enhanced LSTM model with 95%+ accuracy target

    This endpoint uses the production-ready Enhanced LSTM model with:
    - Bidirectional LSTM layers
    - Multi-head self-attention mechanism
    - 17 comprehensive features
    - Target accuracy: ≥95% (predictions within ±5% of actual)

    Request body:
    - data: List of data points with DATETIMEDATA and value fields
    - value_column: Column name containing values (default: PM25)
    - sequence_length: LSTM sequence length (default: 24 hours)
    - model_name: Name of saved model to load (default: enhanced_lstm_pm25)

    Returns:
    - Filled data with confidence scores and metadata
    """
    if not ENHANCED_AI_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Enhanced AI services not available. Install dependencies: pip install tensorflow scikit-learn"
        )

    try:
        # Use enhanced LSTM model
        filled_data = fill_air_quality_gaps_enhanced(
            request.data,
            value_column=request.value_column,
            sequence_length=request.sequence_length,
            model_path='models'
        )

        # Count gaps filled
        gaps_filled = sum(1 for record in filled_data if record.get('gap_filled', False))

        return {
            "success": True,
            "data": filled_data,
            "message": f"Enhanced LSTM gap filling complete (95%+ accuracy target)",
            "gaps_filled": gaps_filled,
            "total_points": len(filled_data),
            "model_type": "Enhanced LSTM + Attention"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in enhanced gap filling: {str(e)}")

@app.post("/enviapi/detect-anomalies")
async def detect_anomalies_endpoint(request: AnomalyDetectionRequest):
    """
    Detect anomalies using multi-method approach

    Combines three detection methods:
    1. Statistical (Z-score, IQR)
    2. Machine Learning (Isolation Forest)
    3. Domain-specific (WHO Air Quality thresholds)

    Request body:
    - data: List of data points with DATETIMEDATA and value fields
    - value_column: Column name to analyze (default: PM25)
    - param_type: Parameter type for thresholds (default: PM25)

    Returns:
    - Detailed anomaly analysis with combined scores
    - Health level classifications
    - Statistical summaries
    """
    if not ENHANCED_AI_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Enhanced AI services not available. Install dependencies: pip install scikit-learn"
        )

    try:
        # Detect anomalies
        results = detect_anomalies(
            request.data,
            value_column=request.value_column,
            param_type=request.param_type
        )

        return {
            "success": True,
            "results": results,
            "message": "Anomaly detection complete"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in anomaly detection: {str(e)}")

@app.get("/enviapi/anomaly-summary")
async def get_anomaly_summary(stationID: str, param: str, startDate: str, endDate: str):
    """
    Get anomaly summary for a station and parameter

    Fetches data from Air4Thai and returns anomaly statistics

    Query parameters:
    - stationID: Station identifier
    - param: Parameter to analyze (PM25, PM10, O3, etc.)
    - startDate: Start date (YYYY-MM-DD)
    - endDate: End date (YYYY-MM-DD)

    Returns:
    - Anomaly statistics
    - Health level distribution
    - Hazardous points summary
    """
    if not ENHANCED_AI_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Enhanced AI services not available"
        )

    try:
        # Fetch data from Air4Thai
        params = {
            "stationID": stationID,
            "param": param,
            "type": "hr",
            "sdate": startDate,
            "edate": endDate,
            "stime": "00",
            "etime": "23"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(AIR4THAI_BASE_URL, params=params)
            response.raise_for_status()
            api_response = response.json()

        # Extract data
        if api_response.get('result') == 'OK' and 'stations' in api_response:
            station_data = api_response['stations'][0]['data']

            # Detect anomalies
            results = detect_anomalies(station_data, value_column=param, param_type=param)

            # Create summary
            summary = {
                "stationID": stationID,
                "param": param,
                "period": {
                    "start": startDate,
                    "end": endDate
                },
                "total_points": results.get('total_points', 0),
                "anomaly_counts": results.get('summary', {}),
                "thresholds": results.get('domain', {}).get('thresholds', {}),
                "statistics": results.get('statistical', {}).get('stats', {})
            }

            return {
                "success": True,
                "summary": summary
            }
        else:
            raise HTTPException(status_code=404, detail="No data found")

    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/enviapi/model-metrics")
async def get_model_metrics(model_name: str = "enhanced_lstm_pm25"):
    """
    Get model performance metrics and metadata

    Query parameters:
    - model_name: Name of the model (default: enhanced_lstm_pm25)

    Returns:
    - Training performance metrics
    - Model architecture details
    - Accuracy statistics
    """
    if not ENHANCED_AI_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Enhanced AI services not available"
        )

    try:
        import json
        metadata_file = os.path.join('models', f'{model_name}_metadata.json')

        if not os.path.exists(metadata_file):
            return {
                "success": False,
                "message": "Model not trained yet. Run training script first.",
                "model_exists": False
            }

        # Load metadata
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)

        # Check if model file exists
        model_file = os.path.join('models', f'{model_name}.keras')
        model_exists = os.path.exists(model_file)

        return {
            "success": True,
            "model_exists": model_exists,
            "model_name": model_name,
            "metadata": metadata,
            "files": {
                "model": model_file,
                "metadata": metadata_file,
                "scaler": os.path.join('models', f'{model_name}_scaler.npy')
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading model metrics: {str(e)}")

@app.post("/enviapi/chatbot")
async def chatbot_query(request: ChatbotRequest):
    """
    AI Chatbot for air quality Q&A

    This endpoint provides an intelligent chatbot that can answer questions about:
    - Current pollution levels
    - Historical trends and patterns
    - Health recommendations
    - AQI categories and meanings
    - Data analysis and insights

    Request body:
    - query: User's question
    - data: Optional air quality data for context
    - param: Parameter name (default: PM25)
    - station: Station name for context (default: "the station")
    - backend: Chatbot backend ('rule-based', 'openai', 'anthropic')

    Returns:
    - AI-generated response
    - Data analysis (if data provided)
    - Conversation metadata
    """
    if not CHATBOT_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Chatbot service not available"
        )

    try:
        # Create chatbot instance
        chatbot = create_chatbot(backend=request.backend)

        # Generate response
        response = chatbot.chat(
            query=request.query,
            data=request.data,
            param=request.param,
            station=request.station
        )

        return {
            "success": True,
            "query": response['query'],
            "response": response['response'],
            "analysis": response.get('analysis'),
            "backend": response['backend'],
            "timestamp": response['timestamp']
        }

    except ValueError as e:
        # API key issues
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chatbot error: {str(e)}")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "tensorflow_available": TENSORFLOW_AVAILABLE,
        "enhanced_ai_available": ENHANCED_AI_AVAILABLE,
        "chatbot_available": CHATBOT_AVAILABLE,
        "gap_filling_enabled": TENSORFLOW_AVAILABLE,
        "anomaly_detection_enabled": ENHANCED_AI_AVAILABLE
    }

@app.get("/enviapi/env")
async def env_info():
    """Environment and service information endpoint"""
    return {
        "service": "Air4Thai API",
        "version": "1.0.0",
        "environment": os.getenv("DEBUG", "False") == "False" and "production" or "development",
        "port": os.getenv("API_PORT", "8000"),
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "features": {
            "tensorflow": TENSORFLOW_AVAILABLE,
            "enhanced_ai": ENHANCED_AI_AVAILABLE,
            "chatbot": CHATBOT_AVAILABLE,
            "gap_filling": TENSORFLOW_AVAILABLE,
            "anomaly_detection": ENHANCED_AI_AVAILABLE
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
