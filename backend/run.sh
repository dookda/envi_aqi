#!/bin/bash

# Start FastAPI server
echo "Starting Air4Thai API Backend..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000
