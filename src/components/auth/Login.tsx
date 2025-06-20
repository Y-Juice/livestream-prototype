import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiCall } from '../../config/api';
import '../../css/Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess] = useState(false);
  const navigate = useNavigate();

  // Use effect to navigate after state is updated
  useEffect(() => {
    if (loginSuccess) {
      navigate('/', { replace: true });
    }
  }, [loginSuccess, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('Attempting to login with:', { email });
      
      const response = await apiCall('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      // Log the response status
      console.log('Login response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `Login failed with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Login response data:', data);

      // Login successful
      console.log('Login successful');
      
      // Store token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('username', data.user.username);
      
      // Set app state
      console.log('Redirecting to home page');
      
      // Force a window reload to ensure all states are refreshed
      window.location.href = '/';
      
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2 className="login-title">
            Sign in to your account
          </h2>
          <p className="login-subtitle">
            Or{' '}
            <Link to="/register">
              create a new account
            </Link>
          </p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
              className="form-input"
              placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
              className="form-input"
              placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
          </div>

            <button
              type="submit"
              disabled={isLoading}
            className="submit-btn"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default Login; 