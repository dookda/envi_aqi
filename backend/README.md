# Air4Thai API Backend

FastAPI backend service for the Air4Thai Dashboard application.

## Features

- Proxy API for Air4Thai data
- CORS enabled for frontend integration
- Automatic API documentation (Swagger/OpenAPI)
- Async HTTP client for better performance
- Type-safe request/response models with Pydantic

## Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create environment file (optional):
```bash
cp .env.example .env
```

## Running the Server

### Development Mode

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or using Python:
```bash
python main.py
```

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Base URL
```
http://localhost:8000
```

### Available Endpoints

#### 1. Get Air Quality Data
```
POST /api/air-quality
Content-Type: application/json

{
  "stationID": "54t",
  "param": "PM25",
  "startDate": "2024-11-25",
  "endDate": "2024-12-02"
}
```

#### 2. Get Stations
```
GET /api/stations
```

#### 3. Get Parameters
```
GET /api/parameters
```

#### 4. Fill Data Gaps (LSTM)
```
POST /api/fill-gaps
Content-Type: application/json

{
  "data": [
    {"DATETIMEDATA": "2024-12-01 00:00:00", "PM25": 25.5},
    {"DATETIMEDATA": "2024-12-01 01:00:00", "PM25": null},
    ...
  ],
  "value_column": "PM25",
  "sequence_length": 24
}
```

#### 5. Get Air Quality with Auto Gap Filling
```
POST /api/air-quality-with-gaps-filled
Content-Type: application/json

{
  "stationID": "54t",
  "param": "PM25",
  "startDate": "2024-11-25",
  "endDate": "2024-12-02"
}
```

This endpoint fetches data from Air4Thai and automatically fills any missing values using LSTM.

#### 6. Health Check
```
GET /health
```

### API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## LSTM Gap Filling

The backend includes an LSTM-based gap filling model extracted from `Complete_AirQuality_DeepLearning.ipynb` (Example 1).

### How It Works

1. **Model Architecture**: 3-layer LSTM (128-64-32 units) with dropout
2. **Features**: Temporal encoding (hour, day, weekend) + cyclical features
3. **Training**: Trained on non-missing data with early stopping
4. **Prediction**: Fills gaps using learned patterns

### Performance (Example 1 - Random 25% Removal)

- **MAE**: ~3.9 µg/m³
- **RMSE**: ~5.8 µg/m³
- **R²**: ~0.13

### Usage Example

```python
import requests

# Fetch data with gaps filled
response = requests.post(
    "http://localhost:8000/api/air-quality-with-gaps-filled",
    json={
        "stationID": "54t",
        "param": "PM25",
        "startDate": "2024-11-25",
        "endDate": "2024-12-02"
    }
)

data = response.json()
filled_data = data['stations'][0]['data']

# Each point includes:
# - filled_value: Original or predicted value
# - predicted_value: LSTM prediction
# - was_gap: Boolean indicating if it was filled
```

## Environment Variables

See `.env.example` for available configuration options.

## Integration with Frontend

Update the frontend API base URL to point to this backend:

```javascript
// In your frontend code
const API_BASE_URL = 'http://localhost:8000';
```

## Development

### Project Structure

```
backend/
├── main.py              # Main FastAPI application
├── requirements.txt     # Python dependencies
├── .env.example        # Environment variables template
└── README.md           # This file
```

### Adding New Endpoints

1. Define Pydantic models for request/response
2. Create async route handlers
3. Add proper error handling
4. Document with docstrings

## License

MIT
