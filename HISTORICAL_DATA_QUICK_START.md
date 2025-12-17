# 🚀 Historical Data Page - Quick Start Guide

## How to Access

1. **Start the Application**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open in Browser**
   - Navigate to [http://localhost:5173/historical](http://localhost:5173/historical)
   - Or click "Historical Data" in the top navigation bar

## 📍 Step-by-Step Guide

### Step 1: Select a Station (Two Methods)

#### Method A: Dropdown Selector 🔽
- Look for the **"Select Station"** dropdown at the top of the controls panel
- Click and choose from the list of stations:
  - 📍 Bang Khen, Bangkok
  - 📍 Bang Khun Thian, Bangkok
  - 📍 Bang Na, Bangkok
  - 📍 Chiang Mai
  - And more...

#### Method B: Interactive Map 🗺️
- Click any **marker** on the map (left panel)
- The map will automatically zoom to the selected station
- Station info appears at the bottom of the map

✅ **Visual Confirmation**: When selected, you'll see:
- Green checkmark with station name and ID
- Blue highlight on the map marker
- Selected station highlighted on map

---

### Step 2: Configure Your Analysis ⚙️

#### Choose Parameter
Select what you want to measure:
- **PM2.5** - Fine particulate matter (most common)
- **PM10** - Coarse particulate matter
- **O3** - Ozone
- **CO** - Carbon Monoxide
- **NO2** - Nitrogen Dioxide
- **SO2** - Sulfur Dioxide

#### Set Date Range 📅
**Option 1: Quick Presets**
- Click **7 Days** for last week
- Click **30 Days** for last month
- Click **90 Days** for last quarter

**Option 2: Custom Range**
- Use date pickers to select specific start/end dates

#### Enable AI Gap Filling 🤖
Toggle the checkbox: **"Enable AI Gap Filling (LSTM)"**

**When to use:**
- ✅ **Enable** when you have missing data points
- ✅ **Enable** for more complete analysis
- ❌ **Disable** to see only actual measurements
- ❌ **Disable** if backend server isn't running

---

### Step 3: View Your Data 📊

The chart automatically updates showing:

#### Chart Elements

| Visual | Meaning |
|--------|---------|
| 🔵 **Blue Solid Line** | Actual measured data from sensors |
| 🟢 **Green Dashed Line** | AI predictions for all data points |
| 🟠 **Orange Dots** | Gap-filled points (where data was missing) |

#### Statistics Dashboard
Three key metrics appear at the top:

1. **Total Data Points** - How many measurements
2. **Gap-Filled Points** - How many AI-predicted values
3. **Data Completeness** - % of real vs. predicted data

---

## 🎮 Interactive Features

### Chart Navigation
- **🔍 Zoom In/Out**:
  - Use slider at bottom of chart
  - Scroll wheel on chart area

- **👆 Pan Timeline**:
  - Click and drag on chart

- **ℹ️ Hover for Details**:
  - Move mouse over any point
  - See exact values and gap status

- **📸 Export Chart**:
  - Click camera icon (top-right of chart)
  - Saves as PNG image

### Quick Actions
- **🔄 Refresh Data**: Click the blue "Refresh Data" button
- **❓ Help Tutorial**: Click the blue/purple help button (bottom-right)

---

## 🎓 Understanding AI Gap Filling

### What is it?
Uses **LSTM (Long Short-Term Memory)** neural networks to predict missing data points.

### How it works:
1. **Analyzes** historical patterns
2. **Identifies** missing data points (gaps)
3. **Predicts** values using AI model
4. **Highlights** filled points in orange

### What to look for:
- **Tooltip Warning**: Hover shows "⚠ Gap-filled by AI"
- **Orange Dots**: Visual markers for predicted values
- **Green Dashed Line**: Shows AI confidence across timeline

### Accuracy Indicators:
- **High completeness %** (>80%) = More reliable
- **Few orange dots** = Mostly real data
- **Many orange dots** = More AI predictions

---

## ⚙️ Backend Setup (For Gap Filling)

### Required for AI Features
```bash
# In separate terminal
cd backend
python main.py
```

**Server should run at:** `http://localhost:8000`

### Without Backend:
- ✅ Can still view historical data
- ✅ Regular charts work fine
- ❌ Gap filling won't work
- 💡 Just **disable** the gap filling checkbox

---

## 💡 Pro Tips

### Best Practices

1. **Start with Presets** 📅
   - Use 7-day preset first
   - Expand to 30-90 days as needed

2. **Check Completeness** ✅
   - Higher % = more reliable trends
   - <70% completeness = consider different date range

3. **Compare Parameters** 🔄
   - PM2.5 and PM10 often correlate
   - O3 might show different patterns

4. **Use Gap Filling Wisely** 🤖
   - Enable for analysis and reporting
   - Disable to see data quality issues

### Common Scenarios

#### Scenario 1: Daily Monitoring
```
✓ Select your local station
✓ Set to 7 days
✓ Choose PM2.5
✓ Enable gap filling
✓ Check daily trends
```

#### Scenario 2: Trend Analysis
```
✓ Select station
✓ Set to 30-90 days
✓ Try multiple parameters
✓ Compare with/without gap filling
✓ Look for patterns
```

#### Scenario 3: Data Quality Check
```
✓ Select station
✓ Disable gap filling
✓ Check completeness %
✓ Identify gaps in data
```

---

## 🚨 Troubleshooting

### "No data available"
**Problem**: Station doesn't measure that parameter
**Solution**: Try PM2.5 (most common) or different parameter

### "Failed to fetch data"
**Problem**: Backend not running (gap filling enabled)
**Solutions**:
1. Start backend server
2. OR disable gap filling checkbox

### Chart shows no data
**Problem**: No measurements in date range
**Solutions**:
1. Try different date range
2. Select different station
3. Check if station was active then

### Gap filling not working
**Problem**: Backend connection issue
**Solutions**:
1. Check backend running at localhost:8000
2. Check browser console for errors
3. Temporarily disable gap filling

---

## 📱 Mobile/Tablet Use

- **Toggle View**: Use button in header to switch map/chart
- **Touch Gestures**: Pinch to zoom, swipe to pan
- **Dropdown Recommended**: Easier than clicking small map markers

---

## 🎯 Example Workflow

### Complete Analysis in 5 Steps:

```
1️⃣ Click "Historical Data" in navigation
   ↓
2️⃣ Select "Bang Khen, Bangkok" from dropdown
   ↓
3️⃣ Click "30 Days" preset button
   ↓
4️⃣ Enable "AI Gap Filling" checkbox
   ↓
5️⃣ View chart with complete data!
```

### What You'll See:
- ✅ 720 total data points (30 days × 24 hours)
- ✅ ~50-100 gap-filled points (typical)
- ✅ 85-90% data completeness
- ✅ Blue line showing real measurements
- ✅ Orange dots at missing data points
- ✅ Smooth trend analysis

---

## 📖 Need More Help?

1. **In-App Tutorial**: Click the help button (bottom-right) for interactive guide
2. **Full Documentation**: See [HISTORICAL_DATA_PAGE.md](HISTORICAL_DATA_PAGE.md)
3. **API Docs**: Check backend API documentation

---

## 🌟 Key Takeaways

✅ **Two ways to select stations**: Dropdown or map click
✅ **Quick presets** for common date ranges
✅ **AI gap filling** makes incomplete data useful
✅ **Interactive charts** with zoom, pan, export
✅ **Real-time statistics** show data quality
✅ **Works without backend** (just disable gap filling)

---

**Happy Exploring! 🎉**

For technical details, see [HISTORICAL_DATA_PAGE.md](HISTORICAL_DATA_PAGE.md)
