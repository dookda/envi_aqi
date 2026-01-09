import { useState, useEffect } from 'react';
import { Activity, Wind, Droplets, ThermometerSun, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { aqiApi, Statistics, DailySummary } from '../services/api';
import { format, subDays } from 'date-fns';

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
    if (aqi === null) return 'Unknown';
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
};

const StatCard = ({
    title,
    value,
    unit,
    icon: Icon,
    color,
    trend
}: {
    title: string;
    value: string | number;
    unit?: string;
    icon: React.ElementType;
    color: string;
    trend?: 'up' | 'down' | 'stable';
}) => (
    <div className="card" style={{ minWidth: '200px' }}>
        <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted">{title}</span>
            <Icon size={20} style={{ color }} />
        </div>
        <div className="flex items-center gap-2">
            <span style={{ fontSize: '2rem', fontWeight: 700, color }}>{value}</span>
            {unit && <span className="text-muted">{unit}</span>}
        </div>
        {trend && (
            <div className="flex items-center gap-1 mt-2 text-sm">
                {trend === 'up' && <TrendingUp size={16} style={{ color: 'var(--error)' }} />}
                {trend === 'down' && <TrendingDown size={16} style={{ color: 'var(--success)' }} />}
                {trend === 'stable' && <Minus size={16} style={{ color: 'var(--neutral-400)' }} />}
                <span className="text-muted">vs last period</span>
            </div>
        )}
    </div>
);

const DashboardPage = () => {
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [dailyData, setDailyData] = useState<DailySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDays, setSelectedDays] = useState(30);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [statsData, summaryData] = await Promise.all([
                    aqiApi.getStatistics(undefined, undefined, selectedDays),
                    aqiApi.getDailySummary(
                        undefined,
                        undefined,
                        format(subDays(new Date(), selectedDays), 'yyyy-MM-dd'),
                        format(new Date(), 'yyyy-MM-dd')
                    ),
                ]);

                setStatistics(statsData);

                // Aggregate daily data by date
                const aggregatedData = summaryData.reduce((acc: Record<string, DailySummary>, curr) => {
                    if (!acc[curr.date]) {
                        acc[curr.date] = { ...curr };
                    } else {
                        acc[curr.date].aqi_avg = ((acc[curr.date].aqi_avg || 0) + (curr.aqi_avg || 0)) / 2;
                        acc[curr.date].pm25_avg = ((acc[curr.date].pm25_avg || 0) + (curr.pm25_avg || 0)) / 2;
                    }
                    return acc;
                }, {});

                setDailyData(
                    Object.values(aggregatedData)
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                );
            } catch (err) {
                console.error('Dashboard error:', err);
                setError('Failed to load dashboard data. Please ensure the backend is running.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedDays]);

    if (loading) {
        return (
            <main className="main-content">
                <div className="flex flex-col items-center justify-center" style={{ minHeight: '400px' }}>
                    <div className="loading-spinner" />
                    <p className="mt-4 text-muted">Loading dashboard...</p>
                </div>
            </main>
        );
    }

    if (error || !statistics) {
        return (
            <main className="main-content">
                <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <h3 className="empty-state-title">Unable to Load Data</h3>
                    <p className="empty-state-description">{error}</p>
                    <button className="btn btn-primary" onClick={() => window.location.reload()}>
                        Retry
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="main-content" style={{ flexDirection: 'column', gap: 'var(--space-8)' }}>
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 style={{ marginBottom: 'var(--space-2)' }}>AQI Dashboard</h1>
                    <p className="text-muted">
                        Overview of Air Quality Index for the past {selectedDays} days
                    </p>
                </div>
                <div className="flex gap-2">
                    {[7, 30, 90].map((days) => (
                        <button
                            key={days}
                            className={`btn ${selectedDays === days ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setSelectedDays(days)}
                        >
                            {days}D
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
                <StatCard
                    title="Average AQI"
                    value={statistics.avg_aqi.toFixed(0)}
                    icon={Activity}
                    color={getAqiColor(statistics.avg_aqi)}
                />
                <StatCard
                    title="Max AQI"
                    value={statistics.max_aqi}
                    icon={TrendingUp}
                    color={getAqiColor(statistics.max_aqi)}
                />
                <StatCard
                    title="Average PM2.5"
                    value={statistics.avg_pm25.toFixed(1)}
                    unit="µg/m³"
                    icon={Wind}
                    color="var(--accent-400)"
                />
                <StatCard
                    title="Max PM2.5"
                    value={statistics.max_pm25.toFixed(1)}
                    unit="µg/m³"
                    icon={Droplets}
                    color="var(--warning)"
                />
                <StatCard
                    title="Total Readings"
                    value={statistics.total_readings.toLocaleString()}
                    icon={ThermometerSun}
                    color="var(--primary-400)"
                />
            </div>

            {/* Charts */}
            <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
                {/* AQI Trend Chart */}
                <div className="card" style={{ flex: '1 1 600px', minHeight: '400px' }}>
                    <h3 style={{ marginBottom: 'var(--space-4)' }}>AQI Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                                dataKey="date"
                                stroke="var(--neutral-400)"
                                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                            />
                            <YAxis stroke="var(--neutral-400)" />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--neutral-800)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius-md)',
                                }}
                                labelStyle={{ color: 'var(--neutral-200)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="aqi_avg"
                                stroke="var(--primary-400)"
                                strokeWidth={2}
                                dot={false}
                                name="Average AQI"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* PM2.5 Trend Chart */}
                <div className="card" style={{ flex: '1 1 600px', minHeight: '400px' }}>
                    <h3 style={{ marginBottom: 'var(--space-4)' }}>PM2.5 Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                                dataKey="date"
                                stroke="var(--neutral-400)"
                                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                            />
                            <YAxis stroke="var(--neutral-400)" />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--neutral-800)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius-md)',
                                }}
                                labelStyle={{ color: 'var(--neutral-200)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="pm25_avg"
                                stroke="var(--accent-400)"
                                strokeWidth={2}
                                dot={false}
                                name="Average PM2.5"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* AQI Level Distribution */}
            <div className="card" style={{ maxWidth: '600px' }}>
                <h3 style={{ marginBottom: 'var(--space-4)' }}>Days by AQI Level</h3>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                        data={[
                            { name: 'Good', value: statistics.days_good, fill: 'var(--aqi-good)' },
                            { name: 'Moderate', value: statistics.days_moderate, fill: 'var(--aqi-moderate)' },
                            { name: 'Unhealthy', value: statistics.days_unhealthy, fill: 'var(--aqi-unhealthy)' },
                        ]}
                        layout="vertical"
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis type="number" stroke="var(--neutral-400)" />
                        <YAxis type="category" dataKey="name" stroke="var(--neutral-400)" width={100} />
                        <Tooltip
                            contentStyle={{
                                background: 'var(--neutral-800)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 'var(--radius-md)',
                            }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </main>
    );
};

export default DashboardPage;
