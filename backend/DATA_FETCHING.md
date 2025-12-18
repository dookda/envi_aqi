# Air Quality Historical Data Fetching Guide

This guide explains how to fetch historical air quality data from the Air4Thai API and populate your TimescaleDB database.

## Overview

The system provides two main scripts for data collection:

1. **`fetch_all_stations.py`** - Fetches all monitoring stations from Air4Thai
2. **`fetch_historical_data.py`** - Fetches historical air quality measurements

## Prerequisites

1. **Database Running**: Ensure TimescaleDB is running
   ```bash
   docker-compose up -d database
   ```

2. **Install Dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Environment Variables**: Create a `.env` file if needed
   ```bash
   DATABASE_URL=postgresql://air4thai_user:air4thai_password@localhost:5432/air4thai
   ```

## Step 1: Fetch All Monitoring Stations

First, fetch the complete list of monitoring stations from Air4Thai:

```bash
cd backend
python fetch_all_stations.py
```

**What this does:**
- Fetches all active monitoring stations from Air4Thai API
- Saves them to the `monitoring_stations` table
- Creates a reference file `all_stations.txt` with all station details
- Updates existing stations if they already exist in the database

**Output:**
```
2025-01-15 10:00:00 - INFO - Fetching all monitoring stations from Air4Thai...
2025-01-15 10:00:01 - INFO - Retrieved 85 stations from Air4Thai API
2025-01-15 10:00:01 - INFO - Saving stations to database...
2025-01-15 10:00:02 - INFO - Stations saved to database:
2025-01-15 10:00:02 - INFO -   New stations: 85
2025-01-15 10:00:02 - INFO -   Updated stations: 0
2025-01-15 10:00:02 - INFO -   Total stations: 85
```

## Step 2: Fetch Historical Air Quality Data

After stations are in the database, fetch historical measurements:

### Basic Usage

Fetch last 90 days for all stations and parameters:
```bash
python fetch_historical_data.py
```

### Advanced Usage

**Fetch specific time period:**
```bash
python fetch_historical_data.py --days 180
```

**Fetch for specific stations:**
```bash
python fetch_historical_data.py --stations "01t,50t,52t" --days 30
```

**Fetch specific parameters:**
```bash
python fetch_historical_data.py --parameters "PM25,PM10" --days 60
```

**Control batch size:**
```bash
python fetch_historical_data.py --batch-size 200 --days 90
```

**Combine options:**
```bash
python fetch_historical_data.py \
  --stations "50t,52t,54t" \
  --parameters "PM25,PM10" \
  --days 365 \
  --batch-size 150
```

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--days` | Number of days of historical data to fetch | 90 |
| `--batch-size` | Number of records to insert per batch | 100 |
| `--stations` | Comma-separated list of station IDs | All stations |
| `--parameters` | Comma-separated list of parameters | All parameters |

### Available Parameters

- `PM25` - PM2.5 particulate matter (μg/m³)
- `PM10` - PM10 particulate matter (μg/m³)
- `O3` - Ozone (ppb)
- `CO` - Carbon Monoxide (ppm)
- `NO2` - Nitrogen Dioxide (ppb)
- `SO2` - Sulfur Dioxide (ppb)

## Data Fetching Process

The script follows this process:

1. **Connects to Air4Thai API** for each station and parameter
2. **Retrieves hourly data** for the specified date range
3. **Checks for duplicates** before inserting (based on station_id, parameter, timestamp)
4. **Batch inserts** data into TimescaleDB for efficiency
5. **Logs progress** with detailed information

### Sample Output

```
2025-01-15 10:05:00 - INFO - Fetching data from 2024-10-17 to 2025-01-15
2025-01-15 10:05:00 - INFO - Stations: 8, Parameters: 6

2025-01-15 10:05:00 - INFO - Processing station: Bang Khen, Bangkok (01t)
2025-01-15 10:05:01 - INFO -   Fetching PM25...
2025-01-15 10:05:03 - INFO -   Retrieved 2160 measurements for PM25
2025-01-15 10:05:05 - INFO -   Inserted 2160 new records for PM25
2025-01-15 10:05:06 - INFO -   Fetching PM10...
2025-01-15 10:05:08 - INFO -   Retrieved 2160 measurements for PM10
2025-01-15 10:05:10 - INFO -   Inserted 2160 new records for PM10
...

============================================================
Data fetch completed!
Total measurements retrieved: 103680
Total new records inserted: 103680
Duplicates skipped: 0
============================================================
```

## Performance Considerations

### API Rate Limiting

- The script includes a 1-second delay between API calls to avoid overwhelming the Air4Thai server
- For fetching all stations (~85) and all parameters (6), expect ~10-15 minutes per 90 days

### Database Performance

- Uses batch inserts for efficiency (default 100 records per batch)
- Checks for duplicates to prevent constraint violations
- TimescaleDB's hypertable provides optimal performance for time-series data

### Recommended Approach

**Initial Population** (First Time):
```bash
# 1. Fetch all stations
python fetch_all_stations.py

# 2. Fetch recent data for all stations (30 days)
python fetch_historical_data.py --days 30

# 3. Gradually fetch more historical data
python fetch_historical_data.py --days 90
python fetch_historical_data.py --days 180
```

**Regular Updates** (Daily/Weekly):
```bash
# Fetch last 7 days to catch any updates
python fetch_historical_data.py --days 7
```

**Specific Analysis**:
```bash
# PM2.5 for northern stations (1 year)
python fetch_historical_data.py \
  --stations "50t,52t,54t" \
  --parameters "PM25" \
  --days 365
```

## Troubleshooting

### Database Connection Issues

**Error**: `Connection refused`

**Solution**: Ensure database is running
```bash
docker-compose up -d database
docker-compose ps
```

### API Timeout Issues

**Error**: `Timeout fetching data`

**Solution**: The Air4Thai API may be slow. The script will continue and log the error.

### Duplicate Key Errors

**Error**: `duplicate key value violates unique constraint`

**Solution**: The script checks for duplicates, but if you encounter this, you can:
- The script will skip existing records automatically
- Or manually delete and re-fetch: `DELETE FROM air_quality_measurements WHERE station_id = '01t' AND timestamp >= '2024-01-01';`

### Memory Issues

**Error**: `MemoryError` when fetching large datasets

**Solution**: Reduce batch size or days:
```bash
python fetch_historical_data.py --days 30 --batch-size 50
```

## Monitoring Progress

### Check Database Contents

```sql
-- Count total measurements
SELECT COUNT(*) FROM air_quality_measurements;

-- Count by station
SELECT station_id, station_name, COUNT(*) as count
FROM air_quality_measurements
GROUP BY station_id, station_name
ORDER BY count DESC;

-- Count by parameter
SELECT parameter, COUNT(*) as count
FROM air_quality_measurements
GROUP BY parameter
ORDER BY parameter;

-- Date range coverage
SELECT
    station_id,
    parameter,
    MIN(timestamp) as earliest,
    MAX(timestamp) as latest,
    COUNT(*) as measurements
FROM air_quality_measurements
GROUP BY station_id, parameter
ORDER BY station_id, parameter;
```

### Check Stations

```sql
-- List all stations
SELECT id, name, city, province, is_active
FROM monitoring_stations
ORDER BY province, city;

-- Count measurements per station
SELECT
    ms.id,
    ms.name,
    ms.province,
    COUNT(aqm.id) as measurement_count
FROM monitoring_stations ms
LEFT JOIN air_quality_measurements aqm ON ms.id = aqm.station_id
GROUP BY ms.id, ms.name, ms.province
ORDER BY measurement_count DESC;
```

## Automation

### Cron Job for Daily Updates

Add to your crontab for daily updates at 2 AM:

```bash
crontab -e
```

Add:
```
0 2 * * * cd /path/to/envi_aqi/backend && /usr/bin/python3 fetch_historical_data.py --days 7 >> /var/log/air4thai_fetch.log 2>&1
```

### Docker Integration

You can run the scripts inside the backend container:

```bash
# Execute in running container
docker-compose exec backend-prod python fetch_historical_data.py --days 30

# Or run as one-off command
docker-compose run --rm backend-prod python fetch_all_stations.py
```

## Data Quality

### Gap Detection

The database tracks gaps in the data. You can query for missing data:

```sql
-- Find gaps in measurements (hourly data expected)
WITH RECURSIVE hours AS (
    SELECT
        MIN(timestamp) as hour,
        MAX(timestamp) as max_hour,
        station_id,
        parameter
    FROM air_quality_measurements
    GROUP BY station_id, parameter

    UNION ALL

    SELECT
        hour + INTERVAL '1 hour',
        max_hour,
        station_id,
        parameter
    FROM hours
    WHERE hour < max_hour
)
SELECT
    h.station_id,
    h.parameter,
    h.hour as missing_hour
FROM hours h
LEFT JOIN air_quality_measurements aqm
    ON h.station_id = aqm.station_id
    AND h.parameter = aqm.parameter
    AND h.hour = aqm.timestamp
WHERE aqm.id IS NULL
LIMIT 100;
```

## Next Steps

After populating the database:

1. **Pre-train LSTM Models**: Run `python pretrain_models.py` to create gap-filling models
2. **Test API Endpoints**: Verify data is accessible via the FastAPI backend
3. **Monitor Data Quality**: Check for gaps and anomalies
4. **Set up Continuous Aggregates**: Use TimescaleDB's continuous aggregates for faster queries

## Support

For issues or questions:
- Check logs for detailed error messages
- Verify database connectivity
- Ensure Air4Thai API is accessible
- Review TimescaleDB documentation for performance tuning
