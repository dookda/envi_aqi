import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, Button, Spinner } from '../atoms';

const ChatbotInterface = ({
  stationID,
  param = 'PM25',
  data = null,
  onClose,
  className = '',
  position = 'bottom-right',
  backend = 'rule-based',
}) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your air quality assistant. Ask me about current pollution levels, trends, or health recommendations.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/enviapi/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input,
          data: data,
          param: param,
          station: stationID || 'the station',
          backend: backend,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const assistantMessage = {
          role: 'assistant',
          content: result.response,
          analysis: result.analysis,
          timestamp: result.timestamp,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your question. Please try again.',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    'What is the current air quality level?',
    'Is it safe to go outside?',
    'What is the trend?',
    'Show me the statistics',
  ];

  const handleQuickQuestion = (question) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const positions = {
    'top-right': 'fixed top-24 right-6 z-modal',
    'top-left': 'fixed top-24 left-6 z-modal',
    'bottom-right': 'fixed bottom-6 right-6 z-modal',
    'bottom-left': 'fixed bottom-6 left-6 z-modal',
  };

  return (
    <div className={`${positions[position]} ${className}`}>
      <Card
        variant="glass"
        padding="none"
        className={`transition-all duration-300 ${
          minimized ? 'w-64 h-14' : 'w-96 h-[500px]'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-primary-500 bg-opacity-90 rounded-t-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <h3 className="font-bold text-white">AI Assistant</h3>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMinimized(!minimized)}
              className="text-white hover:bg-white hover:bg-opacity-20 px-2"
            >
              {minimized ? '▲' : '▼'}
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 px-2"
              >
                ✕
              </Button>
            )}
          </div>
        </div>

        {!minimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 h-[340px] bg-gray-50 bg-opacity-50">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.analysis && (
                      <div className="mt-2 pt-2 border-t border-gray-300 text-xs">
                        <p>
                          Current: {message.analysis.current_value?.toFixed(1)} μg/m³ (
                          {message.analysis.current_level})
                        </p>
                      </div>
                    )}
                    <p className="text-[10px] mt-1 opacity-60">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <Spinner size="sm" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            <div className="px-4 py-2 border-t border-gray-200 bg-white bg-opacity-50">
              <div className="flex flex-wrap gap-1">
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(question)}
                    className="text-xs bg-primary-100 hover:bg-primary-200 text-primary-700 px-2 py-1 rounded transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white rounded-b-lg">
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about air quality..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  disabled={loading}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  className="px-4"
                >
                  {loading ? <Spinner size="xs" /> : 'Send'}
                </Button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Backend: {backend} | Station: {stationID || 'N/A'}
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

ChatbotInterface.propTypes = {
  stationID: PropTypes.string,
  param: PropTypes.string,
  data: PropTypes.arrayOf(PropTypes.object),
  onClose: PropTypes.func,
  className: PropTypes.string,
  position: PropTypes.oneOf(['top-right', 'top-left', 'bottom-right', 'bottom-left']),
  backend: PropTypes.oneOf(['rule-based', 'openai', 'anthropic']),
};

export default ChatbotInterface;
