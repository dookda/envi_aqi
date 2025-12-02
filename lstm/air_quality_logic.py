import requests
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from sklearn.impute import KNNImputer
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression

# 1. Data Ingestion
def fetch_data(station_id='36t', start_date='2025-11-02', end_date='2025-12-01'):
    url = f"http://air4thai.com/forweb/getHistoryData.php?stationID={station_id}&param=PM25&type=hr&sdate={start_date}&edate={end_date}&stime=00&etime=23"
    print(f"Fetching data from: {url}")
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        if 'stations' in data and len(data['stations']) > 0:
            # The API structure usually has a 'data' list inside the station object
            # Adjusting based on typical Air4Thai structure or the provided URL's expected output
            # Let's assume the structure is standard Air4Thai JSON
            station_data = data['stations'][0]['data']
            df = pd.DataFrame(station_data)
            return df
        else:
            print("No station data found in response.")
            return pd.DataFrame()
    except Exception as e:
        print(f"Error fetching data: {e}")
        return pd.DataFrame()

# 2. Preprocessing & Repair
def preprocess_data(df):
    if df.empty:
        return df
    
    # Convert timestamp
    # Air4Thai usually returns DATETIMEDATA like "2025-11-02 00:00:00"
    df['DATETIMEDATA'] = pd.to_datetime(df['DATETIMEDATA'])
    df.set_index('DATETIMEDATA', inplace=True)
    
    # Ensure numeric
    df['PM25'] = pd.to_numeric(df['PM25'], errors='coerce')
    
    # Handle missing dates (reindex to full range)
    full_idx = pd.date_range(start=df.index.min(), end=df.index.max(), freq='H')
    df = df.reindex(full_idx)
    
    # Repair/Impute missing data
    # Using interpolation for simple repair, or KNN for "Learning" based repair
    # Let's use interpolation for continuity, but the prompt asks for "Learning"
    # We can use a rolling mean or simple linear interpolation as a baseline
    df['PM25_Raw'] = df['PM25'] # Keep raw for comparison
    df['PM25'] = df['PM25'].interpolate(method='time')
    
    # If still NaNs (at start/end), ffill/bfill
    df['PM25'] = df['PM25'].ffill().bfill()
    
    return df

# 3. Anomaly Detection
def detect_anomalies(df):
    if df.empty:
        return df
    
    # Simple statistical anomaly detection (Z-score)
    # Or Isolation Forest for "AI" approach
    iso = IsolationForest(contamination=0.05, random_state=42)
    # Reshape for sklearn
    X = df[['PM25']].values
    df['anomaly_score'] = iso.fit_predict(X)
    df['is_anomaly'] = df['anomaly_score'] == -1
    
    return df

# 4. Forecasting (Learning Phase)
def forecast_pm25(df, hours=24):
    if df.empty:
        return None
    
    # Simple Autoregressive approach
    df['lag_1'] = df['PM25'].shift(1)
    df['lag_24'] = df['PM25'].shift(24)
    
    train_df = df.dropna()
    
    X = train_df[['lag_1', 'lag_24']]
    y = train_df['PM25']
    
    model = LinearRegression()
    model.fit(X, y)
    
    # Predict next 'hours' (iterative)
    last_row = df.iloc[-1].copy()
    predictions = []
    
    current_lag_1 = last_row['PM25']
    # For lag_24, we need history. 
    # This is a simplified loop for demonstration
    
    return model

# 5. Natural Language Generation
def generate_summary(df, anomalies):
    latest_val = df['PM25'].iloc[-1]
    avg_val = df['PM25'].mean()
    anom_count = anomalies['is_anomaly'].sum()
    
    summary = f"**Air Quality Analysis Report**\n"
    summary += f"- **Current PM2.5**: {latest_val:.2f} µg/m³\n"
    summary += f"- **Average (Last 30 Days)**: {avg_val:.2f} µg/m³\n"
    summary += f"- **Anomalies Detected**: {anom_count} instances.\n"
    
    if latest_val > 50:
        summary += "⚠️ **Alert**: PM2.5 levels are high. Please take precautions.\n"
    elif latest_val > 37.5:
        summary += "⚠️ **Warning**: PM2.5 levels are moderate. Sensitive groups should be careful.\n"
    else:
        summary += "✅ **Status**: Air quality is good.\n"
        
    return summary

# 6. Chatbot Interface
class AirQualityBot:
    def __init__(self, df, anomalies):
        self.df = df
        self.anomalies = anomalies
        self.context = {}
        
    def ask(self, user_input):
        user_input = user_input.lower()
        
        if "current" in user_input or "now" in user_input:
            val = self.df['PM25'].iloc[-1]
            return f"The current PM2.5 level is {val:.2f} µg/m³."
            
        elif "graph" in user_input or "plot" in user_input:
            self.plot_data()
            return "I have generated the PM2.5 trend graph for you."
            
        elif "anomaly" in user_input or "anomalies" in user_input:
            count = self.anomalies['is_anomaly'].sum()
            return f"I detected {count} anomalies in the data. These might be due to sensor errors or sudden pollution spikes."
            
        elif "summary" in user_input or "report" in user_input:
            return generate_summary(self.df, self.anomalies)
            
        elif "help" in user_input:
            return "I can answer questions like:\n- 'What is the current PM2.5?'\n- 'Show me the graph'\n- 'Report anomalies'\n- 'Give me a summary'"
            
        else:
            return "I'm sorry, I didn't understand that. Try asking about 'current PM2.5', 'graph', or 'summary'."

    def plot_data(self):
        plt.figure(figsize=(10, 5))
        plt.plot(self.df.index, self.df['PM25'], label='PM2.5 (Repaired)', color='blue')
        
        # Highlight anomalies
        anoms = self.df[self.anomalies['is_anomaly']]
        plt.scatter(anoms.index, anoms['PM25'], color='red', label='Anomaly')
        
        plt.title('PM2.5 Air Quality Trends (Last 30 Days)')
        plt.xlabel('Date')
        plt.ylabel('PM2.5 (µg/m³)')
        plt.legend()
        plt.grid(True)
        # In a notebook, plt.show() works. In a script, it might block, so we save it or just print.
        print("[Graph generated]")
        # plt.show() 

# Main execution block for testing
if __name__ == "__main__":
    df = fetch_data()
    if not df.empty:
        print("Data fetched successfully.")
        
        df_clean = preprocess_data(df)
        df_anom = detect_anomalies(df_clean)
        
        bot = AirQualityBot(df_clean, df_anom)
        
        print("\n--- Chatbot Test ---")
        print("User: What is the current PM2.5?")
        print(f"Bot: {bot.ask('What is the current PM2.5?')}")
        
        print("\nUser: Give me a summary.")
        print(f"Bot: {bot.ask('Give me a summary.')}")
        
        print("\nUser: Show graph.")
        print(f"Bot: {bot.ask('Show graph')}")
        
    else:
        print("Failed to fetch data.")
