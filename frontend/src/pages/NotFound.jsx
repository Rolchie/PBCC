import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/">Return home</Link>
    </div>
  );
}

export default NotFound;