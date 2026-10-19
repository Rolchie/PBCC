
import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

const REMEMBER_EMAIL_KEY = 'pbcc-remembered-email';

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2H4Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1Zm3 0h4V7a2 2 0 0 0-4 0v3Zm2 4a2 2 0 0 0-1 3.73V19h2v-1.27A2 2 0 0 0 12 14Z" />
    </svg>
  );
}

function EyeIcon({ visible }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {visible ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-3.2 4" />
          <path d="M6.4 6.4C3.5 8.3 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.7-1.2" />
          <path d="M10 10a3 3 0 0 0 4 4" />
        </>
      )}
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9v-2.9h2.5V9.9c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.8h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1.5 2L12 12.5 19.5 7h-15Zm15.5 2.2-7.4 5.4a1 1 0 0 1-1.2 0L4 9.2V17h16V9.2Z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.6 2.5a2 2 0 0 0-2.1.5L3 4.5a3 3 0 0 0-.8 2.7c1.5 7.5 7.1 13.1 14.6 14.6a3 3 0 0 0 2.7-.8l1.5-1.5a2 2 0 0 0 .5-2.1l-1-3a2 2 0 0 0-2.2-1.3l-2.8.5a14 14 0 0 1-5.1-5.1l.5-2.8a2 2 0 0 0-1.3-2.2l-3-1Z" />
    </svg>
  );
}

function getRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

export default function Login() {
  const [email, setEmail] = useState(getRememberedEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(
    () => Boolean(getRememberedEmail())
  );

  function handleRememberMeChange(event) {
    const checked = event.target.checked;

    setRememberMe(checked);

    if (!checked) {
      try {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      } catch {
        // Browser storage may be unavailable.
      }
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email address and password.');
      return;
    }

    try {
      if (rememberMe) {
        localStorage.setItem(
          REMEMBER_EMAIL_KEY,
          email.trim()
        );
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {
      // Continue if browser storage is unavailable.
    }

    // Your current login authentication is not connected.
    // This must be replaced with your existing backend login.
    setError(
      'Login authentication is not connected yet. The existing AuthContext login function needs to be restored.'
    );
  }

  return (
    <div className="login-page">
      <main className="login-main">
        <div className="login-card">

          <div className="login-card-header">
            <img
              src="/pbcc-logo.png"
              alt="PBCC Official Seal"
              className="login-logo"
            />

            <h1>Sign in to continue</h1>
          </div>

          <form
            className="login-form"
            onSubmit={handleSubmit}
            noValidate
          >

            {/* EMAIL ADDRESS */}
            <div className="login-form-group">
              <label
                htmlFor="login-email"
                className="login-field-label"
              >
                Email Address
              </label>

              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <UserIcon />
                </span>

                <input
                  id="login-email"
                  name="email"
                  type="email"
                  className="login-input"
                  placeholder="e.g., student@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError('');
                  }}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="login-form-group">
              <label
                htmlFor="login-password"
                className="login-field-label"
              >
                Password
              </label>

              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <LockIcon />
                </span>

                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input login-password-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError('');
                  }}
                  autoComplete="current-password"
                  required
                />

                {/* SHOW / HIDE PASSWORD BUTTON */}
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => {
                    setShowPassword((previous) => !previous);
                  }}
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  aria-pressed={showPassword}
                  title={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            {/* REMEMBER ME */}
            <div className="login-remember-row">
              <label
                htmlFor="login-remember-me"
                className="login-remember-label"
              >
                <input
                  id="login-remember-me"
                  name="rememberMe"
                  type="checkbox"
                  className="login-remember-checkbox"
                  checked={rememberMe}
                  onChange={handleRememberMeChange}
                />

                <span>Remember Me</span>
              </label>
            </div>

            {error && (
              <div
                id="login-error"
                className="login-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-submit-button"
            >
              Login
            </button>

          </form>

          <div className="login-card-bottom">
            <p>
              Authorized PBCC accounts only.
            </p>

            <Link
              to="/"
              className="login-back-link"
            >
              ← Back to Public Page
            </Link>
          </div>

        </div>
      </main>

      <footer className="login-footer">
        <div className="login-footer-inner">

          <div
            className="login-footer-icons"
            aria-hidden="true"
          >
            <FacebookIcon />
            <MailIcon />
            <PhoneIcon />
          </div>

          <p>
            Copyright © {new Date().getFullYear()}.
            Pangantucan Bukidnon Community College.
            All Rights Reserved.
          </p>

        </div>
      </footer>
    </div>
  );
}
