import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { motion } from 'framer-motion';
import { ChalkboardTeacher, ArrowLeft } from '@phosphor-icons/react';

import bgImage from '../../assets/landingpage images/bg_001.webp';
import educatorSignupImg from '../../assets/auth images/educatorlogin.svg';
import { API_BASE_URL } from '../../utils/api';

const EducatorSignup = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [educatorEmail, setEducatorEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentCSV, setStudentCSV] = useState(null);
  const [separateBiology, setSeparateBiology] = useState(false);
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
    formData.append('separate_biology_subjects', separateBiology);

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

      navigate('/wait');
    } catch (error) {
      setErrorMessage(error.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
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
          className="card relative bg-base-100 shadow-xl w-full max-w-md backdrop-blur-sm bg-opacity-95 p-8"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.button
            onClick={() => navigate('/auth/Educator/login')}
            className="absolute top-4 left-4 btn btn-sm btn-base-100 btn-circle text-white"
            aria-label="Go back"
          >
            <ArrowLeft size={18} weight="bold" />
          </motion.button>

          <div className="card-body pt-6">
            <div className="flex items-center justify-center mb-4">
              <ChalkboardTeacher weight="duotone" size={32} className="text-primary mr-2" />
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
                className="input input-bordered w-full"
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                value={educatorEmail}
                onChange={(e) => setEducatorEmail(e.target.value)}
                className="input input-bordered w-full"
                readOnly
              />
              <input
                type="date"
                placeholder="Date of Birth"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="input input-bordered w-full"
                required
              />
              <input
                type="text"
                placeholder="Institution Name"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="input input-bordered w-full"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-bordered w-full"
                required
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input input-bordered w-full"
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
                  className="file-input file-input-bordered w-full"
                />
                {studentCSV && (
                  <p className="mt-1 text-sm text-gray-600">📄 {studentCSV.name}</p>
                )}
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Split Biology into Botany and Zoology?</span> 
                  <input type="checkbox" checked={separateBiology} onChange={(e) => setSeparateBiology(e.target.checked)} className="checkbox checkbox-primary" />
                </label>
              </div>
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <button
                  type="submit"
                  className="btn btn-outline btn-primary btn-wide w-full"
                  disabled={loading}
                >
                  {loading ? 'Signing Up...' : 'Sign Up'}
                </button>
              </motion.div>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 w-full p-2 text-center text-white bg-black bg-opacity-40 text-xs z-10">
        © 2025 Learning Platform. All rights reserved.
      </div>
    </div>
  );
};

export default EducatorSignup;
