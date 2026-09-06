import React, { useState } from 'react';
import Cookies from 'universal-cookie';
import axios from 'axios';
import { API_URL } from '../config';

const cookies = new Cookies();


const initialState = {
  fullName: '',
  username: '',
  password: '',
  confirmPassword: '',
  phoneNumber: '',
  avatarURL: '', 
}


const Auth = ({ setAuthToken }) => {
  const [form, setForm] = useState(initialState);
  const [isSignup, setIsSignup] = useState(true);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setError('');
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
  
    const { username, password, phoneNumber, avatarURL, confirmPassword } = form;
    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (isSignup && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const endpoint = isSignup ? 'signup' : 'login';
      const { data } = await axios.post(`${API_URL}/auth/${endpoint}`, {
        username: username.trim(),
        password,
        fullName: form.fullName ? form.fullName.trim() : undefined,
        phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
        avatarURL: avatarURL ? avatarURL.trim() : undefined,
      });

      const { token, userID, fullName, username: responseUsername, avatarURL: responseAvatar, phoneNumber: responsePhone } = data;
  
      cookies.set('token', token, { path: '/' });
      cookies.set('username', responseUsername || username, { path: '/' });
      cookies.set('fullName', fullName || username, { path: '/' });
      cookies.set('userID', userID, { path: '/' });
  
      if (responsePhone || phoneNumber) {
        cookies.set('phoneNumber', responsePhone || phoneNumber, { path: '/' });
      }
      if (responseAvatar || avatarURL) {
        cookies.set('avatarURL', responseAvatar || avatarURL, { path: '/' });
      }
  
      // Update auth state in App.jsx
      setAuthToken(token);
    } catch (err) {
      console.error('Auth error:', err);
      const message = err.response?.data?.message || 'Authentication failed. Please check your credentials and try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setError('');
    setIsSignup((previsSignup) => !previsSignup);
  };

  return (
    <div className="auth__form-container">
      {/* Left Hero Showcase */}
      <div className="auth__hero">
        <div>
          <div className="auth__hero-badge">
            <span>🚆</span>
            <span>NRC Rail Hub • Official Comms</span>
          </div>

          <h1 className="auth__hero-title">
            Connected Rail Operations for <span>Nigeria</span>.
          </h1>

          <p className="auth__hero-description">
            Secure, real-time messaging and operational dispatch for Nigerian Railway Corporation engineers, station managers, and field staff.
          </p>

          <div className="auth__hero-features">
            <div className="auth__hero-feature-item">
              <div className="auth__hero-feature-icon">⚡</div>
              <div>
                <strong>Instant Dispatch & Alerts</strong> — Direct line of communication across rail corridors.
              </div>
            </div>
            <div className="auth__hero-feature-item">
              <div className="auth__hero-feature-icon">🛡️</div>
              <div>
                <strong>End-to-End Enterprise Auth</strong> — Isolated station credentials and secure channel persistence.
              </div>
            </div>
            <div className="auth__hero-feature-item">
              <div className="auth__hero-feature-icon">📡</div>
              <div>
                <strong>Low-Bandwidth Optimized</strong> — Reliable across varying network conditions nationwide.
              </div>
            </div>
          </div>
        </div>

        <div className="auth__hero-footer">
          © {new Date().getFullYear()} Nigerian Railway Corporation. Rail Hub Operations Suite.
        </div>
      </div>

      {/* Right Form Card */}
      <div className="auth__form-container_fields">
        <div className="auth__form-container_fields-content">
          {/* Segmented Pill Mode Switch */}
          <div className="auth__mode-switch">
            <button
              type="button"
              className={`auth__mode-btn ${!isSignup ? 'active' : ''}`}
              onClick={() => { setError(''); setIsSignup(false); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth__mode-btn ${isSignup ? 'active' : ''}`}
              onClick={() => { setError(''); setIsSignup(true); }}
            >
              Create Account
            </button>
          </div>

          <div className="auth__form-header">
            <h2>{isSignup ? 'Register Officer Profile' : 'Welcome to Rail Hub'}</h2>
            <p>{isSignup ? 'Fill in your station details to join the network' : 'Enter your credentials to access operations'}</p>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #f87171',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13.5px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isSignup && (
              <div className='auth__form-container_fields-content_input'>
                <label htmlFor='fullName'>Full Name</label>
                <input
                  name='fullName'
                  type='text'
                  placeholder='e.g. David Okafor'
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className='auth__form-container_fields-content_input'>
              <label htmlFor='username'>Username / Station Handle</label>
              <input
                name='username'
                type='text'
                placeholder='e.g. david_station'
                onChange={handleChange}
                required
              />
            </div>

            {isSignup && (
              <div className='auth__form-container_fields-content_input'>
                <label htmlFor='phoneNumber'>Official Phone Number (Optional)</label>
                <input
                  name='phoneNumber'
                  type='text'
                  placeholder='+234...'
                  onChange={handleChange}
                />
              </div>
            )}

            {isSignup && (
              <div className='auth__form-container_fields-content_input'>
                <label htmlFor='avatarURL'>Avatar Image URL (Optional)</label>
                <input
                  name='avatarURL'
                  type='text'
                  placeholder='https://...'
                  onChange={handleChange}
                />
              </div>
            )}

            <div className='auth__form-container_fields-content_input'>
              <label htmlFor='password'>Password</label>
              <input
                name='password'
                type='password'
                placeholder='••••••••'
                onChange={handleChange}
                required
              />
            </div>

            {isSignup && (
              <div className='auth__form-container_fields-content_input'>
                <label htmlFor='confirmPassword'>Confirm Password</label>
                <input
                  name='confirmPassword'
                  type='password'
                  placeholder='••••••••'
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className='auth__form-container_fields-content_button'>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                    <span>{isSignup ? 'Registering...' : 'Signing In...'}</span>
                  </>
                ) : (
                  <span>{isSignup ? 'Create Station Account' : 'Sign In to Hub'}</span>
                )}
              </button>
            </div>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              {isSignup ? 'Already have an account?' : "Need a station account?"}{' '}
              <button
                type="button"
                onClick={switchMode}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--nrc-green-700)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  textDecoration: 'underline'
                }}
              >
                {isSignup ? 'Sign in here' : 'Register now'}
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth
