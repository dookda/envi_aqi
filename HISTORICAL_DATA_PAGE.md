# Historical Data Page - User Guide

## Overview
The Historical Data page is a comprehensive tool for analyzing air quality trends over time with AI-powered gap filling capabilities. It combines interactive map-based station selection with advanced time series visualization.

## Features

### 🗺️ Interactive Station Selection
- **MapLibre GL JS Map**: Full interactive map showing all monitoring stations
- **Visual Station Markers**:
  - Gray markers: Available stations
  - Blue markers: Currently selected station
  - Hover tooltips with station information
- **Click to Select**: Simply click any station marker to load its historical data

### 📊 Advanced Data Visualization
- **Time Series Charts**: Built with ECharts for smooth, interactive data exploration
- **Multiple Chart Types**: Line charts with area fills for clear trend visualization
- **Zoom & Pan**: Interactive controls to focus on specific time periods
- **Data Export**: Save charts as images for reports

### 🤖 AI-Powered Gap Filling
The page features cutting-edge LSTM (Long Short-Term Memory) neural network technology to fill missing data points:

#### How Gap Filling Works:
1. **Data Collection**: Fetches historical data from Air4Thai API
2. **Gap Detection**: Automatically identifies missing data points
3. **AI Prediction**: Uses trained LSTM model to predict missing values
4. **Visual Indicators**: Shows which data points are filled

#### Visual Elements:
- **Blue Solid Line**: Actual measured data
- **Green Dashed Line**: AI predictions for all data points
- **Orange Dots**: Gap-filled points (where data was missing)
- **Tooltips**: Hover over points to see if they're gap-filled

### 📅 Flexible Date Range Selection
- **Custom Date Range**: Choose any start and end date
- **Quick Presets**:
  - 7 Days: Recent weekly trends
  - 30 Days: Monthly patterns
  - 90 Days: Quarterly analysis
- **Auto-Refresh**: Data updates automatically when dates change

### 📈 Parameter Selection
Choose from multiple air quality parameters:
- **PM2.5**: Fine particulate matter (μg/m³)
- **PM10**: Coarse particulate matter (μg/m³)
- **O3**: Ozone (ppb)
- **CO**: Carbon Monoxide (ppm)
- **NO2**: Nitrogen Dioxide (ppb)
- **SO2**: Sulfur Dioxide (ppb)

### 📊 Real-time Statistics
The page displays key metrics:
- **Total Data Points**: Number of data points in selected range
- **Gap-Filled Points**: How many points were predicted by AI
- **Data Completeness**: Percentage of original (non-filled) data

## How to Use

### Step 1: Select a Station
1. Navigate to the Historical Data page
2. Use the map on the left to find your station
3. Click on any station marker
4. The station info will appear at the bottom of the map

### Step 2: Configure Parameters
1. **Choose Parameter**: Select PM2.5, PM10, O3, etc. from the dropdown
2. **Set Date Range**: Use the date pickers or quick preset buttons
3. **Enable Gap Filling**: Toggle the "Enable AI Gap Filling" checkbox
   - ✅ ON: Uses LSTM model to fill missing data (requires backend)
   - ❌ OFF: Shows only available data with gaps

### Step 3: View and Analyze Data
1. The chart updates automatically
2. Use the **slider at the bottom** to zoom into specific time periods
3. **Hover** over data points to see exact values
4. **Click and drag** to pan across the timeline
5. Use **toolbox icons** (top-right) to:
   - Zoom in/out
   - Reset view
   - Save as image

### Step 4: Interpret Results
- **Solid Blue Line**: Real measurements from sensors
- **Dashed Green Line**: AI predictions (shows model confidence)
- **Orange Dots**: Where data was missing and AI filled the gaps
- **Tooltip Warning**: "⚠ Gap-filled by AI" indicates predicted values

## Technical Details

### Backend Requirements
Gap filling requires the backend server running at `http://localhost:8000`

To start the backend:
```bash
cd backend
python main.py
```

The backend uses:
- **LSTM Neural Network**: Trained on historical air quality patterns
- **Gap Filling API**: `/api/air-quality-with-gaps-filled`
- **Time Series Analysis**: Considers temporal patterns and correlations

### Data Sources
- **Primary**: Air4Thai API (http://air4thai.com)
- **Real-time**: Latest measurements from monitoring stations
- **Historical**: Archives going back years

### Performance
- **Chart Rendering**: Hardware-accelerated canvas rendering
- **Data Loading**: Optimized for datasets up to 90 days
- **Responsive**: Works on desktop and tablet devices
- **Auto-update**: Minimal re-renders for smooth performance

## Tips & Best Practices

### For Accurate Analysis:
1. **Use Gap Filling**: Enable AI predictions for incomplete datasets
2. **Compare Parameters**: Look at multiple pollutants for comprehensive analysis
3. **Check Completeness**: Higher completeness % = more reliable trends
4. **Consider Seasonality**: Compare similar time periods (e.g., same months)

### For Best Performance:
1. **Shorter Ranges**: Start with 7-30 days for faster loading
2. **Backend Connection**: Ensure backend is running for gap filling
3. **Browser**: Use modern browsers (Chrome, Firefox, Edge, Safari)

### Common Use Cases:

#### 1. Daily Monitoring
- Set range to 7 days
- Enable gap filling
- Check PM2.5 and PM10

#### 2. Trend Analysis
- Set range to 30-90 days
- Compare different parameters
- Look for patterns in gap-filled predictions

#### 3. Data Quality Assessment
- Compare with/without gap filling
- Check data completeness percentage
- Verify AI predictions against known events

## Troubleshooting

### "No data available"
- **Cause**: Station may not measure that parameter
- **Solution**: Try a different parameter (PM2.5 is most common)

### "Failed to fetch data"
- **Cause**: Backend server not running (when gap filling is enabled)
- **Solution**: Start backend server or disable gap filling

### Chart is empty
- **Cause**: No data in selected date range
- **Solution**: Adjust date range or select different station

### Gap filling not working
- **Cause**: Backend server connection issue
- **Solution**:
  1. Check backend is running at http://localhost:8000
  2. Check browser console for CORS errors
  3. Try disabling gap filling temporarily

## Navigation

Access the Historical Data page from the top navigation bar:
- **Dashboard**: Main air quality dashboard
- **Live Map**: Real-time AQI visualization
- **Historical Data**: This page ← You are here
- **Full Map**: Extended map view

## API Integration

The page integrates with two APIs:

### 1. Air4Thai Direct API (No Gap Filling)
```javascript
GET http://air4thai.com/forweb/getHistoryData.php
Parameters:
  - stationID: Station identifier
  - param: Parameter (PM25, PM10, etc.)
  - type: 'hr' (hourly)
  - sdate: Start date (YYYY-MM-DD)
  - edate: End date (YYYY-MM-DD)
```

### 2. Backend Gap Filling API
```javascript
POST http://localhost:8000/api/air-quality-with-gaps-filled
Body:
  - stationID: Station identifier
  - param: Parameter name
  - startDate: YYYY-MM-DD
  - endDate: YYYY-MM-DD
Response includes:
  - Original data
  - Predicted values
  - Gap indicators
```

## Future Enhancements

Planned features:
- 📊 Multiple station comparison
- 🔔 Alert threshold configuration
- 📥 Data export (CSV, Excel)
- 📱 Mobile-optimized layout
- 🌐 Multi-language support
- 🎨 Custom chart themes
- 📈 Advanced analytics (correlations, forecasting)

## Credits

- **Mapping**: MapLibre GL JS
- **Charts**: Apache ECharts
- **Data**: Air4Thai API
- **AI Model**: LSTM (TensorFlow/Keras)
- **Icons**: Heroicons

---

**Last Updated**: December 2025
**Version**: 1.0.0
