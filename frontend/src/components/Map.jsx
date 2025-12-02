import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const Map = ({ stations, selectedStation, onStationSelect, basemapStyle }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popup = useRef(null);

  // Initialize map once
  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: basemapStyle,
      center: [100.5018, 13.7563],
      zoom: 6
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Initialize popup
    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 15
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add stations as native circle layer
  useEffect(() => {
    if (!map.current || !stations || stations.length === 0) return;

    const addStationsLayer = () => {
      // Create GeoJSON from stations
      const geojson = {
        type: 'FeatureCollection',
        features: stations.map(station => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [station.lon, station.lat]
          },
          properties: {
            id: station.id,
            name: station.name,
            selected: selectedStation?.id === station.id
          }
        }))
      };

      // Remove existing source and layers if they exist
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
        data: geojson
      });

      // Add unselected circles layer
      map.current.addLayer({
        id: 'stations-circles',
        type: 'circle',
        source: 'stations',
        filter: ['!=', ['get', 'selected'], true],
        paint: {
          'circle-radius': 15,
          'circle-color': '#3b82f6',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1
        }
      });

      // Add selected circles layer
      map.current.addLayer({
        id: 'stations-selected',
        type: 'circle',
        source: 'stations',
        filter: ['==', ['get', 'selected'], true],
        paint: {
          'circle-radius': 18,
          'circle-color': '#ef4444',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1
        }
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'stations-circles', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseenter', 'stations-selected', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'stations-circles', () => {
        map.current.getCanvas().style.cursor = '';
      });
      map.current.on('mouseleave', 'stations-selected', () => {
        map.current.getCanvas().style.cursor = '';
      });

      // Show popup on hover
      const showPopup = (e) => {
        const feature = e.features[0];
        const coordinates = feature.geometry.coordinates.slice();
        const name = feature.properties.name;

        // Ensure popup appears over the feature
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        popup.current
          .setLngLat(coordinates)
          .setHTML(`<div style="font-weight: 600; padding: 4px;">${name}</div>`)
          .addTo(map.current);
      };

      const hidePopup = () => {
        popup.current.remove();
      };

      map.current.on('mouseenter', 'stations-circles', showPopup);
      map.current.on('mouseenter', 'stations-selected', showPopup);
      map.current.on('mouseleave', 'stations-circles', hidePopup);
      map.current.on('mouseleave', 'stations-selected', hidePopup);

      // Handle click
      const handleClick = (e) => {
        const feature = e.features[0];
        const station = stations.find(s => s.id === feature.properties.id);
        if (station) {
          onStationSelect(station);
        }
      };

      map.current.on('click', 'stations-circles', handleClick);
      map.current.on('click', 'stations-selected', handleClick);
    };

    if (map.current.loaded() && map.current.isStyleLoaded()) {
      addStationsLayer();
    } else {
      map.current.once('load', addStationsLayer);
    }
  }, [stations, selectedStation, onStationSelect]);

  // Fly to selected station
  useEffect(() => {
    if (!map.current || !selectedStation) return;

    if (map.current.loaded()) {
      map.current.flyTo({
        center: [selectedStation.lon, selectedStation.lat],
        zoom: 10,
        duration: 1500,
        essential: true
      });
    }
  }, [selectedStation]);

  return (
    <div className="relative w-full h-full">
      <style>{`
        .maplibregl-ctrl-top-right {
          top: 100px;
        }
      `}</style>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
};

export default Map;
