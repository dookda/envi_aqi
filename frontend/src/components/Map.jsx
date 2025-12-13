import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getAQIColor, getAQILabel } from '../utils/helpers/aqi';

const AQI_MAP_API = "http://air4thai.pcd.go.th/forappV2/getAQI_JSON.php";

const Map = ({ stations, selectedStation, onStationSelect, basemapStyle }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popup = useRef(null);
  const [aqiData, setAqiData] = useState(null);

  // Fetch AQI data
  useEffect(() => {
    fetch(AQI_MAP_API)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        setAqiData(data);
      })
      .catch((err) => {
        console.error('Error fetching AQI data:', err);
      });
  }, []);

  // Initialize map once
  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: basemapStyle,
      center: [100.5018, 13.7563],
      zoom: 6
    });

    // Apply globe projection when style loads
    map.current.on('style.load', () => {
      map.current.setProjection({
        type: 'globe'
      });
    });

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
  }, [basemapStyle]);

  // Add stations as native circle layer with AQI data
  useEffect(() => {
    if (!map.current || !aqiData || !aqiData.stations) return;

    const addStationsLayer = () => {
      // Create GeoJSON from AQI data
      const geojson = {
        type: 'FeatureCollection',
        features: aqiData.stations
          .filter(station => station.lat && station.long)
          .map(station => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [parseFloat(station.long), parseFloat(station.lat)]
            },
            properties: {
              id: station.stationID,
              nameEN: station.nameEN,
              nameTH: station.nameTH,
              areaEN: station.areaEN,
              aqi: station.AQILast?.AQI?.aqi || 'N/A',
              colorId: station.AQILast?.AQI?.color_id || '0',
              param: station.AQILast?.AQI?.param || '',
              date: station.AQILast?.date || '',
              time: station.AQILast?.time || '',
              selected: selectedStation?.id === station.stationID
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

      // Add circles layer with AQI-based colors
      map.current.addLayer({
        id: 'stations-circles',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 10,
            8, 14,
            12, 20,
            15, 28
          ],
          'circle-color': [
            'match',
            ['get', 'colorId'],
            '1', '#00E400',
            '2', '#FFFF00',
            '3', '#FF7E00',
            '4', '#FF0000',
            '5', '#8F3F97',
            '6', '#7E0023',
            '#808080'
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.85,
          'circle-blur': 0.15
        }
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'stations-circles', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'stations-circles', () => {
        map.current.getCanvas().style.cursor = '';
      });

      // Show popup on hover with AQI information
      const showPopup = (e) => {
        const feature = e.features[0];
        const coordinates = feature.geometry.coordinates.slice();
        const props = feature.properties;

        // Ensure popup appears over the feature
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        const popupHTML = `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px;">${props.nameEN}</h3>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">${props.areaEN}</p>
            <div style="margin-top: 8px; padding: 8px; background: ${getAQIColor(props.colorId)}; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold; font-size: 16px; color: #000;">AQI: ${props.aqi}</p>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #000;">${getAQILabel(props.colorId)}</p>
              <p style="margin: 2px 0 0 0; font-size: 10px; color: #000;">Primary: ${props.param}</p>
            </div>
            <p style="margin: 4px 0 0 0; font-size: 10px; color: #999;">${props.date} ${props.time}</p>
          </div>
        `;

        popup.current
          .setLngLat(coordinates)
          .setHTML(popupHTML)
          .addTo(map.current);
      };

      const hidePopup = () => {
        popup.current.remove();
      };

      map.current.on('mouseenter', 'stations-circles', showPopup);
      map.current.on('mouseleave', 'stations-circles', hidePopup);

      // Handle click - find matching station from AQI data
      const handleClick = (e) => {
        const feature = e.features[0];
        const stationId = feature.properties.id;

        // Find the station in the original stations array
        const station = stations?.find(s => s.id === stationId);
        if (station && onStationSelect) {
          onStationSelect(station);
        }

        // Fly to the clicked station
        map.current.flyTo({
          center: feature.geometry.coordinates,
          zoom: 12,
          duration: 1500
        });
      };

      map.current.on('click', 'stations-circles', handleClick);
    };

    if (map.current.loaded() && map.current.isStyleLoaded()) {
      addStationsLayer();
    } else {
      map.current.once('load', addStationsLayer);
    }
  }, [aqiData, stations, selectedStation, onStationSelect]);

  const handleZoomIn = () => {
    if (map.current) {
      map.current.zoomIn({ duration: 300 });
    }
  };

  const handleZoomOut = () => {
    if (map.current) {
      map.current.zoomOut({ duration: 300 });
    }
  };

  const handleResetNorth = () => {
    if (map.current) {
      map.current.resetNorth({ duration: 300 });
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />

      {/* Custom Circular Map Controls */}
      <div className="absolute top-24 right-4 flex flex-col gap-2">
        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-full bg-orange-50/65 backdrop-blur-md border border-orange-200/30 shadow-lg flex items-center justify-center hover:bg-orange-100/80 transition-all duration-200"
          aria-label="Zoom in"
          title="Zoom in"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-full bg-orange-50/65 backdrop-blur-md border border-orange-200/30 shadow-lg flex items-center justify-center hover:bg-orange-100/80 transition-all duration-200"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
          </svg>
        </button>

        {/* Reset North */}
        <button
          onClick={handleResetNorth}
          className="w-10 h-10 rounded-full bg-orange-50/65 backdrop-blur-md border border-orange-200/30 shadow-lg flex items-center justify-center hover:bg-orange-100/80 transition-all duration-200"
          aria-label="Reset bearing to north"
          title="Reset bearing to north"
        >
          <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L6 12h4v8h4v-8h4L12 2z" />
            <text x="12" y="18" fontSize="8" fontWeight="bold" fill="white" textAnchor="middle">N</text>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Map;
