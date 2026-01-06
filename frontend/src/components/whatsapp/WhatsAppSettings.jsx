import React, { useState, useEffect } from 'react';
import { Save, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/api';

/**
 * WhatsAppSettings - Profile/Settings section for managing WhatsApp preferences
 * Allows users to opt-in, view status, and activate WhatsApp notifications
 */
const WhatsAppSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const [optInSaved, setOptInSaved] = useState(false); // Track if backend has opt-in saved
  const [activated, setActivated] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activationLink, setActivationLink] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return null;
      }

      const response = await axios.get(`${API_BASE_URL}/whatsapp/status/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { opt_in, activated: isActivated, phone_number, activation_link } = response.data;

      setOptIn(opt_in === true);
      setOptInSaved(opt_in === true); // Track backend opt-in state
      setActivated(isActivated === true);
      setPhoneNumber(phone_number || '');
      setActivationLink(activation_link || '');

      // Return the raw response data so callers (poll) can inspect activation immediately
      return response.data;
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      setMessage({ type: 'error', text: 'Failed to load WhatsApp settings.' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    // Call backend endpoint first to mark user activated and update DB fields immediately
    setActivating(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/whatsapp/activate/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setActivated(true);
        setMessage({
          type: 'success',
          text: response.data.message || 'WhatsApp activated! You can now receive notifications.',
        });
        
        // Open wa.me link if available so user can send initial message (optional, helps with Meta's 24hr window)
        if (activationLink) {
          setTimeout(() => {
            window.open(activationLink, '_blank', 'noopener');
          }, 500);
        }
        
        // Refresh status after activation
        setTimeout(() => fetchStatus(), 1000);
      }
    } catch (error) {
      console.error('Error activating WhatsApp:', error);
      const errorMsg = error.response?.data?.error || 'Failed to activate. Please try again.';
      const details = error.response?.data?.details || '';
      setMessage({
        type: 'error',
        text: `${errorMsg}${details ? ' ' + details : ''}`,
      });
    } finally {
      setActivating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/whatsapp/opt-in/`,
        {
          opt_in: optIn,
          consent_text: 'I agree to receive important notifications and updates on WhatsApp.',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setActivated(response.data.activated);
      setActivationLink(response.data.activation_link || '');
      setOptInSaved(optIn); // Mark opt-in as saved in backend
      
      setMessage({
        type: 'success',
        text: optIn
          ? 'Settings saved! Now click "Activate WhatsApp Updates" below to complete setup.'
          : 'WhatsApp notifications disabled.',
      });
    } catch (error) {
      console.error('Error updating WhatsApp settings:', error);
      setMessage({
        type: 'error',
        text: 'Failed to update settings. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <MessageCircle className="text-green-600" size={24} />
        <h2 className="text-xl font-semibold text-gray-900">WhatsApp Notifications</h2>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Receive instant notifications on WhatsApp when test results are ready and other important updates.
      </p>

      {/* Status Display */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Opt-In Status
            </p>
            <p className="text-sm font-semibold">
              {optIn ? (
                <span className="text-green-600">✓ Opted In</span>
              ) : (
                <span className="text-gray-500">Not Opted In</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Activation Status
            </p>
            <p className="text-sm font-semibold">
              {activated ? (
                <span className="text-green-600">✓ Activated</span>
              ) : (
                <span className="text-orange-500">⚠ Pending Activation</span>
              )}
            </p>
          </div>
        </div>
        {phoneNumber && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Phone Number
            </p>
            <p className="text-sm text-gray-700">{phoneNumber}</p>
          </div>
        )}
      </div>

      {/* Opt-In Toggle */}
      <div className="mb-6">
        <label className="flex items-center space-x-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={optIn}
              onChange={(e) => setOptIn(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`block w-14 h-8 rounded-full transition-colors ${
                optIn ? 'bg-green-600' : 'bg-gray-300'
              }`}
            ></div>
            <div
              className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                optIn ? 'transform translate-x-6' : ''
              }`}
            ></div>
          </div>
          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
            Enable WhatsApp notifications
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-2 ml-17">
          You can opt out anytime by replying STOP to any WhatsApp message or disabling this toggle.
        </p>
      </div>

      {/* Activation Section */}
      {optInSaved && !activated && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-2">
            ⚠️ One More Step Required
          </p>
          <p className="text-sm text-blue-700 mb-3">
            Click the button below to activate WhatsApp notifications. We'll send a test message to verify your phone number.
          </p>
          <button
            onClick={handleActivate}
            disabled={activating}
            className="inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending test message...
              </>
            ) : (
              '✅ Activate WhatsApp Updates'
            )}
          </button>
        </div>
      )}

      {/* Reminder to save if opt-in changed but not saved */}
      {optIn && !optInSaved && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-900 mb-1">
            💡 Don't forget to save!
          </p>
          <p className="text-sm text-yellow-700">
            Click "Save Changes" below to enable WhatsApp notifications before activating.
          </p>
        </div>
      )}

      {/* Success/Error Message */}
      {message.text && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs font-medium text-gray-700 mb-2">
          📋 How it works:
        </p>
        <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
          <li>Enable notifications using the toggle above and click "Save Changes"</li>
          <li>Click "Activate WhatsApp Updates" - we'll send a test message to your phone</li>
          <li>Check your WhatsApp for the activation message</li>
          <li>You're all set! Future notifications will be sent automatically</li>
        </ol>
        <p className="text-xs text-gray-500 mt-2">
          💡 Make sure your phone number is correct and registered on WhatsApp
        </p>
      </div>
    </div>
  );
};

export default WhatsAppSettings;
