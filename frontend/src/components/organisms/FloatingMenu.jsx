import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * FloatingMenu - A circular floating action button with expandable menu items
 * Used to toggle visibility of map panels (Legend, Data Source, etc.)
 */
const FloatingMenu = ({ items, position = 'bottom-right' }) => {
    const [isOpen, setIsOpen] = useState(false);

    const positions = {
        'bottom-right': 'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-overlay',
        'bottom-left': 'fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-overlay',
    };

    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <div className={positions[position]}>
            {/* Menu Items - appear when menu is open */}
            <div className="absolute bottom-14 sm:bottom-16 right-0 flex flex-col-reverse gap-2 sm:gap-3 items-center">
                {items.map((item, index) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            item.onClick();
                            // Keep menu open for toggles
                        }}
                        className={`
              w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center
              shadow-lg transition-all duration-300 ease-out backdrop-blur-md
              ${item.isActive
                                ? 'bg-orange-500/65 text-white border border-orange-400/30'
                                : 'bg-orange-50/65 text-gray-700 hover:bg-orange-100/80 active:bg-orange-200/80 border border-orange-200/30'
                            }
              ${isOpen
                                ? 'opacity-100 translate-y-0 scale-100'
                                : 'opacity-0 translate-y-4 scale-75 pointer-events-none'
                            }
            `}
                        style={{
                            transitionDelay: isOpen ? `${index * 50}ms` : `${(items.length - index - 1) * 30}ms`,
                        }}
                        title={item.label}
                        aria-label={item.label}
                    >
                        {item.icon}
                    </button>
                ))}
            </div>

            {/* Main Toggle Button */}
            <button
                onClick={toggleMenu}
                className={`
          w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center
          shadow-xl transition-all duration-300 ease-out backdrop-blur-md
          border
          ${isOpen
                        ? 'bg-orange-600/65 text-white rotate-45 border-orange-500/30'
                        : 'bg-orange-500/65 text-white hover:bg-orange-600/65 active:bg-orange-700/65 border-orange-400/30'
                    }
        `}
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isOpen}
            >
                {/* Plus/Close icon */}
                <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M12 4v16m8-8H4"
                    />
                </svg>
            </button>
        </div>
    );
};

FloatingMenu.propTypes = {
    items: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            icon: PropTypes.node.isRequired,
            onClick: PropTypes.func.isRequired,
            isActive: PropTypes.bool,
        })
    ).isRequired,
    position: PropTypes.oneOf(['bottom-right', 'bottom-left']),
};

export default FloatingMenu;
