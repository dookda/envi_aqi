import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

/**
 * Custom hook for MapLibre GL JS integration
 * Handles map initialization, layer management, and feature interactions
 */
export const useMapLibre = ({
  container,
  center = [100.5018, 13.7563],
  zoom = 10,
  style = null,
  onLoad = null,
}) => {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Initialize map
  useEffect(() => {
    if (!container.current || mapRef.current) return;

    const defaultStyle = {
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
    };

    mapRef.current = new maplibregl.Map({
      container: container.current,
      style: style || defaultStyle,
      center,
      zoom,
    });

    // Add controls
    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-left');
    mapRef.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    // Handle map load
    mapRef.current.on('load', () => {
      setMapLoaded(true);
      if (onLoad) {
        onLoad(mapRef.current);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [container, center, zoom, style, onLoad]);

  // Add GeoJSON source
  const addGeoJSONSource = (sourceId, data) => {
    if (!mapRef.current || !mapLoaded) return;

    if (!mapRef.current.getSource(sourceId)) {
      mapRef.current.addSource(sourceId, {
        type: 'geojson',
        data,
      });
    } else {
      mapRef.current.getSource(sourceId).setData(data);
    }
  };

  // Add layer
  const addLayer = (layer) => {
    if (!mapRef.current || !mapLoaded) return;

    if (!mapRef.current.getLayer(layer.id)) {
      mapRef.current.addLayer(layer);
    }
  };

  // Remove layer
  const removeLayer = (layerId) => {
    if (!mapRef.current || !mapLoaded) return;

    if (mapRef.current.getLayer(layerId)) {
      mapRef.current.removeLayer(layerId);
    }
  };

  // Toggle layer visibility
  const toggleLayer = (layerId) => {
    if (!mapRef.current || !mapLoaded) return;

    const visibility = mapRef.current.getLayoutProperty(layerId, 'visibility');
    mapRef.current.setLayoutProperty(
      layerId,
      'visibility',
      visibility === 'visible' ? 'none' : 'visible'
    );
  };

  // Set layer opacity
  const setLayerOpacity = (layerId, opacity) => {
    if (!mapRef.current || !mapLoaded) return;

    const layer = mapRef.current.getLayer(layerId);
    if (!layer) return;

    const opacityProp = `${layer.type}-opacity`;
    mapRef.current.setPaintProperty(layerId, opacityProp, opacity / 100);
  };

  // Fly to location
  const flyTo = (center, zoom = null) => {
    if (!mapRef.current) return;

    mapRef.current.flyTo({
      center,
      zoom: zoom || mapRef.current.getZoom(),
      essential: true,
    });
  };

  // Fit bounds
  const fitBounds = (bounds, options = {}) => {
    if (!mapRef.current) return;

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      ...options,
    });
  };

  // Add marker
  const addMarker = (lngLat, options = {}) => {
    if (!mapRef.current) return null;

    return new maplibregl.Marker(options)
      .setLngLat(lngLat)
      .addTo(mapRef.current);
  };

  // Add popup
  const addPopup = (lngLat, content, options = {}) => {
    if (!mapRef.current) return null;

    return new maplibregl.Popup(options)
      .setLngLat(lngLat)
      .setHTML(content)
      .addTo(mapRef.current);
  };

  // Query features at point
  const queryFeatures = (point, layerId = null) => {
    if (!mapRef.current) return [];

    const features = mapRef.current.queryRenderedFeatures(point, {
      layers: layerId ? [layerId] : undefined,
    });

    return features;
  };

  // Add feature click handler
  const onFeatureClick = (layerId, callback) => {
    if (!mapRef.current || !mapLoaded) return;

    mapRef.current.on('click', layerId, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        setSelectedFeature(feature);
        callback(feature, e);
      }
    });

    // Change cursor on hover
    mapRef.current.on('mouseenter', layerId, () => {
      mapRef.current.getCanvas().style.cursor = 'pointer';
    });

    mapRef.current.on('mouseleave', layerId, () => {
      mapRef.current.getCanvas().style.cursor = '';
    });
  };

  return {
    map: mapRef.current,
    mapLoaded,
    selectedFeature,
    addGeoJSONSource,
    addLayer,
    removeLayer,
    toggleLayer,
    setLayerOpacity,
    flyTo,
    fitBounds,
    addMarker,
    addPopup,
    queryFeatures,
    onFeatureClick,
  };
};

/**
 * Hook for managing map layers
 */
export const useMapLayers = (map) => {
  const [layers, setLayers] = useState({});

  const addLayer = (id, config) => {
    setLayers(prev => ({
      ...prev,
      [id]: {
        id,
        visible: true,
        opacity: 100,
        ...config,
      },
    }));
  };

  const removeLayer = (id) => {
    setLayers(prev => {
      const newLayers = { ...prev };
      delete newLayers[id];
      return newLayers;
    });
  };

  const toggleVisibility = (id) => {
    setLayers(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        visible: !prev[id].visible,
      },
    }));
  };

  const setOpacity = (id, opacity) => {
    setLayers(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        opacity,
      },
    }));
  };

  return {
    layers,
    addLayer,
    removeLayer,
    toggleVisibility,
    setOpacity,
  };
};

/**
 * Hook for real-time data updates
 */
export const useRealtimeData = (endpoint, interval = 30000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(endpoint);
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, interval);

    return () => clearInterval(intervalId);
  }, [endpoint, interval]);

  return { data, loading, error };
};

export default {
  useMapLibre,
  useMapLayers,
  useRealtimeData,
};
