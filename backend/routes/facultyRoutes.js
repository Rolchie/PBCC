
const express = require('express');
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/authMiddleware');

const router = express.Router();

const VALID_GRADES = new Set([
  ...Array.from(
    { length: 21 },
    (_, index) => (1 + index / 10).toFixed(1)
  ),
  '5.0',
  'INC',
  'DROPPED'
]);

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizeRole(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeGrade(value) {
  const text = String(value ?? '').trim().toUpperCase();

  if (text === 'INC' || text === 'DROPPED') {
    return text;
  }

  if (!/^\d+(?:\.\d+)?$/.test(text)) {
    return null;
  }

  const numeric = Number(text);
  const normalized = numeric.toFixed(1);

  if (Math.abs(numeric - Number(normalized)) > 0.000001) {
    return null;
  }

  return VALID_GRADES.has(normalized) ? normalized : null;
}

function getGradeRemarks(grade) {
  if (grade === 'INC') return 'INC';
  if (grade === 'DROPPED') return 'Dropped';
  if (grade === '5.0') return 'Failed';
  if (VALID_GRADES.has(grade)) return 'Passed';
  return null;
}

function getGradeEquivalent(grade) {
  if (grade === 'INC' || grade === 'DROPPED') return null;
  if (grade === '5.0') return '74 and below';
  if (grade === '1.0') return '95 and above';

  return String(
    95 - Math.round((Number(grade) - 1) * 10)
  );
}

async function loadFaculty(req, res, next) {
  try {
    const role = normalizeRole(req.user?.role);

    if (!['faculty', 'facultypersonnel'].includes(role)) {
      return res.status(403).json({
        message: 'Faculty access is required.'
      });
    }

    const { data, error } = await supabase
      .from('faculty')
      .select(
        'faculty_id, user_id, employee_no, first_name, middle_name, last_name, department, email, status'
      )
      .eq('user_id', req.user.user_id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(403).json({
        message: 'No faculty record is linked to your account.'
      });
    }

    if (String(data.status || '').trim().toLowerCase() !== 'active') {
      return res.status(403).json({
        message: 'Your faculty record is not active.'
      });
    }

    req.faculty = data;
    next();
  } catch (error) {
    console.error('Faculty verification error:', error);

    return res.status(500).json({
      message: 'Unable to verify faculty access.'
    });
  }
}

router.use(authenticateUser, loadFaculty);

async function getAuthorizedOffering(req, offeringId) {
  const { data, error } = await supabase
    .from('subject_offerings')
    .select(
      'offering_id, subject_id, section_id, period_id, faculty_id, schedule, room, status'
    )
    .eq('offering_id', offeringId)
    .eq('faculty_id', req.faculty.faculty_id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function getRecords(table, columns, field, ids) {
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .in(field, ids);

  if (error) throw error;

  return data || [];
}

// GET /api/faculty/profile
router.get('/profile', (req, res) => {
  return res.json({
    faculty: req.faculty
  });
});

// GET /api/faculty/assigned-classes
router.get('/assigned-classes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subject_offerings')
      .select(
        'offering_id, subject_id, section_id, period_id, faculty_id, schedule, room, status'
      )
      .eq('faculty_id', req.faculty.faculty_id)
      .order('offering_id', { ascending: false });

    if (error) throw error;

    const offerings = data || [];

    const subjectIds = [
      ...new Set(offerings.map(row => row.subject_id))
    ];

    const sectionIds = [
      ...new Set(offerings.map(row => row.section_id))
    ];

    const periodIds = [
      ...new Set(offerings.map(row => row.period_id))
    ];

    const [subjects, sections, periods] = await Promise.all([
      getRecords(
        'subjects',
        'subject_id, subject_code, subject_title, units',
        'subject_id',
        subjectIds
      ),
      getRecords(
        'sections',
        'section_id, section_code, year_level',
        'section_id',
        sectionIds
      ),
      getRecords(
        'academic_periods',
        'period_id, school_year, semester, status',
        'period_id',
        periodIds
      )
    ]);

    const subjectMap = new Map(
      subjects.map(row => [row.subject_id, row])
    );

    const sectionMap = new Map(
      sections.map(row => [row.section_id, row])
    );

    const periodMap = new Map(
      periods.map(row => [row.period_id, row])
    );

    const classes = offerings.map(offering => ({
      ...offering,
      subject: subjectMap.get(offering.subject_id) || null,
      section: sectionMap.get(offering.section_id) || null,
      academic_period: periodMap.get(offering.period_id) || null
    }));

    return res.json({
      message: 'Assigned classes retrieved successfully.',
      classes
    });
  } catch (error) {
    console.error('Faculty assigned classes error:', error);

    return res.status(500).json({
      message: 'Unable to retrieve assigned classes.'
    });
  }
});

// GET /api/faculty/grade-sheet/:offeringId
router.get('/grade-sheet/:offeringId', async (req, res) => {
  try {
    const offeringId = parseId(req.params.offeringId);

    if (!offeringId) {
      return res.status(400).json({
        message: 'Invalid subject offering ID.'
      });
    }

    const offering = await getAuthorizedOffering(req, offeringId);

    if (!offering) {
      return res.status(404).json({
        message: 'Assigned subject offering not found.'
      });
    }

    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('enrollment_id, student_id, offering_id, status')
      .eq('offering_id', offeringId)
      .eq('status', 'enrolled')
      .order('enrollment_id', { ascending: true });

    if (error) throw error;

    const enrollmentRows = enrollments || [];

    const enrollmentIds = enrollmentRows.map(
      row => row.enrollment_id
    );

    const studentIds = [
      ...new Set(enrollmentRows.map(row => row.student_id))
    ];

    const [students, grades] = await Promise.all([
      getRecords(
        'students',
        'student_id, student_no, first_name, middle_name, last_name',
        'student_id',
        studentIds
      ),
      getRecords(
        'grades',
        'grade_id, enrollment_id, grade, remarks, date_posted, status',
        'enrollment_id',
        enrollmentIds
      )
    ]);

    const studentMap = new Map(
      students.map(row => [row.student_id, row])
    );

    const gradeMap = new Map();

    for (const grade of grades) {
      if (gradeMap.has(grade.enrollment_id)) {
        return res.status(409).json({
          message:
            'Duplicate grade records were found. Contact the administrator.'
        });
      }

      gradeMap.set(grade.enrollment_id, grade);
    }

    const records = enrollmentRows.map(enrollment => ({
      enrollment_id: enrollment.enrollment_id,
      student: studentMap.get(enrollment.student_id) || null,
      grade: gradeMap.get(enrollment.enrollment_id) || null
    }));

    records.sort((a, b) => {
      const aName = [
        a.student?.last_name,
        a.student?.first_name
      ].filter(Boolean).join(' ');

      const bName = [
        b.student?.last_name,
        b.student?.first_name
      ].filter(Boolean).join(' ');

      return aName.localeCompare(bName);
    });

    return res.json({
      message: 'Grade sheet retrieved successfully.',
      offering,
      records
    });
  } catch (error) {
    console.error('Faculty grade sheet error:', error);

    return res.status(500).json({
      message: 'Unable to retrieve the grade sheet.'
    });
  }
});

// PUT /api/faculty/grades/:enrollmentId
// Save or update a draft grade.
router.put('/grades/:enrollmentId', async (req, res) => {
  try {
    const enrollmentId = parseId(req.params.enrollmentId);
    const grade = normalizeGrade(req.body?.grade);

    if (!enrollmentId || !grade) {
      return res.status(400).json({
        message:
          'Provide a valid enrollment ID and official PBCC grade.'
      });
    }

    const { data: enrollment, error: enrollmentError } =
      await supabase
        .from('enrollments')
        .select('enrollment_id, offering_id, status')
        .eq('enrollment_id', enrollmentId)
        .maybeSingle();

    if (enrollmentError) throw enrollmentError;

    if (
      !enrollment ||
      String(enrollment.status || '').toLowerCase() !== 'enrolled'
    ) {
      return res.status(404).json({
        message: 'No eligible student subject record was found.'
      });
    }

    const offering = await getAuthorizedOffering(
      req,
      enrollment.offering_id
    );

    if (!offering) {
      return res.status(403).json({
        message: 'You are not assigned to this subject.'
      });
    }

    const { data: existing, error: existingError } =
      await supabase
        .from('grades')
        .select(
          'grade_id, enrollment_id, grade, remarks, date_posted, status'
        )
        .eq('enrollment_id', enrollmentId)
        .limit(2);

    if (existingError) throw existingError;

    if ((existing || []).length > 1) {
      return res.status(409).json({
        message:
          'Duplicate grade records were found. Contact the administrator.'
      });
    }

    const existingGrade = existing?.[0] || null;

    if (
      existingGrade &&
      String(existingGrade.status || '').toLowerCase() !== 'draft'
    ) {
      return res.status(409).json({
        message: 'This grade is not a draft and cannot be edited here.'
      });
    }

    const payload = {
      grade,
      remarks: getGradeRemarks(grade),
      status: 'draft',
      date_posted: null
    };

    let result;

    if (existingGrade) {
      result = await supabase
        .from('grades')
        .update(payload)
        .eq('grade_id', existingGrade.grade_id)
        .eq('status', 'draft')
        .select(
          'grade_id, enrollment_id, grade, remarks, date_posted, status'
        )
        .maybeSingle();

      if (!result.error && !result.data) {
        return res.status(409).json({
          message:
            'The grade changed while saving. Refresh and try again.'
        });
      }
    } else {
      result = await supabase
        .from('grades')
        .insert({
          enrollment_id: enrollmentId,
          ...payload
        })
        .select(
          'grade_id, enrollment_id, grade, remarks, date_posted, status'
        )
        .single();
    }

    if (result.error) {
      if (result.error.code === '23505') {
        return res.status(409).json({
          message:
            'A grade record already exists. Refresh and try again.'
        });
      }

      throw result.error;
    }

    return res.json({
      message: 'Draft grade saved successfully.',
      grade: result.data,
      numerical_equivalent: getGradeEquivalent(grade)
    });
  } catch (error) {
    console.error('Save faculty draft grade error:', error);

    return res.status(500).json({
      message: 'Unable to save the draft grade.'
    });
  }
});

// POST /api/faculty/submit-grades/:offeringId
// Submit all draft grades for one assigned subject offering.
router.post('/submit-grades/:offeringId', async (req, res) => {
  try {
    const offeringId = parseId(req.params.offeringId);

    if (!offeringId) {
      return res.status(400).json({
        message: 'Invalid subject offering ID.'
      });
    }

    const offering = await getAuthorizedOffering(req, offeringId);

    if (!offering) {
      return res.status(404).json({
        message: 'Assigned subject offering not found.'
      });
    }

    const { data, error } = await supabase.rpc(
      'submit_faculty_grade_sheet',
      {
        p_offering_id: offeringId,
        p_faculty_id: req.faculty.faculty_id
      }
    );

    if (error) {
      console.error('Faculty grade submission rejected:', error);

      const message = String(error.message || '');

      if (
        /no enrolled students|valid draft grade|incomplete|not assigned/i
          .test(message)
      ) {
        return res.status(409).json({
          message
        });
      }

      return res.status(500).json({
        message: 'Unable to submit grades. Please try again.'
      });
    }

    return res.json({
      message:
        'Grades submitted successfully. They are now locked for faculty editing and are awaiting validation.',
      offering_id: offeringId,
      submitted_count: Number(data) || 0,
      status: 'submitted'
    });
  } catch (error) {
    console.error('Submit faculty grades error:', error);

    return res.status(500).json({
      message: 'Unable to submit the grade sheet.'
    });
  }
});

module.exports = router;
