import React from 'react';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100">
      <h1 className="text-red-500 text-3xl font-bold">🚫 Unauthorized Access!</h1>
      <p className="text-lg text-gray-700 mt-2">You do not have permission to access this page.</p>
      <button
        onClick={() => navigate('/')}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded shadow-md hover:bg-blue-600"
      >
        Go to Home
      </button>
    </div>
  );
};

export default Unauthorized;
