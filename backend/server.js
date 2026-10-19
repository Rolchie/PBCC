require('dotenv').config();

const express = require('express');
const cors = require('cors');
const supabase = require('./config/supabase');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/api/test', (req, res) => {
  res.json({
    message: 'PBCC Backend is running.'
  });
});

// Run locally
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`PBCC Backend running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
module.exports = app;