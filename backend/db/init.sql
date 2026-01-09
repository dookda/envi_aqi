-- Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For text search
CREATE EXTENSION IF NOT EXISTS vector;    -- For embeddings (pgvector)

-- AQI Stations Table (with geospatial data)
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    station_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255),
    province VARCHAR(100),
    province_th VARCHAR(100),
    district VARCHAR(100),
    district_th VARCHAR(100),
    location GEOGRAPHY(POINT, 4326),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    station_type VARCHAR(50) DEFAULT 'general',
    owner VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_stations_location ON stations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_stations_province ON stations (province);

-- AQI Measurements Table
CREATE TABLE IF NOT EXISTS aqi_measurements (
    id BIGSERIAL PRIMARY KEY,
    station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    measured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    aqi INTEGER,
    aqi_color VARCHAR(20),
    aqi_level VARCHAR(50),
    
    -- Individual pollutants
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    o3 DOUBLE PRECISION,
    co DOUBLE PRECISION,
    no2 DOUBLE PRECISION,
    so2 DOUBLE PRECISION,
    
    -- Sub-indices
    pm25_aqi INTEGER,
    pm10_aqi INTEGER,
    o3_aqi INTEGER,
    co_aqi INTEGER,
    no2_aqi INTEGER,
    so2_aqi INTEGER,
    
    -- Temperature and humidity
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    wind_speed DOUBLE PRECISION,
    wind_direction DOUBLE PRECISION,
    
    -- Data quality
    data_source VARCHAR(50),
    is_valid BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_aqi_measurements_station_id ON aqi_measurements (station_id);
CREATE INDEX IF NOT EXISTS idx_aqi_measurements_measured_at ON aqi_measurements (measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_aqi_measurements_station_time ON aqi_measurements (station_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_aqi_measurements_aqi ON aqi_measurements (aqi);
CREATE INDEX IF NOT EXISTS idx_aqi_measurements_pm25 ON aqi_measurements (pm25);

-- Daily AQI Summary (aggregated for faster queries)
CREATE TABLE IF NOT EXISTS daily_aqi_summary (
    id BIGSERIAL PRIMARY KEY,
    station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- AQI statistics
    aqi_avg DOUBLE PRECISION,
    aqi_max INTEGER,
    aqi_min INTEGER,
    aqi_median DOUBLE PRECISION,
    
    -- PM2.5 statistics
    pm25_avg DOUBLE PRECISION,
    pm25_max DOUBLE PRECISION,
    pm25_min DOUBLE PRECISION,
    
    -- PM10 statistics
    pm10_avg DOUBLE PRECISION,
    pm10_max DOUBLE PRECISION,
    pm10_min DOUBLE PRECISION,
    
    -- Dominant pollutant
    dominant_pollutant VARCHAR(20),
    
    -- Number of valid readings
    reading_count INTEGER,
    
    -- Time above threshold
    hours_unhealthy INTEGER DEFAULT 0,  -- AQI > 100
    hours_hazardous INTEGER DEFAULT 0,  -- AQI > 300
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(station_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_summary_station_date ON daily_aqi_summary (station_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_aqi_summary (date DESC);

-- Chat History Table (for conversational memory)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    session_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    
    -- Context used for RAG
    context_data JSONB,
    sql_query TEXT,
    query_results JSONB,
    
    -- Embeddings for semantic search (if needed)
    embedding vector(768),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id, created_at);

-- Document chunks for RAG (if you have documentation about AQI)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_name VARCHAR(255),
    chunk_index INTEGER,
    content TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops);

-- AQI Level Reference Table
CREATE TABLE IF NOT EXISTS aqi_levels (
    id SERIAL PRIMARY KEY,
    min_aqi INTEGER NOT NULL,
    max_aqi INTEGER NOT NULL,
    level_name VARCHAR(50) NOT NULL,
    level_name_th VARCHAR(50),
    color VARCHAR(7) NOT NULL,
    health_implications TEXT,
    health_implications_th TEXT,
    cautionary_statement TEXT,
    cautionary_statement_th TEXT
);

-- Insert AQI Level Reference Data
INSERT INTO aqi_levels (min_aqi, max_aqi, level_name, level_name_th, color, health_implications, cautionary_statement)
VALUES 
    (0, 50, 'Good', 'ดี', '#00E400', 'Air quality is satisfactory, and air pollution poses little or no risk.', 'None'),
    (51, 100, 'Moderate', 'ปานกลาง', '#FFFF00', 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.', 'Unusually sensitive people should consider reducing prolonged or heavy exertion.'),
    (101, 150, 'Unhealthy for Sensitive Groups', 'เริ่มมีผลกระทบต่อสุขภาพ', '#FF7E00', 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.', 'People with heart or lung disease, older adults, and children should reduce prolonged or heavy exertion.'),
    (151, 200, 'Unhealthy', 'มีผลกระทบต่อสุขภาพ', '#FF0000', 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.', 'People with heart or lung disease, older adults, and children should avoid prolonged or heavy exertion. Everyone else should reduce prolonged or heavy exertion.'),
    (201, 300, 'Very Unhealthy', 'มีผลกระทบต่อสุขภาพมาก', '#8F3F97', 'Health alert: The risk of health effects is increased for everyone.', 'People with heart or lung disease, older adults, and children should avoid all physical activity outdoors. Everyone else should avoid prolonged or heavy exertion.'),
    (301, 500, 'Hazardous', 'อันตราย', '#7E0023', 'Health warning of emergency conditions: everyone is more likely to be affected.', 'Everyone should avoid all physical activity outdoors.')
ON CONFLICT DO NOTHING;

-- Sample Stations Data (Thai Pollution Control Department stations)
INSERT INTO stations (station_code, name, name_th, province, province_th, latitude, longitude, location, station_type, owner)
VALUES 
    ('02T', 'Din Daeng', 'ดินแดง', 'Bangkok', 'กรุงเทพมหานคร', 13.7649, 100.5588, ST_GeogFromText('POINT(100.5588 13.7649)'), 'roadside', 'PCD'),
    ('03T', 'Chok Chai 4', 'โชคชัย 4', 'Bangkok', 'กรุงเทพมหานคร', 13.8179, 100.5759, ST_GeogFromText('POINT(100.5759 13.8179)'), 'general', 'PCD'),
    ('05T', 'Wang Thonglang', 'วังทองหลาง', 'Bangkok', 'กรุงเทพมหานคร', 13.7783, 100.6092, ST_GeogFromText('POINT(100.6092 13.7783)'), 'general', 'PCD'),
    ('10T', 'Government House', 'ทำเนียบรัฐบาล', 'Bangkok', 'กรุงเทพมหานคร', 13.7623, 100.5139, ST_GeogFromText('POINT(100.5139 13.7623)'), 'general', 'PCD'),
    ('11T', 'Ratburana', 'ราษฎร์บูรณะ', 'Bangkok', 'กรุงเทพมหานคร', 13.6767, 100.5014, ST_GeogFromText('POINT(100.5014 13.6767)'), 'general', 'PCD'),
    ('35T', 'Chiang Mai City', 'เชียงใหม่', 'Chiang Mai', 'เชียงใหม่', 18.7879, 98.9932, ST_GeogFromText('POINT(98.9932 18.7879)'), 'general', 'PCD'),
    ('36T', 'Chiang Rai City', 'เชียงราย', 'Chiang Rai', 'เชียงราย', 19.9071, 99.8330, ST_GeogFromText('POINT(99.8330 19.9071)'), 'general', 'PCD'),
    ('54T', 'Khon Kaen', 'ขอนแก่น', 'Khon Kaen', 'ขอนแก่น', 16.4203, 102.8338, ST_GeogFromText('POINT(102.8338 16.4203)'), 'general', 'PCD'),
    ('59T', 'Rayong', 'ระยอง', 'Rayong', 'ระยอง', 12.6828, 101.2737, ST_GeogFromText('POINT(101.2737 12.6828)'), 'industrial', 'PCD'),
    ('70T', 'Phuket', 'ภูเก็ต', 'Phuket', 'ภูเก็ต', 7.8804, 98.3923, ST_GeogFromText('POINT(98.3923 7.8804)'), 'general', 'PCD')
ON CONFLICT (station_code) DO NOTHING;

-- Generate sample AQI data for the past 30 days
DO $$
DECLARE
    station_rec RECORD;
    current_date_var DATE;
    hour_var INTEGER;
    base_pm25 DOUBLE PRECISION;
    variation DOUBLE PRECISION;
    pm25_val DOUBLE PRECISION;
    aqi_val INTEGER;
BEGIN
    FOR station_rec IN SELECT id, station_code FROM stations LOOP
        -- Set base PM2.5 based on station type
        base_pm25 := CASE 
            WHEN station_rec.station_code IN ('35T', '36T') THEN 45  -- Northern Thailand (higher in dry season)
            WHEN station_rec.station_code = '59T' THEN 35  -- Industrial area
            ELSE 25
        END;
        
        -- Generate data for past 30 days
        FOR current_date_var IN SELECT generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day')::DATE LOOP
            FOR hour_var IN 0..23 LOOP
                -- Add daily and hourly variation
                variation := (sin(hour_var * 3.14159 / 12) * 15)  -- Daily pattern
                           + (random() * 20 - 10);  -- Random variation
                
                pm25_val := GREATEST(5, base_pm25 + variation);
                
                -- Calculate AQI from PM2.5 (simplified calculation)
                aqi_val := CASE
                    WHEN pm25_val <= 12 THEN (50 / 12.0) * pm25_val
                    WHEN pm25_val <= 35.4 THEN 50 + (50 / 23.4) * (pm25_val - 12)
                    WHEN pm25_val <= 55.4 THEN 100 + (50 / 20.0) * (pm25_val - 35.4)
                    WHEN pm25_val <= 150.4 THEN 150 + (50 / 95.0) * (pm25_val - 55.4)
                    WHEN pm25_val <= 250.4 THEN 200 + (100 / 100.0) * (pm25_val - 150.4)
                    ELSE 300 + (100 / 100.0) * (pm25_val - 250.4)
                END::INTEGER;
                
                INSERT INTO aqi_measurements (
                    station_id, measured_at, aqi, pm25, pm10, o3, co, no2, so2,
                    aqi_color, aqi_level, temperature, humidity, data_source
                ) VALUES (
                    station_rec.id,
                    (current_date_var + (hour_var || ' hours')::INTERVAL)::TIMESTAMP WITH TIME ZONE,
                    aqi_val,
                    pm25_val,
                    pm25_val * 1.3 + random() * 10,  -- PM10 roughly related to PM2.5
                    20 + random() * 60,  -- O3
                    0.5 + random() * 1.5,  -- CO
                    10 + random() * 30,  -- NO2
                    5 + random() * 15,  -- SO2
                    CASE
                        WHEN aqi_val <= 50 THEN '#00E400'
                        WHEN aqi_val <= 100 THEN '#FFFF00'
                        WHEN aqi_val <= 150 THEN '#FF7E00'
                        WHEN aqi_val <= 200 THEN '#FF0000'
                        WHEN aqi_val <= 300 THEN '#8F3F97'
                        ELSE '#7E0023'
                    END,
                    CASE
                        WHEN aqi_val <= 50 THEN 'Good'
                        WHEN aqi_val <= 100 THEN 'Moderate'
                        WHEN aqi_val <= 150 THEN 'Unhealthy for Sensitive Groups'
                        WHEN aqi_val <= 200 THEN 'Unhealthy'
                        WHEN aqi_val <= 300 THEN 'Very Unhealthy'
                        ELSE 'Hazardous'
                    END,
                    28 + random() * 10 - (hour_var % 24) / 3.0,  -- Temperature
                    50 + random() * 40,  -- Humidity
                    'generated_sample'
                );
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- Populate daily summary
INSERT INTO daily_aqi_summary (station_id, date, aqi_avg, aqi_max, aqi_min, pm25_avg, pm25_max, pm25_min, dominant_pollutant, reading_count, hours_unhealthy, hours_hazardous)
SELECT 
    station_id,
    DATE(measured_at) as date,
    ROUND(AVG(aqi)::numeric, 2) as aqi_avg,
    MAX(aqi) as aqi_max,
    MIN(aqi) as aqi_min,
    ROUND(AVG(pm25)::numeric, 2) as pm25_avg,
    ROUND(MAX(pm25)::numeric, 2) as pm25_max,
    ROUND(MIN(pm25)::numeric, 2) as pm25_min,
    'PM2.5' as dominant_pollutant,
    COUNT(*) as reading_count,
    COUNT(*) FILTER (WHERE aqi > 100) as hours_unhealthy,
    COUNT(*) FILTER (WHERE aqi > 300) as hours_hazardous
FROM aqi_measurements
GROUP BY station_id, DATE(measured_at)
ON CONFLICT (station_id, date) DO UPDATE SET
    aqi_avg = EXCLUDED.aqi_avg,
    aqi_max = EXCLUDED.aqi_max,
    aqi_min = EXCLUDED.aqi_min,
    pm25_avg = EXCLUDED.pm25_avg,
    pm25_max = EXCLUDED.pm25_max,
    pm25_min = EXCLUDED.pm25_min,
    reading_count = EXCLUDED.reading_count,
    hours_unhealthy = EXCLUDED.hours_unhealthy,
    hours_hazardous = EXCLUDED.hours_hazardous;

-- Helper function to get AQI level
CREATE OR REPLACE FUNCTION get_aqi_level(aqi_value INTEGER)
RETURNS TABLE(level_name VARCHAR, color VARCHAR, health_implications TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT al.level_name, al.color, al.health_implications
    FROM aqi_levels al
    WHERE aqi_value BETWEEN al.min_aqi AND al.max_aqi
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to find nearest station
CREATE OR REPLACE FUNCTION find_nearest_station(lat DOUBLE PRECISION, lon DOUBLE PRECISION, limit_count INTEGER DEFAULT 5)
RETURNS TABLE(
    id INTEGER,
    station_code VARCHAR,
    name VARCHAR,
    province VARCHAR,
    distance_km DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.station_code,
        s.name,
        s.province,
        ROUND((ST_Distance(s.location, ST_GeogFromText('POINT(' || lon || ' ' || lat || ')')) / 1000)::numeric, 2) as distance_km
    FROM stations s
    WHERE s.is_active = TRUE
    ORDER BY s.location <-> ST_GeogFromText('POINT(' || lon || ' ' || lat || ')')
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
