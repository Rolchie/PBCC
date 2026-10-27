
const express = require('express');

const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

// Only authorized Program Office personnel can access these routes.
router.use(
  authenticateUser,
  requireRole('Program Office Personnel')
);

// GET /api/program-office/students
router.get('/students', async (req, res) => {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select(`
        student_id,
        user_id,
        student_no,
        first_name,
        middle_name,
        last_name,
        sex,
        birthdate,
        address,
        contact_number,
        email,
        program_id,
        curriculum_id,
        year_level,
        student_type,
        status
      `)
      .order('student_id', { ascending: false });

    if (error) {
      console.error('Fetch students error:', error);

      return res.status(500).json({
        message: 'Failed to retrieve student records.'
      });
    }

    return res.status(200).json({
      message: 'Student records retrieved successfully.',
      students: students || []
    });
  } catch (error) {
    console.error('Student records error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve student records.'
    });
  }
});

module.exports = router;
