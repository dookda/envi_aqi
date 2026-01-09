import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { chatApi, ChartData } from '../services/api';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    context?: Record<string, unknown>;
    chartData?: ChartData | null;
}

const SUGGESTIONS = [
    "What's the current AQI in Bangkok?",
    "Show me PM2.5 trends for Chiang Mai last week",
    "Compare air quality between Bangkok and Phuket",
    "Which province has the worst air quality today?",
    "สถานการณ์ฝุ่น PM2.5 ในเชียงใหม่เป็นอย่างไร?",
    "แนะนำการป้องกันสุขภาพเมื่อ AQI สูง",
];

const ChatPage = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingTime, setLoadingTime] = useState(0);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Timer for loading time display
    useEffect(() => {
        if (isLoading) {
            setLoadingTime(0);
            loadingTimerRef.current = setInterval(() => {
                setLoadingTime(t => t + 1);
            }, 1000);
        } else {
            if (loadingTimerRef.current) {
                clearInterval(loadingTimerRef.current);
                loadingTimerRef.current = null;
            }
            setLoadingTime(0);
        }
        return () => {
            if (loadingTimerRef.current) {
                clearInterval(loadingTimerRef.current);
            }
        };
    }, [isLoading]);

    const handleSend = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Use 180 second timeout for LLM responses (can be slow on first query)
            const response = await chatApi.sendMessage({
                message: messageText,
                session_id: sessionId || undefined,
                include_context: true,
            }, 180000);

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.message,
                timestamp: new Date(response.timestamp),
                context: response.context_used || undefined,
                chartData: response.chart_data || undefined,
            };

            setMessages((prev) => [...prev, assistantMessage]);
            setSessionId(response.session_id);
        } catch (error) {
            console.error('Chat error:', error);
            const errorContent = error instanceof Error
                ? error.message.includes('timed out')
                    ? '⏱️ The AI is taking longer than expected to respond. This can happen on the first query as the model loads. Please try again in a moment.'
                    : `Sorry, I encountered an error: ${error.message}. Please ensure the backend server and Ollama are running.`
                : 'Sorry, I encountered an unexpected error. Please try again.';

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: errorContent,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        handleSend(suggestion);
    };

    return (
        <main className="main-content">
            <div className="chat-container">
                {messages.length === 0 ? (
                    <div className="chat-header">
                        <h1 className="chat-title">
                            <Sparkles size={32} style={{ marginRight: '0.5rem', display: 'inline' }} />
                            AQI Chat Assistant
                        </h1>
                        <p className="chat-subtitle">
                            Ask me anything about Air Quality Index data in Thailand.
                            <br />
                            I can analyze historical data, compare locations, and provide health recommendations.
                        </p>

                        <div className="suggestions">
                            {SUGGESTIONS.map((suggestion, index) => (
                                <button
                                    key={index}
                                    className="suggestion-pill"
                                    onClick={() => handleSuggestionClick(suggestion)}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="messages-container">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`message message-${message.role}`}
                            >
                                <div className="message-avatar">
                                    {message.role === 'user' ? '👤' : '🤖'}
                                </div>
                                <div className="message-content">
                                    <ReactMarkdown>{message.content}</ReactMarkdown>

                                    {/* Render chart if present */}
                                    {message.chartData && message.chartData.data && message.chartData.data.length > 0 && (
                                        <div className="chart-container" style={{
                                            marginTop: '1rem',
                                            padding: '1rem',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}>
                                            <h4 style={{
                                                marginBottom: '1rem',
                                                color: 'var(--text-secondary)',
                                                fontSize: '0.9rem',
                                                fontWeight: 600
                                            }}>
                                                📊 {message.chartData.title}
                                            </h4>
                                            <ResponsiveContainer width="100%" height={300}>
                                                {message.chartData.type === 'line' ? (
                                                    <LineChart data={message.chartData.data}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                        <XAxis
                                                            dataKey="date"
                                                            stroke="var(--text-muted)"
                                                            fontSize={11}
                                                            tickFormatter={(value) => value?.slice(5) || value}
                                                        />
                                                        <YAxis stroke="var(--text-muted)" fontSize={11} />
                                                        <Tooltip
                                                            contentStyle={{
                                                                background: 'rgba(20, 20, 30, 0.95)',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '8px',
                                                                color: 'var(--text-primary)'
                                                            }}
                                                        />
                                                        <Legend />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="AQI"
                                                            stroke="var(--accent)"
                                                            strokeWidth={2}
                                                            dot={{ fill: 'var(--accent)', strokeWidth: 0, r: 3 }}
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="PM2.5"
                                                            stroke="var(--warning)"
                                                            strokeWidth={2}
                                                            dot={{ fill: 'var(--warning)', strokeWidth: 0, r: 3 }}
                                                        />
                                                    </LineChart>
                                                ) : (
                                                    <BarChart data={message.chartData.data}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                        <XAxis
                                                            dataKey="name"
                                                            stroke="var(--text-muted)"
                                                            fontSize={10}
                                                            angle={-45}
                                                            textAnchor="end"
                                                            height={60}
                                                        />
                                                        <YAxis stroke="var(--text-muted)" fontSize={11} />
                                                        <Tooltip
                                                            contentStyle={{
                                                                background: 'rgba(20, 20, 30, 0.95)',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '8px',
                                                                color: 'var(--text-primary)'
                                                            }}
                                                        />
                                                        <Legend />
                                                        <Bar dataKey="AQI" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                                                        <Bar dataKey="PM2.5" fill="var(--warning)" radius={[4, 4, 0, 0]} />
                                                        {message.chartData.data[0]?.value !== undefined && (
                                                            <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                                                        )}
                                                    </BarChart>
                                                )}
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="message message-assistant">
                                <div className="message-avatar">🤖</div>
                                <div className="message-content">
                                    <div className="typing-indicator">
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                        {loadingTime < 10
                                            ? 'Thinking...'
                                            : loadingTime < 30
                                                ? `Processing your request... (${loadingTime}s)`
                                                : `AI is generating a detailed response... (${loadingTime}s)`}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}

                <div className="chat-input-container">
                    <div className="chat-input-wrapper">
                        <textarea
                            ref={inputRef}
                            className="chat-input"
                            placeholder="Ask about AQI data... (e.g., 'What's the air quality in Bangkok?')"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            className="send-button"
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            title="Send message"
                        >
                            {isLoading ? (
                                <div className="loading-spinner" />
                            ) : (
                                <Send size={20} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default ChatPage;
