
const express = require('express');

const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(
  authenticateUser,
  requireRole('Administrator')
);

// GET /api/admin/audit-logs
router.get('/', async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    if (!Number.isSafeInteger(page) || page > 100000) {
      return res.status(400).json({
        message: 'Invalid page number.'
      });
    }

    let query = supabase
      .from('audit_logs')
      .select(
        'audit_id, user_id, action, table_name, record_id, timestamp',
        { count: 'exact' }
      );

    if (
      typeof req.query.action === 'string' &&
      req.query.action.trim()
    ) {
      query = query.eq(
        'action',
        req.query.action.trim()
      );
    }

    if (
      typeof req.query.table_name === 'string' &&
      req.query.table_name.trim()
    ) {
      query = query.eq(
        'table_name',
        req.query.table_name.trim()
      );
    }

    const { data, error, count } = await query
      .order('audit_id', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Fetch audit logs error:', error);

      return res.status(500).json({
        message: 'Failed to retrieve audit logs.'
      });
    }

    // Resolve actor names from existing PBCC accounts.
    const actorIds = [
      ...new Set(
        (data || [])
          .map((log) => log.user_id)
          .filter((id) => id != null)
      )
    ];

    let actorNames = new Map();

    if (actorIds.length > 0) {
      const { data: actors, error: actorError } =
        await supabase
          .from('users')
          .select('user_id, username')
          .in('user_id', actorIds);

      if (actorError) {
        console.error('Audit actor lookup error:', actorError);

        return res.status(500).json({
          message: 'Failed to retrieve audit log actors.'
        });
      }

      actorNames = new Map(
        (actors || []).map((actor) => [
          actor.user_id,
          actor.username
        ])
      );
    }

    const logs = (data || []).map((log) => ({
      ...log,
      actor_username:
        actorNames.get(log.user_id) || null
    }));

    return res.status(200).json({
      message: 'Audit logs retrieved successfully.',
      logs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Audit logs error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve audit logs.'
    });
  }
});

module.exports = router;
