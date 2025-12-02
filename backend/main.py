from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import httpx
from datetime import datetime

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

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
