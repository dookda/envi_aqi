import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import App from './App';
import LiveMapPage from './pages/LiveMapPage';
import HistoricalDataPage from './pages/HistoricalDataPage';
import FullMapPage from './pages/FullMapPage';

/**
 * Main Router Application
 * Handles navigation between different pages
 */
const RouterApp = () => {
  return (
    <BrowserRouter>
      <div className="relative w-screen h-screen overflow-hidden">
        {/* Navigation Bar */}
        <nav className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 shadow-lg">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo/Brand */}
              <div className="flex items-center space-x-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white font-bold text-xl">AQI Monitor</span>
              </div>

              {/* Navigation Links */}
              <div className="flex space-x-1">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-white hover:bg-white/20'
                    }`
                  }
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Dashboard</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/live-map"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-white hover:bg-white/20'
                    }`
                  }
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <span>Live Map</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/historical"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-white hover:bg-white/20'
                    }`
                  }
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Historical Data</span>
                  </div>
                </NavLink>

                <NavLink
                  to="/full-map"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-white hover:bg-white/20'
                    }`
                  }
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Full Map</span>
                  </div>
                </NavLink>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className="absolute top-0 left-0 right-0 bottom-0">
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/live-map" element={<LiveMapPage />} />
            <Route path="/historical" element={<HistoricalDataPage />} />
            <Route path="/full-map" element={<FullMapPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default RouterApp;
