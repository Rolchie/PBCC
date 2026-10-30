const express = require('express');
const { createClient } = require('@supabase/supabase-js');

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

function createLoginClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  );
}

async function getApplicationUser(authUserId) {
  return supabase
    .from('users')
    .select(
      'user_id, username, role, status, must_change_password'
    )
    .eq('auth_user_id', authUserId)
    .single();
}

function isActiveUser(user) {
  return (
    typeof user?.status === 'string' &&
    user.status.trim().toLowerCase() === 'active'
  );
}

// GET /api/auth/test
router.get('/test', (req, res) => {
  return res.json({
    message: 'Authentication route is working.'
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: 'Email and password are required.'
      });
    }

    const loginClient = createLoginClient();

    const { data, error } =
      await loginClient.auth.signInWithPassword({
        email: email.trim(),
        password
      });

    if (error || !data?.user || !data?.session) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    const {
      data: applicationUser,
      error: userError
    } = await getApplicationUser(data.user.id);

    if (userError || !applicationUser) {
      console.error(
        'PBCC user lookup failed during login:',
        userError
      );

      return res.status(403).json({
        message:
          'Your account is not linked to a PBCC user record. Please contact the administrator.'
      });
    }

    if (!VALID_ROLES.includes(applicationUser.role)) {
      return res.status(403).json({
        message:
          'Your account does not have a recognized PBCC role.'
      });
    }

    if (!isActiveUser(applicationUser)) {
      return res.status(403).json({
        message:
          'Your account is not active. Please contact the administrator.'
      });
    }

    return res.status(200).json({
      message: 'Login successful.',
      user: applicationUser,
      session: data.session
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      message: 'Login failed. Please try again.'
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const {
      data: applicationUser,
      error
    } = await getApplicationUser(req.user.id);

    if (error || !applicationUser) {
      return res.status(404).json({
        message: 'Application user record not found.'
      });
    }

    if (!VALID_ROLES.includes(applicationUser.role)) {
      return res.status(403).json({
        message: 'Unrecognized PBCC account role.'
      });
    }

    if (!isActiveUser(applicationUser)) {
      return res.status(403).json({
        message: 'Your account is not active.'
      });
    }

    return res.status(200).json({
      message: 'Current user retrieved successfully.',
      user: applicationUser
    });
  } catch (error) {
    console.error('Current user error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve current user.'
    });
  }
});

// POST /api/auth/change-initial-password
router.post(
  '/change-initial-password',
  authenticateUser,
  async (req, res) => {
    try {
      const {
        currentPassword,
        newPassword,
        confirmPassword
      } = req.body || {};

      if (
        typeof currentPassword !== 'string' ||
        typeof newPassword !== 'string' ||
        typeof confirmPassword !== 'string'
      ) {
        return res.status(400).json({
          message: 'All password fields are required.'
        });
      }

      if (!req.user.must_change_password) {
        return res.status(400).json({
          message:
            'Your account does not require an initial password change.'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          message:
            'Your new password must contain at least 8 characters.'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          message: 'New passwords do not match.'
        });
      }

      if (
        newPassword === currentPassword ||
        newPassword === 'ChangeMe1!'
      ) {
        return res.status(400).json({
          message:
            'Choose a new password different from the initial password.'
        });
      }

      // Verify the current password with Supabase Auth.
      const verificationClient = createLoginClient();

      const { data, error: verifyError } =
        await verificationClient.auth.signInWithPassword({
          email: req.user.email,
          password: currentPassword
        });

      if (
        verifyError ||
        !data?.user ||
        data.user.id !== req.user.id
      ) {
        return res.status(401).json({
          message: 'Current password is incorrect.'
        });
      }

      // Change the actual password in Supabase Auth.
      const { error: passwordError } =
        await supabase.auth.admin.updateUserById(
          req.user.id,
          {
            password: newPassword
          }
        );

      if (passwordError) {
        console.error(
          'Password update failed:',
          passwordError
        );

        return res.status(500).json({
          message:
            'Unable to update your password. Please try again.'
        });
      }

      // Clear the first-login requirement only after
      // Supabase has accepted the new password.
      const { error: updateError } = await supabase
        .from('users')
        .update({
          must_change_password: false
        })
        .eq('user_id', req.user.user_id)
        .eq('must_change_password', true);

      if (updateError) {
        console.error(
          'Password requirement update failed:',
          updateError
        );

        return res.status(500).json({
          message:
            'Your password was changed, but account activation could not be completed. Contact the administrator.'
        });
      }

      return res.status(200).json({
        message:
          'Password changed successfully. Please log in again using your new password.'
      });
    } catch (error) {
      console.error(
        'Initial password change error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to change password. Please try again.'
      });
    }
  }
);

// GET /api/auth/student-test
router.get(
  '/student-test',
  authenticateUser,
  requireRole('Student'),
  (req, res) => {
    return res.json({
      message: 'Student access granted.',
      role: req.user.role
    });
  }
);

// GET /api/auth/registrar-test
router.get(
  '/registrar-test',
  authenticateUser,
  requireRole('Registrar Personnel'),
  (req, res) => {
    return res.json({
      message: 'Registrar access granted.',
      role: req.user.role
    });
  }
);

module.exports = router;