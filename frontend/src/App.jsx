import { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState('Connecting to backend...');

  useEffect(() => {
    fetch('http://localhost:5000/api/test')
      .then((response) => response.json())
      .then((data) => {
        setMessage(data.message);
      })
      .catch(() => {
        setMessage('Could not connect to PBCC backend.');
      });
  }, []);

  return (
    <div>
      <h1>PBCC Student Enrollment System</h1>
      <p>{message}</p>
    </div>
  );
}

export default App;