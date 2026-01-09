"""
AQI Query Service
Handles interpretation of natural language queries about AQI data
"""

import re
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from loguru import logger


class AQIQueryService:
    """Service for converting natural language to AQI database queries"""
    
    # Keywords for query intent detection
    LOCATION_KEYWORDS = {
        "bangkok": "Bangkok",
        "กรุงเทพ": "Bangkok",
        "chiang mai": "Chiang Mai",
        "chiangmai": "Chiang Mai",
        "เชียงใหม่": "Chiang Mai",
        "chiang rai": "Chiang Rai",
        "chiangrai": "Chiang Rai",
        "เชียงราย": "Chiang Rai",
        "khon kaen": "Khon Kaen",
        "ขอนแก่น": "Khon Kaen",
        "phuket": "Phuket",
        "ภูเก็ต": "Phuket",
        "rayong": "Rayong",
        "ระยอง": "Rayong"
    }
    
    TIME_PATTERNS = {
        "today": lambda: (date.today(), date.today()),
        "yesterday": lambda: (date.today() - timedelta(days=1), date.today() - timedelta(days=1)),
        "this week": lambda: (date.today() - timedelta(days=7), date.today()),
        "last week": lambda: (date.today() - timedelta(days=14), date.today() - timedelta(days=7)),
        "this month": lambda: (date.today().replace(day=1), date.today()),
        "last month": lambda: ((date.today().replace(day=1) - timedelta(days=1)).replace(day=1), 
                              date.today().replace(day=1) - timedelta(days=1)),
        "last 7 days": lambda: (date.today() - timedelta(days=7), date.today()),
        "last 30 days": lambda: (date.today() - timedelta(days=30), date.today()),
        "last 3 months": lambda: (date.today() - timedelta(days=90), date.today())
    }
    
    QUERY_INTENTS = {
        "current": ["current", "now", "latest", "ปัจจุบัน", "ตอนนี้", "ล่าสุด"],
        "history": ["history", "historical", "past", "ประวัติ", "ย้อนหลัง"],
        "compare": ["compare", "comparison", "vs", "versus", "difference", "เปรียบเทียบ"],
        "statistics": ["average", "mean", "max", "min", "statistics", "stats", "ค่าเฉลี่ย", "สูงสุด", "ต่ำสุด"],
        "trend": ["trend", "pattern", "increasing", "decreasing", "แนวโน้ม"],
        "worst": ["worst", "highest", "unhealthy", "hazardous", "แย่ที่สุด", "สูงสุด"],
        "best": ["best", "lowest", "good", "cleanest", "ดีที่สุด", "ต่ำสุด"]
    }
    
    POLLUTANT_KEYWORDS = {
        "pm2.5": "pm25",
        "pm25": "pm25",
        "pm 2.5": "pm25",
        "ฝุ่น": "pm25",
        "pm10": "pm10",
        "pm 10": "pm10",
        "ozone": "o3",
        "o3": "o3",
        "โอโซน": "o3",
        "co": "co",
        "carbon monoxide": "co",
        "no2": "no2",
        "nitrogen dioxide": "no2",
        "so2": "so2",
        "sulfur dioxide": "so2"
    }
    
    def detect_intent(self, query: str) -> str:
        """Detect the intent of the query"""
        query_lower = query.lower()
        
        for intent, keywords in self.QUERY_INTENTS.items():
            for keyword in keywords:
                if keyword in query_lower:
                    return intent
        
        return "general"
    
    def extract_location(self, query: str) -> Optional[str]:
        """Extract location/province from query"""
        query_lower = query.lower()
        
        for keyword, province in self.LOCATION_KEYWORDS.items():
            if keyword in query_lower:
                return province
        
        return None
    
    def extract_time_range(self, query: str) -> Tuple[date, date]:
        """Extract time range from query"""
        query_lower = query.lower()
        
        for pattern, date_func in self.TIME_PATTERNS.items():
            if pattern in query_lower:
                return date_func()
        
        # Look for specific date patterns
        date_match = re.search(r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})', query)
        if date_match:
            try:
                parsed_date = datetime.strptime(date_match.group(1).replace('/', '-'), '%Y-%m-%d').date()
                return (parsed_date, parsed_date)
            except ValueError:
                pass
        
        # Default to last 7 days
        return (date.today() - timedelta(days=7), date.today())
    
    def extract_pollutant(self, query: str) -> Optional[str]:
        """Extract pollutant type from query"""
        query_lower = query.lower()
        
        for keyword, pollutant in self.POLLUTANT_KEYWORDS.items():
            if keyword in query_lower:
                return pollutant
        
        return None
    
    async def get_relevant_data(
        self,
        query: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Get relevant AQI data based on the query"""
        
        intent = self.detect_intent(query)
        location = self.extract_location(query)
        start_date, end_date = self.extract_time_range(query)
        pollutant = self.extract_pollutant(query) or "pm25"
        
        context = {
            "intent": intent,
            "location": location,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "pollutant": pollutant,
            "data": {}
        }
        
        if intent == "current":
            context["data"] = await self._get_current_data(db, location)
        elif intent == "compare":
            context["data"] = await self._get_comparison_data(db, location, start_date, end_date)
        elif intent in ["worst", "best"]:
            context["data"] = await self._get_extreme_data(db, intent, location, start_date, end_date)
        elif intent == "statistics":
            context["data"] = await self._get_statistics_data(db, location, start_date, end_date)
        elif intent == "trend":
            context["data"] = await self._get_trend_data(db, location, start_date, end_date)
        else:
            # General or history query
            context["data"] = await self._get_history_data(db, location, start_date, end_date)
        
        return context
    
    async def _get_current_data(self, db: AsyncSession, location: Optional[str]) -> Dict:
        """Get current AQI readings"""
        query = """
            SELECT DISTINCT ON (m.station_id)
                s.name, s.province, m.aqi, m.aqi_level, m.aqi_color,
                m.pm25, m.pm10, m.o3, m.measured_at
            FROM aqi_measurements m
            JOIN stations s ON m.station_id = s.id
            WHERE s.is_active = TRUE
        """
        params = {}
        
        if location:
            query += " AND s.province ILIKE :location"
            params["location"] = f"%{location}%"
        
        query += " ORDER BY m.station_id, m.measured_at DESC LIMIT 10"
        
        result = await db.execute(text(query), params)
        rows = result.fetchall()
        
        return {
            "type": "current",
            "readings": [
                {
                    "station": row[0],
                    "province": row[1],
                    "aqi": row[2],
                    "level": row[3],
                    "color": row[4],
                    "pm25": round(row[5], 1) if row[5] else None,
                    "pm10": round(row[6], 1) if row[6] else None,
                    "o3": round(row[7], 1) if row[7] else None,
                    "time": row[8].strftime("%Y-%m-%d %H:%M") if row[8] else None
                }
                for row in rows
            ]
        }
    
    async def _get_statistics_data(
        self, 
        db: AsyncSession, 
        location: Optional[str],
        start_date: date,
        end_date: date
    ) -> Dict:
        """Get statistical summary"""
        query = """
            SELECT 
                COUNT(DISTINCT m.station_id) as station_count,
                COUNT(*) as reading_count,
                ROUND(AVG(m.aqi)::numeric, 1) as avg_aqi,
                MAX(m.aqi) as max_aqi,
                MIN(m.aqi) as min_aqi,
                ROUND(AVG(m.pm25)::numeric, 1) as avg_pm25,
                ROUND(MAX(m.pm25)::numeric, 1) as max_pm25,
                ROUND(AVG(m.pm10)::numeric, 1) as avg_pm10
            FROM aqi_measurements m
            JOIN stations s ON m.station_id = s.id
            WHERE DATE(m.measured_at) BETWEEN :start_date AND :end_date
        """
        params = {"start_date": start_date, "end_date": end_date}
        
        if location:
            query += " AND s.province ILIKE :location"
            params["location"] = f"%{location}%"
        
        result = await db.execute(text(query), params)
        row = result.fetchone()
        
        # Get level distribution
        level_query = """
            SELECT 
                aqi_level,
                COUNT(*) as count
            FROM aqi_measurements m
            JOIN stations s ON m.station_id = s.id
            WHERE DATE(m.measured_at) BETWEEN :start_date AND :end_date
        """
        if location:
            level_query += " AND s.province ILIKE :location"
        level_query += " GROUP BY aqi_level ORDER BY count DESC"
        
        level_result = await db.execute(text(level_query), params)
        levels = level_result.fetchall()
        
        return {
            "type": "statistics",
            "period": f"{start_date} to {end_date}",
            "station_count": row[0] if row else 0,
            "reading_count": row[1] if row else 0,
            "aqi": {
                "average": float(row[2]) if row and row[2] else None,
                "max": row[3] if row else None,
                "min": row[4] if row else None
            },
            "pm25": {
                "average": float(row[5]) if row and row[5] else None,
                "max": float(row[6]) if row and row[6] else None
            },
            "pm10_average": float(row[7]) if row and row[7] else None,
            "level_distribution": [
                {"level": l[0], "count": l[1]} for l in levels
            ]
        }
    
    async def _get_extreme_data(
        self,
        db: AsyncSession,
        intent: str,
        location: Optional[str],
        start_date: date,
        end_date: date
    ) -> Dict:
        """Get worst or best AQI readings"""
        order = "DESC" if intent == "worst" else "ASC"
        
        query = f"""
            SELECT 
                s.name, s.province,
                DATE(m.measured_at) as date,
                ROUND(AVG(m.aqi)::numeric, 1) as avg_aqi,
                MAX(m.aqi) as max_aqi,
                ROUND(AVG(m.pm25)::numeric, 1) as avg_pm25
            FROM aqi_measurements m
            JOIN stations s ON m.station_id = s.id
            WHERE DATE(m.measured_at) BETWEEN :start_date AND :end_date
        """
        params = {"start_date": start_date, "end_date": end_date}
        
        if location:
            query += " AND s.province ILIKE :location"
            params["location"] = f"%{location}%"
        
        query += f"""
            GROUP BY s.name, s.province, DATE(m.measured_at)
            ORDER BY max_aqi {order}
            LIMIT 10
        """
        
        result = await db.execute(text(query), params)
        rows = result.fetchall()
        
        return {
            "type": f"{intent}_readings",
            "period": f"{start_date} to {end_date}",
            "readings": [
                {
                    "station": row[0],
                    "province": row[1],
                    "date": row[2].isoformat(),
                    "avg_aqi": float(row[3]) if row[3] else None,
                    "max_aqi": row[4],
                    "avg_pm25": float(row[5]) if row[5] else None
                }
                for row in rows
            ]
        }
    
    async def _get_trend_data(
        self,
        db: AsyncSession,
        location: Optional[str],
        start_date: date,
        end_date: date
    ) -> Dict:
        """Get daily trend data"""
        query = """
            SELECT 
                DATE(m.measured_at) as date,
                ROUND(AVG(m.aqi)::numeric, 1) as avg_aqi,
                ROUND(AVG(m.pm25)::numeric, 1) as avg_pm25,
                COUNT(DISTINCT m.station_id) as station_count
            FROM aqi_measurements m
            JOIN stations s ON m.station_id = s.id
            WHERE DATE(m.measured_at) BETWEEN :start_date AND :end_date
        """
        params = {"start_date": start_date, "end_date": end_date}
        
        if location:
            query += " AND s.province ILIKE :location"
            params["location"] = f"%{location}%"
        
        query += " GROUP BY DATE(m.measured_at) ORDER BY date"
        
        result = await db.execute(text(query), params)
        rows = result.fetchall()
        
        # Calculate trend direction
        if len(rows) >= 2:
            first_avg = float(rows[0][1]) if rows[0][1] else 0
            last_avg = float(rows[-1][1]) if rows[-1][1] else 0
            trend = "increasing" if last_avg > first_avg else "decreasing" if last_avg < first_avg else "stable"
            change_percent = ((last_avg - first_avg) / first_avg * 100) if first_avg > 0 else 0
        else:
            trend = "insufficient_data"
            change_percent = 0
        
        return {
            "type": "trend",
            "period": f"{start_date} to {end_date}",
            "trend_direction": trend,
            "change_percent": round(change_percent, 1),
            "daily_data": [
                {
                    "date": row[0].isoformat(),
                    "avg_aqi": float(row[1]) if row[1] else None,
                    "avg_pm25": float(row[2]) if row[2] else None,
                    "stations": row[3]
                }
                for row in rows
            ]
        }
    
    async def _get_history_data(
        self,
        db: AsyncSession,
        location: Optional[str],
        start_date: date,
        end_date: date
    ) -> Dict:
        """Get historical data summary"""
        # Get daily summary
        query = """
            SELECT 
                d.date,
                s.name,
                s.province,
                d.aqi_avg,
                d.aqi_max,
                d.pm25_avg,
                d.hours_unhealthy
            FROM daily_aqi_summary d
            JOIN stations s ON d.station_id = s.id
            WHERE d.date BETWEEN :start_date AND :end_date
        """
        params = {"start_date": start_date, "end_date": end_date}
        
        if location:
            query += " AND s.province ILIKE :location"
            params["location"] = f"%{location}%"
        
        query += " ORDER BY d.date DESC, d.aqi_avg DESC LIMIT 50"
        
        result = await db.execute(text(query), params)
        rows = result.fetchall()
        
        return {
            "type": "history",
            "period": f"{start_date} to {end_date}",
            "summary": [
                {
                    "date": row[0].isoformat(),
                    "station": row[1],
                    "province": row[2],
                    "avg_aqi": float(row[3]) if row[3] else None,
                    "max_aqi": row[4],
                    "avg_pm25": float(row[5]) if row[5] else None,
                    "hours_unhealthy": row[6]
                }
                for row in rows
            ]
        }
    
    async def _get_comparison_data(
        self,
        db: AsyncSession,
        location: Optional[str],
        start_date: date,
        end_date: date
    ) -> Dict:
        """Get comparison data between stations/provinces"""
        query = """
            SELECT 
                s.province,
                COUNT(DISTINCT s.id) as station_count,
                ROUND(AVG(m.aqi)::numeric, 1) as avg_aqi,
                MAX(m.aqi) as max_aqi,
                MIN(m.aqi) as min_aqi,
                ROUND(AVG(m.pm25)::numeric, 1) as avg_pm25
            FROM aqi_measurements m
            JOIN stations s ON m.station_id = s.id
            WHERE DATE(m.measured_at) BETWEEN :start_date AND :end_date
              AND s.is_active = TRUE
        """
        params = {"start_date": start_date, "end_date": end_date}
        
        if location:
            query += " AND s.province ILIKE :location"
            params["location"] = f"%{location}%"
        
        query += " GROUP BY s.province ORDER BY avg_aqi DESC"
        
        result = await db.execute(text(query), params)
        rows = result.fetchall()
        
        return {
            "type": "comparison",
            "period": f"{start_date} to {end_date}",
            "provinces": [
                {
                    "province": row[0],
                    "stations": row[1],
                    "avg_aqi": float(row[2]) if row[2] else None,
                    "max_aqi": row[3],
                    "min_aqi": row[4],
                    "avg_pm25": float(row[5]) if row[5] else None
                }
                for row in rows
            ]
        }
    
    def format_context_for_llm(self, context: Dict[str, Any]) -> str:
        """Format context data for LLM prompt"""
        data = context.get("data", {})
        data_type = data.get("type", "unknown")
        
        formatted = f"## AQI Data Context\n"
        formatted += f"**Query Type:** {context.get('intent', 'general')}\n"
        formatted += f"**Location:** {context.get('location', 'All Thailand')}\n"
        formatted += f"**Date Range:** {context.get('date_range', {}).get('start')} to {context.get('date_range', {}).get('end')}\n\n"
        
        if data_type == "current":
            formatted += "### Current AQI Readings:\n"
            for reading in data.get("readings", [])[:5]:
                formatted += f"- **{reading['station']}** ({reading['province']}): AQI {reading['aqi']} ({reading['level']}), PM2.5: {reading['pm25']} µg/m³\n"
        
        elif data_type == "statistics":
            formatted += "### Statistical Summary:\n"
            formatted += f"- Period: {data.get('period')}\n"
            formatted += f"- Stations: {data.get('station_count')}\n"
            formatted += f"- Total Readings: {data.get('reading_count')}\n"
            aqi = data.get('aqi', {})
            formatted += f"- AQI Average: {aqi.get('average')}, Max: {aqi.get('max')}, Min: {aqi.get('min')}\n"
            pm25 = data.get('pm25', {})
            formatted += f"- PM2.5 Average: {pm25.get('average')} µg/m³, Max: {pm25.get('max')} µg/m³\n"
            formatted += "\n**Level Distribution:**\n"
            for level in data.get('level_distribution', [])[:5]:
                formatted += f"- {level['level']}: {level['count']} readings\n"
        
        elif data_type == "trend":
            formatted += "### Trend Analysis:\n"
            formatted += f"- Period: {data.get('period')}\n"
            formatted += f"- Trend: {data.get('trend_direction')}\n"
            formatted += f"- Change: {data.get('change_percent')}%\n\n"
            formatted += "**Daily Values:**\n"
            for day in data.get('daily_data', [])[-7:]:  # Last 7 days
                formatted += f"- {day['date']}: AQI {day['avg_aqi']}, PM2.5 {day['avg_pm25']} µg/m³\n"
        
        elif data_type in ["worst_readings", "best_readings"]:
            formatted += f"### {'Worst' if 'worst' in data_type else 'Best'} Readings:\n"
            for reading in data.get("readings", [])[:5]:
                formatted += f"- {reading['date']} - **{reading['station']}** ({reading['province']}): Max AQI {reading['max_aqi']}, PM2.5 {reading['avg_pm25']} µg/m³\n"
        
        elif data_type == "comparison":
            formatted += "### Province Comparison:\n"
            for prov in data.get("provinces", [])[:10]:
                formatted += f"- **{prov['province']}** ({prov['stations']} stations): Avg AQI {prov['avg_aqi']}, Max {prov['max_aqi']}, PM2.5 Avg {prov['avg_pm25']} µg/m³\n"
        
        elif data_type == "history":
            formatted += "### Historical Data:\n"
            for entry in data.get("summary", [])[:10]:
                formatted += f"- {entry['date']} - **{entry['station']}** ({entry['province']}): Avg AQI {entry['avg_aqi']}, Max {entry['max_aqi']}\n"
        
        return formatted


# Singleton instance
aqi_query_service = AQIQueryService()
