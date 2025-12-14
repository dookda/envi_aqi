"""
AI Chatbot Service for Air Quality Q&A
Supports multiple backends: Rule-based, OpenAI, Anthropic, or Local LLM
"""

import os
from typing import Dict, List, Any, Optional
from datetime import datetime
import pandas as pd
import numpy as np

# Optional imports for AI backends
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


class AirQualityChatbot:
    """
    AI Chatbot for answering questions about air quality data

    Backends:
    - 'rule-based': Template-based responses (no external dependencies)
    - 'openai': OpenAI GPT models
    - 'anthropic': Anthropic Claude models
    - 'local': Local LLM (future implementation)
    """

    def __init__(self, backend='rule-based', api_key=None):
        self.backend = backend
        self.api_key = api_key or os.getenv('OPENAI_API_KEY') or os.getenv('ANTHROPIC_API_KEY')
        self.conversation_history = []

        # AQI thresholds for responses
        self.aqi_thresholds = {
            'PM25': {
                'good': (0, 15),
                'moderate': (16, 35),
                'unhealthy_sensitive': (36, 55),
                'unhealthy': (56, 150),
                'very_unhealthy': (151, 250),
                'hazardous': (251, 500)
            }
        }

        # Health recommendations
        self.health_recommendations = {
            'good': "Air quality is good. Enjoy outdoor activities!",
            'moderate': "Air quality is acceptable. Unusually sensitive people should consider reducing prolonged outdoor exertion.",
            'unhealthy_sensitive': "Sensitive groups (children, elderly, people with respiratory conditions) should reduce prolonged outdoor exertion.",
            'unhealthy': "Everyone should reduce prolonged outdoor exertion. Sensitive groups should avoid outdoor activities.",
            'very_unhealthy': "Everyone should avoid prolonged outdoor exertion. Sensitive groups should remain indoors.",
            'hazardous': "Everyone should avoid all outdoor physical activities. Stay indoors and keep windows closed."
        }

    def classify_aqi_level(self, value: float, param: str = 'PM25') -> str:
        """Classify AQI level based on value"""
        if param not in self.aqi_thresholds:
            param = 'PM25'

        thresholds = self.aqi_thresholds[param]
        for level, (min_val, max_val) in thresholds.items():
            if min_val <= value <= max_val:
                return level

        return 'hazardous' if value > 250 else 'good'

    def analyze_data(self, data: List[Dict[str, Any]], param: str = 'PM25') -> Dict[str, Any]:
        """Analyze air quality data and generate insights"""
        if not data:
            return {'error': 'No data provided'}

        df = pd.DataFrame(data)

        # Ensure value column is numeric
        if param not in df.columns:
            return {'error': f'Parameter {param} not found in data'}

        values = pd.to_numeric(df[param], errors='coerce').dropna()

        if len(values) == 0:
            return {'error': 'No valid data points'}

        # Calculate statistics
        current_value = values.iloc[-1] if len(values) > 0 else None
        avg_value = values.mean()
        max_value = values.max()
        min_value = values.min()

        # Classify levels
        current_level = self.classify_aqi_level(current_value, param) if current_value else 'unknown'
        avg_level = self.classify_aqi_level(avg_value, param)

        # Trend analysis (last 24 hours vs previous 24 hours if enough data)
        trend = 'stable'
        if len(values) >= 48:
            recent_avg = values.iloc[-24:].mean()
            previous_avg = values.iloc[-48:-24].mean()
            if recent_avg > previous_avg * 1.1:
                trend = 'increasing'
            elif recent_avg < previous_avg * 0.9:
                trend = 'decreasing'

        return {
            'current_value': float(current_value) if current_value else None,
            'current_level': current_level,
            'avg_value': float(avg_value),
            'avg_level': avg_level,
            'max_value': float(max_value),
            'min_value': float(min_value),
            'trend': trend,
            'data_points': len(values),
            'recommendation': self.health_recommendations.get(current_level, '')
        }

    def generate_rule_based_response(self, query: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate response using rule-based templates
        """
        query_lower = query.lower()

        # No context - general questions
        if not context or 'analysis' not in context:
            if any(word in query_lower for word in ['hello', 'hi', 'hey']):
                return "Hello! I'm your air quality assistant. I can help you understand current pollution levels, historical trends, and provide health recommendations. What would you like to know?"

            if any(word in query_lower for word in ['what', 'who', 'how']):
                if 'aqi' in query_lower or 'air quality' in query_lower:
                    return ("AQI (Air Quality Index) measures air pollution levels. PM2.5 is one of the most important "
                           "pollutants measured. The main categories are:\n"
                           "- Good (0-15 μg/m³): Safe for everyone\n"
                           "- Moderate (16-35 μg/m³): Acceptable, sensitive people should be cautious\n"
                           "- Unhealthy for Sensitive Groups (36-55 μg/m³): Sensitive groups should reduce outdoor activities\n"
                           "- Unhealthy (56-150 μg/m³): Everyone should reduce outdoor exertion\n"
                           "- Very Unhealthy (151-250 μg/m³): Avoid outdoor activities\n"
                           "- Hazardous (251+ μg/m³): Stay indoors")

                if 'pm2.5' in query_lower or 'pm25' in query_lower:
                    return ("PM2.5 refers to fine particulate matter smaller than 2.5 micrometers in diameter. "
                           "These tiny particles can penetrate deep into the lungs and bloodstream, causing health issues. "
                           "Main sources include vehicle emissions, industrial processes, and burning of fossil fuels.")

            return "I can help you with air quality questions. Please provide some data context or ask about AQI categories, health impacts, or pollution sources."

        # With context - data-specific questions
        analysis = context.get('analysis', {})
        param = context.get('param', 'PM25')
        station = context.get('station', 'this location')

        # Current level questions
        if any(word in query_lower for word in ['current', 'now', 'today', 'latest']):
            current_value = analysis.get('current_value')
            current_level = analysis.get('current_level', 'unknown')
            recommendation = analysis.get('recommendation', '')

            if current_value is None:
                return "I don't have current data available."

            return (f"Current {param} level at {station} is {current_value:.1f} μg/m³, "
                   f"which is classified as '{current_level.replace('_', ' ').title()}'. "
                   f"{recommendation}")

        # Trend questions
        if any(word in query_lower for word in ['trend', 'increasing', 'decreasing', 'better', 'worse']):
            trend = analysis.get('trend', 'stable')
            avg_value = analysis.get('avg_value', 0)

            trend_text = {
                'increasing': 'worsening',
                'decreasing': 'improving',
                'stable': 'stable'
            }.get(trend, 'stable')

            return (f"The air quality trend is {trend_text}. "
                   f"The average {param} level is {avg_value:.1f} μg/m³ over the analyzed period.")

        # Safety/health questions
        if any(word in query_lower for word in ['safe', 'dangerous', 'health', 'should i', 'can i']):
            current_level = analysis.get('current_level', 'unknown')
            recommendation = analysis.get('recommendation', '')

            return f"Based on current conditions ({current_level.replace('_', ' ').title()}): {recommendation}"

        # Historical/statistics questions
        if any(word in query_lower for word in ['average', 'max', 'min', 'highest', 'lowest', 'history']):
            avg_value = analysis.get('avg_value', 0)
            max_value = analysis.get('max_value', 0)
            min_value = analysis.get('min_value', 0)
            data_points = analysis.get('data_points', 0)

            return (f"Over the analyzed period ({data_points} data points):\n"
                   f"- Average {param}: {avg_value:.1f} μg/m³\n"
                   f"- Highest: {max_value:.1f} μg/m³\n"
                   f"- Lowest: {min_value:.1f} μg/m³")

        # Default response with summary
        current_value = analysis.get('current_value', 0)
        current_level = analysis.get('current_level', 'unknown')
        trend = analysis.get('trend', 'stable')

        return (f"Current {param} at {station}: {current_value:.1f} μg/m³ ({current_level.replace('_', ' ').title()}). "
               f"Trend: {trend}. Ask me about specific details like trends, safety, or historical data.")

    def generate_ai_response(self, query: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate response using AI backend (OpenAI or Anthropic)
        """
        if self.backend == 'openai' and OPENAI_AVAILABLE:
            return self._generate_openai_response(query, context)
        elif self.backend == 'anthropic' and ANTHROPIC_AVAILABLE:
            return self._generate_anthropic_response(query, context)
        else:
            # Fallback to rule-based
            return self.generate_rule_based_response(query, context)

    def _generate_openai_response(self, query: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Generate response using OpenAI GPT"""
        if not self.api_key:
            raise ValueError("OpenAI API key not provided")

        openai.api_key = self.api_key

        # Build context message
        system_message = (
            "You are an air quality expert assistant. You help users understand air pollution data, "
            "health impacts, and provide recommendations. Use the provided data analysis to give accurate, "
            "helpful responses. Be concise and clear."
        )

        context_str = ""
        if context and 'analysis' in context:
            analysis = context['analysis']
            context_str = f"\n\nCurrent data analysis:\n{analysis}"

        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": query + context_str}
                ],
                max_tokens=200,
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Error generating AI response: {str(e)}"

    def _generate_anthropic_response(self, query: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Generate response using Anthropic Claude"""
        if not self.api_key:
            raise ValueError("Anthropic API key not provided")

        client = anthropic.Anthropic(api_key=self.api_key)

        # Build context
        context_str = ""
        if context and 'analysis' in context:
            analysis = context['analysis']
            context_str = f"\n\nCurrent data analysis:\n{analysis}"

        prompt = f"{query}{context_str}"

        try:
            message = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=200,
                messages=[
                    {
                        "role": "user",
                        "content": f"You are an air quality expert. Answer this question concisely: {prompt}"
                    }
                ]
            )
            return message.content[0].text
        except Exception as e:
            return f"Error generating AI response: {str(e)}"

    def chat(self, query: str, data: Optional[List[Dict[str, Any]]] = None,
             param: str = 'PM25', station: str = 'the station') -> Dict[str, Any]:
        """
        Main chat interface

        Args:
            query: User question
            data: Optional air quality data for analysis
            param: Parameter name (PM25, PM10, etc.)
            station: Station name for context

        Returns:
            Dict with response and metadata
        """
        # Analyze data if provided
        context = None
        if data:
            analysis = self.analyze_data(data, param)
            context = {
                'analysis': analysis,
                'param': param,
                'station': station
            }

        # Generate response based on backend
        if self.backend == 'rule-based':
            response = self.generate_rule_based_response(query, context)
        else:
            response = self.generate_ai_response(query, context)

        # Store in conversation history
        self.conversation_history.append({
            'timestamp': datetime.now().isoformat(),
            'query': query,
            'response': response,
            'context': context
        })

        return {
            'query': query,
            'response': response,
            'analysis': context.get('analysis') if context else None,
            'backend': self.backend,
            'timestamp': datetime.now().isoformat()
        }

    def get_conversation_history(self) -> List[Dict[str, Any]]:
        """Get conversation history"""
        return self.conversation_history

    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []


# Convenience functions
def create_chatbot(backend='rule-based', api_key=None) -> AirQualityChatbot:
    """
    Create a chatbot instance

    Args:
        backend: 'rule-based', 'openai', or 'anthropic'
        api_key: API key for AI backends (optional, can use env vars)

    Returns:
        AirQualityChatbot instance
    """
    return AirQualityChatbot(backend=backend, api_key=api_key)


def chat_with_data(query: str, data: List[Dict[str, Any]],
                   param: str = 'PM25', backend: str = 'rule-based') -> Dict[str, Any]:
    """
    Quick chat interface with data

    Args:
        query: User question
        data: Air quality data
        param: Parameter name
        backend: Chatbot backend to use

    Returns:
        Chat response
    """
    chatbot = create_chatbot(backend=backend)
    return chatbot.chat(query, data=data, param=param)
