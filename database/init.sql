-- Initialize PostGIS Extension for spatial database capabilities
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create air quality measurements table
CREATE TABLE IF NOT EXISTS air_quality_measurements (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL,
    station_name VARCHAR(255),
    parameter VARCHAR(50) NOT NULL,
    value FLOAT,
    unit VARCHAR(20),
    timestamp TIMESTAMPTZ NOT NULL,
    latitude FLOAT,
    longitude FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries (optimized for time-series data)
CREATE INDEX IF NOT EXISTS idx_station_id ON air_quality_measurements(station_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_parameter ON air_quality_measurements(parameter, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_timestamp ON air_quality_measurements(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_station_param_time ON air_quality_measurements(station_id, parameter, timestamp DESC);

-- Create monitoring stations table with PostGIS geometry
CREATE TABLE IF NOT EXISTS monitoring_stations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    location GEOGRAPHY(POINT, 4326), -- PostGIS geometry column for spatial queries
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index on location
CREATE INDEX IF NOT EXISTS idx_stations_location ON monitoring_stations USING GIST(location);

-- Create parameters reference table
CREATE TABLE IF NOT EXISTS parameters (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    description TEXT,
    threshold_good FLOAT,
    threshold_moderate FLOAT,
    threshold_unhealthy FLOAT,
    threshold_very_unhealthy FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default parameters
INSERT INTO parameters (id, name, unit, threshold_good, threshold_moderate, threshold_unhealthy, threshold_very_unhealthy) VALUES
    ('PM25', 'PM2.5', 'μg/m³', 12.0, 35.4, 55.4, 150.4),
    ('PM10', 'PM10', 'μg/m³', 54.0, 154.0, 254.0, 354.0),
    ('O3', 'Ozone', 'ppb', 54.0, 70.0, 85.0, 105.0),
    ('CO', 'Carbon Monoxide', 'ppm', 4.4, 9.4, 12.4, 15.4),
    ('NO2', 'Nitrogen Dioxide', 'ppb', 53.0, 100.0, 360.0, 649.0),
    ('SO2', 'Sulfur Dioxide', 'ppb', 35.0, 75.0, 185.0, 304.0)
ON CONFLICT (id) DO NOTHING;

-- Insert default monitoring stations with PostGIS geometry
INSERT INTO monitoring_stations (id, name, latitude, longitude, location, city, province) VALUES
    ('01t', 'Bang Khen, Bangkok', 13.8267, 100.6105, ST_SetSRID(ST_MakePoint(100.6105, 13.8267), 4326)::geography, 'Bangkok', 'Bangkok'),
    ('02t', 'Bang Khun Thian, Bangkok', 13.6447, 100.4225, ST_SetSRID(ST_MakePoint(100.4225, 13.6447), 4326)::geography, 'Bangkok', 'Bangkok'),
    ('03t', 'Bang Na, Bangkok', 13.6683, 100.6039, ST_SetSRID(ST_MakePoint(100.6039, 13.6683), 4326)::geography, 'Bangkok', 'Bangkok'),
    ('04t', 'Boom Rung Muang, Bangkok', 13.7486, 100.5092, ST_SetSRID(ST_MakePoint(100.5092, 13.7486), 4326)::geography, 'Bangkok', 'Bangkok'),
    ('05t', 'Chom Thong, Bangkok', 13.6803, 100.4372, ST_SetSRID(ST_MakePoint(100.4372, 13.6803), 4326)::geography, 'Bangkok', 'Bangkok'),
    ('50t', 'Chiang Mai', 18.7883, 98.9853, ST_SetSRID(ST_MakePoint(98.9853, 18.7883), 4326)::geography, 'Chiang Mai', 'Chiang Mai'),
    ('52t', 'Lampang', 18.2886, 99.4919, ST_SetSRID(ST_MakePoint(99.4919, 18.2886), 4326)::geography, 'Lampang', 'Lampang'),
    ('54t', 'Lamphun', 18.5744, 99.0083, ST_SetSRID(ST_MakePoint(99.0083, 18.5744), 4326)::geography, 'Lamphun', 'Lamphun')
ON CONFLICT (id) DO NOTHING;

-- Create model training data table
CREATE TABLE IF NOT EXISTS model_training_data (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    parameter VARCHAR(50) NOT NULL,
    station_id VARCHAR(50),
    training_start_date TIMESTAMPTZ,
    training_end_date TIMESTAMPTZ,
    accuracy_score FLOAT,
    mae FLOAT,
    rmse FLOAT,
    r2_score FLOAT,
    model_path TEXT,
    model_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create anomalies detection table
CREATE TABLE IF NOT EXISTS detected_anomalies (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL,
    parameter VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    value FLOAT NOT NULL,
    expected_value FLOAT,
    anomaly_score FLOAT,
    detection_method VARCHAR(50),
    severity VARCHAR(20),
    anomaly_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON detected_anomalies(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_station ON detected_anomalies(station_id, timestamp DESC);

-- Create standard materialized views for aggregated data (without TimescaleDB)
-- Hourly aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS air_quality_hourly AS
SELECT
    DATE_TRUNC('hour', timestamp) AS hour,
    station_id,
    parameter,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    COUNT(*) as measurement_count
FROM air_quality_measurements
GROUP BY DATE_TRUNC('hour', timestamp), station_id, parameter;

CREATE INDEX IF NOT EXISTS idx_hourly_hour ON air_quality_hourly(hour DESC);
CREATE INDEX IF NOT EXISTS idx_hourly_station ON air_quality_hourly(station_id, hour DESC);

-- Daily aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS air_quality_daily AS
SELECT
    DATE_TRUNC('day', timestamp) AS day,
    station_id,
    parameter,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    COUNT(*) as measurement_count
FROM air_quality_measurements
GROUP BY DATE_TRUNC('day', timestamp), station_id, parameter;

CREATE INDEX IF NOT EXISTS idx_daily_day ON air_quality_daily(day DESC);
CREATE INDEX IF NOT EXISTS idx_daily_station ON air_quality_daily(station_id, day DESC);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Note: To refresh materialized views, run:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY air_quality_hourly;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY air_quality_daily;
