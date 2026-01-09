import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import StationsPage from './pages/StationsPage';

function App() {
    return (
        <Router>
            <div className="app-container">
                <Header />
                <Routes>
                    <Route path="/" element={<ChatPage />} />
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/stations" element={<StationsPage />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
