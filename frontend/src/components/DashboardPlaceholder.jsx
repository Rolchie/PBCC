import { useAuth } from '../context/useAuth';

// Temporary shared shell for every role's dashboard. Step 5 replaces
// this with real navigation and per-role layout — this just proves
// the login → role redirect → protected route chain works end to end.
function DashboardPlaceholder({ title }) {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-placeholder">
      <h1>{title}</h1>
      <p>Welcome, {user?.name ?? user?.email ?? 'user'}.</p>
      <button type="button" onClick={logout}>
        Log out
      </button>
    </div>
  );
}

export default DashboardPlaceholder;