import { Link, useLocation } from 'react-router-dom';
import { Wind, MessageSquare, LayoutDashboard, MapPin } from 'lucide-react';

const Header = () => {
    const location = useLocation();

    const navLinks = [
        { path: '/chat', label: 'Chat AI', icon: MessageSquare },
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/stations', label: 'Stations', icon: MapPin },
    ];

    return (
        <header className="header">
            <div className="header-content">
                <Link to="/" className="logo">
                    <div className="logo-icon">
                        <Wind size={24} />
                    </div>
                    <span className="logo-text">AQI Chat AI</span>
                </Link>

                <nav className="nav-links">
                    {navLinks.map(({ path, label, icon: Icon }) => (
                        <Link
                            key={path}
                            to={path}
                            className={`nav-link ${location.pathname === path ? 'active' : ''}`}
                        >
                            <Icon size={18} style={{ marginRight: '0.5rem', display: 'inline' }} />
                            {label}
                        </Link>
                    ))}
                </nav>
            </div>
        </header>
    );
};

export default Header;
