import { useState, useEffect } from 'react';
import Map from './components/Map';
import Chart from './components/Chart';
import { fetchAirQualityData, getStations, getParameters, getBasemaps } from './services/api';

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

  const handleFetchData = async () => {
    if (!selectedStation) {
      setError('Please select a station from the map');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchAirQualityData({
        stationID: selectedStation.id,
        param: selectedParameter.id,
        startDate,
        endDate
      });

      console.log('API Response:', result);

      // Handle Air4Thai API response format
      if (result && result.result === 'OK' && result.stations && Array.isArray(result.stations)) {
        // Extract data from stations array
        const stationData = result.stations[0]?.data || [];
        console.log('Extracted data:', stationData);
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
      setError('Failed to fetch data. Please try again.');
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
  }, [selectedStation, selectedParameter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-gray-800">
            Air4Thai Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time Air Quality Monitoring in Thailand
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Station Info */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Station Selection
              </h2>
              {selectedStation ? (
                <div className="space-y-2">
                  <p className="text-lg font-medium text-blue-600">
                    {selectedStation.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    ID: {selectedStation.id}
                  </p>
                  <p className="text-sm text-gray-600">
                    Lat: {selectedStation.lat.toFixed(4)}, Lon: {selectedStation.lon.toFixed(4)}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  Click on a marker on the map to select a station
                </p>
              )}
            </div>

            {/* Parameter Selection */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Parameter
              </h2>
              <select
                value={selectedParameter.id}
                onChange={(e) => {
                  const param = parameters.find(p => p.id === e.target.value);
                  setSelectedParameter(param);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {parameters.map(param => (
                  <option key={param.id} value={param.id}>
                    {param.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Basemap Selection */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Map Style
              </h2>
              <select
                value={selectedBasemap.id}
                onChange={(e) => {
                  const basemap = basemaps.find(b => b.id === e.target.value);
                  setSelectedBasemap(basemap);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {basemaps.map(basemap => (
                  <option key={basemap.id} value={basemap.id}>
                    {basemap.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Date Range
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleFetchData}
                  disabled={loading || !selectedStation}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  {loading ? 'Loading...' : 'Refresh Data'}
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Data auto-loads when selecting a station or parameter
                </p>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Map and Chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Station Locations
              </h2>
              <div className="h-96">
                <Map
                  stations={stations}
                  selectedStation={selectedStation}
                  onStationSelect={setSelectedStation}
                  basemapStyle={selectedBasemap.url}
                />
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Air Quality Trend
                {loading && (
                  <span className="ml-3 text-sm text-blue-600 animate-pulse">
                    Loading data...
                  </span>
                )}
              </h2>
              <div className="h-96 relative">
                {loading && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <p className="mt-3 text-gray-600">Fetching air quality data...</p>
                    </div>
                  </div>
                )}
                <Chart data={data} parameter={selectedParameter} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white shadow-md mt-12">
        <div className="container mx-auto px-4 py-4 text-center text-gray-600">
          <p>Data source: <a href="http://air4thai.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Air4Thai</a></p>
        </div>
      </footer>
    </div>
  );
}

export default App;
