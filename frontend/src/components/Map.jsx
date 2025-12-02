import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const Map = ({ stations, selectedStation, onStationSelect, basemapStyle }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: basemapStyle || 'https://demotiles.maplibre.org/style.json',
      center: [100.5018, 13.7563], // Bangkok coordinates
      zoom: 6
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
  }, []);

  // Update map style when basemapStyle changes
  useEffect(() => {
    if (!map.current || !basemapStyle) return;

    try {
      map.current.setStyle(basemapStyle);

      // Re-add markers after style loads
      map.current.once('style.load', () => {
        // Trigger marker re-render by clearing markers
        markers.current.forEach(marker => marker.remove());
        markers.current = [];
      });
    } catch (error) {
      console.error('Error changing basemap style:', error);
    }
  }, [basemapStyle]);

  useEffect(() => {
    if (!map.current || !stations) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add markers for each station
    stations.forEach(station => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      // Highlight selected station
      if (selectedStation && selectedStation.id === station.id) {
        el.style.backgroundColor = '#ef4444';
        el.style.width = '36px';
        el.style.height = '36px';
      } else {
        el.style.backgroundColor = '#3b82f6';
      }

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([station.lon, station.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 })
            .setHTML(`<div class="font-semibold">${station.name}</div>`)
        )
        .addTo(map.current);

      el.addEventListener('click', () => {
        onStationSelect(station);
      });

      markers.current.push(marker);
    });

    // Fly to selected station
    if (selectedStation) {
      map.current.flyTo({
        center: [selectedStation.lon, selectedStation.lat],
        zoom: 10,
        duration: 1500
      });
    }
  }, [stations, selectedStation, onStationSelect, basemapStyle]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
};

export default Map;
