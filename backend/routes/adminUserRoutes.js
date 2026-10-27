
const express = require('express');

const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

const VALID_ROLES = [
  'Student',
  'Faculty',
  'Registrar Personnel',
  'Program Office Personnel',
  'Administrator'
];

const VALID_STATUSES = ['active', 'inactive'];

const USER_COLUMNS =
  'user_id, auth_user_id, username, role, status';

// All routes require Administrator access.
router.use(
  authenticateUser,
  requireRole('Administrator')
);

function normalizeStatus(status) {
  return typeof status === 'string'
    ? status.trim().toLowerCase()
    : '';
}

// Store UTC in the existing timestamp-without-time-zone column.
function utcTimestamp() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

async function writeAuditLog(actorId, action, recordId) {
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: actorId,
      action,
      table_name: 'users',
      record_id: recordId,
      timestamp: utcTimestamp()
    });

  if (error) {
    console.error('Audit log insert failed:', error);
    return false;
  }

  return true;
}

// GET /api/admin/users
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .order('user_id', { ascending: false });

    if (error) {
      console.error('Fetch users error:', error);

      return res.status(500).json({
        message: 'Failed to retrieve user accounts.'
      });
    }

    return res.status(200).json({
      message: 'User accounts retrieved successfully.',
      users: data || []
    });
  } catch (error) {
    console.error('List users error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve user accounts.'
    });
  }
});

// POST /api/admin/users
router.post('/', async (req, res) => {
  try {
    const { email, password, role, status = 'active' } =
      req.body || {};

    const cleanEmail =
      typeof email === 'string'
        ? email.trim().toLowerCase()
        : '';

    const cleanStatus = normalizeStatus(status);

    if (!cleanEmail || !password) {
      return res.status(400).json({
        message: 'Email and password are required.'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: 'Please enter a valid email address.'
      });
    }

    if (
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.'
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        message: 'Invalid PBCC user role.'
      });
    }

    if (!VALID_STATUSES.includes(cleanStatus)) {
      return res.status(400).json({
        message: 'Invalid account status.'
      });
    }

    const { data: existingUser, error: lookupError } =
      await supabase
        .from('users')
        .select('user_id')
        .eq('username', cleanEmail)
        .maybeSingle();

    if (lookupError) {
      console.error('User lookup error:', lookupError);

      return res.status(500).json({
        message: 'Unable to verify existing accounts.'
      });
    }

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists.'
      });
    }

    // Create the account in Supabase Authentication.
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true
      });

    if (authError || !authData?.user) {
      console.error('Supabase Auth creation error:', authError);

      return res.status(400).json({
        message:
          'Unable to create authentication account. The email may already be registered.'
      });
    }

    const authUserId = authData.user.id;

    // Create the linked PBCC application user.
    const { data: applicationUser, error: insertError } =
      await supabase
        .from('users')
        .insert({
          auth_user_id: authUserId,
          username: cleanEmail,
          role,
          status: cleanStatus
        })
        .select(USER_COLUMNS)
        .single();

    if (insertError) {
      console.error('PBCC user creation error:', insertError);

      // Attempt to remove the Auth account if linking fails.
      const { error: cleanupError } =
        await supabase.auth.admin.deleteUser(authUserId);

      if (cleanupError) {
        console.error(
          'Auth account cleanup failed:',
          cleanupError
        );
      }

      return res.status(500).json({
        message:
          'The PBCC user record could not be saved. Please contact the system administrator.'
      });
    }

    // Record who created the account.
    const auditLogged = await writeAuditLog(
      req.user.user_id,
      'CREATE_USER',
      applicationUser.user_id
    );

    return res.status(201).json({
      message: auditLogged
        ? 'User account created successfully.'
        : 'User account created, but its audit log could not be saved.',
      user: applicationUser,
      auditLogged
    });
  } catch (error) {
    console.error('Create user error:', error);

    return res.status(500).json({
      message: 'Failed to create user account.'
    });
  }
});

// PATCH /api/admin/users/:userId
router.patch('/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: 'Invalid user ID.'
      });
    }

    const { role, status } = req.body || {};
    const updates = {};

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({
          message: 'Invalid PBCC user role.'
        });
      }

      updates.role = role;
    }

    if (status !== undefined) {
      const cleanStatus = normalizeStatus(status);

      if (!VALID_STATUSES.includes(cleanStatus)) {
        return res.status(400).json({
          message: 'Invalid account status.'
        });
      }

      updates.status = cleanStatus;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'No valid account changes were provided.'
      });
    }

    const { data: targetUser, error: lookupError } =
      await supabase
        .from('users')
        .select(USER_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle();

    if (lookupError) {
      console.error('User lookup error:', lookupError);

      return res.status(500).json({
        message: 'Unable to retrieve the selected account.'
      });
    }

    if (!targetUser) {
      return res.status(404).json({
        message: 'User account not found.'
      });
    }

    // Protect the Administrator's own access.
    if (Number(req.user.user_id) === userId) {
      if (
        (updates.role && updates.role !== 'Administrator') ||
        (updates.status && updates.status !== 'active')
      ) {
        return res.status(403).json({
          message:
            'You cannot deactivate or remove your own Administrator access.'
        });
      }
    }

    const roleChanged =
      updates.role !== undefined &&
      updates.role !== targetUser.role;

    const statusChanged =
      updates.status !== undefined &&
      updates.status !== normalizeStatus(targetUser.status);

    if (!roleChanged && !statusChanged) {
      return res.status(200).json({
        message: 'No account changes were necessary.',
        user: targetUser,
        auditLogged: true
      });
    }

    const actualUpdates = {};

    if (roleChanged) {
      actualUpdates.role = updates.role;
    }

    if (statusChanged) {
      actualUpdates.status = updates.status;
    }

    const { data: updatedUser, error: updateError } =
      await supabase
        .from('users')
        .update(actualUpdates)
        .eq('user_id', userId)
        .select(USER_COLUMNS)
        .single();

    if (updateError) {
      console.error('Update user error:', updateError);

      return res.status(500).json({
        message: 'Failed to update user account.'
      });
    }

    // Record each type of change separately.
    const auditResults = [];

    if (roleChanged) {
      auditResults.push(
        await writeAuditLog(
          req.user.user_id,
          'UPDATE_USER_ROLE',
          userId
        )
      );
    }

    if (statusChanged) {
      auditResults.push(
        await writeAuditLog(
          req.user.user_id,
          'UPDATE_USER_STATUS',
          userId
        )
      );
    }

    const auditLogged = auditResults.every(Boolean);

    return res.status(200).json({
      message: auditLogged
        ? 'User account updated successfully.'
        : 'User account updated, but one or more audit logs could not be saved.',
      user: updatedUser,
      auditLogged
    });
  } catch (error) {
    console.error('Update user error:', error);

    return res.status(500).json({
      message: 'Failed to update user account.'
    });
  }
});

module.exports = router;
