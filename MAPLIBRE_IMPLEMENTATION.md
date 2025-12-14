# MapLibre GL JS Integration - 2D Mapping Dashboard

## Overview

This implementation provides a professional 2D mapping dashboard using **MapLibre GL JS** for geospatial air quality visualization. The design follows modern UI/UX principles with a map-centric layout, interactive layer controls, and real-time data integration.

## Architecture

```
Map-Centric Dashboard
├── Left Sidebar (Navigation)
│   ├── Home
│   ├── Live Map (Active)
│   ├── Layers
│   └── Analytics
├── Central Map View (MapLibre GL JS)
│   ├── Vector/Raster Tiles
│   ├── GeoJSON Layers
│   ├── Interactive Features
│   └── Time Slider
└── Right Control Panel
    ├── Layer Controls
    ├── Real-time Data Cards
    ├── Legend
    └── Filters
```

## Components Created

### 1. Templates

#### `MapDashboard.jsx`
Main dashboard layout with:
- **Left sidebar navigation** (Home, Live Map, Layers, Analytics)
- **Central MapLibre map** with full interaction
- **Right panel** with layer controls and data cards
- **Time slider** for temporal data
- **Search overlay** for location search
- **Responsive design** with glassmorphism effects

**Key Features:**
- Layer toggle with opacity controls
- Real-time AQI data display
- Interactive legend
- Station type and range filters
- Clean, modern UI matching reference design

### 2. Molecules

#### `FeatureInfoPanel.jsx`
Displays detailed information when users click map features:
- Property grid display
- Main value with AQI badge
- Geometry information
- Action buttons (View Details, View Trends)
- Formatted coordinates
- Responsive positioning

### 3. Custom Hooks

#### `useMapLibre.js`
Comprehensive MapLibre integration hook:
```javascript
const {
  map,                  // MapLibre instance
  mapLoaded,           // Loading state
  addGeoJSONSource,    // Add GeoJSON data
  addLayer,            // Add map layer
  toggleLayer,         // Show/hide layer
  setLayerOpacity,     // Adjust transparency
  flyTo,               // Animate to location
  fitBounds,           // Fit to bounds
  addMarker,           // Add marker
  addPopup,            // Add popup
  onFeatureClick,      // Click handler
} = useMapLibre({ container, center, zoom });
```

#### `useMapLayers.js`
Layer state management:
- Add/remove layers
- Toggle visibility
- Set opacity
- Layer configuration

#### `useRealtimeData.js`
Real-time data fetching with auto-refresh:
```javascript
const { data, loading, error } = useRealtimeData(endpoint, 30000);
```

### 4. Utilities

#### `mapLayers.js`
Pre-configured layer creators:

**Point Layers:**
```javascript
createAQIPointLayer(sourceId, layerId)
// Graduated circles colored by AQI value
```

**Heat Maps:**
```javascript
createHeatMapLayer(sourceId, layerId)
// Density-based visualization
```

**Choropleth:**
```javascript
createChoroplethLayer(sourceId, layerId, property)
// Thematic polygon coloring
```

**3D Extrusions:**
```javascript
createExtrusionLayer(sourceId, layerId, heightProperty)
// 3D building/height visualization
```

**Clustering:**
```javascript
createClusterLayer(sourceId, layerId)
// Point clustering for performance
```

**Helper Functions:**
- `getAQIColor(aqi)` - Get color by AQI value
- `getAQICategory(aqi)` - Get category and color
- `createGeoJSONFromPoints(points)` - Convert to GeoJSON
- `calculateBounds(geojson)` - Calculate bounding box
- `filterFeaturesByProperty()` - Attribute filtering
- `filterFeaturesByTime()` - Temporal filtering

### 5. Pages

#### `LiveMapPage.jsx`
Complete example implementation:
- MapLibre map initialization
- Air quality station display
- Interactive feature selection
- Real-time data integration
- Legend and statistics
- Clean overlay design

## Installation

### 1. Install MapLibre GL JS

```bash
npm install maplibre-gl
```

### 2. Add CSS Import

In your main app file or component:
```javascript
import 'maplibre-gl/dist/maplibre-gl.css';
```

### 3. Update package.json

```json
{
  "dependencies": {
    "maplibre-gl": "^4.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

## Usage Examples

### Basic Map Setup

```jsx
import { useRef } from 'react';
import { useMapLibre } from '../hooks/useMapLibre';

function MyMap() {
  const mapContainer = useRef(null);

  const { map, mapLoaded } = useMapLibre({
    container: mapContainer,
    center: [100.5018, 13.7563], // Bangkok
    zoom: 10,
  });

  return <div ref={mapContainer} className="w-full h-screen" />;
}
```

### Adding GeoJSON Layer

```jsx
import { useEffect } from 'react';
import { createAQIPointLayer, createGeoJSONFromPoints } from '../utils/mapLayers';

function AQIMap() {
  const { mapLoaded, addGeoJSONSource, addLayer } = useMapLibre({...});

  useEffect(() => {
    if (!mapLoaded) return;

    // Your station data
    const stations = [
      { id: '01t', lat: 13.8267, lon: 100.6105, aqi: 85 },
      { id: '02t', lat: 13.6447, lon: 100.4225, aqi: 65 },
    ];

    // Create GeoJSON
    const geojson = createGeoJSONFromPoints(stations);

    // Add to map
    addGeoJSONSource('aqi-stations', geojson);

    const layer = createAQIPointLayer('aqi-stations', 'aqi-points');
    addLayer(layer);
  }, [mapLoaded]);

  return <div ref={mapContainer} />;
}
```

### Feature Interaction

```jsx
const { onFeatureClick, flyTo } = useMapLibre({...});
const [selectedFeature, setSelectedFeature] = useState(null);

useEffect(() => {
  if (!mapLoaded) return;

  onFeatureClick('aqi-points', (feature) => {
    setSelectedFeature(feature);
    flyTo(feature.geometry.coordinates, 13);
  });
}, [mapLoaded]);

return (
  <>
    <div ref={mapContainer} />
    {selectedFeature && (
      <FeatureInfoPanel
        feature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
      />
    )}
  </>
);
```

### Layer Control

```jsx
const [layerVisible, setLayerVisible] = useState(true);
const [opacity, setOpacity] = useState(100);

const handleToggle = () => {
  toggleLayer('aqi-points');
  setLayerVisible(!layerVisible);
};

const handleOpacity = (value) => {
  setLayerOpacity('aqi-points', value);
  setOpacity(value);
};
```

### Real-time Data Integration

```jsx
import { useRealtimeData } from '../hooks/useMapLibre';

function RealtimeMap() {
  const { data: stations } = useRealtimeData('/api/stations', 30000);

  useEffect(() => {
    if (!mapLoaded || !stations) return;

    const geojson = createGeoJSONFromPoints(stations);
    addGeoJSONSource('aqi-stations', geojson);
  }, [stations, mapLoaded]);

  return <div ref={mapContainer} />;
}
```

## Styling Features

### AQI Color Scheme

The implementation uses EPA AQI color standards:

| AQI Range | Color | Category |
|-----------|-------|----------|
| 0-50 | #00E400 | Good |
| 51-100 | #FFFF00 | Moderate |
| 101-150 | #FF7E00 | Unhealthy for Sensitive |
| 151-200 | #FF0000 | Unhealthy |
| 201-300 | #8F3F97 | Very Unhealthy |
| 301+ | #7E0023 | Hazardous |

### Graduated Symbols

Point sizes scale with AQI value:
- 0-50: 8px
- 51-100: 10px
- 101-150: 14px
- 151-200: 18px
- 201-300: 22px
- 301+: 26px

## Data Formats

### Station Data Format

```javascript
{
  id: '01t',
  name: 'Bang Khen',
  lat: 13.8267,
  lon: 100.6105,
  aqi: 85,
  PM25: 32.4,
  PM10: 45.2,
  type: 'Urban',
  timestamp: '2024-12-14T12:00:00Z'
}
```

### GeoJSON Output

```javascript
{
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [100.6105, 13.8267]
      },
      properties: {
        id: '01t',
        name: 'Bang Khen',
        aqi: 85,
        PM25: 32.4,
        ...
      }
    }
  ]
}
```

## Layer Types Supported

1. **Circle Layers** - Points with graduated symbols
2. **Heat Maps** - Density visualization
3. **Fill Layers** - Polygons with choropleth styling
4. **Fill Extrusion** - 3D height visualization
5. **Line Layers** - Routes, boundaries, networks
6. **Symbol Layers** - Labels and icons
7. **Cluster Layers** - Point aggregation

## Performance Optimization

### Vector Tiles
- Use vector tiles for better performance
- Smaller file sizes than raster
- Client-side styling

### Clustering
- Enable clustering for large datasets (>1000 points)
- Reduces rendering load
- Improves interaction speed

### Layer Filtering
- Use MapLibre expressions for efficient filtering
- Filter on client-side when possible
- Use `filter` property instead of removing/adding layers

### GeoJSON Optimization
- Simplify geometries when appropriate
- Use appropriate precision (6 decimals max)
- Remove unnecessary properties

## Integration with Backend

### API Endpoints

Expected backend endpoints:

```javascript
// Get all stations
GET /api/stations
Response: Array of station objects

// Get station by ID
GET /api/stations/:id
Response: Single station object

// Get AQI summary
GET /api/anomaly-summary?stationID=36t&param=PM25&startDate=...&endDate=...
Response: Anomaly statistics

// Get real-time data
GET /api/air-quality?stationID=36t&param=PM25
Response: Current measurements
```

### WebSocket for Real-time Updates

```javascript
useEffect(() => {
  const ws = new WebSocket('ws://localhost:8000/ws');

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Update GeoJSON source
    addGeoJSONSource('aqi-stations', createGeoJSONFromPoints(data));
  };

  return () => ws.close();
}, []);
```

## Customization

### Custom Base Maps

```javascript
const customStyle = {
  version: 8,
  sources: {
    'custom-tiles': {
      type: 'raster',
      tiles: ['https://your-tile-server/{z}/{x}/{y}.png'],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: 'custom-layer',
      type: 'raster',
      source: 'custom-tiles',
    },
  ],
};

const { map } = useMapLibre({
  container: mapContainer,
  style: customStyle,
});
```

### Custom Layer Styling

```javascript
const customPointLayer = {
  id: 'custom-points',
  type: 'circle',
  source: 'my-source',
  paint: {
    'circle-radius': 10,
    'circle-color': '#3388ff',
    'circle-opacity': 0.8,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
  },
};
```

## File Structure

```
frontend/src/
├── components/
│   ├── templates/
│   │   └── MapDashboard.jsx         # Main dashboard layout
│   ├── molecules/
│   │   └── FeatureInfoPanel.jsx     # Feature details panel
│   └── atoms/
│       ├── Card.jsx
│       ├── Button.jsx
│       └── Badge.jsx
├── hooks/
│   └── useMapLibre.js               # MapLibre integration hooks
├── utils/
│   └── mapLayers.js                 # Layer creation utilities
├── pages/
│   └── LiveMapPage.jsx              # Example implementation
└── index.css                        # Tailwind imports + MapLibre CSS
```

## Browser Support

MapLibre GL JS supports:
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari 13+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Next Steps

1. **Integrate with Your API**: Replace mock data with actual API calls
2. **Add More Layers**: Traffic, weather, administrative boundaries
3. **Implement Filtering**: Add UI controls for attribute/time filtering
4. **Add Export Features**: PDF export, screenshot capture
5. **Implement Routing**: Add route planning capabilities
6. **Add Analytics**: Charts and statistics based on selected features
7. **Offline Support**: Add service worker for offline maps

## Resources

- **MapLibre GL JS Docs**: https://maplibre.org/maplibre-gl-js-docs/
- **Style Spec**: https://maplibre.org/maplibre-style-spec/
- **Examples**: https://maplibre.org/maplibre-gl-js-docs/example/
- **Vector Tiles**: https://github.com/mapbox/vector-tile-spec

## License

This implementation uses MapLibre GL JS (BSD 3-Clause License), which is free and open source.

---

**Status**: ✅ Complete and ready to use
**Last Updated**: December 14, 2025
**MapLibre Version**: 4.0.0+
