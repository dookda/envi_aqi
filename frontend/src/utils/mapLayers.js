/**
 * MapLibre Layer Utilities
 * Helper functions for creating and styling map layers
 */

/**
 * Create AQI point layer with graduated symbols
 */
export const createAQIPointLayer = (sourceId, layerId) => ({
  id: layerId,
  type: 'circle',
  source: sourceId,
  paint: {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['get', 'aqi'],
      0, 8,
      50, 10,
      100, 14,
      150, 18,
      200, 22,
      300, 26,
    ],
    'circle-color': [
      'step',
      ['get', 'aqi'],
      '#00E400', // Good (0-50)
      51, '#FFFF00', // Moderate (51-100)
      101, '#FF7E00', // Unhealthy for Sensitive (101-150)
      151, '#FF0000', // Unhealthy (151-200)
      201, '#8F3F97', // Very Unhealthy (201-300)
      301, '#7E0023', // Hazardous (301+)
    ],
    'circle-opacity': 0.8,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
  },
});

/**
 * Create heat map layer
 */
export const createHeatMapLayer = (sourceId, layerId) => ({
  id: layerId,
  type: 'heatmap',
  source: sourceId,
  paint: {
    // Increase the heatmap weight based on AQI value
    'heatmap-weight': [
      'interpolate',
      ['linear'],
      ['get', 'aqi'],
      0, 0,
      100, 0.5,
      200, 1,
    ],
    // Increase the heatmap color intensity
    'heatmap-intensity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 1,
      9, 3,
    ],
    // Color ramp for heatmap
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(33,102,172,0)',
      0.2, 'rgb(103,169,207)',
      0.4, 'rgb(209,229,240)',
      0.6, 'rgb(253,219,199)',
      0.8, 'rgb(239,138,98)',
      1, 'rgb(178,24,43)',
    ],
    // Adjust the heatmap radius by zoom level
    'heatmap-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 2,
      9, 20,
    ],
    // Transition from heatmap to circle layer by zoom level
    'heatmap-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      7, 1,
      9, 0,
    ],
  },
});

/**
 * Create choropleth polygon layer
 */
export const createChoroplethLayer = (sourceId, layerId, property = 'value') => ({
  id: layerId,
  type: 'fill',
  source: sourceId,
  paint: {
    'fill-color': [
      'step',
      ['get', property],
      '#FFEDA0', // 0-20
      20, '#FED976',
      40, '#FEB24C',
      60, '#FD8D3C',
      80, '#FC4E2A',
      100, '#E31A1C',
      120, '#BD0026',
    ],
    'fill-opacity': 0.7,
    'fill-outline-color': '#ffffff',
  },
});

/**
 * Create extrusion layer (3D buildings/heights)
 */
export const createExtrusionLayer = (sourceId, layerId, heightProperty = 'height') => ({
  id: layerId,
  type: 'fill-extrusion',
  source: sourceId,
  paint: {
    'fill-extrusion-color': [
      'interpolate',
      ['linear'],
      ['get', heightProperty],
      0, '#3288bd',
      50, '#66c2a5',
      100, '#abdda4',
      150, '#e6f598',
      200, '#fee08b',
      250, '#fdae61',
      300, '#f46d43',
    ],
    'fill-extrusion-height': ['get', heightProperty],
    'fill-extrusion-base': 0,
    'fill-extrusion-opacity': 0.8,
  },
});

/**
 * Create line layer (roads, routes, boundaries)
 */
export const createLineLayer = (sourceId, layerId, widthProperty = null) => ({
  id: layerId,
  type: 'line',
  source: sourceId,
  paint: {
    'line-color': '#3388ff',
    'line-width': widthProperty
      ? ['get', widthProperty]
      : 2,
    'line-opacity': 0.8,
  },
});

/**
 * Create symbol layer (labels, icons)
 */
export const createSymbolLayer = (sourceId, layerId, textField = 'name') => ({
  id: layerId,
  type: 'symbol',
  source: sourceId,
  layout: {
    'text-field': ['get', textField],
    'text-font': ['Open Sans Regular'],
    'text-size': 12,
    'text-offset': [0, 1.5],
    'text-anchor': 'top',
  },
  paint: {
    'text-color': '#333333',
    'text-halo-color': '#ffffff',
    'text-halo-width': 2,
  },
});

/**
 * Create cluster layer
 */
export const createClusterLayer = (sourceId, layerId) => [
  {
    id: `${layerId}-clusters`,
    type: 'circle',
    source: sourceId,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#51bbd6',
        10, '#f1f075',
        30, '#f28cb1',
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20,
        10, 30,
        30, 40,
      ],
    },
  },
  {
    id: `${layerId}-cluster-count`,
    type: 'symbol',
    source: sourceId,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
    paint: {
      'text-color': '#ffffff',
    },
  },
  {
    id: `${layerId}-unclustered-point`,
    type: 'circle',
    source: sourceId,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#11b4da',
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  },
];

/**
 * Get AQI color by value
 */
export const getAQIColor = (aqi) => {
  if (aqi <= 50) return '#00E400'; // Good
  if (aqi <= 100) return '#FFFF00'; // Moderate
  if (aqi <= 150) return '#FF7E00'; // Unhealthy for Sensitive
  if (aqi <= 200) return '#FF0000'; // Unhealthy
  if (aqi <= 300) return '#8F3F97'; // Very Unhealthy
  return '#7E0023'; // Hazardous
};

/**
 * Get AQI category by value
 */
export const getAQICategory = (aqi) => {
  if (aqi <= 50) return { label: 'Good', color: '#00E400' };
  if (aqi <= 100) return { label: 'Moderate', color: '#FFFF00' };
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: '#FF7E00' };
  if (aqi <= 200) return { label: 'Unhealthy', color: '#FF0000' };
  if (aqi <= 300) return { label: 'Very Unhealthy', color: '#8F3F97' };
  return { label: 'Hazardous', color: '#7E0023' };
};

/**
 * Create GeoJSON from array of points
 */
export const createGeoJSONFromPoints = (points) => ({
  type: 'FeatureCollection',
  features: points.map(point => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.lon || point.lng, point.lat],
    },
    properties: {
      ...point,
    },
  })),
});

/**
 * Calculate bounds from GeoJSON
 */
export const calculateBounds = (geojson) => {
  const coordinates = [];

  const extractCoordinates = (geometry) => {
    if (geometry.type === 'Point') {
      coordinates.push(geometry.coordinates);
    } else if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
      coordinates.push(...geometry.coordinates);
    } else if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
      geometry.coordinates.forEach(ring => coordinates.push(...ring));
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(polygon =>
        polygon.forEach(ring => coordinates.push(...ring))
      );
    }
  };

  geojson.features.forEach(feature => extractCoordinates(feature.geometry));

  if (coordinates.length === 0) return null;

  const lngs = coordinates.map(coord => coord[0]);
  const lats = coordinates.map(coord => coord[1]);

  return [
    [Math.min(...lngs), Math.min(...lats)], // Southwest
    [Math.max(...lngs), Math.max(...lats)], // Northeast
  ];
};

/**
 * Filter features by property value
 */
export const filterFeaturesByProperty = (geojson, property, min, max) => ({
  ...geojson,
  features: geojson.features.filter(feature => {
    const value = feature.properties[property];
    return value >= min && value <= max;
  }),
});

/**
 * Filter features by time range
 */
export const filterFeaturesByTime = (geojson, startTime, endTime) => ({
  ...geojson,
  features: geojson.features.filter(feature => {
    const timestamp = new Date(feature.properties.timestamp).getTime();
    return timestamp >= startTime && timestamp <= endTime;
  }),
});

export default {
  createAQIPointLayer,
  createHeatMapLayer,
  createChoroplethLayer,
  createExtrusionLayer,
  createLineLayer,
  createSymbolLayer,
  createClusterLayer,
  getAQIColor,
  getAQICategory,
  createGeoJSONFromPoints,
  calculateBounds,
  filterFeaturesByProperty,
  filterFeaturesByTime,
};
