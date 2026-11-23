
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

// Registrar routes
const registrarRoutes = require('./routes/registrarRoutes');

// Faculty grade management routes
const facultyRoutes = require('./routes/facultyRoutes');

// Student grade viewing routes
const studentRoutes = require('./routes/studentRoutes');

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

// Registrar
app.use('/api/registrar', registrarRoutes);

// Faculty
app.use('/api/faculty', facultyRoutes);

// Student
app.use('/api/student', studentRoutes);

// Diagnostic endpoint
app.get('/api/test', (req, res) => {
  return res.json({
    message: 'PBCC Backend is running.',
    version: 'student-grade-viewing-2026-11-23',
    studentLoadEndpoint:
      '/api/program-office/student-loads',
    registrarEndpoint:
      '/api/registrar/enrollment-reviews',
    facultyEndpoint:
      '/api/faculty/assigned-classes',
    facultyGradeSheetEndpoint:
      '/api/faculty/grade-sheet/:offeringId',
    facultyDraftGradeEndpoint:
      '/api/faculty/grades/:enrollmentId',
    facultySubmitGradesEndpoint:
      '/api/faculty/submit-grades/:offeringId',
    studentGradesEndpoint:
      '/api/student/grades',
    databaseStructureChanged: false
  });
});

// Handle unknown API routes
app.use('/api', (req, res) => {
  return res.status(404).json({
    message: 'API endpoint not found.'
  });
});

// Run locally
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(
      `PBCC Backend running on http://localhost:${PORT}`
    );

    console.log(
      'Faculty endpoint: /api/faculty/assigned-classes'
    );

    console.log(
      'Faculty grade sheet: /api/faculty/grade-sheet/:offeringId'
    );

    console.log(
      'Student grades: /api/student/grades'
    );
  });
}

// Export for Vercel deployment
module.exports = app;
