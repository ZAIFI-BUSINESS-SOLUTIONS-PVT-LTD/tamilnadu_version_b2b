import React from 'react';
import { User, GraduationCap } from 'lucide-react';
import WhatsAppSettings from '../../components/whatsapp/WhatsAppSettings.jsx';

/**
 * Educator Settings Page
 * Manages educator profile and WhatsApp notification preferences
 */
const ESettings = () => {
  return (
    <div className="mt-12 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your educator profile and notification preferences</p>
      </div>

      {/* Profile Information Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <GraduationCap className="text-blue-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">Educator Profile</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              placeholder="Managed during registration"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Institution
            </label>
            <input
              type="text"
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              placeholder="Managed during registration"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            To update your profile information, please contact your administrator
          </p>
        </div>
      </div>

      {/* WhatsApp Notifications Section */}
      <WhatsAppSettings />
      
      {/* Help Section */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">📖 Need Help?</h3>
        <p className="text-sm text-blue-700">
          For assistance with your educator account, please contact your institution administrator or support team.
        </p>
      </div>
    </div>
  );
};

export default ESettings;
