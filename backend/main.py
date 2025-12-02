from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
from datetime import datetime
from lstm_gap_filler import fill_air_quality_gaps, TENSORFLOW_AVAILABLE

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

# Air4Thai API endpoint
AIR4THAI_BASE_URL = "http://air4thai.com/forweb/getHistoryData.php"

@app.get("/")
async def root():
    return {"message": "Air4Thai API Backend", "version": "1.0.0"}

@app.post("/api/air-quality")
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

@app.get("/api/stations", response_model=List[Station])
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

@app.get("/api/parameters", response_model=List[Parameter])
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

@app.post("/api/fill-gaps")
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

@app.post("/api/air-quality-with-gaps-filled")
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

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "tensorflow_available": TENSORFLOW_AVAILABLE,
        "gap_filling_enabled": TENSORFLOW_AVAILABLE
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
