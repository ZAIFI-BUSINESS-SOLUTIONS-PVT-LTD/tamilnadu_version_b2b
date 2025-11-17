import PropTypes from 'prop-types';
import { SignOut } from "@phosphor-icons/react";

/**
 * UserDropdown Component
 * Displays a dropdown menu for user-related actions, typically found in a header/navbar.
 * Shows user initials, name, and type-specific information, along with a logout option.
 */
const UserDropdown = ({
  userInfo, // Object containing user details (name, inst/student_id)
  onLogout, // Function to handle user logout
  type,     // String indicating the user type ('student' or 'educator')
}) => {
  // Get the first letter of the user's name, or 'U' as a fallback
  const initials = userInfo?.name?.charAt(0)?.toUpperCase() || 'U';

  // Determine the secondary text based on user type
  const secondaryInfo = type === 'educator'
    ? `Institution: ${userInfo.inst || "N/A"}`
    : `Student ID: #${userInfo.student_id || "N/A"}`;

  return (
    <div className="dropdown dropdown-end">
      {/* Dropdown Trigger Button (Initials Avatar) */}
      <label
        tabIndex={0} // Makes the label focusable and keyboard interactive
        className="btn btn-ghost btn-circle hover:bg-gray-100 transition-colors p-0"
        aria-label="Open user menu" // Accessibility improvement
      >
        <div
          aria-hidden="true"
          className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-lg flex items-center justify-center"
        >
          {initials}
        </div>
      </label>

      {/* Dropdown Content */}
      <ul
        tabIndex={0} // Makes the dropdown content focusable
        className="menu dropdown-content mt-2 p-2 shadow-lg bg-white rounded-box w-64 border border-gray-200 z-10" // Added z-index for layering
        role="menu" // Semantic role for the dropdown menu
        aria-orientation="vertical" // Indicates vertical orientation of menu items
      >
        {/* User Information Display */}
        <div className="flex items-center p-4 border-b border-gray-100 w-full min-w-0"> {/* Added bottom border */}
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-xl flex-shrink-0"> {/* Added flex-shrink-0 */}
            {initials}
          </div>
          <div className="ml-3 overflow-hidden min-w-0 flex-1">
            <p className="font-semibold text-gray-900 truncate" title={userInfo.name}> {/* Added title for full name on hover */}
              {userInfo.name}
            </p>
            <p className="text-sm text-gray-500 truncate" title={secondaryInfo}> {/* Added title for full secondary info on hover */}
              {secondaryInfo}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <div className="p-2">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full py-2 px-3 hover:bg-gray-50 rounded-lg text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            role="menuitem" // Semantic role for a menu item
          >
            <SignOut size={18} aria-hidden="true" /> {/* Hide icon from screen readers as text is present */}
            <span>Logout</span>
          </button>
        </div>
      </ul>
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
  type: PropTypes.oneOf(['student', 'educator']).isRequired,
};

export default UserDropdown;