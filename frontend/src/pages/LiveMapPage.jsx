import { useState, useRef, useEffect } from 'react';
import { useMapLibre } from '../hooks/useMapLibre';
import FeatureInfoPanel from '../components/molecules/FeatureInfoPanel';
import {
  createAQIPointLayer,
  createHeatMapLayer,
  createGeoJSONFromPoints,
  calculateBounds,
} from '../utils/mapLayers';

/**
 * Live Map Page - Full-featured 2D mapping dashboard
 * Demonstrates MapLibre GL JS integration with Air Quality data
 */
const LiveMapPage = () => {
  const mapContainer = useRef(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    map,
    mapLoaded,
    addGeoJSONSource,
    addLayer,
    toggleLayer,
    setLayerOpacity,
    flyTo,
    fitBounds,
    onFeatureClick,
  } = useMapLibre({
    container: mapContainer,
    center: [100.5018, 13.7563], // Bangkok
    zoom: 10,
  });

  // Fetch station data
  useEffect(() => {
    const fetchStations = async () => {
      try {
        // Example: Fetch from your API
        // const response = await fetch('/api/stations');
        // const data = await response.json();

        // Mock data for demonstration
        const mockData = [
          { id: '01t', name: 'Bang Khen', lat: 13.8267, lon: 100.6105, aqi: 85, PM25: 32.4, type: 'Urban' },
          { id: '02t', name: 'Bang Khun Thian', lat: 13.6447, lon: 100.4225, aqi: 65, PM25: 24.8, type: 'Suburban' },
          { id: '03t', name: 'Bang Na', lat: 13.6683, lon: 100.6039, aqi: 92, PM25: 38.2, type: 'Urban' },
          { id: '04t', name: 'Boom Rung Muang', lat: 13.7486, lon: 100.5092, aqi: 78, PM25: 29.6, type: 'Urban' },
          { id: '05t', name: 'Chom Thong', lat: 13.6803, lon: 100.4372, aqi: 71, PM25: 26.4, type: 'Suburban' },
          { id: '36t', name: 'Din Daeng', lat: 13.7644, lon: 100.5439, aqi: 88, PM25: 34.1, type: 'Urban' },
          { id: '50t', name: 'Chiang Mai', lat: 18.7883, lon: 98.9853, aqi: 102, PM25: 42.5, type: 'Urban' },
        ];

        setStations(mockData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stations:', error);
        setLoading(false);
      }
    };

    fetchStations();
  }, []);

  // Add layers when map loads and data is ready
  useEffect(() => {
    if (!mapLoaded || stations.length === 0) return;

    // Create GeoJSON from stations
    const geojson = createGeoJSONFromPoints(stations);

    // Add source
    addGeoJSONSource('aqi-stations', geojson);

    // Add point layer
    const pointLayer = createAQIPointLayer('aqi-stations', 'aqi-points');
    addLayer(pointLayer);

    // Add heat map layer (initially hidden)
    const heatmapLayer = createHeatMapLayer('aqi-stations', 'aqi-heatmap');
    addLayer({
      ...heatmapLayer,
      layout: { visibility: 'none' },
    });

    // Add labels
    addLayer({
      id: 'aqi-labels',
      type: 'symbol',
      source: 'aqi-stations',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 11,
        'text-offset': [0, 2],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#333333',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
      },
    });

    // Set up click handler
    onFeatureClick('aqi-points', (feature) => {
      setSelectedFeature(feature);
      flyTo(feature.geometry.coordinates, 13);
    });

    // Fit map to show all stations
    const bounds = calculateBounds(geojson);
    if (bounds) {
      fitBounds(bounds, { padding: 50 });
    }
  }, [mapLoaded, stations, addGeoJSONSource, addLayer, onFeatureClick, flyTo, fitBounds]);

  return (
    <div className="relative w-screen h-screen">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading stations...</p>
          </div>
        </div>
      )}

      {/* Feature Info Panel */}
      {selectedFeature && (
        <FeatureInfoPanel
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
          position="bottom-right"
        />
      )}

      {/* Map Title Overlay */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-white bg-opacity-95 backdrop-blur-sm shadow-lg rounded-full px-6 py-3">
          <h1 className="text-lg font-bold text-gray-800">Live Air Quality Map - Bangkok</h1>
        </div>
      </div>

      {/* Stats Overlay */}
      <div className="absolute top-20 left-4 z-10 space-y-2">
        <div className="bg-white bg-opacity-95 backdrop-blur-sm shadow-lg rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Active Stations</p>
          <p className="text-2xl font-bold text-primary-600">{stations.length}</p>
        </div>
        <div className="bg-white bg-opacity-95 backdrop-blur-sm shadow-lg rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Average AQI</p>
          <p className="text-2xl font-bold text-gray-800">
            {stations.length > 0
              ? Math.round(stations.reduce((sum, s) => sum + s.aqi, 0) / stations.length)
              : 0}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-white bg-opacity-95 backdrop-blur-sm shadow-lg rounded-lg p-4 w-64">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">AQI Classification</h3>
          <div className="space-y-2">
            <LegendItem color="#00E400" label="Good" range="0-50" />
            <LegendItem color="#FFFF00" label="Moderate" range="51-100" />
            <LegendItem color="#FF7E00" label="Unhealthy (Sensitive)" range="101-150" />
            <LegendItem color="#FF0000" label="Unhealthy" range="151-200" />
            <LegendItem color="#8F3F97" label="Very Unhealthy" range="201-300" />
            <LegendItem color="#7E0023" label="Hazardous" range="301+" />
          </div>
        </div>
      </div>
    </div>
  );
};

const LegendItem = ({ color, label, range }) => (
  <div className="flex items-center space-x-3">
    <div className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: color }}></div>
    <div className="flex-1">
      <p className="text-xs font-medium text-gray-800">{label}</p>
      <p className="text-xs text-gray-500">{range}</p>
    </div>
  </div>
);

export default LiveMapPage;
