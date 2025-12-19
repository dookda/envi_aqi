import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import App from './App';
import HistoricalDataPage from './pages/HistoricalDataPage';
import ChatbotPage from './pages/ChatbotPage';

/**
 * Main Router Application
 * Handles navigation between different pages
 */
const RouterApp = () => {
  return (
    <BrowserRouter basename="/env">
      <div className="relative w-screen h-screen overflow-hidden">
        {/* Navigation Bar - Responsive */}
        <nav className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 shadow-lg">
          <div className="container mx-auto px-3 sm:px-6">
            <div className="flex items-center justify-between h-12 sm:h-16">
              {/* Logo/Brand */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white font-bold text-base sm:text-xl">AQI Monitor</span>
              </div>

              {/* Navigation Links - Responsive */}
              <div className="flex space-x-1">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all duration-200 min-h-[40px] flex items-center ${isActive
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'text-white hover:bg-white/20 active:bg-white/30'
                    }`
                  }
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="hidden sm:inline text-sm sm:text-base">Dashboard</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/historical"
                  className={({ isActive }) =>
                    `px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all duration-200 min-h-[40px] flex items-center ${isActive
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'text-white hover:bg-white/20 active:bg-white/30'
                    }`
                  }
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden sm:inline text-sm sm:text-base">Historical</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/chatbot"
                  className={({ isActive }) =>
                    `px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all duration-200 min-h-[40px] flex items-center ${isActive
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'text-white hover:bg-white/20 active:bg-white/30'
                    }`
                  }
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span className="hidden sm:inline text-sm sm:text-base">AI Chat</span>
                  </div>
                </NavLink>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area - Account for navbar height */}
        <div className="absolute top-12 sm:top-16 left-0 right-0 bottom-0">
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/historical" element={<HistoricalDataPage />} />
            <Route path="/chatbot" element={<ChatbotPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default RouterApp;
