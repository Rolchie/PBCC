
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Authentication routes
const authRoutes = require('./routes/authRoutes');

// Administrator routes
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminAuditRoutes = require('./routes/adminAuditRoutes');
const adminDashboardRoutes = require('./routes/adminDashboardRoutes');

// Program Office routes
const programOfficeRoutes = require('./routes/programOfficeRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Authentication
app.use('/api/auth', authRoutes);

// Administrator
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/audit-logs', adminAuditRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);

// Program Office
app.use('/api/program-office', programOfficeRoutes);

// Backend health check
app.get('/api/test', (req, res) => {
  return res.json({
    message: 'PBCC Backend is running.'
  });
});

// Run locally
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(
      `PBCC Backend running on http://localhost:${PORT}`
    );
  });
}

// Export for Vercel deployment
module.exports = app;
