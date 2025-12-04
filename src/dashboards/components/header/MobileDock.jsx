import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';


/**
 * MobileSideDock Component
 * Replaces the full-screen mobile sidebar with a bottom dock for mobile screens.
 * Renders primary navigation icons in a compact fixed bottom bar. If additional
 * items include a parent with children (e.g., Reports), a small popup menu appears above the dock.
 */
const MobileSidebar = ({ isOpen = false, onClose, items = [], additionalItems = [], onLogout }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);
  const popupRef = useRef(null);
  const [popupLeft, setPopupLeft] = useState(null);

  // Enhance icon for mobile dock only: larger size and bolder weight
  // Also attempt to set color/currentColor so most SVG icons inherit the dock's text color.
  const enhanceIcon = (icon) => {
    try {
      if (React.isValidElement(icon))
        return React.cloneElement(icon, { size: 24, weight: 'bold', color: 'currentColor' });
    } catch (e) {
      // fallthrough
    }
    return icon;
  };

  // Close popup on outside click or Escape
  useEffect(() => {
    function handleGlobalClick(e) {
      // close only if click is outside both the menu button area and the popup itself
      if (
        menuRef.current &&
        popupRef.current &&
        !menuRef.current.contains(e.target) &&
        !popupRef.current.contains(e.target)
      ) setOpenMenu(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpenMenu(false);
    }
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // When menu opens, compute a left position (px) for the fixed popup and clamp to viewport
  useEffect(() => {
    function updatePosition() {
      if (!openMenu) return;
      const btnRect = menuRef.current && menuRef.current.getBoundingClientRect();
      const popupEl = popupRef.current;
      if (!btnRect || !popupEl) return;
      const popupW = popupEl.offsetWidth || 176; // fallback
      let desired = btnRect.left + btnRect.width / 2 - popupW / 2;
      const min = 8; // px from left
      const max = window.innerWidth - popupW - 8;
      const left = Math.max(min, Math.min(desired, max));
      setPopupLeft(left);
    }

    // compute after paint so offsetWidth is available
    requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [openMenu]);

  function handleItemClick(item) {
    if (item.onClick) item.onClick();
    if (item.to) navigate(item.to);
    if (onClose) onClose();
  }

  return (
    // Dock is only visible on small screens (md:hidden)
    <div className="fixed inset-x-0 bottom-0 z-[60] md:hidden">
      <nav
        aria-label="Mobile dock"
        className="bg-gradient-to-b from-blue-900 to-blue-950 shadow-2xl w-full h-20 border-t border-blue-300/20 
             relative overflow-hidden
             before:content-[''] before:absolute before:inset-0 before:border-t before:border-white/30 before:pointer-events-none
             after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-b after:from-white/10 after:via-transparent after:to-white/5 after:pointer-events-none
             rounded-t-2xl"
      >
        <div className="flex items-center h-full">
          {/* Render items evenly spaced */}
          {(() => {
            const renderItems = [...items.slice(0, 4)];
            if (additionalItems && additionalItems.length > 0) {
              renderItems.push({
                isMore: true,
                icon: additionalItems[0].icon,
                text: 'Reports'
              });
            }

            return renderItems.map((item, idx) => {
              const key = item.to || item.text || `dock-${idx}`;
              const active = item.to && pathname.startsWith(item.to);
              // More button
              if (item.isMore) {
                return (
                  <div key={key} className="flex-1 flex items-center justify-center" ref={menuRef}>
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(!openMenu)}
                        className={`flex flex-col items-center justify-center p-2 focus:outline-none`}
                        aria-haspopup="menu"
                        aria-expanded={openMenu}
                        aria-label="More"
                        title="More"
                      >
                        <div className={`w-12 h-8 flex items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${openMenu ? 'bg-blue-50 text-blue-900' : 'text-gray-300 hover:text-cyan-200'}`}>{enhanceIcon(item.icon)}</div>
                        <span className={`text-xs mt-2 font-medium leading-none tracking-tight transition-colors duration-200 ease-in-out ${openMenu ? 'text-white' : 'text-gray-300'}`}>{item.text}</span>
                      </button>

                      {openMenu && (
                        <div
                          role="menu"
                          ref={popupRef}
                          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-44 z-[60]"
                          style={{
                            left: popupLeft != null ? popupLeft : '50%',
                            bottom: 96,
                            transform: popupLeft == null ? 'translateX(-50%)' : undefined,
                          }}
                        >
                          <ul className="space-y-1">
                            {additionalItems.flatMap((it) => (it.isParent ? it.children || [] : [it])).map((child, cidx) => (
                              <li key={`more-${cidx}`}>
                                <button
                                  role="menuitem"
                                  onClick={() => {
                                    if (child.onClick) child.onClick();
                                    if (child.to) navigate(child.to);
                                    setOpenMenu(false);
                                    if (onClose) onClose();
                                  }}
                                  className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <div className="w-5 h-5">{child.icon}</div>
                                  <span className="text-sm">{child.text}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={key} className="flex-1 flex items-center justify-center">
                  <button
                    onClick={() => handleItemClick(item)}
                    className={`flex flex-col items-center justify-center p-2 focus:outline-none`}
                    aria-current={active ? 'page' : undefined}
                    aria-label={item.text}
                    title={item.text}
                  >
                    <div className={`w-12 h-8 flex items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${active ? 'bg-blue-50 text-blue-900' : 'text-gray-300 hover:text-cyan-200'}`}>{enhanceIcon(item.icon)}</div>
                    <span className={`text-xs mt-2 font-medium leading-none tracking-tight transition-colors duration-200 ease-in-out ${active ? 'text-white' : 'text-gray-300'}`}>{item.text}</span>
                  </button>
                </div>
              );
            });
          })()}
        </div>
      </nav>
    </div>
  );
};

MobileSidebar.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      // Assuming SidebarItem expects these props
      to: PropTypes.string,
      text: PropTypes.string.isRequired,
      icon: PropTypes.node, // React element for the icon
      // Add any other props SidebarItem expects
    })
  ).isRequired,
  additionalItems: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string.isRequired,
      icon: PropTypes.node,
      onClick: PropTypes.func.isRequired,
      isParent: PropTypes.bool,
      isCollapsed: PropTypes.bool,
      children: PropTypes.arrayOf(
        PropTypes.shape({
          text: PropTypes.string.isRequired,
          icon: PropTypes.node,
          onClick: PropTypes.func.isRequired,
        })
      ),
    })
  ),
  onLogout: PropTypes.func,
};

export default MobileSidebar;