# Air4Thai Dashboard - Frontend

React + Vite frontend application for visualizing air quality data from Thailand.

## Features

- **Interactive Map**: MapLibre GL JS with multiple basemap options
- **Dynamic Charts**: ECharts with zoom, pan, and export capabilities
- **Real-time Data**: Live air quality data from Air4Thai API
- **Responsive Design**: Tailwind CSS v4 with beautiful UI
- **Parameter Selection**: Monitor PM2.5, PM10, O3, CO, NO2, SO2
- **Date Range Filtering**: Custom date range queries

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Build

```bash
npm run build
npm run preview  # Preview production build
```

## Project Structure

```
src/
├── components/
│   ├── Map.jsx          # MapLibre map with station markers
│   └── Chart.jsx        # ECharts time series visualization
├── services/
│   └── api.js           # API service (Air4Thai data)
├── App.jsx              # Main application component
├── App.css              # App-specific styles
├── index.css            # Global styles with Tailwind
└── main.jsx             # Application entry point
```

## Technologies

- React 19
- Vite 7
- Tailwind CSS 4
- MapLibre GL JS 5
- ECharts 6
- Axios

## Configuration

The app uses the Air4Thai public API by default. To use the FastAPI backend, update the API base URL in `src/services/api.js`:

```javascript
const BASE_URL = 'http://localhost:8000/api';
```

## License

MIT
