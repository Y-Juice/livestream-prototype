import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../../css/Login.css';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Use effect to navigate after state is updated
  useEffect(() => {
    if (registerSuccess) {
      navigate('/', { replace: true });
    }
  }, [registerSuccess, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('Attempting to register with:', { email, username });
      
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password }),
        credentials: 'include',
      });

      // Log the response status
      console.log('Registration response status:', response.status);
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        throw new Error('Failed to parse server response');
      }

      console.log('Registration response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Registration successful
      console.log('Registration successful');
      
      // Store token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('username', data.user.username);
      
      // Set app state
      console.log('Redirecting to home page');
      
      // Force a window reload to ensure all states are refreshed
      window.location.href = '/';
      
      // Alternative approach using React Router
      // setRegisterSuccess(true);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2 className="login-title">
            Create your account
          </h2>
          <p className="login-subtitle">
            Already have an account?{' '}
            <Link to="/login">
              Sign in
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
            <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
              className="form-input"
              placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                minLength={6}
              className="form-input"
              placeholder="Enter your password (minimum 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
          </div>

            <button
              type="submit"
              disabled={isLoading}
            className="submit-btn"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default Register; 