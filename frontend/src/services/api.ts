/**
 * API Service for AQI Chat AI
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Types
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatRequest {
    message: string;
    session_id?: string;
    include_context?: boolean;
    stream?: boolean;
}

export interface ChartDataPoint {
    name?: string;
    date?: string;
    AQI?: number;
    'PM2.5'?: number;
    value?: number;
}

export interface ChartData {
    type: 'line' | 'bar';
    title: string;
    xAxisLabel: string;
    yAxisLabel: string;
    data: ChartDataPoint[];
}

export interface ChatResponse {
    session_id: string;
    message: string;
    context_used: Record<string, unknown> | null;
    chart_data?: ChartData | null;
    timestamp: string;
}

export interface Station {
    id: number;
    station_code: string;
    name: string;
    name_th?: string;
    province: string;
    province_th?: string;
    latitude: number;
    longitude: number;
    station_type?: string;
    is_active: boolean;
}

export interface AQIMeasurement {
    id: number;
    station_id: number;
    station_name?: string;
    measured_at: string;
    aqi: number | null;
    aqi_level?: string;
    aqi_color?: string;
    pm25: number | null;
    pm10: number | null;
    o3: number | null;
    co: number | null;
    no2: number | null;
    so2: number | null;
    temperature?: number;
    humidity?: number;
}

export interface DailySummary {
    date: string;
    station_id: number;
    station_name?: string;
    aqi_avg: number | null;
    aqi_max: number | null;
    aqi_min: number | null;
    pm25_avg: number | null;
    pm25_max: number | null;
    reading_count?: number;
    hours_unhealthy?: number;
}

export interface Statistics {
    period_start: string;
    period_end: string;
    total_readings: number;
    avg_aqi: number;
    max_aqi: number;
    min_aqi: number;
    avg_pm25: number;
    max_pm25: number;
    days_good: number;
    days_moderate: number;
    days_unhealthy: number;
}

export interface HealthStatus {
    status: string;
    components: {
        api: string;
        database: string;
        ollama: string;
        ollama_models?: string[];
    };
}

// Error handler
class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error = await response.text();
        throw new ApiError(error || response.statusText, response.status);
    }
    return response.json();
}

// Chat API - with longer timeout for LLM responses
export const chatApi = {
    async sendMessage(request: ChatRequest, timeoutMs = 120000): Promise<ChatResponse> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/chat/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
                signal: controller.signal,
            });
            return handleResponse<ChatResponse>(response);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new ApiError('Request timed out. The AI is still processing. Please try a simpler question or wait a moment.', 408);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    },

    async getSessions(limit = 10): Promise<{ id: string; name: string; created_at: string; message_count: number }[]> {
        const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions?limit=${limit}`);
        return handleResponse(response);
    },

    async getSessionMessages(sessionId: string, limit = 50): Promise<ChatMessage[]> {
        const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions/${sessionId}/messages?limit=${limit}`);
        return handleResponse(response);
    },

    async deleteSession(sessionId: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions/${sessionId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new ApiError('Failed to delete session', response.status);
        }
    },

    async getModels(): Promise<{ current_model: string; embed_model: string; available_models: string[] }> {
        const response = await fetch(`${API_BASE_URL}/api/v1/chat/models`);
        return handleResponse(response);
    },
};

// AQI API
export const aqiApi = {
    async getCurrent(stationId?: number, province?: string): Promise<AQIMeasurement[]> {
        const params = new URLSearchParams();
        if (stationId) params.append('station_id', stationId.toString());
        if (province) params.append('province', province);

        const response = await fetch(`${API_BASE_URL}/api/v1/aqi/current?${params}`);
        return handleResponse(response);
    },

    async getHistory(
        stationId: number,
        startDate?: string,
        endDate?: string,
        limit = 100
    ): Promise<AQIMeasurement[]> {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await fetch(`${API_BASE_URL}/api/v1/aqi/history?station_id=${stationId}&${params}`);
        return handleResponse(response);
    },

    async getDailySummary(
        stationId?: number,
        province?: string,
        startDate?: string,
        endDate?: string
    ): Promise<DailySummary[]> {
        const params = new URLSearchParams();
        if (stationId) params.append('station_id', stationId.toString());
        if (province) params.append('province', province);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await fetch(`${API_BASE_URL}/api/v1/aqi/daily-summary?${params}`);
        return handleResponse(response);
    },

    async getStatistics(
        stationId?: number,
        province?: string,
        days = 30
    ): Promise<Statistics> {
        const params = new URLSearchParams({ days: days.toString() });
        if (stationId) params.append('station_id', stationId.toString());
        if (province) params.append('province', province);

        const response = await fetch(`${API_BASE_URL}/api/v1/aqi/statistics?${params}`);
        return handleResponse(response);
    },

    async compare(stationIds: number[], startDate?: string, endDate?: string): Promise<unknown[]> {
        const params = new URLSearchParams({ station_ids: stationIds.join(',') });
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await fetch(`${API_BASE_URL}/api/v1/aqi/compare?${params}`);
        return handleResponse(response);
    },
};

// Stations API
export const stationsApi = {
    async getAll(province?: string, stationType?: string, isActive = true): Promise<Station[]> {
        const params = new URLSearchParams({ is_active: isActive.toString() });
        if (province) params.append('province', province);
        if (stationType) params.append('station_type', stationType);

        const response = await fetch(`${API_BASE_URL}/api/v1/stations/?${params}`);
        return handleResponse(response);
    },

    async getById(stationId: number): Promise<Station> {
        const response = await fetch(`${API_BASE_URL}/api/v1/stations/${stationId}`);
        return handleResponse(response);
    },

    async getProvinces(): Promise<{ province: string; province_th: string; station_count: number }[]> {
        const response = await fetch(`${API_BASE_URL}/api/v1/stations/provinces`);
        return handleResponse(response);
    },

    async getNearby(lat: number, lon: number, radiusKm = 50, limit = 5): Promise<(Station & { distance_km: number })[]> {
        const params = new URLSearchParams({
            latitude: lat.toString(),
            longitude: lon.toString(),
            radius_km: radiusKm.toString(),
            limit: limit.toString(),
        });

        const response = await fetch(`${API_BASE_URL}/api/v1/stations/nearby?${params}`);
        return handleResponse(response);
    },

    async getSummary(stationId: number): Promise<unknown> {
        const response = await fetch(`${API_BASE_URL}/api/v1/stations/${stationId}/summary`);
        return handleResponse(response);
    },
};

// Health API
export const healthApi = {
    async check(): Promise<HealthStatus> {
        const response = await fetch(`${API_BASE_URL}/health`);
        return handleResponse(response);
    },
};

export default {
    chat: chatApi,
    aqi: aqiApi,
    stations: stationsApi,
    health: healthApi,
};
