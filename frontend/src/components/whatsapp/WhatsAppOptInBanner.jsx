import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/api';

/**
 * WhatsAppOptInBanner - Dashboard banner for users who haven't opted in or activated WhatsApp
 * Shows once per session, can be dismissed, and allows opt-in + activation
 */
const WhatsAppOptInBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isOptedIn, setIsOptedIn] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [activationLink, setActivationLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [optingIn, setOptingIn] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem('whatsapp_banner_dismissed');
    if (dismissed) {
      setLoading(false);
      return;
    }

    // Fetch WhatsApp status from backend
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/whatsapp/status/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const { opt_in, activated, show_banner, activation_link } = response.data;
        
        setIsOptedIn(opt_in === true);
        setIsActivated(activated === true);
        setActivationLink(activation_link || '');
        setShowBanner(show_banner === true);
      } catch (error) {
        console.error('Error fetching WhatsApp status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const handleOptIn = async () => {
    setOptingIn(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/whatsapp/opt-in/`,
        {
          opt_in: true,
          consent_text: 'I agree to receive important notifications and updates on WhatsApp.',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setIsOptedIn(true);
      setActivationLink(response.data.activation_link || '');
    } catch (error) {
      console.error('Error updating WhatsApp opt-in:', error);
      alert('Failed to update preferences. Please try again.');
    } finally {
      setOptingIn(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('whatsapp_banner_dismissed', 'true');
  };

  if (loading || !showBanner) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-500 rounded-lg shadow-md p-4 mb-6 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Dismiss banner"
      >
        <X size={20} />
      </button>

      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <svg
            className="h-8 w-8 text-green-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            📱 Get Instant Test Completion Alerts on WhatsApp
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            {!isOptedIn
              ? 'Receive real-time notifications when test results are ready. Stay informed without checking the dashboard constantly!'
              : 'You\'re almost there! Click "Enable WhatsApp Updates" below to activate instant notifications.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            {!isOptedIn ? (
              <>
                <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleOptIn();
                      }
                    }}
                    disabled={optingIn}
                  />
                  <span>I agree to receive notifications on WhatsApp</span>
                </label>
                {optingIn && (
                  <span className="text-sm text-gray-500">Saving...</span>
                )}
              </>
            ) : (
              <>
                {activationLink && !isActivated && (
                  <a
                    href={activationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    ✅ Enable WhatsApp Updates
                  </a>
                )}
                <button
                  onClick={handleDismiss}
                  className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  {isActivated ? 'Dismiss' : 'Maybe Later'}
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-2">
            You can change this preference anytime from your profile settings. Reply STOP to opt out.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppOptInBanner;
