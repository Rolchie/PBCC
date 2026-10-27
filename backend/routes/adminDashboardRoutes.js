
const express = require('express');

const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(
  authenticateUser,
  requireRole('Administrator')
);

// GET /api/admin/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const [
      usersResult,
      activeResult,
      enrollmentsResult,
      activitiesResult
    ] = await Promise.all([
      supabase
        .from('users')
        .select('user_id', {
          count: 'exact',
          head: true
        }),

      supabase
        .from('users')
        .select('user_id', {
          count: 'exact',
          head: true
        })
        .eq('status', 'active'),

      supabase
        .from('enrollments')
        .select('enrollment_id', {
          count: 'exact',
          head: true
        }),

      supabase
        .from('audit_logs')
        .select('audit_id', {
          count: 'exact',
          head: true
        })
    ]);

    const results = [
      usersResult,
      activeResult,
      enrollmentsResult,
      activitiesResult
    ];

    const failedResult = results.find(
      (result) => result.error
    );

    if (failedResult) {
      console.error(
        'Dashboard statistics query failed:',
        failedResult.error
      );

      return res.status(500).json({
        message:
          'Unable to retrieve dashboard statistics.'
      });
    }

    return res.status(200).json({
      message:
        'Dashboard statistics retrieved successfully.',
      stats: {
        totalUsers: usersResult.count ?? 0,
        activeAccounts: activeResult.count ?? 0,
        subjectEnrollments:
          enrollmentsResult.count ?? 0,
        recordedActivities:
          activitiesResult.count ?? 0
      }
    });
  } catch (error) {
    console.error(
      'Administrator dashboard error:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to load dashboard statistics.'
    });
  }
});

module.exports = router;
