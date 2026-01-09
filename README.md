# AQI Chat AI

A local AI-powered assistant for Air Quality Index (AQI) historical data analysis in Thailand. Built with FastAPI, PostgreSQL+PostGIS, React TypeScript, and Ollama.

![AQI Chat AI Architecture](docs/architecture.png)

## 🚀 Features

- **🤖 AI-Powered Chat**: Natural language queries about AQI data using local LLM (Ollama)
- **📊 RAG Pipeline**: Retrieval-Augmented Generation for accurate, data-driven responses
- **🗺️ Geospatial Queries**: Find nearby stations using PostGIS
- **📈 Interactive Dashboard**: Visualize AQI trends and statistics
- **📍 Station Monitoring**: Real-time and historical data for all stations
- **🌐 Bilingual Support**: Thai and English language support

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   React TypeScript Frontend                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Chat Page  │  │  Dashboard  │  │  Stations Explorer  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Chat API   │  │   AQI API    │  │  Stations API    │  │
│  │   (Ollama)   │  │   (History)  │  │  (PostGIS)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  ┌────────────────────────────────┐                        │
│  │      RAG Query Service         │                        │
│  │  (Intent Detection, Context)   │                        │
│  └────────────────────────────────┘                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
      ┌───────────┴───────────┐
      ▼                       ▼
┌─────────────────┐   ┌───────────────────┐
│  PostgreSQL +   │   │      Ollama       │
│    PostGIS      │   │  ┌─────────────┐  │
│  ┌───────────┐  │   │  │  LLM Model  │  │
│  │ Stations  │  │   │  │  (llama3.2) │  │
│  │ AQI Data  │  │   │  └─────────────┘  │
│  │ Chat Hist │  │   │  ┌─────────────┐  │
│  └───────────┘  │   │  │  Embeddings │  │
└─────────────────┘   └───────────────────┘
```

## 📋 Prerequisites

- **Docker** & **Docker Compose** (recommended)
- **Ollama** (for local LLM)
- **Node.js 18+** (for local development)
- **Python 3.11+** (for local development)

## 🛠️ Quick Start

### 1. Clone and Setup

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your settings (defaults work for development)
```

### 2. Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Pull Ollama Model

```bash
# Connect to Ollama container and pull the model
docker exec -it aqi_ollama ollama pull llama3.2

# Or pull the embedding model
docker exec -it aqi_ollama ollama pull nomic-embed-text
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Ollama**: http://localhost:11434

## 📁 Project Structure

```
envi_aqi/
├── docker-compose.yml          # Docker orchestration
├── .env.example                # Environment template
├── backend/
│   ├── Dockerfile              # Backend container
│   ├── requirements.txt        # Python dependencies
│   ├── main.py                 # FastAPI application
│   ├── config.py               # Settings configuration
│   ├── db/
│   │   ├── __init__.py
│   │   ├── database.py         # Async database connection
│   │   └── init.sql            # Database schema & sample data
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── chat.py             # Chat AI endpoints
│   │   ├── aqi.py              # AQI data endpoints
│   │   ├── stations.py         # Stations endpoints
│   │   └── health.py           # Health checks
│   └── services/
│       ├── __init__.py
│       ├── ollama_service.py   # Ollama LLM integration
│       └── aqi_query_service.py # Natural language processing
└── frontend/
    ├── Dockerfile              # Frontend container
    ├── package.json            # Node dependencies
    ├── vite.config.ts          # Vite configuration
    ├── tsconfig.json           # TypeScript config
    ├── index.html              # HTML entry point
    └── src/
        ├── main.tsx            # React entry point
        ├── App.tsx             # Main component
        ├── index.css           # Design system
        ├── components/
        │   └── Header.tsx      # Navigation header
        ├── pages/
        │   ├── ChatPage.tsx    # AI Chat interface
        │   ├── DashboardPage.tsx # Statistics dashboard
        │   └── StationsPage.tsx # Station explorer
        └── services/
            └── api.ts          # API client
```

## 🔌 API Endpoints

### Chat API

```
POST   /api/v1/chat/              # Send message to AI
POST   /api/v1/chat/stream        # Streaming chat response
GET    /api/v1/chat/sessions      # List chat sessions
GET    /api/v1/chat/sessions/{id}/messages
DELETE /api/v1/chat/sessions/{id}
GET    /api/v1/chat/models        # Available LLM models
```

### AQI API

```
GET    /api/v1/aqi/current        # Latest readings
GET    /api/v1/aqi/history        # Historical data
GET    /api/v1/aqi/daily-summary  # Daily aggregations
GET    /api/v1/aqi/statistics     # Period statistics
GET    /api/v1/aqi/compare        # Compare stations
```

### Stations API

```
GET    /api/v1/stations/          # List all stations
GET    /api/v1/stations/provinces # Provinces with stations
GET    /api/v1/stations/nearby    # Find nearby stations (PostGIS)
GET    /api/v1/stations/{id}      # Station details
GET    /api/v1/stations/{id}/summary
```

## 💬 Example Chat Queries

The AI assistant can answer questions like:

- "What's the current AQI in Bangkok?"
- "Show me PM2.5 trends for Chiang Mai last week"
- "Compare air quality between Bangkok and Phuket"
- "Which province has the worst air quality today?"
- "สถานการณ์ฝุ่น PM2.5 ในเชียงใหม่เป็นอย่างไร?"
- "แนะนำการป้องกันสุขภาพเมื่อ AQI สูง"

## 🧠 How the AI Works

1. **Intent Detection**: Analyzes user query to determine the type of question
2. **Context Extraction**: Identifies locations, time ranges, and pollutants
3. **Data Retrieval**: Queries PostgreSQL for relevant AQI data
4. **Context Formatting**: Structures data for the LLM prompt
5. **Response Generation**: Ollama generates a natural language response
6. **Session Management**: Maintains conversation context

## 🔧 Development

### Local Development (without Docker)

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (in another terminal)
cd frontend
npm install
npm run dev

# PostgreSQL (ensure it's running)
psql -f backend/db/init.sql

# Ollama (ensure it's running)
ollama serve
ollama pull llama3.2
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | postgresql://aqi_user:aqi_password@postgres:5432/aqi_database |
| `OLLAMA_BASE_URL` | Ollama API URL | http://ollama:11434 |
| `OLLAMA_MODEL` | LLM model name | llama3.2 |
| `OLLAMA_EMBED_MODEL` | Embedding model | nomic-embed-text |
| `API_PORT` | Backend port | 8000 |
| `VITE_API_BASE_URL` | Frontend API URL | http://localhost:8000 |

## 📊 Database Schema

### Key Tables

- **stations**: Monitoring station locations (with PostGIS geometry)
- **aqi_measurements**: Hourly AQI readings
- **daily_aqi_summary**: Pre-aggregated daily statistics
- **chat_sessions**: Conversation sessions
- **chat_messages**: Chat history with context

### Sample Data

The database is initialized with:
- 10 sample stations across Thailand
- 30 days of generated AQI data
- AQI level reference data

## 🚀 Production Deployment

```bash
# Set production profile
export COMPOSE_PROFILES=prod

# Update .env for production
DEBUG=False
CORS_ORIGINS=https://your-domain.com

# Deploy
docker-compose -f docker-compose.yml up -d
```

## 📝 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

Built with ❤️ for better air quality awareness in Thailand
