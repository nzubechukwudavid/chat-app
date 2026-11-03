import React, { useEffect, useMemo, useState } from 'react';

import { errorMessage, resetPassword } from '../lib/api';
import { passwordLabel, passwordScore } from '../lib/format';
import { AlertIcon, TrainIcon } from './ui/icons';
import PasswordField from './ui/PasswordField';

const EMPTY = { password: '', confirmPassword: '' };

const validate = (form) => {
  const errors = {};

  if (!form.password) {
    errors.password = 'Choose a new password.';
  } else if (form.password.length < 8) {
    errors.password = 'Use at least 8 characters.';
  } else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
    errors.password = 'Include at least one letter and one number.';
  }

  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
};

/**
 * The screen a recovery email points at.
 *
 * The token is read once from the query string and immediately removed from
 * the address bar, so it does not linger in browser history, screenshots or
 * copied URLs. It is only sent to the server when the form is submitted, which
 * keeps link-prefetching mail scanners from consuming it.
 */
const ResetPassword = () => {
  const [token] = useState(
    () => new URLSearchParams(window.location.search).get('token') || '',
  );
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const score = useMemo(() => passwordScore(form.password), [form.password]);

  useEffect(() => {
    if (!token) return;
    window.history.replaceState({}, '', '/reset-password');
  }, [token]);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
    setServerError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');

    const nextErrors = validate(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      document
        .getElementById(`reset-${Object.keys(nextErrors)[0]}`)
        ?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPassword({ token, newPassword: form.password });
      if (result.ok) {
        setIsDone(true);
      } else {
        setServerError(result.error);
      }
    } catch (error) {
      setServerError(errorMessage(error, 'We could not reset your password. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (name) =>
    errors[name] ? (
      <span className="auth__field-error" id={`reset-${name}-error`} role="alert">
        {errors[name]}
      </span>
    ) : null;

  return (
    <main className="auth auth--reset">
      <section className="auth__form-container_fields" aria-label="Reset your password">
        <div className="auth__form-container_fields-content auth__reset-card">
          <div className="auth__brand auth__brand--reset">
            <span className="auth__brand-mark">
              <TrainIcon size={24} />
            </span>
            <span className="auth__brand-text">
              <span className="auth__brand-name">Rail Hub</span>
              <span className="auth__brand-caption">NRC Operations</span>
            </span>
          </div>

          {isDone ? (
            <>
              <div className="auth__form-header">
                <h2>Password updated</h2>
                <p>Sign in with your new password. Every older session has been signed out.</p>
              </div>
              <div className="auth__notice" role="status">
                Your reset link has been used and can no longer be reused.
              </div>
              <a className="auth__submit auth__submit--link" href="/">
                Go to sign in
              </a>
            </>
          ) : !token ? (
            <>
              <div className="auth__form-header">
                <h2>Link not valid</h2>
                <p>This reset link is invalid or has expired.</p>
              </div>
              <div className="alert alert--error" role="alert">
                <span className="alert__icon">
                  <AlertIcon size={16} />
                </span>
                <span>
                  Request a new link from the sign-in screen. Links expire after 30 minutes and
                  work once.
                </span>
              </div>
              <a className="auth__submit auth__submit--link" href="/">
                Back to sign in
              </a>
            </>
          ) : (
            <>
              <div className="auth__form-header">
                <h2>Choose a new password</h2>
                <p>Use at least 8 characters, including a letter and a number.</p>
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
                <div className="auth__field">
                  <label className="auth__field-label" htmlFor="reset-password">
                    <span>New password</span>
                    <span className="auth__field-optional">8+ chars</span>
                  </label>
                  <PasswordField
                    id="reset-password"
                    name="password"
                    value={form.password}
                    onChange={update}
                    autoComplete="new-password"
                    invalid={Boolean(errors.password)}
                    describedBy={errors.password ? 'reset-password-error' : undefined}
                    required
                  />

                  {form.password ? (
                    <>
                      <div className="strength" aria-hidden="true">
                        {[1, 2, 3, 4].map((segment) => {
                          const tier =
                            score >= 4
                              ? 'strong'
                              : score === 3
                                ? 'good'
                                : score === 2
                                  ? 'fair'
                                  : 'weak';
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

                <div className="auth__field">
                  <label className="auth__field-label" htmlFor="reset-confirmPassword">
                    <span>Confirm new password</span>
                  </label>
                  <PasswordField
                    id="reset-confirmPassword"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={update}
                    autoComplete="new-password"
                    invalid={Boolean(errors.confirmPassword)}
                    describedBy={
                      errors.confirmPassword ? 'reset-confirmPassword-error' : undefined
                    }
                    required
                  />
                  {fieldError('confirmPassword')}
                </div>

                <div className="auth__submit-row">
                  <button type="submit" className="auth__submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="btn__spinner" aria-hidden="true" />
                        <span>Updating…</span>
                      </>
                    ) : (
                      <span>Set new password</span>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {!isDone && (
            <p className="auth__meta">
              <a className="auth__meta-link" href="/">
                Back to sign in
              </a>
            </p>
          )}
        </div>
      </section>
    </main>
  );
};

export default ResetPassword;
