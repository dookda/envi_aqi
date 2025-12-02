# Air4Thai Dashboard

An interactive web dashboard for visualizing air quality data from the Air4Thai API. Built with React, Vite, Tailwind CSS, MapLibre GL JS, ECharts, and FastAPI.

## Project Structure

```
envi_aqi/
├── frontend/          # React + Vite application
│   ├── src/
│   │   ├── components/    # React components (Map, Chart)
│   │   ├── services/      # API services
│   │   ├── App.jsx        # Main app component
│   │   └── main.jsx       # Entry point
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
│
├── backend/           # FastAPI backend
│   ├── main.py           # FastAPI application
│   ├── requirements.txt  # Python dependencies
│   └── README.md         # Backend documentation
│
└── lstm/             # LSTM models for air quality prediction
```

## Features

### Frontend
- **Interactive Map**: Visualize air quality monitoring stations across Thailand using MapLibre GL JS
- **Real-time Data**: Fetch historical air quality data from Air4Thai API
- **Dynamic Charts**: Display air quality trends with interactive ECharts visualizations
- **Multiple Parameters**: Monitor PM2.5, PM10, O3, CO, NO2, and SO2 levels
- **Date Range Selection**: Query data for custom date ranges
- **Basemap Selection**: Choose from 5 different map styles
- **Drag-to-Zoom**: Interactive chart zooming and panning
- **Responsive Design**: Beautiful UI with Tailwind CSS that works on all devices

### Backend
- **API Proxy**: Proxy requests to Air4Thai API
- **CORS Enabled**: For frontend integration
- **Async Operations**: High-performance async HTTP client
- **Type Safety**: Pydantic models for request/response validation
- **Auto Documentation**: Swagger/OpenAPI docs

## Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS framework
- **MapLibre GL JS** - Open-source mapping library
- **ECharts** - Powerful charting library
- **Axios** - HTTP client for API requests

### Backend
- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **HTTPX** - Async HTTP client

## Quick Start

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
./run.sh
```

The backend API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## Usage

1. **Select a Station**: Click on any marker on the map to select a monitoring station
2. **Choose a Parameter**: Select the air quality parameter you want to monitor (PM2.5, PM10, etc.)
3. **Choose a Basemap**: Select your preferred map style from the dropdown
4. **Set Date Range**: Choose start and end dates for the data you want to view
5. **Fetch Data**: Click the "Fetch Data" button to retrieve and visualize the data
6. **Interact with Chart**: 
   - Use mouse wheel to zoom
   - Drag to pan
   - Click zoom icon to box-select zoom area
   - Use slider at bottom for range selection

## API Reference

### Air4Thai API Endpoint
```
http://air4thai.com/forweb/getHistoryData.php
```

### Backend Endpoints

- `POST /api/air-quality` - Fetch air quality data
- `GET /api/stations` - Get monitoring stations
- `GET /api/parameters` - Get air quality parameters
- `GET /health` - Health check

## Available Stations

The dashboard includes several monitoring stations across Thailand:
- Bangkok (Bang Khen, Bang Khun Thian, Bang Na, etc.)
- Chiang Mai
- Lampang
- Lamphun

## Available Parameters

- **PM2.5** - Particulate Matter < 2.5 μm
- **PM10** - Particulate Matter < 10 μm
- **O3** - Ozone
- **CO** - Carbon Monoxide
- **NO2** - Nitrogen Dioxide
- **SO2** - Sulfur Dioxide

## Basemap Options

- Streets (Light) - MapLibre demo tiles
- OpenStreetMap - Classic OSM style
- Carto Light - Light-themed basemap
- Carto Dark - Dark-themed basemap
- Satellite - Satellite imagery

## Development

### Frontend Development

```bash
cd frontend
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

### Backend Development

```bash
cd backend
uvicorn main:app --reload  # Development server with auto-reload
```

## Contributing

Feel free to submit issues or pull requests to improve the dashboard.

## Data Source

Data is provided by [Air4Thai](http://air4thai.com), Thailand's air quality monitoring network.

## License

MIT
