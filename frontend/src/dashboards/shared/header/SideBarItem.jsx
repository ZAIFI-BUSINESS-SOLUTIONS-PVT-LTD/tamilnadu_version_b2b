import React from 'react';
import PropTypes from 'prop-types';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx'; // Recommended: Install with `npm install clsx` or `yarn add clsx`

/**
 * SidebarItem Component
 * Represents a single navigation item within a sidebar.
 * Handles routing, active state highlighting, and animated text
 * based on sidebar open/close state.
 */
const SidebarItem = ({
  to,                // The path the link navigates to
  icon,              // React element for the item's icon
  text,              // Display text for the item
  isSidebarOpen,     // Boolean indicating if the parent sidebar is open (for animations)
  onClick,           // Optional click handler for the item
  activePattern,     // Optional RegExp for custom active route matching (e.g., for /users and /users/profile)
}) => {
  const location = useLocation();

  /**
   * Determines if the current route is active based on 'to' or 'activePattern'.
   * If activePattern is provided, it will test the current pathname against it.
   * Otherwise, it will perform a direct comparison with 'to'.
   */
  const isActiveRoute = () => {
    if (activePattern) {
      return activePattern.test(location.pathname);
    }
    return location.pathname === to;
  };

  return (
    <motion.li
      // Animation for the list item itself, for subtle entrance/exit effect
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative group" // Used for hover effects like tooltips or icon color changes
    >
      <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) => {
          // Determine the active state: use custom pattern if provided, else rely on NavLink's isActive
          const activeState = activePattern ? isActiveRoute() : isActive;

          return clsx( // Using clsx for cleaner conditional class application
            "flex items-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            {
              // Classes for when the sidebar is open vs. collapsed
              'px-4 py-3 text-left': isSidebarOpen,
              'w-10 h-10 justify-center': !isSidebarOpen, // Icon-only view when collapsed
            },
            {
              // Classes for active vs. inactive states
              "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 font-medium shadow-md": activeState,
              "text-gray-700 hover:bg-blue-50 hover:shadow-sm": !activeState,
            }
          );
        }}
      >
        {/* Icon Container: Animates margin based on sidebar state */}
        <div
          className={clsx(
            "flex items-center justify-center transition-colors duration-200 group-hover:text-blue-600",
            {
              'mr-3': isSidebarOpen, // Add margin when sidebar is open
            }
          )}
        >
          {icon}
        </div>

        {/* Text Span: Animates visibility based on sidebar state */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="text-base whitespace-nowrap overflow-hidden"
            >
              {text}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Screen Reader Only Text: Provides context when text is hidden (sidebar collapsed) */}
        {!isSidebarOpen && (
          <span className="sr-only">{text}</span>
        )}
      </NavLink>
    </motion.li>
  );
};

SidebarItem.propTypes = {
  to: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired, // Expects a React element (e.g., <Icon size={...} />)
  text: PropTypes.string.isRequired,
  isSidebarOpen: PropTypes.bool.isRequired,
  onClick: PropTypes.func, // Optional click handler
  activePattern: PropTypes.instanceOf(RegExp), // Optional regex for matching active routes
};

// Memoize the component to prevent unnecessary re-renders if props don't change
export default React.memo(SidebarItem);