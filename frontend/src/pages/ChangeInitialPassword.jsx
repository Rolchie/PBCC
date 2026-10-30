import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import './Login.css';

export default function ChangeInitialPassword() {
  const navigate = useNavigate();
  const {
    changeInitialPassword,
    logout,
  } = useAuth();

  const [currentPassword, setCurrentPassword] =
    useState('');

  const [newPassword, setNewPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPasswords, setShowPasswords] =
    useState(false);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] =
    useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setError('Please complete all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setError(
        'Your new password must contain at least 8 characters.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (
      newPassword === currentPassword ||
      newPassword === 'ChangeMe1!'
    ) {
      setError(
        'Please choose a password different from the initial password.'
      );
      return;
    }

    setSubmitting(true);

    try {
      await changeInitialPassword(
        currentPassword,
        newPassword,
        confirmPassword
      );

      navigate('/login', {
        replace: true,
        state: {
          passwordChanged: true,
        },
      });
    } catch (err) {
      setError(
        err?.message ||
          'Unable to change your password. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
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

            <h1>Change Your Initial Password</h1>
          </div>

          <form
            className="login-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <p
              style={{
                textAlign: 'center',
                lineHeight: 1.6,
                margin: '0 0 16px',
              }}
            >
              For your account's security, you must
              create a new password before accessing
              the PBCC system.
            </p>

            <div className="login-form-group">
              <label
                htmlFor="current-password"
                className="login-field-label"
              >
                Current Password
              </label>

              <div className="login-input-wrapper">
                <input
                  id="current-password"
                  className="login-input"
                  type={
                    showPasswords ? 'text' : 'password'
                  }
                  value={currentPassword}
                  onChange={(event) =>
                    setCurrentPassword(event.target.value)
                  }
                  placeholder="Enter initial password"
                  autoComplete="current-password"
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <div className="login-form-group">
              <label
                htmlFor="new-password"
                className="login-field-label"
              >
                New Password
              </label>

              <div className="login-input-wrapper">
                <input
                  id="new-password"
                  className="login-input"
                  type={
                    showPasswords ? 'text' : 'password'
                  }
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  disabled={submitting}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div className="login-form-group">
              <label
                htmlFor="confirm-password"
                className="login-field-label"
              >
                Confirm New Password
              </label>

              <div className="login-input-wrapper">
                <input
                  id="confirm-password"
                  className="login-input"
                  type={
                    showPasswords ? 'text' : 'password'
                  }
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <label
              className="login-remember-label"
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(event) =>
                  setShowPasswords(event.target.checked)
                }
                disabled={submitting}
              />
              Show passwords
            </label>

            {error && (
              <div
                className="login-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-submit-button"
              disabled={submitting}
            >
              {submitting
                ? 'Changing Password...'
                : 'Change Password'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '12px',
                background: 'transparent',
                border: '1px solid #102a4c',
                borderRadius: '8px',
                color: '#102a4c',
                cursor: submitting
                  ? 'not-allowed'
                  : 'pointer',
              }}
            >
              Log Out
            </button>
          </form>

          <div className="login-card-bottom">
            <p>
              Pangantucan Bukidnon Community College
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}