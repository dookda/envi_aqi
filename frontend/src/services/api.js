import axios from 'axios';

const BASE_URL = 'http://air4thai.com/forweb/getHistoryData.php';
const BACKEND_URL = 'http://localhost:5600';

/**
 * Fetch historical air quality data from Air4Thai API
 * @param {Object} params - Query parameters
 * @param {string} params.stationID - Station ID
 * @param {string} params.param - Parameter (e.g., 'PM25', 'PM10', 'O3', 'CO', 'NO2', 'SO2')
 * @param {string} params.startDate - Start date (format: YYYY-MM-DD)
 * @param {string} params.endDate - End date (format: YYYY-MM-DD)
 * @returns {Promise<Array>} Air quality data
 */
export const fetchAirQualityData = async ({ stationID, param, startDate, endDate }) => {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        stationID,
        param,
        type: 'hr',
        sdate: startDate,
        edate: endDate,
        stime: '00',
        etime: '23'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching air quality data:', error);
    throw error;
  }
};

/**
 * Fetch air quality data with AI gap filling using LSTM model
 * @param {Object} params - Query parameters
 * @param {string} params.stationID - Station ID
 * @param {string} params.param - Parameter (e.g., 'PM25', 'PM10', 'O3', 'CO', 'NO2', 'SO2')
 * @param {string} params.startDate - Start date (format: YYYY-MM-DD)
 * @param {string} params.endDate - End date (format: YYYY-MM-DD)
 * @returns {Promise<Object>} Air quality data with gaps filled
 */
export const fetchAirQualityDataWithGapFilling = async ({ stationID, param, startDate, endDate }) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/enviapi/air-quality-with-gaps-filled`, {
      stationID,
      param,
      startDate,
      endDate
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching air quality data with gap filling:', error);
    throw error;
  }
};

/**
 * Get list of monitoring stations
 * @returns {Array} List of stations with their coordinates
 */
export const getStations = () => {
  // Sample stations - you can expand this list
  return [
    { id: '01t', name: 'Bang Khen, Bangkok', lat: 13.8267, lon: 100.6105 },
    { id: '02t', name: 'Bang Khun Thian, Bangkok', lat: 13.6447, lon: 100.4225 },
    { id: '03t', name: 'Bang Na, Bangkok', lat: 13.6683, lon: 100.6039 },
    { id: '04t', name: 'Boom Rung Muang, Bangkok', lat: 13.7486, lon: 100.5092 },
    { id: '05t', name: 'Chom Thong, Bangkok', lat: 13.6803, lon: 100.4372 },
    { id: '50t', name: 'Chiang Mai', lat: 18.7883, lon: 98.9853 },
    { id: '52t', name: 'Lampang', lat: 18.2886, lon: 99.4919 },
    { id: '54t', name: 'Lamphun', lat: 18.5744, lon: 99.0083 },
  ];
};

/**
 * Get available parameters for air quality measurement
 * @returns {Array} List of parameters
 */
export const getParameters = () => {
  return [
    { id: 'PM25', name: 'PM2.5', unit: 'μg/m³', color: '#ff6b6b' },
    { id: 'PM10', name: 'PM10', unit: 'μg/m³', color: '#4ecdc4' },
    { id: 'O3', name: 'Ozone (O3)', unit: 'ppb', color: '#45b7d1' },
    { id: 'CO', name: 'Carbon Monoxide (CO)', unit: 'ppm', color: '#f9ca24' },
    { id: 'NO2', name: 'Nitrogen Dioxide (NO2)', unit: 'ppb', color: '#95afc0' },
    { id: 'SO2', name: 'Sulfur Dioxide (SO2)', unit: 'ppb', color: '#eb4d4b' }
  ];
};

/**
 * Get available basemap styles
 * @returns {Array} List of basemap options
 */
export const getBasemaps = () => {
  return [
    {
      id: 'carto-light',
      name: 'Carto Light',
      url: {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors, © CARTO',
            maxzoom: 19
          }
        },
        layers: [
          {
            id: 'carto',
            type: 'raster',
            source: 'carto'
          }
        ]
      }
    },
    {
      id: 'carto-dark',
      name: 'Carto Dark',
      url: {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors, © CARTO',
            maxzoom: 19
          }
        },
        layers: [
          {
            id: 'carto',
            type: 'raster',
            source: 'carto'
          }
        ]
      }
    },
    {
      id: 'satellite',
      name: 'Satellite',
      url: {
        version: 8,
        sources: {
          satellite: {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community',
            maxzoom: 19
          }
        },
        layers: [
          {
            id: 'satellite',
            type: 'raster',
            source: 'satellite'
          }
        ]
      }
    },
    {
      id: 'osm',
      name: 'OpenStreetMap',
      url: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
            maxzoom: 19
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm'
          }
        ]
      }
    }
  ];
};
