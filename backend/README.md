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

#### 4. Health Check
```
GET /health
```

### API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

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
