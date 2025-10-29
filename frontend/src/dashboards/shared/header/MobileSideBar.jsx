import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SignOut, CaretDown, CaretRight } from "@phosphor-icons/react";
import SidebarItem from './SideBarItem'; // Assuming this handles regular navigation items
import { mobileSidebarVariants, mobileOverlayVariants } from './Constants'; // Animation variants
import Logo from '../../../assets/images/logo.svg'; // Application logo

/**
 * MobileSidebar Component
 * Displays a responsive sidebar for mobile views with navigation items,
 * collapsible additional items, and a logout option.
 * Uses Framer Motion for entry/exit animations.
 */
const MobileSidebar = ({
  isOpen,
  onClose,
  items, // Main navigation items
  additionalItems, // Items that might have nested children (e.g., settings, profile)
  onLogout, // Logout handler
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for closing the sidebar when clicking outside */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={mobileOverlayVariants}
            className="fixed inset-0 z-40 bg-black/50 md:hidden" // Added transparency to overlay
            onClick={onClose}
            aria-hidden="true" // Indicate that this is for visual/interaction purposes, not content
          />

          {/* Mobile Sidebar */}
          <motion.aside
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={mobileSidebarVariants}
            className="bg-white fixed top-0 left-0 z-50 w-64 h-full shadow-lg p-4 overflow-y-auto md:hidden"
            role="navigation"
            aria-label="Sidebar navigation"
          >
            {/* Header: Close Button & Logo */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={onClose}
                className="btn btn-ghost flex items-center justify-center p-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-label="Close sidebar"
              >
                <X size={24} className="w-6 h-6" />
              </button>
              <img src={Logo} alt="Application Logo" className="w-28 h-auto" /> {/* Added h-auto for aspect ratio */}
            </div>

            {/* Navigation Links */}
            <nav>
              {/* Main Navigation Items */}
              <ul className="space-y-2">
                {items.map((item, index) => (
                  <SidebarItem
                    key={item.to || `main-item-${index}`} // Use 'to' as key if present, otherwise index
                    {...item}
                    isSidebarOpen={true} // This prop might be redundant if it's always true for mobile
                    onClick={onClose} // Close sidebar on item click
                  />
                ))}

                {/* Additional Items (potentially collapsible) */}
                {additionalItems && additionalItems.map((item, index) => (
                  <li key={`additional-${index}`} className="space-y-1">
                    <button
                      onClick={() => {
                        item.onClick(); // Execute item's specific click handler
                        if (!item.isParent) { // If not a parent, close sidebar
                          onClose();
                        }
                      }}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 w-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      aria-expanded={item.isParent ? (!item.isCollapsed).toString() : undefined}
                      aria-controls={item.isParent ? `sub-menu-${index}` : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 flex items-center justify-center">
                          {item.icon}
                        </div>
                        <span>{item.text}</span>
                      </div>
                      {item.isParent && (item.isCollapsed ? <CaretRight size={18} /> : <CaretDown size={18} />)}
                    </button>

                    {item.isParent && !item.isCollapsed && (
                      <ul id={`sub-menu-${index}`} className="pl-12 space-y-1">
                        {item.children?.map((child, childIndex) => (
                          <li key={`child-${childIndex}`}>
                            <button
                              onClick={() => {
                                child.onClick();
                                onClose(); // Always close sidebar on child item click
                              }}
                              className="flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 w-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <div className="w-6 h-6 flex items-center justify-center">
                                {child.icon}
                              </div>
                              <span>{child.text}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              <hr className="my-4 border-gray-200" /> {/* Added border color for clarity */}

              {/* Logout Item */}
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 w-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    aria-label="Logout"
                  >
                    <SignOut size={24} className="w-6 h-6" />
                    <span>Logout</span>
                  </button>
                </li>
              </ul>
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

MobileSidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
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
  onLogout: PropTypes.func.isRequired,
};

export default MobileSidebar;