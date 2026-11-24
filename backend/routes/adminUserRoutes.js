
const express = require('express');

const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

const INITIAL_PASSWORD = 'ChangeMe1!';

const VALID_ROLES = [
  'Student',
  'Faculty',
  'Registrar Personnel',
  'Program Office Personnel',
  'Administrator'
];

const VALID_STATUSES = ['active', 'inactive'];

const VALID_YEAR_LEVELS = [1, 2, 3, 4];

const VALID_STUDENT_TYPES = [
  'Incoming',
  'Continuing',
  'Returning',
  'Transferee',
  'Shiftee'
];

const USER_COLUMNS =
  'user_id, auth_user_id, username, first_name, middle_name, last_name, role, status, must_change_password';

router.use(
  authenticateUser,
  requireRole('Administrator')
);

function normalizeStatus(status) {
  return typeof status === 'string'
    ? status.trim().toLowerCase()
    : '';
}

function utcTimestamp() {
  return new Date()
    .toISOString()
    .replace('T', ' ')
    .replace('Z', '');
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
    const {
      first_name,
      middle_name,
      last_name,
      email,
      role,
      year_level,
      student_type
    } = req.body || {};

    const cleanFirstName =
      typeof first_name === 'string'
        ? first_name.trim()
        : '';

    const cleanMiddleName =
      typeof middle_name === 'string'
        ? middle_name.trim()
        : '';

    const cleanLastName =
      typeof last_name === 'string'
        ? last_name.trim()
        : '';

    const cleanEmail =
      typeof email === 'string'
        ? email.trim().toLowerCase()
        : '';

    if (!cleanFirstName || !cleanLastName) {
      return res.status(400).json({
        message: 'First name and last name are required.'
      });
    }

    if (
      cleanFirstName.length > 100 ||
      cleanMiddleName.length > 100 ||
      cleanLastName.length > 100
    ) {
      return res.status(400).json({
        message:
          'Each name field must contain no more than 100 characters.'
      });
    }

    if (!cleanEmail) {
      return res.status(400).json({
        message: 'Email address is required.'
      });
    }

    if (
      cleanEmail.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        message: 'Please enter a valid email address.'
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        message: 'Invalid PBCC user role.'
      });
    }

    let cleanYearLevel = null;
    let cleanStudentType = null;

    // Validate student-specific fields.
    if (role === 'Student') {
      cleanYearLevel =
        typeof year_level === 'number' ||
        typeof year_level === 'string'
          ? Number(year_level)
          : null;

      cleanStudentType =
        typeof student_type === 'string'
          ? student_type.trim()
          : '';

      if (!VALID_YEAR_LEVELS.includes(cleanYearLevel)) {
        return res.status(400).json({
          message: 'Please select a valid year level.'
        });
      }

      if (!VALID_STUDENT_TYPES.includes(cleanStudentType)) {
        return res.status(400).json({
          message: 'Please select a valid student type.'
        });
      }
    }

    // Check whether the email already exists.
    const {
      data: existingUser,
      error: lookupError
    } = await supabase
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

    // Create the Supabase Authentication account.
    const {
      data: authData,
      error: authError
    } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: INITIAL_PASSWORD,
      email_confirm: true
    });

    if (authError || !authData?.user) {
      console.error(
        'Supabase Auth creation error:',
        authError
      );

      return res.status(400).json({
        message:
          'Unable to create authentication account. The email may already be registered.'
      });
    }

    const authUserId = authData.user.id;

    // Create the application account and complete
    // its student profile in one database transaction.
    const {
      data: accountData,
      error: insertError
    } = await supabase.rpc('create_pbcc_user', {
      p_auth_user_id: authUserId,
      p_username: cleanEmail,
      p_first_name: cleanFirstName,
      p_middle_name: cleanMiddleName || null,
      p_last_name: cleanLastName,
      p_role: role,
      p_year_level: cleanYearLevel,
      p_student_type: cleanStudentType
    });

    if (insertError) {
      console.error(
        'PBCC account creation error:',
        insertError
      );

      // Remove the authentication account when
      // PostgreSQL explicitly rejects the transaction.
      // For uncertain network failures, avoid deleting
      // an account that may have been committed.
      if (
        insertError.code &&
        /^[0-9A-Z]{5}$/.test(insertError.code) &&
        !insertError.code.startsWith('08')
      ) {
        const { error: cleanupError } =
          await supabase.auth.admin.deleteUser(authUserId);

        if (cleanupError) {
          console.error(
            'Auth account cleanup failed:',
            cleanupError
          );
        }
      } else {
        console.error(
          'Account creation outcome requires verification:',
          authUserId
        );
      }

      return res.status(500).json({
        message:
          'The PBCC account could not be confirmed. Please contact the system administrator.'
      });
    }

    if (!accountData?.user) {
      console.error(
        'Unexpected account creation response:',
        authUserId
      );

      return res.status(500).json({
        message: 'Account creation requires verification.'
      });
    }

    const applicationUser = accountData.user;
    const student = accountData.student || null;

    const auditLogged = await writeAuditLog(
      req.user.user_id,
      'CREATE_USER',
      applicationUser.user_id
    );

    return res.status(201).json({
      message: auditLogged
        ? role === 'Student'
          ? 'Student account and profile created successfully.'
          : 'User account created successfully.'
        : 'Account created, but its audit log could not be saved.',
      user: applicationUser,
      student,
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

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        message: 'Invalid user ID.'
      });
    }

    const body = req.body || {};
    const allowedFields = ['role', 'status'];

    if (
      Object.keys(body).some(
        (key) => !allowedFields.includes(key)
      )
    ) {
      return res.status(400).json({
        message:
          'Only user role and account status can be edited.'
      });
    }

    const { role, status } = body;
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

    const {
      data: targetUser,
      error: lookupError
    } = await supabase
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
        (
          updates.role &&
          updates.role !== 'Administrator'
        ) ||
        (
          updates.status &&
          updates.status !== 'active'
        )
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
      updates.status !==
        normalizeStatus(targetUser.status);

    // Prevent conversion to Student without
    // completing the required academic details.
    if (roleChanged && updates.role === 'Student') {
      return res.status(400).json({
        message:
          'Changing an existing account to Student requires a separate academic profile setup.'
      });
    }

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

    const {
      data: updatedUser,
      error: updateError
    } = await supabase
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
