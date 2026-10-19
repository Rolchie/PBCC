import { Link } from 'react-router-dom';

// Generic placeholder for pages the manuscript's UI prototype shows
// but that have no backend endpoint yet. Do NOT wire these up to fake
// behavior — this page exists so the link/button isn't a dead click,
// while making it obvious nothing is implemented yet.
function ComingSoon({ title, missingEndpoint }) {
  return (
    <div className="coming-soon">
      <h1>{title}</h1>
      <p>This feature isn't available yet.</p>
      {missingEndpoint && (
        <p className="coming-soon-note">
          Needs backend endpoint: <code>{missingEndpoint}</code>
        </p>
      )}
      <Link to="/login">← Back to sign in</Link>
    </div>
  );
}

export default ComingSoon;