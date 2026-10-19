import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getRoleHome } from '../utils/roles';
import './Login.css';

function Login() {
  const { login, isAuthenticated, role, loading: sessionLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already logged in (e.g. typed /login manually) — send straight
  // to the dashboard instead of showing the form again.
  if (!sessionLoading && isAuthenticated) {
    const redirectTo = location.state?.from?.pathname ?? getRoleHome(role);
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const loggedInUser = await login(email, password);
      const redirectTo =
        location.state?.from?.pathname ?? getRoleHome(loggedInUser.role);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Placeholder seal — swap for the real PBCC logo image asset
            when available (see the TODO in Login.css). */}
        <div className="login-seal">PBCC</div>

        <h1 className="login-title">Sign in to continue</h1>

        <form onSubmit={handleSubmit} noValidate>
          <label className="login-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />

          <label className="login-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />

          <div className="login-row">
            {/* Visual only for now — there's no "remember me" /
                long-lived-session behavior implemented on the backend
                yet, so this checkbox doesn't change anything yet. */}
            <label className="login-checkbox">
              <input type="checkbox" disabled={submitting} />
              Remember me
            </label>
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <Link to="/register" className="login-secondary">
          Create Student Account
        </Link>

        <Link to="/" className="login-back">
          ← Back to Public Page
        </Link>
      </div>
    </div>
  );
}

export default Login;