import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bgImage from '../../assets/landingpage-images/bg_001.webp';  // Background image';
import { adminLogin } from '../../utils/api';  // Import the login function
import { Button } from '../../components/ui/button.jsx';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await adminLogin(email, password);

      if (response.error) {
        setError(response.error);
      } else if (response.token) {
        // Save token in localStorage or context
        localStorage.setItem('adminToken', response.token);

        // Redirect to dashboard
        navigate('/admin/dashboard');
      } else {
        setError('Invalid credentials, please try again');
      }
    } catch (err) {
      setError('Something went wrong, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Back Button */}
      <Button
        onClick={() => navigate('/auth')}
        size="sm"
        variant="outline"
        className="self-start ml-4 mt-4 md:top-4 md:left-4 z-20"
      >
        Back
      </Button>

      {/* Auth Card */}
      <div className="flex flex-1 items-center justify-center relative z-10">
        <div className="card-auth-default">
          <p className="body-smallmuted italic text-center">
            "Leadership is not about being in charge. It is about taking care of those in your charge."
          </p>

          {error && <p className="text-red-500 text-center">{error}</p>}

          <form className="w-full flex flex-col space-y-4" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-text w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-text w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
