import PropTypes from 'prop-types';
import React, { useState, useRef, useEffect } from 'react';
import { LogOut, MessageSquare, Moon, Sun } from "lucide-react";
import { Button } from '../../../components/ui/button.jsx';

/**
 * UserDropdown Component
 * Displays a dropdown menu for user-related actions, typically found in a header/navbar.
 * Shows user initials, name, and type-specific information, along with a logout option.
 */
const UserDropdown = ({
  userInfo, // Object containing user details (name, inst/student_id)
  onLogout, // Function to handle user logout
  onFeedback, // Optional function to open feedback modal
  type,     // String indicating the user type ('student' or 'educator')
}) => {
  // Get the first letter of the user's name, or 'U' as a fallback
  const initials = userInfo?.name?.charAt(0)?.toUpperCase() || 'U';

  // Determine the secondary text based on user type
  // Normalize institution name from multiple possible fields the backend may use
  const instName = (
    userInfo && (
      userInfo.inst ||
      userInfo.institution ||
      userInfo.institute ||
      userInfo.school ||
      userInfo.school_name ||
      userInfo.schoolName ||
      userInfo.organization ||
      userInfo.org ||
      userInfo.org_name
    )
  ) || 'N/A';

  const secondaryInfo = type === 'educator'
    ? `Institution: ${instName}`
    : `Student ID: #${userInfo?.student_id ?? 'N/A'}`;

  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full p-0"
        aria-label="Open user menu"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div
          aria-hidden="true"
          className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-lg flex items-center justify-center"
        >
          {initials}
        </div>
      </Button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card shadow-xl z-20"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="flex items-center p-4 border-b border-border w-full min-w-0">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white font-semibold text-xl flex-shrink-0">
              {initials}
            </div>
            <div className="ml-3 overflow-hidden min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate" title={userInfo.name}>
                {userInfo.name}
              </p>
              <p className="text-sm text-muted-foreground truncate" title={secondaryInfo}>
                {secondaryInfo}
              </p>
            </div>
          </div>

          <div className="p-2 space-y-2">
            {onFeedback && (
              <button
                onClick={onFeedback}
                className="flex items-center gap-3 w-full py-2 px-3 hover:bg-muted rounded-lg text-foreground transition-colors focus:outline-none"
                role="menuitem"
              >
                <MessageSquare size={18} aria-hidden="true" />
                <span>Feedback</span>
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 w-full py-2 px-3 hover:bg-muted rounded-lg text-foreground transition-colors focus:outline-none"
              role="menuitem"
            >
              {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
              <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-3 w-full py-2 px-3 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              role="menuitem"
            >
              <LogOut size={18} aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

UserDropdown.propTypes = {
  userInfo: PropTypes.shape({
    name: PropTypes.string, // Name can be optional as per `charAt(0)` fallback
    inst: PropTypes.string, // Institution for educator
    student_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // Student ID for student
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
  onFeedback: PropTypes.func,
  type: PropTypes.oneOf(['student', 'educator']).isRequired,
};

export default UserDropdown;