import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { motion } from 'framer-motion';
import { UserCheck, ArrowLeft } from 'lucide-react';

import bgImage from '../../assets/landingpage-images/bg_001.webp';
import educatorSignupImg from '../../assets/auth images/educatorlogin.svg';
import { API_BASE_URL } from '../../utils/api';
import { Button } from '../../components/ui/button.jsx';

const EducatorSignup = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [educatorEmail, setEducatorEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentCSV, setStudentCSV] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(true); // Default checked
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activationLink, setActivationLink] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const cardVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95, transition: { duration: 0.1 } }
  };

  useEffect(() => {
    document.title = "Educator Signup | Learning Platform";

    const token = localStorage.getItem('token');
    const csvStatus = localStorage.getItem('csv_status');
    const storedEmail = localStorage.getItem('educator_email');

    if (storedEmail) {
      setEducatorEmail(storedEmail);
    }

    setIsAuthorized(csvStatus === 'pending');


    if (token) {
      switch (csvStatus) {
        case 'pending':
          setIsAuthorized(true);
          break;
        case 'started':
          navigate('/wait');
          break;
        case 'completed':
          navigate('/educator/dashboard');
          break;
        case 'failed':
          navigate('/csverror');
          break;
        default:
          navigate('/unauthorized');
      }
    } else {
      navigate('/unauthorized');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('name', fullName);
    formData.append('dob', dob);
    formData.append('institution', institutionName);
    formData.append('email', educatorEmail);
    formData.append('password', password);
    formData.append('phone_number', phoneNumber);
    formData.append('whatsapp_opt_in', whatsappOptIn);
    formData.append('whatsapp_consent_text', 'I agree to receive important notifications and updates on WhatsApp.');
    formData.append('whatsapp_consent_ip', window.location.hostname); // Simple IP placeholder

    if (studentCSV) {
      formData.append('file', studentCSV);
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/educator/register/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('first_time_login', 'false');

      // Show success modal with WhatsApp activation link if opted in
      if (whatsappOptIn && phoneNumber) {
        const whatsappPhone = process.env.REACT_APP_WHATSAPP_BUSINESS_PHONE || '917984113438';
        const link = `https://wa.me/${whatsappPhone}?text=Start%20WhatsApp%20updates%20for%20educator%20account`;
        setActivationLink(link);
        setShowSuccessModal(true);
      } else {
        navigate('/wait');
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    navigate('/wait');
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-red-500 text-xl">🚫 Unauthorized Access! Redirecting...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover' }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-30 z-0"></div>

      {/* Login Card */}
      <div className="flex flex-1 items-center justify-center relative z-10 py-12 px-4">
        <motion.div
          className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100 backdrop-blur-sm bg-opacity-95 p-8"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.button
            onClick={() => navigate('/auth/Educator/login')}
            className="absolute top-4 left-4 h-9 w-9 rounded-full bg-white/90 text-gray-700 shadow hover:bg-white"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </motion.button>

          <div className="pt-6 space-y-4">
            <div className="flex items-center justify-center mb-4">
              <UserCheck size={32} className="text-primary mr-2" />
              <h2 className="text-2xl font-bold text-center text-gray-800">Educator Signup</h2>
            </div>

            <p className="text-center p-2 text-gray-700 italic">
              Join us, esteemed educator! Create your account and start inspiring minds.
            </p>

            <div className="w-4/5 mx-auto flex justify-center items-center p-4">
              <motion.img
                src={educatorSignupImg}
                alt="Educator Signup"
                className="w-full object-contain"
              />
            </div>

            {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}

            <form className="w-full flex flex-col space-y-4 mt-4" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                value={educatorEmail}
                onChange={(e) => setEducatorEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                readOnly
              />
              <input
                type="date"
                placeholder="Date of Birth"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <input
                type="text"
                placeholder="Institution Name"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <input
                type="tel"
                placeholder="Phone Number (with country code, e.g., +919876543210)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-700">
                  Upload Student Details (CSV)
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setStudentCSV(e.target.files[0])}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white"
                />
                {studentCSV && (
                  <p className="mt-1 text-sm text-gray-600">📄 {studentCSV.name}</p>
                )}
              </div>
              
              {/* WhatsApp Opt-in Checkbox */}
              <div className="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <input
                  type="checkbox"
                  id="whatsapp-opt-in"
                  checked={whatsappOptIn}
                  onChange={(e) => setWhatsappOptIn(e.target.checked)}
                  className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="whatsapp-opt-in" className="text-sm text-gray-700">
                  📱 I agree to receive important notifications and updates on WhatsApp.
                  <span className="block text-xs text-gray-500 mt-1">You can opt out anytime by replying STOP.</span>
                </label>
              </div>
              
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Signing Up...' : 'Sign Up'}
                </Button>
              </motion.div>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 w-full p-2 text-center text-white bg-black bg-opacity-40 text-xs z-10">
        © 2025 Learning Platform. All rights reserved.
      </div>

      {/* WhatsApp Activation Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h3>
              <p className="text-gray-600 mb-6">
                One more step to receive WhatsApp notifications
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-gray-700 mb-3">
                  <strong>Enable WhatsApp Updates:</strong>
                </p>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Click the button below to open WhatsApp</li>
                  <li>Tap "Send" once to activate notifications</li>
                  <li>You're all set! 🎉</li>
                </ol>
              </div>

              <div className="space-y-3">
                <a
                  href={activationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  ✅ Enable WhatsApp Updates
                </a>
                <button
                  onClick={handleCloseModal}
                  className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Skip for Now
                </button>
              </div>
              
              <p className="text-xs text-gray-500 mt-4">
                You can enable this later from your profile settings
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default EducatorSignup;
