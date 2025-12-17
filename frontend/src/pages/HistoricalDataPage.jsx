import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Chart from '../components/Chart';
import {
  fetchAirQualityData,
  fetchAirQualityDataWithGapFilling,
  getStations,
  getParameters
} from '../services/api';
import { getAQIColor, getAQILabel } from '../utils/helpers/aqi';

/**
 * Historical Data Page - Shows historical air quality data with gap filling
 * Features:
 * - Interactive map for station selection
 * - Time series chart with gap filling visualization
 * - Date range selector
 * - Parameter selection
 * - Gap filling toggle with AI-powered predictions
 */
const HistoricalDataPage = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popup = useRef(null);

  // Data state
  const [stations] = useState(getStations());
  const [parameters] = useState(getParameters());
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedParameter, setSelectedParameter] = useState(parameters[0]); // Default to PM2.5
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // UI state
  const [useGapFilling, setUseGapFilling] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // 30 days ago
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [showMap, setShowMap] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

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
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
          },
        ],
      },
      center: [100.5018, 13.7563],
      zoom: 5.5,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Initialize popup
    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 15,
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add station markers
  useEffect(() => {
    if (!map.current) return;

    const addStationMarkers = () => {
      console.log('🗺️ Adding station markers...');
      // Create GeoJSON from stations
      const geojson = {
        type: 'FeatureCollection',
        features: stations.map(station => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [station.lon, station.lat],
          },
          properties: {
            id: station.id,
            name: station.name,
            selected: selectedStation?.id === station.id,
          },
        })),
      };

      // Remove existing layers and source
      if (map.current.getLayer('stations-circles')) {
        map.current.removeLayer('stations-circles');
      }
      if (map.current.getLayer('stations-selected')) {
        map.current.removeLayer('stations-selected');
      }
      if (map.current.getSource('stations')) {
        map.current.removeSource('stations');
      }

      // Add source
      map.current.addSource('stations', {
        type: 'geojson',
        data: geojson,
      });

      // Add circles layer
      map.current.addLayer({
        id: 'stations-circles',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 6,
            5, 10,
            6, 14,
            8, 18,
            10, 22,
          ],
          'circle-color': [
            'case',
            ['get', 'selected'],
            '#3b82f6',
            '#ef4444',
          ],
          'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 2,
            8, 3,
            12, 4,
          ],
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.85,
        },
      });

      console.log('✅ Added', stations.length, 'station markers to map');

      // Add selected highlight layer
      map.current.addLayer({
        id: 'stations-selected',
        type: 'circle',
        source: 'stations',
        filter: ['==', ['get', 'selected'], true],
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 12,
            8, 16,
            12, 20,
          ],
          'circle-color': '#3b82f6',
          'circle-opacity': 0.3,
        },
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'stations-circles', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'stations-circles', () => {
        map.current.getCanvas().style.cursor = '';
      });

      // Show popup on hover
      map.current.on('mouseenter', 'stations-circles', (e) => {
        const feature = e.features[0];
        const coordinates = feature.geometry.coordinates.slice();
        const { name, id } = feature.properties;

        popup.current
          .setLngLat(coordinates)
          .setHTML(`
            <div style="padding: 8px; min-width: 150px;">
              <h3 style="margin: 0 0 4px 0; font-weight: bold; font-size: 13px;">${name}</h3>
              <p style="margin: 0; font-size: 11px; color: #666;">ID: ${id}</p>
              <p style="margin: 4px 0 0 0; font-size: 10px; color: #3b82f6;">Click to view historical data</p>
            </div>
          `)
          .addTo(map.current);
      });

      map.current.on('mouseleave', 'stations-circles', () => {
        popup.current.remove();
      });

      // Handle click
      map.current.on('click', 'stations-circles', (e) => {
        const feature = e.features[0];
        const stationId = feature.properties.id;
        const station = stations.find(s => s.id === stationId);

        if (station) {
          setSelectedStation(station);
          map.current.flyTo({
            center: [station.lon, station.lat],
            zoom: 10,
            duration: 1500,
          });
        }
      });
    };

    // Wait for both map and style to be loaded
    if (map.current.loaded() && map.current.isStyleLoaded()) {
      console.log('✅ Map already loaded, adding markers now');
      addStationMarkers();
    } else {
      console.log('⏳ Waiting for map to load...');
      map.current.once('load', () => {
        console.log('✅ Map loaded, adding markers');
        addStationMarkers();
      });
    }
  }, [stations, selectedStation]);

  // Fetch data when parameters change
  const fetchData = async () => {
    if (!selectedStation) {
      setError('Please select a station from the map');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = useGapFilling
        ? await fetchAirQualityDataWithGapFilling({
            stationID: selectedStation.id,
            param: selectedParameter.id,
            startDate,
            endDate,
          })
        : await fetchAirQualityData({
            stationID: selectedStation.id,
            param: selectedParameter.id,
            startDate,
            endDate,
          });

      console.log('API Response:', result);

      // Check for API errors
      if (result && result.result === 'Error') {
        setChartData([]);
        if (result.error && result.error.includes('There is not have parammeter')) {
          setError(`No ${selectedParameter.name} data available for ${selectedStation.name}. Try a different parameter.`);
        } else {
          setError(result.error || 'Error fetching data from API');
        }
        return;
      }

      // Handle Air4Thai API response format
      if (result && result.result === 'OK' && result.stations && Array.isArray(result.stations)) {
        const stationData = result.stations[0]?.data || [];

        if (stationData.length === 0) {
          setError(`No data available for ${selectedStation.name} during the selected date range.`);
        }

        setChartData(stationData);
      } else if (Array.isArray(result)) {
        setChartData(result);
      } else if (result && typeof result === 'object') {
        const dataArray = result.data || [];
        setChartData(Array.isArray(dataArray) ? dataArray : []);
      } else {
        setChartData([]);
        setError('Received invalid data format from API');
      }
    } catch (err) {
      setError(
        `Failed to fetch data. ${
          useGapFilling
            ? 'Please ensure the backend server is running at http://localhost:8000'
            : 'Please try again.'
        }`
      );
      console.error('API Error:', err);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when station or parameter changes
  useEffect(() => {
    if (selectedStation && startDate && endDate) {
      setError(null);
      fetchData();
    }
  }, [selectedStation, selectedParameter, useGapFilling]);

  // Calculate statistics
  const stats = {
    totalPoints: chartData.length,
    filledPoints: chartData.filter(d => d.gap_filled || d.was_gap).length,
    completeness: chartData.length > 0
      ? ((chartData.length - chartData.filter(d => d.gap_filled || d.was_gap).length) / chartData.length * 100).toFixed(1)
      : 0,
  };

  return (
    <div className="relative w-screen h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Main Content */}
      <div className="absolute top-16 left-0 right-0 bottom-0 flex flex-col md:flex-row">
        {/* Left Panel - Map */}
        <div className={`${showMap ? 'flex' : 'hidden md:flex'} flex-col w-full md:w-2/5 border-r border-gray-200 bg-white`}>
          {/* Map Container */}
          <div ref={mapContainer} className="flex-1 relative" />

          {/* Map Legend */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm shadow-lg rounded-lg p-3 border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Stations</h4>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white"></div>
                <span className="text-xs text-gray-600">Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white"></div>
                <span className="text-xs text-gray-600">Selected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Chart and Controls */}
        <div className={`${!showMap ? 'flex' : 'hidden md:flex'} flex-col w-full md:w-3/5 bg-white`}>
          {/* Controls Panel */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            {/* Station Selection Dropdown */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Select Station</span>
                </span>
              </label>
              <select
                value={selectedStation?.id || ''}
                onChange={(e) => {
                  const station = stations.find(s => s.id === e.target.value);
                  if (station) {
                    setSelectedStation(station);
                    // Fly to station on map
                    if (map.current) {
                      map.current.flyTo({
                        center: [station.lon, station.lat],
                        zoom: 10,
                        duration: 1500,
                      });
                    }
                  }
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm font-medium"
              >
                <option value="">-- Click on map or select from list --</option>
                {stations.map(station => (
                  <option key={station.id} value={station.id}>
                    📍 {station.name}
                  </option>
                ))}
              </select>
              {selectedStation && (
                <p className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Selected: {selectedStation.name} (ID: {selectedStation.id})</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Parameter Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Parameter
                </label>
                <select
                  value={selectedParameter.id}
                  onChange={(e) => {
                    const param = parameters.find(p => p.id === e.target.value);
                    setSelectedParameter(param);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                >
                  {parameters.map(param => (
                    <option key={param.id} value={param.id}>
                      {param.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Gap Filling Toggle and Refresh */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="flex items-center space-x-3 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                <input
                  type="checkbox"
                  id="useGapFilling"
                  checked={useGapFilling}
                  onChange={(e) => setUseGapFilling(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="useGapFilling" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Enable AI Gap Filling (LSTM)
                </label>
              </div>

              <button
                onClick={fetchData}
                disabled={loading || !selectedStation}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors shadow-sm disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>

              {/* Quick Date Ranges */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - 7);
                    setStartDate(start.toISOString().split('T')[0]);
                    setEndDate(end.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                  7 Days
                </button>
                <button
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - 30);
                    setStartDate(start.toISOString().split('T')[0]);
                    setEndDate(end.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                  30 Days
                </button>
                <button
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - 90);
                    setStartDate(start.toISOString().split('T')[0]);
                    setEndDate(end.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                  90 Days
                </button>
              </div>
            </div>

            {/* Statistics */}
            {chartData.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Total Data Points</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalPoints}</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Gap-Filled Points</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.filledPoints}</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Data Completeness</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completeness}%</p>
                </div>
              </div>
            )}
          </div>

          {/* Chart Area */}
          <div className="flex-1 p-6 overflow-hidden">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {!selectedStation && !error && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md mx-auto px-4">
                  <svg className="w-24 h-24 mx-auto text-blue-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <h3 className="text-xl font-bold text-gray-700 mb-2">Ready to Explore Historical Data</h3>
                  <p className="text-gray-500 text-sm mb-4">Choose a station to get started</p>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left space-y-2 mb-4">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Two ways to select a station:</p>
                    <div className="flex items-start space-x-2 text-sm text-blue-800">
                      <span className="font-bold">1.</span>
                      <span>Use the <strong>dropdown above</strong> to search by station name</span>
                    </div>
                    <div className="flex items-start space-x-2 text-sm text-blue-800">
                      <span className="font-bold">2.</span>
                      <span>Click any <strong>marker on the map</strong> (left panel)</span>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-left">
                    <p className="text-sm font-semibold text-purple-900 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                      </svg>
                      AI Gap Filling
                    </p>
                    <p className="text-xs text-purple-800">
                      Enable the checkbox to use LSTM neural networks for predicting missing data points automatically.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedStation && !error && (
              <div className="h-full relative">
                {loading && (
                  <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-gray-600 font-medium">
                        {useGapFilling ? 'Analyzing data with AI...' : 'Fetching historical data...'}
                      </p>
                    </div>
                  </div>
                )}
                <Chart data={chartData} parameter={selectedParameter} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Help/Tutorial Button */}
      <div className="absolute bottom-6 right-6 z-10">
        <button
          onClick={() => setShowTutorial(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
          title="How to use this page"
        >
          <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h2 className="text-2xl font-bold">How to Use Historical Data Page</h2>
                </div>
                <button
                  onClick={() => setShowTutorial(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Step 1 */}
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
                <h3 className="font-bold text-lg text-blue-900 mb-2 flex items-center">
                  <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center mr-2 text-sm">1</span>
                  Select a Monitoring Station
                </h3>
                <p className="text-blue-800 text-sm mb-3">You have two options:</p>
                <ul className="space-y-2 text-sm text-blue-900">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>Dropdown Method:</strong> Use the "Select Station" dropdown at the top of the controls panel. Search and select from the list of stations.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>Map Method:</strong> Click any marker on the interactive map (left panel). The map will zoom to the selected station.</span>
                  </li>
                </ul>
              </div>

              {/* Step 2 */}
              <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-lg">
                <h3 className="font-bold text-lg text-purple-900 mb-2 flex items-center">
                  <span className="bg-purple-600 text-white rounded-full w-7 h-7 flex items-center justify-center mr-2 text-sm">2</span>
                  Configure Analysis Parameters
                </h3>
                <ul className="space-y-2 text-sm text-purple-900">
                  <li className="flex items-start space-x-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span><strong>Parameter:</strong> Choose what to measure (PM2.5, PM10, O3, CO, NO2, SO2)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span><strong>Date Range:</strong> Select start and end dates, or use quick presets (7, 30, 90 days)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span><strong>AI Gap Filling:</strong> Toggle checkbox to enable LSTM-powered predictions for missing data</span>
                  </li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded-r-lg">
                <h3 className="font-bold text-lg text-green-900 mb-2 flex items-center">
                  <span className="bg-green-600 text-white rounded-full w-7 h-7 flex items-center justify-center mr-2 text-sm">3</span>
                  Interpret the Chart
                </h3>
                <div className="space-y-3 text-sm text-green-900">
                  <p className="font-medium">Understanding the visualization:</p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-0.5 bg-blue-600"></div>
                      <span><strong>Blue Solid Line:</strong> Actual measured data from sensors</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-0.5 border-t-2 border-dashed border-green-600"></div>
                      <span><strong>Green Dashed Line:</strong> AI predictions (when gap filling enabled)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span><strong>Orange Dots:</strong> Gap-filled points (missing data predicted by AI)</span>
                    </div>
                  </div>
                  <p className="mt-3 bg-green-100 p-2 rounded">
                    <strong>💡 Tip:</strong> Hover over any point to see exact values and gap-filling status
                  </p>
                </div>
              </div>

              {/* AI Gap Filling Info */}
              <div className="bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-200 p-4 rounded-lg">
                <h3 className="font-bold text-lg text-orange-900 mb-2 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                  </svg>
                  About AI Gap Filling
                </h3>
                <p className="text-sm text-orange-900 mb-2">
                  Uses LSTM (Long Short-Term Memory) neural networks to intelligently predict missing data points based on:
                </p>
                <ul className="text-sm text-orange-800 space-y-1 ml-4">
                  <li>• Historical patterns and trends</li>
                  <li>• Temporal correlations</li>
                  <li>• Seasonal variations</li>
                  <li>• Nearby station readings</li>
                </ul>
                <div className="mt-3 bg-orange-100 p-2 rounded text-xs text-orange-900">
                  <strong>⚠️ Note:</strong> Requires backend server running at http://localhost:8000
                </div>
              </div>

              {/* Statistics Info */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <h3 className="font-bold text-lg text-gray-900 mb-2">Statistics Explained</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Total Data Points</p>
                    <p className="text-gray-600 text-xs">Number of hourly measurements in selected range</p>
                  </div>
                  <div>
                    <p className="font-semibold text-orange-700">Gap-Filled Points</p>
                    <p className="text-gray-600 text-xs">How many values were AI-predicted</p>
                  </div>
                  <div>
                    <p className="font-semibold text-green-700">Data Completeness</p>
                    <p className="text-gray-600 text-xs">% of original (non-filled) measurements</p>
                  </div>
                </div>
              </div>

              {/* Interactive Features */}
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                <h3 className="font-bold text-lg text-indigo-900 mb-2">Interactive Chart Features</h3>
                <ul className="text-sm text-indigo-900 space-y-1">
                  <li>• <strong>Zoom:</strong> Use the slider at the bottom or scroll wheel to zoom in/out</li>
                  <li>• <strong>Pan:</strong> Click and drag to move across the timeline</li>
                  <li>• <strong>Export:</strong> Click the camera icon to save chart as image</li>
                  <li>• <strong>Reset:</strong> Click the home icon to restore original view</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-4 rounded-b-2xl border-t border-gray-200">
              <button
                onClick={() => setShowTutorial(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:shadow-lg transition-all"
              >
                Got it! Let's explore data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricalDataPage;
