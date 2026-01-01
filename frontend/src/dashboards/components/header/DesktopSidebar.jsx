import PropTypes from 'prop-types';
import { LogOut, ChevronDown, ChevronRight } from "lucide-react";
import Logo from '../../../assets/images/logo.svg';
import LogoInverted from '../../../assets/images/logo-inverted.svg';
import { motion, AnimatePresence } from 'framer-motion';
import SidebarItem from './SideBarItem'; // Assuming SidebarItem handles individual link rendering and active states

/**
 * DesktopSidebar Component
 *
 * Renders the main desktop sidebar navigation for the application.
 * It supports a collapsed (narrow) and expanded (wide) state,
 * displaying primary navigation items, optional additional items,
 * user profile information, and a logout button.
 *
 * Transitions between states are smoothly animated using Framer Motion.
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.items - An array of objects defining the main navigation links.
 * Each object should typically have:
 * - `to`: (string) The path for the navigation link.
 * - `icon`: (React.ElementType) The icon component for the link.
 * - `text`: (string) The display text for the link.
 * - `activePattern`: (RegExp) A regex pattern to determine if the link is active.
 * - `isParent`: (boolean, optional) Indicates if the item has children (for collapsible sections).
 * - `isCollapsed`: (boolean, optional) Controls the collapsed state of children if `isParent` is true.
 * - `toggleCollapse`: (function, optional) Function to toggle the collapsed state of children.
 * - `children`: (Array<object>, optional) Nested array of link objects for collapsible sections.
 * @param {Array<object>} [props.additionalItems] - An array of objects defining additional links/tools.
 * These items are typically action-oriented buttons. Each object should have:
 * - `icon`: (React.ElementType) The icon component.
 * - `text`: (string) The display text.
 * - `onClick`: (function) The handler for the button click.
 * Note: While `additionalItems` in `StudentHeader` is flat, this component's rendering logic
 * for `additionalItems` supports `isParent` and `children` for potential future use or
 * compatibility with other contexts (e.g., `EducatorHeader`'s 'Reports' section).
 * @param {boolean} props.isCollapsed - A boolean indicating whether the sidebar is currently collapsed.
 * @param {function} props.onLogout - A function to be called when the logout button is clicked.
 * @param {object} [props.userInfo] - An object containing details about the logged-in user.
 * Expected properties: `name` (string), `inst` (string, e.g., institution name or role).
 * @returns {JSX.Element} The rendered DesktopSidebar component.
 */
const DesktopSidebar = ({ items, additionalItems, isCollapsed, onLogout, userInfo }) => {
  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-card z-40 transition-all duration-300 flex flex-col shadow-md overflow-x-hidden
        ${isCollapsed ? "w-20" : "w-64"}`}
      aria-label="Main sidebar navigation"
    >
      {/* Header section with logo and app name */}
      <div className={`flex items-center h-20 mb-2 border-b border-border ${!isCollapsed ? 'justify-start px-6' : 'justify-center'}`}>
        {!isCollapsed ? (
          // Expanded state: Full logo and app name
          <AnimatePresence mode="wait"> {/* Use mode="wait" to ensure current animation completes before new one starts */}
            <motion.div
              key="logo-expanded" // Unique key for AnimatePresence
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center space-x-4"
            >
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-md">
                <span className="font-semibold text-white text-xl">
                  IE
                </span>
              </div>
              <img
                src={Logo}
                alt="InzightEd Logo"
                className="h-7 pt-1 dark:hidden"
              />
              <img
                src={LogoInverted}
                alt="InzightEd Logo"
                className="h-7 pt-1 hidden dark:block"
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          // Collapsed state: Only "IE" initials
          <AnimatePresence mode="wait">
            <motion.div
              key="logo-collapsed" // Unique key for AnimatePresence
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-md"
            >
              <span className="font-semibold text-white text-xl">
                IE
              </span>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Main navigation section, takes remaining vertical space and allows scrolling */}
      <nav className="flex-1 flex flex-col justify-between overflow-y-auto py-4">
        <div className={isCollapsed ? "px-2" : "px-3"}>
          {/* "Main Menu" section title */}
          <div className="px-3 mb-4">
            {!isCollapsed ? (
              <AnimatePresence>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Main Menu
                </motion.span>
              </AnimatePresence>
            ) : (
              <span className="text-md font-extrabold text-muted-foreground uppercase tracking-wider flex justify-center">
                ...
              </span>
            )}
          </div>

          {/* List of main navigation items */}
          <ul className={` ${isCollapsed ? "flex flex-col items-center space-y-4" : "space-y-2"}`} role="menu">
            {items.map((item, index) => (
              <SidebarItem
                key={item.to || index} // Use 'to' as key if available, otherwise index
                {...item}
                // Pass `!isCollapsed` to `SidebarItem` so it knows whether to display its text.
                // It would be more semantically clear to rename this prop in SidebarItem to e.g., `isParentSidebarExpanded`.
                isSidebarOpen={!isCollapsed}
              />
            ))}
          </ul>

          {/* Additional items section (e.g., Reports & Tools) */}
          {additionalItems && additionalItems.length > 0 && (
            <>
              {/* "Reports & Tools" section title */}
              <div className="px-3 mt-8 mb-4">
                {!isCollapsed ? (
                  <AnimatePresence>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      Reports & Tools
                    </motion.span>
                  </AnimatePresence>
                ) : (
                  <span className="text-md font-extrabold text-muted-foreground uppercase tracking-wider flex justify-center">
                    ...
                  </span>
                )}
              </div>

              {/* List of additional items */}
              {/*
                NOTE: The rendering logic for additionalItems below is more complex than
                simply passing them to SidebarItem. It includes logic for `isParent` and `children`
                which might not be needed if `additionalItems` are always flat (as seen in StudentHeader).
                If `SidebarItem` is designed to handle nested items, this section could be simplified
                by mapping `additionalItems` directly to `SidebarItem` components.
                For the purpose of this refactoring, the existing structure is maintained.
              */}
              <ul className={`${isCollapsed ? "mt-4 flex flex-col items-center" : "space-y-1"}`} role="menu">
                {additionalItems.map((item, index) => (
                  <li key={`additional-${index}`} className={`relative group ${isCollapsed ? "w-10 h-10 flex justify-center" : "w-full"}`} role="none">
                    <button
                      onClick={item.onClick}
                      className={`w-full flex items-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-0
                                  ${!isCollapsed ? 'px-4 py-3 text-left' : 'p-3 justify-center'}
                                  hover:bg-muted text-foreground group
                                  ${isCollapsed ? 'justify-center items-center' : 'px-4 py-3 text-left w-full'}`}
                      aria-label={item.text} // Add aria-label for accessibility when text is hidden
                      role="menuitem"
                    >
                      <div className="relative flex items-center">
                        <div className={`flex items-center justify-center text-muted-foreground group-hover:text-primary
                                        ${!isCollapsed ? 'mr-3' : ''}`}>
                          {item.icon}
                        </div>

                        {/* Animate presence for text */}
                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="font-medium text-base"
                            >
                              {item.text}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {/* Animate presence for caret icons for collapsible items */}
                        <AnimatePresence>
                          {!isCollapsed && item.isParent && ( // Only show caret if it's a parent item and sidebar is expanded
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute right-0 -mr-6"
                            >
                              {item.isCollapsed ? // Assuming `item.isCollapsed` is managed externally for this item
                                <ChevronRight size={16} className="text-muted-foreground" /> :
                                <ChevronDown size={16} className="text-muted-foreground" />
                              }
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </button>

                    {/* Collapsible children items */}
                    <AnimatePresence>
                      {!isCollapsed && item.isParent && !item.isCollapsed && (
                        <motion.ul
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-1 ml-6 space-y-1 border-l-2 border-border pl-4"
                          role="group" // ARIA role for a group of related menu items
                        >
                          {item.children?.map((child, childIndex) => (
                            <motion.li
                              key={`child-${childIndex}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: childIndex * 0.05 }}
                              role="none"
                            >
                              <button
                                onClick={child.onClick}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                  text-muted-foreground hover:bg-muted hover:text-primary transition-colors text-base focus:outline-none focus:ring-0"
                                aria-label={child.text}
                                role="menuitem"
                              >
                                <div className="flex items-center justify-center">
                                  {child.icon}
                                </div>
                                <span>{child.text}</span>
                              </button>
                            </motion.li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* User profile section (only visible when sidebar is expanded) */}
        {!isCollapsed && userInfo && (
          <div className="mt-auto mb-4 px-3">
            <div className="flex items-center p-3 bg-muted rounded-xl">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm">
                {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'} {/* Ensure uppercase initial */}
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-foreground">{userInfo.name || 'User'}</div>
                <div className="text-sm text-muted-foreground">{userInfo.inst || 'Role/Institution'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Logout section */}
        <div className={isCollapsed ? "px-2" : "px-3"}>
          <ul className={`${isCollapsed ? "mt-4 flex flex-col items-center" : "space-y-1"}`} role="menu">
            <li className={`relative group ${isCollapsed ? "w-10 h-10 flex justify-center" : "w-full"}`} role="none">
              <button
                onClick={onLogout}
                className={`w-full flex items-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-0
                ${!isCollapsed ? 'px-4 py-3 text-left' : 'p-3 justify-center'}
                hover:bg-red-50 dark:hover:bg-red-950/20 text-foreground group relative`}
                aria-label="Logout"
                role="menuitem"
              >
                <div className={`flex items-center justify-center text-muted-foreground group-hover:text-red-600${!isCollapsed ? ' mr-3' : ''}`}>
                  <LogOut size={20} />
                </div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="font-medium text-base"
                    >
                      Logout
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
};

DesktopSidebar.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      to: PropTypes.string,
      icon: PropTypes.node.isRequired,
      text: PropTypes.string.isRequired,
      activePattern: PropTypes.instanceOf(RegExp),
      isParent: PropTypes.bool,
      isCollapsed: PropTypes.bool,
      toggleCollapse: PropTypes.func,
      children: PropTypes.array, // Could be more specific with PropTypes.arrayOf(PropTypes.shape(...))
    })
  ).isRequired,
  additionalItems: PropTypes.arrayOf(
    PropTypes.shape({
      icon: PropTypes.node.isRequired,
      text: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
      isParent: PropTypes.bool, // Optional, for consistent rendering logic
      isCollapsed: PropTypes.bool, // Optional, for consistent rendering logic
      children: PropTypes.array, // Optional, for consistent rendering logic
    })
  ),
  isCollapsed: PropTypes.bool.isRequired,
  onLogout: PropTypes.func.isRequired,
  userInfo: PropTypes.shape({
    name: PropTypes.string,
    inst: PropTypes.string,
  }),
};

export default DesktopSidebar;