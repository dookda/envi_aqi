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
    basemap: false
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

      {/* Header - Floating */}
      <header className="absolute top-0 left-0 right-0 z-10 bg-orange-50/65 backdrop-blur-md shadow-lg border-b border-orange-200/30">
        <div className="container mx-auto px-4 py-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Thailand AQI Map
            </h1>
            <p className="text-gray-600 text-sm">
              Real-time Air Quality Index across Thailand
            </p>
          </div>
        </div>
      </header>

      {/* Control Panel - Floating Left */}
      {showPanels.controls && (
      <div className="absolute top-24 left-4 z-20 w-80 max-h-[calc(100vh-7rem)] overflow-y-auto space-y-4 transition-all duration-300 ease-out">
        {/* Station Info */}
        <div className="bg-orange-50/65 backdrop-blur-md rounded-lg shadow-lg border border-orange-200/30">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/20"
            onClick={() => togglePanel('station')}
          >
            <h2 className="text-lg font-semibold text-gray-800">
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
            <div className="px-4 pb-4">
              {selectedStation ? (
                <div className="space-y-2">
                  <p className="text-base font-medium text-blue-600">
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
                <p className="text-gray-500 italic text-sm">
                  Click on a marker on the map to select a station
                </p>
              )}
            </div>
          )}
        </div>

        {/* Parameter Selection */}
        <div className="bg-orange-50/65 backdrop-blur-md rounded-lg shadow-lg border border-orange-200/30">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/20"
            onClick={() => togglePanel('parameter')}
          >
            <h2 className="text-lg font-semibold text-gray-800">
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
            <div className="px-4 pb-4">
              <select
                value={selectedParameter.id}
                onChange={(e) => {
                  const param = parameters.find(p => p.id === e.target.value);
                  setSelectedParameter(param);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/20"
            onClick={() => togglePanel('dateRange')}
          >
            <h2 className="text-lg font-semibold text-gray-800">
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
            <div className="px-4 pb-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex items-center space-x-2 py-2">
                <input
                  type="checkbox"
                  id="useAIFilling"
                  checked={useAIFilling}
                  onChange={(e) => setUseAIFilling(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="useAIFilling" className="text-xs font-medium text-gray-700 cursor-pointer">
                  Fill data gaps with AI predictions (LSTM)
                </label>
              </div>
              <button
                onClick={handleFetchData}
                disabled={loading || !selectedStation}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 text-sm"
              >
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
              <p className="text-xs text-gray-500 text-center">
                Data auto-loads when selecting a station or parameter
              </p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50/65 backdrop-blur-md border border-red-300/50 rounded-lg shadow-lg p-3">
            <p className="text-red-800 text-xs">{error}</p>
          </div>
        )}
      </div>
      )}

      {/* Basemap Selection - Floating Right */}
      {showPanels.basemap && (
      <div className="absolute top-24 right-16 z-20 w-64 transition-all duration-300 ease-out">
        <div className="bg-orange-50/65 backdrop-blur-md rounded-lg shadow-lg border border-orange-200/30">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/20"
            onClick={() => togglePanel('basemap')}
          >
            <h2 className="text-lg font-semibold text-gray-800">
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
            <div className="px-4 pb-4">
              <select
                value={selectedBasemap.id}
                onChange={(e) => {
                  const basemap = basemaps.find(b => b.id === e.target.value);
                  setSelectedBasemap(basemap);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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

      {/* Chart - Floating Bottom Left */}
      {showPanels.chart && (
      <div className="absolute bottom-4 left-4 z-20 w-[calc(100%-2rem)] max-w-2xl transition-all duration-300 ease-out">
        <div className="bg-orange-50/65 backdrop-blur-md rounded-lg shadow-lg border border-orange-200/30">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/20"
            onClick={() => togglePanel('chart')}
          >
            <h2 className="text-lg font-semibold text-gray-800">
              Air Quality Trend
              {loading && (
                <span className="ml-3 text-xs text-blue-600 animate-pulse">
                  Loading data...
                </span>
              )}
            </h2>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${collapsedPanels.chart ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {!collapsedPanels.chart && (
            <div className="px-4 pb-4">
              <div className="h-80 relative">
                {loading && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-gray-600 text-sm">Fetching air quality data...</p>
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

      {/* Footer - Floating Bottom Right */}
      <div className="absolute bottom-24 right-4 z-10 bg-orange-50/65 backdrop-blur-md rounded-lg shadow-lg border border-orange-200/30 px-4 py-2">
        <p className="text-xs text-gray-600">
          Data source: <a href="http://air4thai.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Air4Thai</a>
        </p>
      </div>
    </div>
  );
}

export default App;
