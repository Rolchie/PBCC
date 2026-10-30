const supabase = require('../config/supabase');

async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        message: 'Authentication token is required.'
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        message: 'Authentication token is required.'
      });
    }

    const { data, error } =
      await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        message:
          'Invalid or expired authentication token.'
      });
    }

    const {
      data: applicationUser,
      error: userError
    } = await supabase
      .from('users')
      .select(
        'user_id, username, role, status, must_change_password'
      )
      .eq('auth_user_id', data.user.id)
      .single();

    if (userError || !applicationUser) {
      console.error(
        'Application user lookup error:',
        userError
      );

      return res.status(404).json({
        message: 'Application user record not found.'
      });
    }

    if (
      typeof applicationUser.status !== 'string' ||
      applicationUser.status.trim().toLowerCase() !==
        'active'
    ) {
      return res.status(403).json({
        message: 'User account is not active.'
      });
    }

    req.user = {
      ...data.user,
      user_id: applicationUser.user_id,
      username: applicationUser.username,
      role: applicationUser.role,
      status: applicationUser.status,
      must_change_password:
        applicationUser.must_change_password === true
    };

    // Users with an initial password may only access
    // the session-check and password-change endpoints.
    // This check applies to all routes using this middleware.
    if (req.user.must_change_password) {
      const allowedPaths = [
        '/api/auth/me',
        '/api/auth/change-initial-password'
      ];

      const currentPath = req.originalUrl.split('?')[0];

      if (!allowedPaths.includes(currentPath)) {
        return res.status(403).json({
          code: 'PASSWORD_CHANGE_REQUIRED',
          message:
            'You must change your initial password before accessing the PBCC system.'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    return res.status(500).json({
      message: 'Authentication failed.'
    });
  }
}

module.exports = authenticateUser;