import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Card, Button, Badge } from '../atoms';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MapDashboard = ({
  initialCenter = [100.5018, 13.7563], // Bangkok
  initialZoom = 10,
  layers = [],
  onFeatureClick,
  onMapLoad,
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [activeView, setActiveView] = useState('live-map');
  const [activeLayers, setActiveLayers] = useState({});
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [timeRange, setTimeRange] = useState({ start: 0, end: 24 });
  const [realtimeData, setRealtimeData] = useState({
    aqi: null,
    stations: 0,
    alerts: 0,
  });

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: initialCenter,
      zoom: initialZoom,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-left');
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    map.current.on('load', () => {
      if (onMapLoad) {
        onMapLoad(map.current);
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  const toggleLayer = (layerId) => {
    setActiveLayers(prev => ({
      ...prev,
      [layerId]: !prev[layerId]
    }));

    if (map.current.getLayer(layerId)) {
      const visibility = activeLayers[layerId] ? 'none' : 'visible';
      map.current.setLayoutProperty(layerId, 'visibility', visibility);
    }
  };

  const updateLayerOpacity = (layerId, opacity) => {
    if (map.current.getLayer(layerId)) {
      map.current.setPaintProperty(layerId, 'fill-opacity', opacity / 100);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-20 bg-white shadow-lg flex flex-col items-center py-6 space-y-8">
        <div className="flex items-center justify-center w-12 h-12 bg-primary-500 rounded-xl">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>

        <nav className="flex-1 flex flex-col items-center space-y-6">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-colors ${
              activeView === 'dashboard'
                ? 'bg-primary-100 text-primary-600'
                : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </button>

          <button
            onClick={() => setActiveView('live-map')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-colors ${
              activeView === 'live-map'
                ? 'bg-primary-500 text-white shadow-lg'
                : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-xs mt-1">Live Map</span>
          </button>

          <button
            onClick={() => setActiveView('layers')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-colors ${
              activeView === 'layers'
                ? 'bg-primary-100 text-primary-600'
                : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-xs mt-1">Layers</span>
          </button>

          <button
            onClick={() => setActiveView('analytics')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-colors ${
              activeView === 'analytics'
                ? 'bg-primary-100 text-primary-600'
                : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs mt-1">Analytics</span>
          </button>
        </nav>

        <button className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
          <img
            src="https://ui-avatars.com/api/?name=User&background=6366f1&color=fff"
            alt="User"
            className="w-full h-full object-cover"
          />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Live Air Quality Map</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time monitoring across Bangkok</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <Button variant="primary" size="md">
              Add Station
            </Button>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div ref={mapContainer} className="absolute inset-0" />

          {/* Map Controls Overlay */}
          <div className="absolute top-4 left-4 space-y-2">
            <Card variant="glass" padding="sm" className="backdrop-blur-md">
              <div className="flex items-center space-x-2">
                <button className="p-2 rounded hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <input
                  type="text"
                  placeholder="Search location..."
                  className="bg-transparent border-none outline-none text-sm w-48"
                />
              </div>
            </Card>
          </div>

          {/* Time Slider */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <Card variant="glass" padding="md" className="backdrop-blur-md w-96">
              <div className="flex items-center space-x-4">
                <button className="p-2 rounded-lg hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span>00:00</span>
                    <span className="font-semibold text-primary-600">12:00</span>
                    <span>24:00</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={timeRange.end}
                    onChange={(e) => setTimeRange({ ...timeRange, end: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <span className="text-sm font-mono text-gray-700 w-16 text-right">
                  {String(timeRange.end).padStart(2, '0')}:00
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-96 bg-white shadow-lg overflow-y-auto p-6 space-y-6">
        {/* Layer Controls */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Map Layers</h3>
            <button className="text-primary-600 text-sm font-medium hover:text-primary-700">
              View all
            </button>
          </div>

          <div className="space-y-3">
            <LayerControl
              name="AQI Stations"
              type="PM2.5 Monitoring"
              icon="📍"
              active={activeLayers['aqi-stations']}
              onToggle={() => toggleLayer('aqi-stations')}
              opacity={100}
              onOpacityChange={(val) => updateLayerOpacity('aqi-stations', val)}
            />
            <LayerControl
              name="Heat Map"
              type="Interpolated"
              icon="🗺️"
              active={activeLayers['heat-map']}
              onToggle={() => toggleLayer('heat-map')}
              opacity={70}
              onOpacityChange={(val) => updateLayerOpacity('heat-map', val)}
            />
            <LayerControl
              name="Traffic Layer"
              type="Real-time"
              icon="🚗"
              active={activeLayers['traffic']}
              onToggle={() => toggleLayer('traffic')}
              opacity={100}
              onOpacityChange={(val) => updateLayerOpacity('traffic', val)}
            />
          </div>
        </div>

        {/* Real-time Data Cards */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Live Data</h3>

          <div className="space-y-3">
            <DataCard
              title="Air Quality Index"
              value="86"
              unit="AQI"
              status="moderate"
              trend="+5"
              stations="45 Active"
            />
            <DataCard
              title="PM2.5 Average"
              value="32.4"
              unit="μg/m³"
              status="unhealthy-sensitive"
              trend="-2.1"
              stations="45 Sensors"
            />
            <DataCard
              title="Weather Conditions"
              value="28°C"
              unit=""
              status="good"
              trend="Clear Sky"
              stations="Humidity 65%"
            />
          </div>
        </div>

        {/* Legend */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">AQI Classification</h3>
          <div className="space-y-2">
            <LegendItem color="bg-aqi-good" label="Good" range="0-50" />
            <LegendItem color="bg-aqi-moderate" label="Moderate" range="51-100" />
            <LegendItem color="bg-aqi-unhealthy-sensitive" label="Unhealthy for Sensitive" range="101-150" />
            <LegendItem color="bg-aqi-unhealthy" label="Unhealthy" range="151-200" />
            <LegendItem color="bg-aqi-very-unhealthy" label="Very Unhealthy" range="201-300" />
            <LegendItem color="bg-aqi-hazardous" label="Hazardous" range="300+" />
          </div>
        </div>

        {/* Filters */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Station Type</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>All Stations</option>
                <option>Urban</option>
                <option>Suburban</option>
                <option>Industrial</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">AQI Range</label>
              <div className="flex space-x-2">
                <input type="number" placeholder="Min" className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="number" placeholder="Max" className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Layer Control Component
const LayerControl = ({ name, type, icon, active, onToggle, opacity, onOpacityChange }) => (
  <Card variant="flat" padding="sm" className="hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-gray-800">{name}</p>
          <p className="text-xs text-gray-500">{type}</p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={active}
          onChange={onToggle}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
      </label>
    </div>
    {active && (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-600 w-16">Opacity</span>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => onOpacityChange(parseInt(e.target.value))}
            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs font-mono text-gray-700 w-10 text-right">{opacity}%</span>
        </div>
      </div>
    )}
  </Card>
);

// Data Card Component
const DataCard = ({ title, value, unit, status, trend, stations }) => {
  const statusColors = {
    good: 'bg-aqi-good',
    moderate: 'bg-aqi-moderate',
    'unhealthy-sensitive': 'bg-aqi-unhealthy-sensitive',
    unhealthy: 'bg-aqi-unhealthy',
  };

  return (
    <Card variant="flat" padding="md" className="hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <div className="flex items-baseline mt-1">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {unit && <span className="text-sm text-gray-500 ml-2">{unit}</span>}
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${statusColors[status]}`}></div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{stations}</span>
        <span className={`font-semibold ${trend.startsWith('+') ? 'text-red-500' : 'text-green-500'}`}>
          {trend}
        </span>
      </div>
    </Card>
  );
};

// Legend Item Component
const LegendItem = ({ color, label, range }) => (
  <div className="flex items-center space-x-3">
    <div className={`w-8 h-4 rounded ${color}`}></div>
    <span className="text-sm text-gray-700 flex-1">{label}</span>
    <span className="text-xs text-gray-500 font-mono">{range}</span>
  </div>
);

LayerControl.propTypes = {
  name: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  opacity: PropTypes.number.isRequired,
  onOpacityChange: PropTypes.func.isRequired,
};

DataCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  unit: PropTypes.string,
  status: PropTypes.string.isRequired,
  trend: PropTypes.string.isRequired,
  stations: PropTypes.string.isRequired,
};

LegendItem.propTypes = {
  color: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  range: PropTypes.string.isRequired,
};

MapDashboard.propTypes = {
  initialCenter: PropTypes.arrayOf(PropTypes.number),
  initialZoom: PropTypes.number,
  layers: PropTypes.array,
  onFeatureClick: PropTypes.func,
  onMapLoad: PropTypes.func,
};

export default MapDashboard;
