import { useState, useEffect } from 'react';
import Map from './components/Map';
import Chart from './components/Chart';
import FloatingMenu from './components/organisms/FloatingMenu';
import { fetchAirQualityData, fetchAirQualityDataWithGapFilling, getStations, getParameters, getBasemaps } from './services/api';

function App() {
  const [stations] = useState(getStations());
  const [parameters] = useState(getParameters());
  const [basemaps] = useState(getBasemaps());
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedParameter, setSelectedParameter] = useState(parameters[0]);
  const [selectedBasemap, setSelectedBasemap] = useState(basemaps[0]);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // 7 days ago
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useAIFilling, setUseAIFilling] = useState(true); // Enable by default

  // Panel visibility states (show/hide entire panels)
  const [showPanels, setShowPanels] = useState({
    controls: false,
    chart: false,
    basemap: false,
    info: false
  });

  // Collapse states for panels (accordion behavior within panels)
  const [collapsedPanels, setCollapsedPanels] = useState({
    station: false,
    parameter: false,
    dateRange: false,
    chart: false,
    basemap: false
  });

  const togglePanel = (panelName) => {
    setCollapsedPanels(prev => ({
      ...prev,
      [panelName]: !prev[panelName]
    }));
  };

  const togglePanelVisibility = (panelName) => {
    setShowPanels(prev => {
      // If the panel is already open, close it
      if (prev[panelName]) {
        return {
          ...prev,
          [panelName]: false
        };
      }
      // Otherwise, close all panels and open only the clicked one
      return {
        controls: false,
        chart: false,
        basemap: false,
        info: false,
        [panelName]: true
      };
    });
  };

  const handleStationSelect = (station) => {
    setSelectedStation(station);
    // Auto-expand chart panel when a station is selected
    setCollapsedPanels(prev => ({
      ...prev,
      chart: false
    }));
  };

  const handleFetchData = async () => {
    if (!selectedStation) {
      setError('Please select a station from the map');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use gap filling API if enabled, otherwise use regular API
      const result = useAIFilling
        ? await fetchAirQualityDataWithGapFilling({
          stationID: selectedStation.id,
          param: selectedParameter.id,
          startDate,
          endDate
        })
        : await fetchAirQualityData({
          stationID: selectedStation.id,
          param: selectedParameter.id,
          startDate,
          endDate
        });

      console.log('API Response:', result);

      // Check for API errors
      if (result && result.result === 'Error') {
        setData([]);
        if (result.error && result.error.includes('There is not have parammeter')) {
          setError(`No ${selectedParameter.name} data available for ${selectedStation.name}. Try selecting a different parameter or station.`);
        } else {
          setError(result.error || 'Error fetching data from API');
        }
        return;
      }

      // Handle Air4Thai API response format
      if (result && result.result === 'OK' && result.stations && Array.isArray(result.stations)) {
        // Extract data from stations array
        const stationData = result.stations[0]?.data || [];
        console.log('Extracted data:', stationData);

        if (stationData.length === 0) {
          setError(`No data available for ${selectedStation.name} during the selected date range.`);
        }

        setData(stationData);
      } else if (Array.isArray(result)) {
        setData(result);
      } else if (result && typeof result === 'object') {
        // Try other possible data locations
        const dataArray = result.data || [];
        setData(Array.isArray(dataArray) ? dataArray : []);
      } else {
        setData([]);
        setError('Received invalid data format from API');
      }
    } catch (err) {
      setError(`Failed to fetch data. ${useAIFilling ? 'Please ensure the backend server is running.' : 'Please try again.'}`);
      console.error('API Error:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStation && startDate && endDate) {
      // Clear previous error when selecting new station
      setError(null);
      handleFetchData();
    }
  }, [selectedStation, selectedParameter, useAIFilling]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map Background - Full Screen */}
      <div className="absolute inset-0 z-0">
        <Map
          stations={stations}
          selectedStation={selectedStation}
          onStationSelect={handleStationSelect}
          basemapStyle={selectedBasemap.url}
        />
      </div>

      {/* Header - Floating & Responsive */}
      <header className="absolute top-0 left-0 right-0 z-10 bg-orange-50/65 backdrop-blur-md shadow-lg border-b border-orange-200/30">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800">
              Thailand AQI Map
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">
              Real-time Air Quality Index across Thailand
            </p>
          </div>
        </div>
      </header>

      {/* Control Panel - Floating Left (Responsive) */}
      {showPanels.controls && (
        <div className="absolute top-12 sm:top-16 left-2 sm:left-4 z-20 w-[calc(100%-1rem)] sm:w-80 max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] overflow-y-auto space-y-3 sm:space-y-4 transition-all duration-300 ease-out">
          {/* Station Info */}
          <div className="bg-orange-50/65 backdrop-blur-md rounded-lg shadow-lg border border-orange-200/30">
            <div
              className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-white/20 min-h-[44px]"
              onClick={() => togglePanel('station')}
            >
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                Station Selection
              </h2>
              <svg
                className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${collapsedPanels.station ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {!collapsedPanels.station && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                {selectedStation ? (
                  <div className="space-y-1 sm:space-y-2">
                    <p className="text-sm sm:text-base font-medium text-blue-600">
                      {selectedStation.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      ID: {selectedStation.id}
                    </p>
                    <p className="text-xs text-gray-600">
                      Lat: {selectedStation.lat.toFixed(4)}, Lon: {selectedStation.lon.toFixed(4)}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-xs sm:text-sm">
                    Tap a marker on the map to select a station
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Parameter Selection */}
          <div className="bg-orange-50/65 backdrop-blur-md rounded-lg shadow-lg border border-orange-200/30">
            <div
              className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-white/20 min-h-[44px]"
              onClick={() => togglePanel('parameter')}
            >
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                Parameter
              </h2>
              <svg
                className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${collapsedPanels.parameter ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {!collapsedPanels.parameter && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                <select
                  value={selectedParameter.id}
                  onChange={(e) => {
                    const param = parameters.find(p => p.id === e.target.value);
                    setSelectedParameter(param);
                  }}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[44px]"
                >
                  {parameters.map(param => (
                    <option key={param.id} value={param.id}>
                      {param.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="bg-orange-50/65 backdrop-blur-md rounded-lg shadow-lg border border-orange-200/30">
            <div
              className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-white/20 min-h-[44px]"
              onClick={() => togglePanel('dateRange')}
            >
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                Date Range
              </h2>
              <svg
                className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${collapsedPanels.dateRange ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {!collapsedPanels.dateRange && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2 sm:space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:block sm:space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2 sm:px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2 sm:px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[44px]"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2 py-1 sm:py-2">
                  <input
                    type="checkbox"
                    id="useAIFilling"
                    checked={useAIFilling}
                    onChange={(e) => setUseAIFilling(e.target.checked)}
                    className="w-5 h-5 sm:w-4 sm:h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="useAIFilling" className="text-xs font-medium text-gray-700 cursor-pointer">
                    Fill gaps with AI (LSTM)
                  </label>
                </div>
                <button
                  onClick={handleFetchData}
                  disabled={loading || !selectedStation}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 text-white font-semibold py-2.5 sm:py-2 px-4 rounded-lg transition duration-200 text-sm min-h-[44px]"
                >
                  {loading ? 'Loading...' : 'Refresh Data'}
                </button>
                <p className="text-xs text-gray-500 text-center hidden sm:block">
                  Data auto-loads when selecting a station or parameter
                </p>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50/65 backdrop-blur-md border border-red-300/50 rounded-lg shadow-lg p-2 sm:p-3">
              <p className="text-red-800 text-xs">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Basemap Selection - Floating Right (Responsive) */}
      {showPanels.basemap && (
        <div className="absolute top-12 sm:top-16 right-2 sm:right-16 z-20 w-[calc(100%-1rem)] sm:w-64 transition-all duration-300 ease-out">
          <div className="bg-orange-50/65 backdrop-blur-md rounded-lg shadow-lg border border-orange-200/30">
            <div
              className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-white/20 min-h-[44px]"
              onClick={() => togglePanel('basemap')}
            >
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                Basemap Style
              </h2>
              <svg
                className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${collapsedPanels.basemap ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {!collapsedPanels.basemap && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                <select
                  value={selectedBasemap.id}
                  onChange={(e) => {
                    const basemap = basemaps.find(b => b.id === e.target.value);
                    setSelectedBasemap(basemap);
                  }}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[44px]"
                >
                  {basemaps.map(basemap => (
                    <option key={basemap.id} value={basemap.id}>
                      {basemap.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart - Floating Bottom Left (Responsive) */}
      {showPanels.chart && (
        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-auto z-20 sm:w-[calc(100%-8rem)] sm:max-w-2xl transition-all duration-300 ease-out">
          <div className="bg-orange-50/65 backdrop-blur-md rounded-lg shadow-lg border border-orange-200/30">
            <div
              className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-white/20 min-h-[44px]"
              onClick={() => togglePanel('chart')}
            >
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center flex-wrap">
                <span>Air Quality Trend</span>
                {loading && (
                  <span className="ml-2 sm:ml-3 text-xs text-blue-600 animate-pulse">
                    Loading...
                  </span>
                )}
              </h2>
              <svg
                className={`w-5 h-5 text-gray-600 transition-transform duration-200 flex-shrink-0 ${collapsedPanels.chart ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {!collapsedPanels.chart && (
              <div className="px-2 sm:px-4 pb-3 sm:pb-4">
                <div className="h-48 sm:h-64 md:h-80 relative">
                  {loading && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-gray-600 text-xs sm:text-sm">Fetching data...</p>
                      </div>
                    </div>
                  )}
                  <Chart data={data} parameter={selectedParameter} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Right Panel - Summary Info */}
      {showPanels.info && (
        <div className="absolute top-12 sm:top-16 right-2 sm:right-16 bottom-20 z-20 w-[320px] transition-all duration-300 ease-out hidden sm:block">
          <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-purple-600">
              <h2 className="text-white font-bold text-lg">Summary</h2>
              <p className="text-white/70 text-xs">
                {selectedStation ? selectedStation.name : 'Select a station'}
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedStation ? (
                <>
                  {/* Station Info */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Station</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedStation.name}</p>
                    <p className="text-xs text-gray-500 mt-1">ID: {selectedStation.id}</p>
                    <p className="text-xs text-gray-400">
                      📍 {selectedStation.lat.toFixed(4)}, {selectedStation.lon.toFixed(4)}
                    </p>
                  </div>

                  {/* Current Value */}
                  {data.length > 0 && (() => {
                    const values = data.map(d => parseFloat(d[selectedParameter.id])).filter(v => !isNaN(v) && v > 0);
                    if (values.length === 0) return null;
                    const current = values[values.length - 1];
                    const avg = values.reduce((a, b) => a + b, 0) / values.length;
                    const max = Math.max(...values);
                    const min = Math.min(...values);

                    const getHealthLevel = (v) => {
                      if (v <= 25) return { label: 'Good', bg: 'bg-green-100 text-green-800', color: 'text-green-600' };
                      if (v <= 37) return { label: 'Moderate', bg: 'bg-yellow-100 text-yellow-800', color: 'text-yellow-600' };
                      if (v <= 50) return { label: 'Unhealthy for Sensitive', bg: 'bg-orange-100 text-orange-800', color: 'text-orange-600' };
                      if (v <= 90) return { label: 'Unhealthy', bg: 'bg-red-100 text-red-800', color: 'text-red-600' };
                      return { label: 'Very Unhealthy', bg: 'bg-purple-100 text-purple-800', color: 'text-purple-600' };
                    };
                    const health = getHealthLevel(current);

                    return (
                      <>
                        {/* Current Value Card */}
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 text-center">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Current {selectedParameter.name}</p>
                          <p className={`text-4xl font-bold ${health.color}`}>{current.toFixed(0)}</p>
                          <p className="text-sm text-gray-500">{selectedParameter.unit}</p>
                          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${health.bg}`}>
                            {health.label}
                          </span>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 uppercase">Avg</p>
                            <p className="text-lg font-bold text-green-600">{avg.toFixed(0)}</p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 uppercase">Max</p>
                            <p className="text-lg font-bold text-red-600">{max.toFixed(0)}</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 uppercase">Min</p>
                            <p className="text-lg font-bold text-blue-600">{min.toFixed(0)}</p>
                          </div>
                        </div>

                        {/* Data Info */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Data Points</span>
                            <span className="font-medium text-gray-800">{values.length}</span>
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-gray-500">Parameter</span>
                            <span className="font-medium text-gray-800">{selectedParameter.name}</span>
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-gray-500">AI Gap Filling</span>
                            <span className={`font-medium ${useAIFilling ? 'text-green-600' : 'text-gray-400'}`}>
                              {useAIFilling ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {data.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-sm">No data loaded</p>
                      <p className="text-xs mt-1">Click "Refresh Data" to load</p>
                    </div>
                  )}

                  {loading && (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Loading data...</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm">No station selected</p>
                  <p className="text-xs mt-1">Click a marker on the map</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FloatingMenu - Control Panel Toggles */}
      <FloatingMenu
        items={[
          {
            id: 'controls',
            label: 'Toggle Control Panel',
            isActive: showPanels.controls,
            onClick: () => togglePanelVisibility('controls'),
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            ),
          },
          {
            id: 'chart',
            label: 'Toggle Chart',
            isActive: showPanels.chart,
            onClick: () => togglePanelVisibility('chart'),
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ),
          },
          {
            id: 'info',
            label: 'Toggle Summary Panel',
            isActive: showPanels.info,
            onClick: () => togglePanelVisibility('info'),
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
          {
            id: 'basemap',
            label: 'Toggle Basemap Selection',
            isActive: showPanels.basemap,
            onClick: () => togglePanelVisibility('basemap'),
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            ),
          },
        ]}
        position="bottom-right"
      />

      {/* Footer - Floating Bottom Right (Responsive) */}
      <div className="absolute bottom-20 sm:bottom-24 right-2 sm:right-4 z-10 bg-orange-50/65 backdrop-blur-md rounded-lg shadow-lg border border-orange-200/30 px-2 sm:px-4 py-1.5 sm:py-2">
        <p className="text-[10px] sm:text-xs text-gray-600">
          Data: <a href="http://air4thai.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Air4Thai</a>
        </p>
      </div>
    </div>
  );
}

export default App;
