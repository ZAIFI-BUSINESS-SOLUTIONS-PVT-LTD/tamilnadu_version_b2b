import React from 'react';
import { User, Building } from 'lucide-react';
import WhatsAppSettings from '../../components/whatsapp/WhatsAppSettings.jsx';

/**
 * Institution Settings Page
 * Manages institution/manager profile and WhatsApp notification preferences
 */
const ISettings = () => {
  return (
    <div className="mt-12 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your institution profile and notification preferences</p>
      </div>

      {/* Profile Information Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <Building className="text-blue-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Institution Profile</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Institution Name
            </label>
            <input
              type="text"
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              placeholder="Managed by administrator"
            />
            <p className="text-xs text-gray-500 mt-1">
              Contact your administrator to update institution details
            </p>
          </div>
        </div>
      </div>

      {/* WhatsApp Notifications Section */}
      <WhatsAppSettings />
      
      {/* Help Section */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">📖 Need Help?</h3>
        <p className="text-sm text-blue-700">
          For assistance with your institution account, please contact your system administrator or support team.
        </p>
      </div>
    </div>
  );
};

export default ISettings;
