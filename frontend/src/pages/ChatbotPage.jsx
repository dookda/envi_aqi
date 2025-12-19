import { useState } from 'react';
import { getStations, getParameters, fetchAirQualityData } from '../services/api';
import Chart from '../components/Chart';

/**
 * AI Chatbot Page - Chat with AI about air quality data
 * Layout: Chart/Visualization on LEFT, Chat on RIGHT (consistent with other pages)
 */
const ChatbotPage = () => {
    const [stations] = useState(getStations());
    const [parameters] = useState(getParameters());
    const [selectedStation, setSelectedStation] = useState(null);
    const [selectedParameter, setSelectedParameter] = useState(parameters[0]);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "👋 Hello! I'm your AI air quality assistant. I can help you:\n\n• Check current pollution levels at any station\n• Show historical data charts\n• Provide health recommendations\n• Analyze trends and patterns\n\nSelect a station and ask me anything!",
            timestamp: new Date().toISOString(),
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [showChart, setShowChart] = useState(false);
    const [summaryData, setSummaryData] = useState(null);

    // Quick action buttons
    const quickActions = [
        { label: '📊 Current AQI', query: 'What is the current air quality?' },
        { label: '📈 7-day trend', query: 'Show me the 7-day trend chart' },
        { label: '🏥 Health advice', query: 'Is it safe to go outside today?' },
        { label: '⚠️ Anomalies', query: 'Are there any anomalies in the data?' },
    ];

    // Fetch chart data when requested
    const loadChartData = async (days = 7) => {
        if (!selectedStation) return null;

        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        try {
            const data = await fetchAirQualityData({
                stationID: selectedStation.id,
                param: selectedParameter.id,
                startDate,
                endDate
            });

            // Handle API response - data might be in "stations" array or direct array
            let processedData = [];
            if (data && data.stations && data.stations[0] && data.stations[0].data) {
                processedData = data.stations[0].data;
            } else if (Array.isArray(data)) {
                processedData = data;
            }

            setChartData(processedData);
            setShowChart(true);

            // Calculate summary stats
            if (processedData.length > 0) {
                const values = processedData.map(d => parseFloat(d[selectedParameter.id]) || 0).filter(v => v > 0);
                if (values.length > 0) {
                    const latest = values[values.length - 1];
                    const avg = values.reduce((a, b) => a + b, 0) / values.length;
                    const max = Math.max(...values);
                    const min = Math.min(...values);
                    setSummaryData({
                        current: latest,
                        average: avg,
                        max,
                        min,
                        count: values.length,
                        station: selectedStation.name,
                        param: selectedParameter.name,
                        unit: selectedParameter.unit
                    });
                }
            }

            return processedData;
        } catch (error) {
            console.error('Error loading chart:', error);
            return null;
        }
    };

    // Get health level color
    const getHealthLevel = (value) => {
        if (!value) return { color: 'gray', label: 'Unknown', bg: 'bg-gray-100' };
        if (value <= 25) return { color: 'green', label: 'Good', bg: 'bg-green-100 text-green-800' };
        if (value <= 37) return { color: 'yellow', label: 'Moderate', bg: 'bg-yellow-100 text-yellow-800' };
        if (value <= 50) return { color: 'orange', label: 'Unhealthy for Sensitive', bg: 'bg-orange-100 text-orange-800' };
        if (value <= 90) return { color: 'red', label: 'Unhealthy', bg: 'bg-red-100 text-red-800' };
        return { color: 'purple', label: 'Very Unhealthy', bg: 'bg-purple-100 text-purple-800' };
    };

    // Handle sending message
    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = {
            role: 'user',
            content: input,
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);
        const query = input.toLowerCase();
        setInput('');
        setLoading(true);

        try {
            let response = '';

            if (!selectedStation) {
                response = "Please select a station first using the dropdown above. Then I can provide information about air quality at that location.";
            } else if (query.includes('chart') || query.includes('trend') || query.includes('graph') || query.includes('show')) {
                const days = query.includes('30') ? 30 : query.includes('90') ? 90 : 7;
                const data = await loadChartData(days);
                if (data && data.length > 0) {
                    response = `📈 Here's the ${days}-day ${selectedParameter.name} trend for ${selectedStation.name}.\n\nI found ${data.length} data points. Check the chart panel on the left for visualization.`;
                } else {
                    response = `I tried to fetch ${days}-day data but received no results. The Air4Thai API may be temporarily unavailable.`;
                }
            } else if (query.includes('current') || query.includes('now') || query.includes('quality') || query.includes('aqi')) {
                const data = await loadChartData(1);
                if (summaryData) {
                    const health = getHealthLevel(summaryData.current);
                    response = `📊 **Current ${selectedParameter.name} at ${selectedStation.name}:**\n\n• Value: ${summaryData.current?.toFixed(1)} ${selectedParameter.unit}\n• Status: ${health.label}\n• Average: ${summaryData.average?.toFixed(1)} ${selectedParameter.unit}\n\n${getHealthAdvice(summaryData.current)}`;
                } else {
                    response = "I couldn't fetch the current data. Please try again or check if the station is online.";
                }
            } else if (query.includes('safe') || query.includes('health') || query.includes('outside') || query.includes('advice')) {
                await loadChartData(1);
                if (summaryData) {
                    response = getDetailedHealthAdvice(summaryData.current, selectedStation.name);
                } else {
                    response = "I need to check the current data first. Please make sure a station is selected.";
                }
            } else if (query.includes('anomal') || query.includes('unusual') || query.includes('spike')) {
                const data = await loadChartData(7);
                if (data && data.length > 0) {
                    response = analyzeAnomalies(data, selectedParameter);
                } else {
                    response = "I couldn't analyze anomalies - no data available.";
                }
            } else {
                response = `I understand you're asking about "${input}". Here's what I can help with:\n\n• Type "show chart" to see historical data\n• Ask "is it safe outside?" for health advice\n• Ask "what's the current AQI?" for real-time data\n• Ask about "anomalies" to detect unusual patterns`;
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString(),
            }]);

        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Sorry, I encountered an error: ${error.message}`,
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setLoading(false);
        }
    };

    const getHealthAdvice = (value) => {
        if (!value) return "Unable to assess - no data available.";
        if (value <= 25) return "✅ **Good** - Air quality is excellent. Safe for all outdoor activities.";
        if (value <= 37) return "🟡 **Moderate** - Acceptable air quality. Sensitive individuals should limit prolonged outdoor activities.";
        if (value <= 50) return "🟠 **Unhealthy for Sensitive** - Children, elderly, and those with respiratory issues should reduce outdoor activities.";
        if (value <= 90) return "🔴 **Unhealthy** - Everyone should limit outdoor activities. Wear a mask if going outside.";
        return "🟣 **Very Unhealthy** - Avoid outdoor activities. Stay indoors with air purification if possible.";
    };

    const getDetailedHealthAdvice = (value, stationName) => {
        const level = getHealthAdvice(value);
        return `🏥 **Health Assessment for ${stationName}**\n\nCurrent PM2.5 Level: ${value?.toFixed(1)} μg/m³\n\n${level}\n\n**Recommendations:**\n• ${value > 50 ? 'Wear N95 mask outdoors' : 'No mask required'}\n• ${value > 37 ? 'Keep windows closed' : 'Natural ventilation is OK'}\n• ${value > 50 ? 'Use air purifier indoors' : 'Normal indoor activities'}\n• ${value > 90 ? 'Avoid all outdoor exercise' : value > 50 ? 'Light indoor exercise only' : 'Outdoor exercise is fine'}`;
    };

    const analyzeAnomalies = (data, parameter) => {
        const values = data.map(d => parseFloat(d[parameter.id])).filter(v => !isNaN(v) && v > 0);
        if (values.length === 0) return "No valid data to analyze.";

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
        const threshold = mean + 2 * stdDev;
        const anomalyCount = values.filter(v => v > threshold).length;

        if (anomalyCount === 0) {
            return `✅ **No anomalies detected** in the past 7 days.\n\nStatistics:\n• Mean: ${mean.toFixed(1)} ${parameter.unit}\n• Std Dev: ${stdDev.toFixed(1)}\n• All ${values.length} values within normal range`;
        }

        return `⚠️ **${anomalyCount} potential anomalies detected!**\n\nThreshold: ${threshold.toFixed(1)} ${parameter.unit}\n• Mean: ${mean.toFixed(1)} ${parameter.unit}\n• Std Dev: ${stdDev.toFixed(1)}\n\nCheck the chart for visual analysis.`;
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="relative w-full h-full bg-gray-50 flex">
            {/* Left Panel - Data Visualization */}
            <div className="hidden md:flex flex-col flex-1 bg-gray-100">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-white">
                    <h2 className="text-lg font-semibold text-gray-800">Data Visualization</h2>
                    <p className="text-sm text-gray-500">
                        {selectedStation ? `${selectedStation.name} - ${selectedParameter.name}` : 'Select a station to view data'}
                    </p>
                </div>

                {/* Summary Cards */}
                {summaryData && (
                    <div className="p-4 bg-white border-b border-gray-200">
                        <div className="grid grid-cols-4 gap-3">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase">Current</p>
                                <p className="text-xl font-bold text-blue-600">{summaryData.current?.toFixed(0)}</p>
                                <p className="text-xs text-gray-400">{summaryData.unit}</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase">Average</p>
                                <p className="text-xl font-bold text-green-600">{summaryData.average?.toFixed(0)}</p>
                                <p className="text-xs text-gray-400">{summaryData.unit}</p>
                            </div>
                            <div className="text-center p-3 bg-red-50 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase">Max</p>
                                <p className="text-xl font-bold text-red-600">{summaryData.max?.toFixed(0)}</p>
                                <p className="text-xs text-gray-400">{summaryData.unit}</p>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase">Min</p>
                                <p className="text-xl font-bold text-purple-600">{summaryData.min?.toFixed(0)}</p>
                                <p className="text-xs text-gray-400">{summaryData.unit}</p>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getHealthLevel(summaryData.current).bg}`}>
                                {getHealthLevel(summaryData.current).label}
                            </span>
                            <span className="text-xs text-gray-400">{summaryData.count} data points</span>
                        </div>
                    </div>
                )}

                {/* Chart Area */}
                <div className="flex-1 p-4">
                    {showChart && chartData.length > 0 ? (
                        <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <Chart data={chartData} parameter={selectedParameter} />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-gray-400">
                                <svg className="w-20 h-20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <p className="text-lg font-medium">No Chart Data</p>
                                <p className="text-sm mt-1">Ask the AI to show a chart</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Chat */}
            <div className="flex flex-col w-full md:w-[420px] bg-white border-l border-gray-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-purple-600">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg">AI Assistant</h1>
                            <p className="text-white/70 text-xs">Ask about air quality</p>
                        </div>
                    </div>
                </div>

                {/* Station & Parameter Selector */}
                <div className="p-3 border-b border-gray-100 bg-gray-50 flex gap-2">
                    <select
                        value={selectedStation?.id || ''}
                        onChange={(e) => {
                            setSelectedStation(stations.find(s => s.id === e.target.value));
                            setSummaryData(null);
                            setShowChart(false);
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    >
                        <option value="">Select Station...</option>
                        {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select
                        value={selectedParameter.id}
                        onChange={(e) => setSelectedParameter(parameters.find(p => p.id === e.target.value))}
                        className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    >
                        {parameters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : 'bg-gray-100 text-gray-800 rounded-bl-md'
                                }`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <p className="text-[10px] mt-2 opacity-60">
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-2xl px-4 py-3 rounded-bl-md">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="px-3 py-2 border-t border-gray-100 flex gap-2 overflow-x-auto">
                    {quickActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => { setInput(action.query); }}
                            className="whitespace-nowrap px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded-full transition-colors"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-gray-200 bg-white">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask about air quality..."
                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={loading || !input.trim()}
                            className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatbotPage;
