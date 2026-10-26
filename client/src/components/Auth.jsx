import React, { useMemo, useState } from 'react';

import { errorMessage } from '../lib/api';
import { passwordLabel, passwordScore } from '../lib/format';
import { AlertIcon, BoltIcon, ShieldIcon, TrainIcon } from './ui/icons';
import PasswordField from './ui/PasswordField';
import StationClock from './ui/StationClock';

const EMPTY = {
  fullName: '',
  username: '',
  password: '',
  confirmPassword: '',
  phoneNumber: '',
  avatarURL: '',
};

const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/;

/** Client-side checks that mirror the server's rules, so most mistakes are caught before a round trip. */
const validate = (form, isSignup) => {
  const errors = {};

  const username = form.username.trim();
  if (!username) {
    errors.username = 'Enter your station handle.';
  } else if (isSignup && !USERNAME_PATTERN.test(username)) {
    errors.username = '3-32 characters: letters, numbers, dots, dashes or underscores.';
  }

  if (!form.password) {
    errors.password = 'Enter your password.';
  } else if (isSignup) {
    if (form.password.length < 8) {
      errors.password = 'Use at least 8 characters.';
    } else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      errors.password = 'Include at least one letter and one number.';
    }
  }

  if (isSignup && form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (isSignup && form.phoneNumber.trim() && !/^\+?[0-9]{7,15}$/.test(form.phoneNumber.trim())) {
    errors.phoneNumber = 'Use 7-15 digits, optionally starting with +.';
  }

  if (isSignup && form.avatarURL.trim() && !/^https:\/\/\S+$/i.test(form.avatarURL.trim())) {
    errors.avatarURL = 'Avatar must be a valid https:// URL.';
  }

  return errors;
};

const Auth = ({ signIn, signUp }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const score = useMemo(() => passwordScore(form.password), [form.password]);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
    setServerError('');
  };

  const switchMode = (nextIsSignup) => {
    setErrors({});
    setServerError('');
    setIsSignup(nextIsSignup);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');

    const nextErrors = validate(form, isSignup);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstField = Object.keys(nextErrors)[0];
      document.getElementById(`auth-${firstField}`)?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignup) {
        await signUp({
          username: form.username.trim(),
          password: form.password,
          fullName: form.fullName.trim() || undefined,
          phoneNumber: form.phoneNumber.trim() || undefined,
          avatarURL: form.avatarURL.trim() || undefined,
        });
      } else {
        await signIn({ username: form.username.trim(), password: form.password });
      }
    } catch (error) {
      setServerError(errorMessage(error, 'Unable to sign you in. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (name) =>
    errors[name] ? (
      <span className="auth__field-error" id={`auth-${name}-error`} role="alert">
        {errors[name]}
      </span>
    ) : null;

  return (
    <div className="auth">
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="auth__hero" aria-label="About Rail Hub">
        <div className="auth__hero-top">
          <div className="auth__brand">
            <span className="auth__brand-mark">
              <TrainIcon size={24} />
            </span>
            <span className="auth__brand-text">
              <span className="auth__brand-name">Rail Hub</span>
              <span className="auth__brand-caption">NRC Operations</span>
            </span>
          </div>

          <span className="auth__hero-badge">
            <span className="auth__hero-badge-dot" aria-hidden="true" />
            Nigeria Railway Corporation
          </span>

          <p className="auth__hero-kicker">Operations control suite</p>

          <h1 className="auth__hero-title">
            Connected rail operations for <span>Nigeria</span>.
          </h1>

          <p className="auth__hero-description">
            Real-time dispatch, station coordination and secure messaging for engineers, station
            managers and field staff across every corridor.
          </p>

          <ul className="auth__hero-features">
            <li className="auth__hero-feature-item">
              <span className="auth__hero-feature-icon">
                <BoltIcon size={16} />
              </span>
              <span className="auth__hero-feature-text">
                <strong>Instant dispatch &amp; alerts</strong>
                <span>A direct line across rail corridors, in real time.</span>
              </span>
            </li>

            <li className="auth__hero-feature-item">
              <span className="auth__hero-feature-icon">
                <ShieldIcon size={16} />
              </span>
              <span className="auth__hero-feature-text">
                <strong>Enterprise-grade authentication</strong>
                <span>Isolated station credentials with hardened sessions.</span>
              </span>
            </li>

            <li className="auth__hero-feature-item">
              <span className="auth__hero-feature-icon">
                <TrainIcon size={16} />
              </span>
              <span className="auth__hero-feature-text">
                <strong>Built for low bandwidth</strong>
                <span>Reliable on the network conditions our crews actually meet.</span>
              </span>
            </li>
          </ul>
        </div>

        <footer className="auth__hero-footer">
          <span>© {new Date().getFullYear()} Nigerian Railway Corporation</span>
          <StationClock className="auth__hero-clock" />
        </footer>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Form                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="auth__form-container_fields" aria-label="Sign in or create an account">
        <div className="auth__form-container_fields-content">
          <div className="auth__mode-switch" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={!isSignup}
              className={`auth__mode-btn ${!isSignup ? 'active' : ''}`}
              onClick={() => switchMode(false)}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignup}
              className={`auth__mode-btn ${isSignup ? 'active' : ''}`}
              onClick={() => switchMode(true)}
            >
              Create Account
            </button>
          </div>

          <div className="auth__form-header">
            <h2>{isSignup ? 'Register officer profile' : 'Welcome back'}</h2>
            <p>
              {isSignup
                ? 'Set up your station identity to join the network.'
                : 'Enter your credentials to access operations.'}
            </p>
          </div>

          {serverError && (
            <div className="alert alert--error" role="alert" style={{ marginBottom: 16 }}>
              <span className="alert__icon">
                <AlertIcon size={16} />
              </span>
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {isSignup && (
              <div className="auth__field">
                <label className="auth__field-label" htmlFor="auth-fullName">
                  <span>Full name</span>
                  <span className="auth__field-optional">Optional</span>
                </label>
                <input
                  className="input"
                  id="auth-fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. David Okafor"
                  value={form.fullName}
                  onChange={update}
                  maxLength={100}
                />
              </div>
            )}

            <div className="auth__field">
              <label className="auth__field-label" htmlFor="auth-username">
                <span>Station handle</span>
              </label>
              <input
                className="input"
                id="auth-username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                placeholder="e.g. david_station"
                value={form.username}
                onChange={update}
                aria-invalid={Boolean(errors.username) || undefined}
                aria-describedby={errors.username ? 'auth-username-error' : undefined}
                maxLength={32}
                required
              />
              {fieldError('username')}
            </div>

            {isSignup && (
              <div className="auth__field">
                <label className="auth__field-label" htmlFor="auth-phoneNumber">
                  <span>Phone number</span>
                  <span className="auth__field-optional">Optional</span>
                </label>
                <input
                  className="input"
                  id="auth-phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+234 800 000 0000"
                  value={form.phoneNumber}
                  onChange={update}
                  aria-invalid={Boolean(errors.phoneNumber) || undefined}
                  aria-describedby={errors.phoneNumber ? 'auth-phoneNumber-error' : undefined}
                />
                {fieldError('phoneNumber')}
              </div>
            )}

            {isSignup && (
              <div className="auth__field">
                <label className="auth__field-label" htmlFor="auth-avatarURL">
                  <span>Avatar URL</span>
                  <span className="auth__field-optional">Optional</span>
                </label>
                <input
                  className="input"
                  id="auth-avatarURL"
                  name="avatarURL"
                  type="url"
                  autoComplete="photo"
                  placeholder="https://…"
                  value={form.avatarURL}
                  onChange={update}
                  aria-invalid={Boolean(errors.avatarURL) || undefined}
                  aria-describedby={errors.avatarURL ? 'auth-avatarURL-error' : undefined}
                />
                {fieldError('avatarURL')}
              </div>
            )}

            <div className="auth__field">
              <label className="auth__field-label" htmlFor="auth-password">
                <span>Password</span>
                {isSignup && <span className="auth__field-optional">8+ chars</span>}
              </label>

              <PasswordField
                id="auth-password"
                name="password"
                value={form.password}
                onChange={update}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                invalid={Boolean(errors.password)}
                describedBy={errors.password ? 'auth-password-error' : undefined}
                required
              />

              {isSignup && form.password ? (
                <>
                  <div className="strength" aria-hidden="true">
                    {[1, 2, 3, 4].map((segment) => {
                      const tier =
                        score >= 4 ? 'strong' : score === 3 ? 'good' : score === 2 ? 'fair' : 'weak';
                      return (
                        <span
                          key={segment}
                          className={`strength__segment ${
                            segment <= score ? `strength__segment--${tier}` : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                  <span className="strength__label" aria-live="polite">
                    Password strength: {passwordLabel(score)}
                  </span>
                </>
              ) : null}

              {fieldError('password')}
            </div>

            {isSignup && (
              <div className="auth__field">
                <label className="auth__field-label" htmlFor="auth-confirmPassword">
                  <span>Confirm password</span>
                </label>
                <PasswordField
                  id="auth-confirmPassword"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={update}
                  autoComplete="new-password"
                  invalid={Boolean(errors.confirmPassword)}
                  describedBy={errors.confirmPassword ? 'auth-confirmPassword-error' : undefined}
                  required
                />
                {fieldError('confirmPassword')}
              </div>
            )}

            <div className="auth__submit-row">
              <button type="submit" className="auth__submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="btn__spinner" aria-hidden="true" />
                    <span>{isSignup ? 'Registering…' : 'Signing in…'}</span>
                  </>
                ) : (
                  <span>{isSignup ? 'Create station account' : 'Sign in to Rail Hub'}</span>
                )}
              </button>
            </div>
          </form>

          <p className="auth__meta">
            {isSignup ? 'Already have an account?' : 'Need a station account?'}{' '}
            <button
              type="button"
              className="auth__meta-link"
              onClick={() => switchMode(!isSignup)}
            >
              {isSignup ? 'Sign in instead' : 'Register now'}
            </button>
          </p>

          <p className="auth__legal">
            Access is restricted to authorised NRC personnel. Activity may be audited.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Auth;
