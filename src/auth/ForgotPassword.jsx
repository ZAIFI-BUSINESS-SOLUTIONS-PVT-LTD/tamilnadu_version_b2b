import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../utils/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const preRole = params.get('role') || '';

  const [email, setEmail] = useState('');
  const [role] = useState(preRole);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Forgot Password';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const res = await forgotPassword(email);
    setLoading(false);
    if (res && res.detail) {
      setStatus({ ok: true, message: res.detail });
    } else if (res && res.error) {
      setStatus({ ok: false, message: res.error });
    } else {
      setStatus({ ok: true, message: 'If that account exists, reset instructions have been sent.' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-2">Forgot Password</h2>
        <p className="text-sm text-gray-500 mb-4">Enter the email associated with your account. We'll send reset instructions.</p>

        {status && (
          <div className={`mb-4 p-3 rounded ${status.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {status.message}
          </div>
        )}

        {!status?.ok && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border rounded p-2 text-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset email'}
              </button>
              <button type="button" className="text-sm text-gray-600 underline" onClick={() => navigate(-1)}>Back</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
