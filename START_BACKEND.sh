#!/bin/bash

# Start Backend Server for Air Quality Gap Filling
echo "🚀 Starting Air Quality Backend Server..."
echo "================================================"

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    exit 1
fi

# Check if requirements are installed
echo "📦 Checking dependencies..."
python3 -c "import fastapi" 2>/dev/null || {
    echo "⚠️  Installing requirements..."
    pip3 install -r requirements.txt
}

# Check TensorFlow
python3 -c "import tensorflow" 2>/dev/null || {
    echo "⚠️  TensorFlow not found. Gap filling will be limited."
    echo "💡 To install: pip3 install tensorflow"
}

echo ""
echo "✅ Starting server..."
echo "📍 Backend URL: http://localhost:8000"
echo "📊 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================================"
echo ""

# Start the server
python3 main.py
