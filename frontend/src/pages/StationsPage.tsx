import { useState, useEffect } from 'react';
import { MapPin, Activity, Wind, Clock, ChevronRight } from 'lucide-react';
import { stationsApi, aqiApi, Station, AQIMeasurement } from '../services/api';
import { format } from 'date-fns';

const getAqiColor = (aqi: number | null): string => {
    if (aqi === null) return 'var(--neutral-500)';
    if (aqi <= 50) return 'var(--aqi-good)';
    if (aqi <= 100) return 'var(--aqi-moderate)';
    if (aqi <= 150) return 'var(--aqi-unhealthy-sensitive)';
    if (aqi <= 200) return 'var(--aqi-unhealthy)';
    if (aqi <= 300) return 'var(--aqi-very-unhealthy)';
    return 'var(--aqi-hazardous)';
};

const getAqiLevel = (aqi: number | null): string => {
    if (aqi === null) return 'N/A';
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
};

const getAqiBadgeClass = (aqi: number | null): string => {
    if (aqi === null) return '';
    if (aqi <= 50) return 'aqi-badge-good';
    if (aqi <= 100) return 'aqi-badge-moderate';
    if (aqi <= 150) return 'aqi-badge-unhealthy-sensitive';
    if (aqi <= 200) return 'aqi-badge-unhealthy';
    if (aqi <= 300) return 'aqi-badge-very-unhealthy';
    return 'aqi-badge-hazardous';
};

interface StationWithAQI extends Station {
    currentAqi?: AQIMeasurement;
}

const StationCard = ({ station, onClick }: { station: StationWithAQI; onClick: () => void }) => {
    const aqi = station.currentAqi?.aqi ?? null;

    return (
        <div
            className="card"
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={onClick}
        >
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 'var(--radius-md)',
                            background: getAqiColor(aqi),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <MapPin size={20} color={aqi && aqi > 100 ? 'white' : 'black'} />
                    </div>
                    <div>
                        <h4 style={{ marginBottom: 2 }}>{station.name}</h4>
                        <span className="text-sm text-muted">{station.province}</span>
                    </div>
                </div>
                <ChevronRight size={20} className="text-muted" />
            </div>

            <div className="flex gap-4">
                <div className="flex items-center gap-2">
                    <Activity size={16} style={{ color: getAqiColor(aqi) }} />
                    <span style={{ color: getAqiColor(aqi), fontWeight: 600 }}>
                        AQI {aqi ?? '--'}
                    </span>
                </div>

                {station.currentAqi?.pm25 && (
                    <div className="flex items-center gap-2">
                        <Wind size={16} className="text-muted" />
                        <span className="text-muted">
                            PM2.5: {station.currentAqi.pm25.toFixed(1)}
                        </span>
                    </div>
                )}
            </div>

            <div className="mt-4">
                <span className={`aqi-badge ${getAqiBadgeClass(aqi)}`}>
                    {getAqiLevel(aqi)}
                </span>
            </div>

            {station.currentAqi?.measured_at && (
                <div className="flex items-center gap-2 mt-4 text-sm text-muted">
                    <Clock size={14} />
                    <span>Updated: {format(new Date(station.currentAqi.measured_at), 'MMM dd, HH:mm')}</span>
                </div>
            )}
        </div>
    );
};

const StationDetail = ({ station, onClose }: { station: StationWithAQI; onClose: () => void }) => {
    const [history, setHistory] = useState<AQIMeasurement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await aqiApi.getHistory(station.id, undefined, undefined, 24);
                setHistory(data);
            } catch (err) {
                console.error('Failed to fetch history:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [station.id]);

    const aqi = station.currentAqi?.aqi ?? null;

    return (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2>{station.name}</h2>
                    <p className="text-muted">{station.province} • {station.station_code}</p>
                </div>
                <button className="btn btn-ghost" onClick={onClose}>← Back</button>
            </div>

            {/* Current AQI */}
            <div
                className="card-glass"
                style={{
                    padding: 'var(--space-6)',
                    marginBottom: 'var(--space-6)',
                    background: `linear-gradient(135deg, ${getAqiColor(aqi)}22, transparent)`,
                    border: `2px solid ${getAqiColor(aqi)}`,
                }}
            >
                <div className="text-center">
                    <div style={{ fontSize: '4rem', fontWeight: 700, color: getAqiColor(aqi) }}>
                        {aqi ?? '--'}
                    </div>
                    <div className={`aqi-badge ${getAqiBadgeClass(aqi)}`} style={{ fontSize: '1rem' }}>
                        {getAqiLevel(aqi)}
                    </div>
                </div>

                {station.currentAqi && (
                    <div className="flex justify-center gap-6 mt-6">
                        <div className="text-center">
                            <div className="text-muted text-sm">PM2.5</div>
                            <div style={{ fontWeight: 600 }}>{station.currentAqi.pm25?.toFixed(1) ?? '--'} µg/m³</div>
                        </div>
                        <div className="text-center">
                            <div className="text-muted text-sm">PM10</div>
                            <div style={{ fontWeight: 600 }}>{station.currentAqi.pm10?.toFixed(1) ?? '--'} µg/m³</div>
                        </div>
                        <div className="text-center">
                            <div className="text-muted text-sm">O3</div>
                            <div style={{ fontWeight: 600 }}>{station.currentAqi.o3?.toFixed(1) ?? '--'} ppb</div>
                        </div>
                    </div>
                )}
            </div>

            {/* 24-hour History */}
            <h4 style={{ marginBottom: 'var(--space-4)' }}>24-Hour History</h4>

            {loading ? (
                <div className="flex justify-center">
                    <div className="loading-spinner" />
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: 'var(--space-3)', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--neutral-400)' }}>Time</th>
                                <th style={{ textAlign: 'right', padding: 'var(--space-3)', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--neutral-400)' }}>AQI</th>
                                <th style={{ textAlign: 'right', padding: 'var(--space-3)', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--neutral-400)' }}>PM2.5</th>
                                <th style={{ textAlign: 'right', padding: 'var(--space-3)', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--neutral-400)' }}>Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((reading) => (
                                <tr key={reading.id}>
                                    <td style={{ padding: 'var(--space-3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        {format(new Date(reading.measured_at), 'HH:mm')}
                                    </td>
                                    <td style={{ padding: 'var(--space-3)', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', color: getAqiColor(reading.aqi), fontWeight: 600 }}>
                                        {reading.aqi ?? '--'}
                                    </td>
                                    <td style={{ padding: 'var(--space-3)', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
                                        {reading.pm25?.toFixed(1) ?? '--'}
                                    </td>
                                    <td style={{ padding: 'var(--space-3)', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
                                        <span className={`aqi-badge ${getAqiBadgeClass(reading.aqi)}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                            {getAqiLevel(reading.aqi)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Location */}
            <div className="mt-6">
                <h4 style={{ marginBottom: 'var(--space-3)' }}>Location</h4>
                <p className="text-muted">
                    Coordinates: {station.latitude?.toFixed(4)}, {station.longitude?.toFixed(4)}
                </p>
                <p className="text-muted">
                    Type: {station.station_type || 'General'}
                </p>
            </div>
        </div>
    );
};

const StationsPage = () => {
    const [stations, setStations] = useState<StationWithAQI[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStation, setSelectedStation] = useState<StationWithAQI | null>(null);
    const [provinceFilter, setProvinceFilter] = useState<string>('');
    const [provinces, setProvinces] = useState<{ province: string; station_count: number }[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [stationsData, provincesData, currentAqi] = await Promise.all([
                    stationsApi.getAll(),
                    stationsApi.getProvinces(),
                    aqiApi.getCurrent(),
                ]);

                // Merge current AQI data with stations
                const stationsWithAqi = stationsData.map((station) => ({
                    ...station,
                    currentAqi: currentAqi.find((m) => m.station_id === station.id),
                }));

                setStations(stationsWithAqi);
                setProvinces(provincesData);
            } catch (err) {
                console.error('Stations error:', err);
                setError('Failed to load stations. Please ensure the backend is running.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredStations = provinceFilter
        ? stations.filter((s) => s.province === provinceFilter)
        : stations;

    // Sort by AQI (highest first)
    const sortedStations = [...filteredStations].sort((a, b) => {
        const aqiA = a.currentAqi?.aqi ?? 0;
        const aqiB = b.currentAqi?.aqi ?? 0;
        return aqiB - aqiA;
    });

    if (loading) {
        return (
            <main className="main-content">
                <div className="flex flex-col items-center justify-center" style={{ minHeight: '400px' }}>
                    <div className="loading-spinner" />
                    <p className="mt-4 text-muted">Loading stations...</p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="main-content">
                <div className="empty-state">
                    <div className="empty-state-icon">📍</div>
                    <h3 className="empty-state-title">Unable to Load Stations</h3>
                    <p className="empty-state-description">{error}</p>
                    <button className="btn btn-primary" onClick={() => window.location.reload()}>
                        Retry
                    </button>
                </div>
            </main>
        );
    }

    if (selectedStation) {
        return (
            <main className="main-content">
                <StationDetail
                    station={selectedStation}
                    onClose={() => setSelectedStation(null)}
                />
            </main>
        );
    }

    return (
        <main className="main-content" style={{ flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Header */}
            <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                    <h1 style={{ marginBottom: 'var(--space-2)' }}>Monitoring Stations</h1>
                    <p className="text-muted">
                        {stations.length} active stations across Thailand
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <select
                        className="chat-input"
                        style={{ width: 'auto', minHeight: 'auto', padding: 'var(--space-3) var(--space-4)' }}
                        value={provinceFilter}
                        onChange={(e) => setProvinceFilter(e.target.value)}
                    >
                        <option value="">All Provinces</option>
                        {provinces.map((p) => (
                            <option key={p.province} value={p.province}>
                                {p.province} ({p.station_count})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stations Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 'var(--space-6)',
                }}
            >
                {sortedStations.map((station) => (
                    <StationCard
                        key={station.id}
                        station={station}
                        onClick={() => setSelectedStation(station)}
                    />
                ))}
            </div>

            {sortedStations.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">📍</div>
                    <h3 className="empty-state-title">No Stations Found</h3>
                    <p className="empty-state-description">
                        {provinceFilter
                            ? `No stations found in ${provinceFilter}. Try selecting a different province.`
                            : 'No monitoring stations available.'
                        }
                    </p>
                </div>
            )}
        </main>
    );
};

export default StationsPage;
