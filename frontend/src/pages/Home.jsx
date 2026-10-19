import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { healthApi } from '../Services/api';

function Home() {
  const [status, setStatus] = useState('Connecting to backend...');

  useEffect(() => {
    healthApi
      .test()
      .then((response) => {
        setStatus(response.data.message);
      })
      .catch(() => {
        setStatus('Could not connect to PBCC backend.');
      });
  }, []);

  return (
    <div>
      <h1>PBCC Student Enrollment System</h1>
      <p>{status}</p>
      <Link to="/login">Sign in</Link>
    </div>
  );
}

export default Home;