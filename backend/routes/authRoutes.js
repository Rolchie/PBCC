const express = require('express');
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    message: 'Authentication route is working.'
  });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    res.json({
      message: 'Login successful.',
      user: data.user,
      session: data.session
    });

  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      message: 'Login failed.'
    });
  }
});

router.get('/me', authenticateUser, async (req, res) => {
  try {
    console.log('Authenticated user ID:', req.user.id);
    const { data, error } = await supabase
      .from('users')
      .select('user_id, username, role, status')
      .eq('auth_user_id', req.user.id)
      .single();

    if (error || !data) {
      console.error('User lookup error:', error);

      return res.status(404).json({
      message: 'Application user record not found.'
     });
    }

    res.json({
      message: 'Current user retrieved successfully.',
      user: data
    });

  } catch (error) {
    console.error('Current user error:', error);

    res.status(500).json({
      message: 'Failed to retrieve current user.'
    });
  }
});

router.get(
    '/student-test',
    authenticateUser,
    requireRole('Student'),
    (req, res) => {
        res.json({
            message: 'Student access granted.',
            role: req.user.role
        });
    }
);

router.get(
    '/registrar-test',
    authenticateUser,
    requireRole('Registrar Personnel'),
    (req, res) => {
        res.json({
            message: 'Registrar access granted.',
            role: req.user.role
        });
    }
);

module.exports = router;