#!/bin/bash
# Quick setup script for populating the Air Quality database

set -e  # Exit on error

echo "=================================="
echo "Air Quality Database Setup"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if database is running
echo -e "${BLUE}Checking database connection...${NC}"
if docker-compose ps database | grep -q "Up"; then
    echo -e "${GREEN}✓ Database is running${NC}"
else
    echo -e "${YELLOW}Starting database...${NC}"
    docker-compose up -d database
    echo "Waiting for database to be ready..."
    sleep 5
fi

echo ""

# Install Python dependencies
echo -e "${BLUE}Installing Python dependencies...${NC}"
pip install -r requirements.txt -q
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""

# Fetch all stations
echo -e "${BLUE}Step 1: Fetching all monitoring stations...${NC}"
python fetch_all_stations.py

echo ""

# Ask user for data range
echo -e "${YELLOW}How many days of historical data do you want to fetch?${NC}"
echo "  1) 7 days (quick test)"
echo "  2) 30 days (recommended for initial setup)"
echo "  3) 90 days (comprehensive)"
echo "  4) 180 days (6 months)"
echo "  5) 365 days (1 year - will take a while)"
echo "  6) Custom"
echo ""
read -p "Enter choice [1-6] (default: 2): " choice
choice=${choice:-2}

case $choice in
    1)
        DAYS=7
        ;;
    2)
        DAYS=30
        ;;
    3)
        DAYS=90
        ;;
    4)
        DAYS=180
        ;;
    5)
        DAYS=365
        ;;
    6)
        read -p "Enter number of days: " DAYS
        ;;
    *)
        DAYS=30
        ;;
esac

echo ""

# Ask about parameters
echo -e "${YELLOW}Which parameters do you want to fetch?${NC}"
echo "  1) All parameters (PM25, PM10, O3, CO, NO2, SO2)"
echo "  2) PM2.5 and PM10 only"
echo "  3) Custom"
echo ""
read -p "Enter choice [1-3] (default: 1): " param_choice
param_choice=${param_choice:-1}

PARAMS_ARG=""
case $param_choice in
    2)
        PARAMS_ARG="--parameters PM25,PM10"
        ;;
    3)
        read -p "Enter parameters (comma-separated, e.g., PM25,PM10,O3): " custom_params
        PARAMS_ARG="--parameters $custom_params"
        ;;
esac

echo ""

# Fetch historical data
echo -e "${BLUE}Step 2: Fetching $DAYS days of historical data...${NC}"
echo -e "${YELLOW}This may take a while depending on the number of days and parameters.${NC}"
echo ""

python fetch_historical_data.py --days $DAYS $PARAMS_ARG

echo ""
echo -e "${GREEN}=================================="
echo "✓ Database setup completed!"
echo "==================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Pre-train LSTM models: python pretrain_models.py"
echo "  2. Start the backend: docker-compose --profile prod up -d"
echo "  3. View data in your application"
echo ""
echo "To fetch more data later, run:"
echo "  python fetch_historical_data.py --days [days]"
echo ""
