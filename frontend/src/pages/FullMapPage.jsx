import { useEffect, useState, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import PageHeader from '../components/organisms/PageHeader';
import AQILegend from '../components/organisms/AQILegend';
import StationDetailsPanel from '../components/organisms/StationDetailsPanel';
import { LoadingState, ErrorState } from '../components/molecules';
import { Card } from '../components/atoms';
import { getAQIColor, getAQILabel } from '../utils/helpers/aqi';

const AQI_MAP_API = "http://air4thai.pcd.go.th/forappV2/getAQI_JSON.php";

export default function FullMapPage() {
    const [aqiData, setAqiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedStation, setSelectedStation] = useState(null);
    const mapContainer = useRef(null);
    const map = useRef(null);

    // Fetch AQI data
    useEffect(() => {
        fetch(AQI_MAP_API)
            .then((res) => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then((data) => {
                setAqiData(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
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
            },
            center: [100.5018, 13.7563], // Thailand center
            zoom: 5.5
        });

        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // Add stations to map
    useEffect(() => {
        if (!map.current || !aqiData || !aqiData.stations) return;

        const addStations = () => {
            // Create GeoJSON from AQI data
            const features = aqiData.stations
                .filter(station => station.lat && station.long)
                .map(station => ({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(station.long), parseFloat(station.lat)]
                    },
                    properties: {
                        stationID: station.stationID,
                        nameEN: station.nameEN,
                        nameTH: station.nameTH,
                        areaEN: station.areaEN,
                        areaTH: station.areaTH,
                        aqi: station.AQILast?.AQI?.aqi || 'N/A',
                        colorId: station.AQILast?.AQI?.color_id || '0',
                        param: station.AQILast?.AQI?.param || '',
                        date: station.AQILast?.date || '',
                        time: station.AQILast?.time || ''
                    }
                }));

            const geojson = {
                type: 'FeatureCollection',
                features: features
            };

            // Remove existing layers and source if they exist
            if (map.current.getLayer('stations-circles')) {
                map.current.removeLayer('stations-circles');
            }
            if (map.current.getSource('stations')) {
                map.current.removeSource('stations');
            }

            // Add source
            map.current.addSource('stations', {
                type: 'geojson',
                data: geojson
            });

            // Add circles layer with color based on AQI
            map.current.addLayer({
                id: 'stations-circles',
                type: 'circle',
                source: 'stations',
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        5, 6,
                        10, 12,
                        15, 18
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
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                    'circle-opacity': 0.85
                }
            });

            // Add hover effect
            map.current.on('mouseenter', 'stations-circles', (e) => {
                map.current.getCanvas().style.cursor = 'pointer';

                const feature = e.features[0];
                const coordinates = feature.geometry.coordinates.slice();
                const props = feature.properties;

                // Create popup HTML
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

                new maplibregl.Popup({
                    closeButton: false,
                    offset: 15
                })
                    .setLngLat(coordinates)
                    .setHTML(popupHTML)
                    .addTo(map.current);
            });

            map.current.on('mouseleave', 'stations-circles', () => {
                map.current.getCanvas().style.cursor = '';
                const popups = document.getElementsByClassName('maplibregl-popup');
                if (popups.length) {
                    popups[0].remove();
                }
            });

            // Handle click
            map.current.on('click', 'stations-circles', (e) => {
                const feature = e.features[0];
                setSelectedStation(feature.properties);
                map.current.flyTo({
                    center: feature.geometry.coordinates,
                    zoom: 12,
                    duration: 1500
                });
            });
        };

        if (map.current.loaded() && map.current.isStyleLoaded()) {
            addStations();
        } else {
            map.current.once('load', addStations);
        }
    }, [aqiData]);

    if (loading) {
        return <LoadingState message="Loading Thailand AQI Map..." size="xl" />;
    }

    if (error) {
        return <ErrorState title="Error Loading Map" message={error} />;
    }

    return (
        <div className="relative w-full h-screen">
            {/* Map Container */}
            <div ref={mapContainer} className="w-full h-full" />

            {/* Header */}
            <PageHeader
                title="Thailand AQI Map"
                subtitle={`Real-time Air Quality Index across Thailand - ${aqiData?.stations?.length || 0} stations`}
                variant="default"
                actionButton={{
                    label: 'Back to Dashboard',
                    to: '/',
                    variant: 'primary',
                    size: 'md',
                    icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    ),
                }}
                className="absolute top-0 left-0 right-0 z-dropdown"
            />

            {/* Legend */}
            <AQILegend position="bottom-left" />

            {/* Station Details Panel */}
            <StationDetailsPanel
                station={selectedStation}
                onClose={() => setSelectedStation(null)}
                position="top-right"
            />

            {/* Data Source Attribution */}
            <div className="absolute bottom-6 right-6 z-dropdown">
                <Card variant="glass" padding="sm">
                    <p className="text-xs text-gray-600">
                        Data: <a href="http://air4thai.pcd.go.th" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Air4Thai PCD</a>
                    </p>
                </Card>
            </div>
        </div>
    );
}
