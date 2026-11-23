
const express = require('express');
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateUser);

router.use((req, res, next) => {
  const role = String(req.user?.role || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '');

  if (role !== 'student') {
    return res.status(403).json({
      message: 'Student access only.',
    });
  }

  next();
});

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter((value) => value != null))];
}

function semesterRank(value) {
  const semester = normalize(value);

  if (semester.includes('first') || semester === '1') return 1;
  if (semester.includes('second') || semester === '2') return 2;
  if (semester.includes('summer') || semester.includes('midyear')) return 3;

  return 4;
}

async function queryRows(table, columns, field, ids) {
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .in(field, ids);

  if (error) throw error;

  return data || [];
}

async function getStudent(req) {
  const { data, error } = await supabase
    .from('students')
    .select(
      'student_id, student_no, curriculum_id, program_id, year_level'
    )
    .eq('user_id', req.user.user_id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function getAcademicData(student) {
  const { data: enrollmentRows, error: enrollmentError } =
    await supabase
      .from('enrollments')
      .select('enrollment_id, offering_id, status')
      .eq('student_id', student.student_id);

  if (enrollmentError) throw enrollmentError;

  const enrollments = enrollmentRows || [];

  const offerings = await queryRows(
    'subject_offerings',
    'offering_id, subject_id, period_id, faculty_id',
    'offering_id',
    unique(enrollments.map((item) => item.offering_id))
  );

  const offeringById = new Map(
    offerings.map((item) => [item.offering_id, item])
  );

  const periodIds = unique(
    offerings.map((item) => item.period_id)
  );

  const periods = await queryRows(
    'academic_periods',
    'period_id, school_year, semester',
    'period_id',
    periodIds
  );

  periods.sort((a, b) => {
    const yearA = Number(
      String(a.school_year || '').match(/\d{4}/)?.[0] || 0
    );

    const yearB = Number(
      String(b.school_year || '').match(/\d{4}/)?.[0] || 0
    );

    if (yearA !== yearB) return yearB - yearA;

    return semesterRank(b.semester) - semesterRank(a.semester);
  });

  const subjects = await queryRows(
    'subjects',
    'subject_id, subject_code, subject_title, units',
    'subject_id',
    unique(offerings.map((item) => item.subject_id))
  );

  const subjectById = new Map(
    subjects.map((item) => [item.subject_id, item])
  );

  const periodById = new Map(
    periods.map((item) => [item.period_id, item])
  );

  return {
    enrollments,
    offerings,
    periods,
    subjects,
    offeringById,
    subjectById,
    periodById,
  };
}

async function getLoadClassifications(student, academicData) {
  const result = new Map();

  if (!student.curriculum_id || !student.year_level) {
    return result;
  }

  const { data: curriculumRows, error } = await supabase
    .from('curriculum_subjects')
    .select('subject_id, year_level, semester, is_required')
    .eq('curriculum_id', student.curriculum_id);

  if (error) throw error;

  const curriculum = curriculumRows || [];

  for (const period of academicData.periods) {
    const prescribedRows = curriculum.filter(
      (row) =>
        Number(row.year_level) === Number(student.year_level) &&
        normalize(row.semester) === normalize(period.semester)
    );

    const requiredIds = new Set(
      prescribedRows
        .filter((row) => row.is_required === true)
        .map((row) => row.subject_id)
    );

    const allowedIds = new Set(
      prescribedRows.map((row) => row.subject_id)
    );

    const enrolledIds = new Set(
      academicData.enrollments
        .filter((enrollment) => {
          const offering = academicData.offeringById.get(
            enrollment.offering_id
          );

          return (
            offering?.period_id === period.period_id &&
            normalize(enrollment.status) === 'enrolled'
          );
        })
        .map((enrollment) =>
          academicData.offeringById.get(enrollment.offering_id)
            ?.subject_id
        )
        .filter((id) => id != null)
    );

    if (prescribedRows.length === 0 || requiredIds.size === 0) {
      result.set(period.period_id, 'Not determined');
      continue;
    }

    const missingRequired = [...requiredIds].some(
      (id) => !enrolledIds.has(id)
    );

    const outsideCurriculum = [...enrolledIds].some(
      (id) => !allowedIds.has(id)
    );

    result.set(
      period.period_id,
      missingRequired || outsideCurriculum
        ? 'Irregular'
        : 'Regular'
    );
  }

  return result;
}

function sendError(res, error, message) {
  console.error(message, error);

  return res.status(500).json({
    message,
  });
}

// GET /api/student/periods
router.get('/periods', async (req, res) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return res.status(404).json({
        message: 'No student record is linked to this account.',
      });
    }

    const academicData = await getAcademicData(student);

    return res.json({
      student_no: student.student_no,
      periods: academicData.periods.map((period) => ({
        ...period,
        label: `${period.school_year} ${period.semester}`,
      })),
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to retrieve enrolled academic periods.'
    );
  }
});

// GET /api/student/subjects
router.get('/subjects', async (req, res) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return res.status(404).json({
        message: 'No student record is linked to this account.',
      });
    }

    const academicData = await getAcademicData(student);

    const classifications = await getLoadClassifications(
      student,
      academicData
    );

    const rows = academicData.enrollments
      .filter(
        (enrollment) =>
          normalize(enrollment.status) === 'enrolled'
      )
      .map((enrollment) => {
        const offering = academicData.offeringById.get(
          enrollment.offering_id
        );

        const subject = offering
          ? academicData.subjectById.get(offering.subject_id)
          : null;

        return {
          enrollment_id: enrollment.enrollment_id,
          offering_id: enrollment.offering_id,
          period_id: offering?.period_id ?? null,
          subject_code: subject?.subject_code || '—',
          subject_title: subject?.subject_title || '—',
          units: subject?.units ?? null,
          faculty_id: offering?.faculty_id ?? null,
          load_status: offering
            ? classifications.get(offering.period_id) ||
              'Not determined'
            : 'Not determined',
        };
      });

    rows.sort((a, b) =>
      a.subject_code.localeCompare(b.subject_code)
    );

    return res.json({
      student_no: student.student_no,
      subjects: rows,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to retrieve enrolled subjects.'
    );
  }
});

// GET /api/student/grades
// Only grades with status = released are returned.
router.get('/grades', async (req, res) => {
  try {
    const student = await getStudent(req);

    if (!student) {
      return res.status(404).json({
        message: 'No student record is linked to this account.',
      });
    }

    const academicData = await getAcademicData(student);

    const enrollmentIds = academicData.enrollments.map(
      (item) => item.enrollment_id
    );

    if (enrollmentIds.length === 0) {
      return res.json({
        student_no: student.student_no,
        grades: [],
      });
    }

    const { data, error } = await supabase
      .from('grades')
      .select('enrollment_id, grade, remarks, date_posted')
      .in('enrollment_id', enrollmentIds)
      .eq('status', 'released');

    if (error) throw error;

    const enrollmentById = new Map(
      academicData.enrollments.map((item) => [
        item.enrollment_id,
        item,
      ])
    );

    const grades = (data || []).map((grade) => {
      const enrollment = enrollmentById.get(
        grade.enrollment_id
      );

      const offering = enrollment
        ? academicData.offeringById.get(enrollment.offering_id)
        : null;

      const subject = offering
        ? academicData.subjectById.get(offering.subject_id)
        : null;

      return {
        enrollment_id: grade.enrollment_id,
        period_id: offering?.period_id ?? null,
        subject_code: subject?.subject_code || '—',
        subject_title: subject?.subject_title || '—',
        units: subject?.units ?? null,
        grade: grade.grade,
        remarks: grade.remarks,
        date_posted: grade.date_posted,
      };
    });

    grades.sort((a, b) =>
      a.subject_code.localeCompare(b.subject_code)
    );

    return res.json({
      student_no: student.student_no,
      grades,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to retrieve released grades.'
    );
  }
});

module.exports = router;
