"""
Simple script to test Air4Thai API response
"""
import requests
from datetime import datetime, timedelta
import json

# Test parameters
station_id = "50t"  # Chiang Mai
parameter = "PM25"
end_date = datetime.now()
start_date = end_date - timedelta(days=7)

url = "http://air4thai.com/forweb/getHistoryData.php"
params = {
    'stationID': station_id,
    'param': parameter,
    'type': 'hr',
    'sdate': start_date.strftime('%Y-%m-%d'),
    'edate': end_date.strftime('%Y-%m-%d'),
    'stime': '00',
    'etime': '23'
}

print(f"Testing Air4Thai API")
print(f"URL: {url}")
print(f"Parameters: {params}")
print("-" * 80)

try:
    response = requests.get(url, params=params, timeout=30)
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print("-" * 80)

    if response.status_code == 200:
        data = response.json()
        print(f"Response JSON (pretty):")
        print(json.dumps(data, indent=2, ensure_ascii=False))

        # Analyze the response
        print("\n" + "=" * 80)
        print("Analysis:")
        print(f"Response type: {type(data)}")

        if isinstance(data, dict):
            print(f"Result: {data.get('result')}")
            if data.get('result') == 'Error':
                print(f"Error message: {data.get('error')}")
            elif data.get('result') == 'OK':
                stations = data.get('stations', [])
                print(f"Number of stations: {len(stations)}")
                if stations:
                    station_data = stations[0].get('data', [])
                    print(f"Number of data points: {len(station_data)}")
                    if station_data:
                        print(f"First data point: {station_data[0]}")
                        print(f"Last data point: {station_data[-1]}")
    else:
        print(f"Error: HTTP {response.status_code}")
        print(f"Response text: {response.text}")

except Exception as e:
    print(f"Exception occurred: {e}")
    import traceback
    traceback.print_exc()
