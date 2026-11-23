
const express = require('express');
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateUser);

router.use((req, res, next) => {
  const role = String(req.user?.role || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  if (
    ![
      'registrar',
      'registrarpersonnel'
    ].includes(role)
  ) {
    return res.status(403).json({
      message: 'Registrar access is required.'
    });
  }

  next();
});

function unique(values) {
  return [...new Set(values.filter(
    value => value !== null && value !== undefined
  ))];
}

function mapBy(items, key) {
  return new Map(
    items.map(item => [String(item[key]), item])
  );
}

function fullName(student) {
  return [
    student?.first_name,
    student?.middle_name,
    student?.last_name
  ].filter(Boolean).join(' ');
}

function databaseError(error) {
  console.error('Registrar database error:', error);
  return new Error('Unable to retrieve registrar records.');
}

async function getRows(table, columns, ids, key) {
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .in(key, ids);

  if (error) throw databaseError(error);
  return data || [];
}

async function buildEnrollmentGroups() {
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select(
      'enrollment_id, student_id, offering_id, enrollment_date, status'
    )
    .in('status', ['pending', 'enrolled'])
    .order('enrollment_id', { ascending: false });

  if (error) throw databaseError(error);

  const enrollmentRows = enrollments || [];

  if (!enrollmentRows.length) return [];

  const [
    students,
    offerings
  ] = await Promise.all([
    getRows(
      'students',
      'student_id, student_no, first_name, middle_name, last_name, email, program_id, curriculum_id, year_level, status',
      unique(enrollmentRows.map(row => row.student_id)),
      'student_id'
    ),
    getRows(
      'subject_offerings',
      'offering_id, subject_id, section_id, period_id',
      unique(enrollmentRows.map(row => row.offering_id)),
      'offering_id'
    )
  ]);

  const [
    subjects,
    sections,
    periods,
    programs
  ] = await Promise.all([
    getRows(
      'subjects',
      'subject_id, subject_code, subject_title, units',
      unique(offerings.map(row => row.subject_id)),
      'subject_id'
    ),
    getRows(
      'sections',
      'section_id, section_code, program_id, year_level, capacity, status',
      unique(offerings.map(row => row.section_id)),
      'section_id'
    ),
    getRows(
      'academic_periods',
      'period_id, school_year, semester, status',
      unique(offerings.map(row => row.period_id)),
      'period_id'
    ),
    getRows(
      'programs',
      'program_id, program_code, program_name',
      unique(students.map(row => row.program_id)),
      'program_id'
    )
  ]);

  const studentMap = mapBy(students, 'student_id');
  const offeringMap = mapBy(offerings, 'offering_id');
  const subjectMap = mapBy(subjects, 'subject_id');
  const sectionMap = mapBy(sections, 'section_id');
  const periodMap = mapBy(periods, 'period_id');
  const programMap = mapBy(programs, 'program_id');

  const groups = new Map();

  for (const enrollment of enrollmentRows) {
    const student = studentMap.get(
      String(enrollment.student_id)
    );

    const offering = offeringMap.get(
      String(enrollment.offering_id)
    );

    if (!student || !offering) continue;

    const subject = subjectMap.get(
      String(offering.subject_id)
    );

    const section = sectionMap.get(
      String(offering.section_id)
    );

    const period = periodMap.get(
      String(offering.period_id)
    );

    const program = programMap.get(
      String(student.program_id)
    );

    const key = [
      enrollment.student_id,
      offering.period_id,
      offering.section_id,
      String(enrollment.status).toLowerCase()
    ].join(':');

    if (!groups.has(key)) {
      groups.set(key, {
        group_id: key,
        student_id: enrollment.student_id,
        student_no: student.student_no,
        student_name: fullName(student),
        email: student.email,
        year_level: student.year_level,
        student_status: student.status,
        program_id: student.program_id,
        program_code: program?.program_code || '—',
        program_name: program?.program_name || '—',
        period_id: offering.period_id,
        school_year: period?.school_year || '—',
        semester: period?.semester || '—',
        period_status: period?.status || '',
        section_id: offering.section_id,
        section_code: section?.section_code || '—',
        status: enrollment.status,
        subjects: [],
        subject_count: 0,
        total_units: 0,
        enrollment_ids: []
      });
    }

    const group = groups.get(key);

    group.subjects.push({
      enrollment_id: enrollment.enrollment_id,
      offering_id: enrollment.offering_id,
      subject_id: offering.subject_id,
      subject_code: subject?.subject_code || '—',
      subject_title: subject?.subject_title || 'Unknown Subject',
      units: Number(subject?.units || 0),
      status: enrollment.status,
      enrollment_date: enrollment.enrollment_date
    });

    group.enrollment_ids.push(enrollment.enrollment_id);
    group.total_units += Number(subject?.units || 0);
    group.subject_count += 1;
  }

  return [...groups.values()].map(group => ({
    ...group,
    subjects: group.subjects.sort((a, b) =>
      String(a.subject_code).localeCompare(
        String(b.subject_code),
        undefined,
        { numeric: true }
      )
    )
  }));
}

router.get('/dashboard', async (req, res) => {
  try {
    const groups = await buildEnrollmentGroups();

    const pending = groups.filter(
      group => String(group.status).toLowerCase() === 'pending'
    );

    const confirmed = groups.filter(
      group => String(group.status).toLowerCase() === 'enrolled'
    );

    const { count, error } = await supabase
      .from('students')
      .select('student_id', {
        count: 'exact',
        head: true
      });

    if (error) throw databaseError(error);

    const { data: activePeriods, error: periodError } =
      await supabase
        .from('academic_periods')
        .select('period_id, school_year, semester, status')
        .eq('status', 'active')
        .order('period_id', { ascending: false });

    if (periodError) throw databaseError(periodError);

    return res.json({
      pending_reviews: pending.length,
      confirmed_enrollments: confirmed.length,
      student_records: count || 0,
      active_period: activePeriods?.[0] || null,
      recent_pending: pending.slice(0, 5)
    });
  } catch (error) {
    console.error('Registrar dashboard error:', error);

    return res.status(500).json({
      message: error.message || 'Unable to load dashboard.'
    });
  }
});

router.get('/enrollment-reviews', async (req, res) => {
  try {
    const groups = await buildEnrollmentGroups();

    return res.json({
      reviews: groups.filter(
        group =>
          String(group.status).toLowerCase() === 'pending'
      )
    });
  } catch (error) {
    console.error('Enrollment reviews error:', error);

    return res.status(500).json({
      message: error.message || 'Unable to load reviews.'
    });
  }
});

router.get('/enrollment-records', async (req, res) => {
  try {
    const groups = await buildEnrollmentGroups();

    return res.json({
      records: groups.filter(
        group =>
          String(group.status).toLowerCase() === 'enrolled'
      )
    });
  } catch (error) {
    console.error('Enrollment records error:', error);

    return res.status(500).json({
      message: error.message || 'Unable to load records.'
    });
  }
});

router.get('/students', async (req, res) => {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select(
        'student_id, student_no, first_name, middle_name, last_name, email, program_id, curriculum_id, year_level, status'
      )
      .order('last_name', { ascending: true });

    if (error) throw databaseError(error);

    const programs = await getRows(
      'programs',
      'program_id, program_code, program_name',
      unique((students || []).map(row => row.program_id)),
      'program_id'
    );

    const programMap = mapBy(programs, 'program_id');

    return res.json({
      students: (students || []).map(student => ({
        ...student,
        student_name: fullName(student),
        program_code:
          programMap.get(String(student.program_id))
            ?.program_code || '—',
        program_name:
          programMap.get(String(student.program_id))
            ?.program_name || '—'
      }))
    });
  } catch (error) {
    console.error('Registrar students error:', error);

    return res.status(500).json({
      message: error.message || 'Unable to load students.'
    });
  }
});

router.post(
  '/enrollment-reviews/confirm',
  async (req, res) => {
    try {
      const {
        student_id,
        period_id,
        section_id
      } = req.body || {};

      const studentId = Number(student_id);
      const periodId = Number(period_id);
      const sectionId = Number(section_id);

      if (
        !Number.isInteger(studentId) ||
        studentId <= 0 ||
        !Number.isInteger(periodId) ||
        periodId <= 0 ||
        !Number.isInteger(sectionId) ||
        sectionId <= 0
      ) {
        return res.status(400).json({
          message: 'Valid student, period, and section are required.'
        });
      }

      const groups = await buildEnrollmentGroups();

      const pendingGroups = groups.filter(
        group =>
          Number(group.student_id) === studentId &&
          Number(group.period_id) === periodId &&
          String(group.status).toLowerCase() === 'pending'
      );

      if (!pendingGroups.length) {
        return res.status(404).json({
          message: 'No pending enrollments were found.'
        });
      }

      if (
        pendingGroups.some(
          group => Number(group.section_id) !== sectionId
        )
      ) {
        return res.status(409).json({
          message:
            'This student has pending subjects in multiple sections. Resolve the section conflict before confirmation.'
        });
      }

      const group = pendingGroups.find(
        item => Number(item.section_id) === sectionId
      );

      if (!group || !group.enrollment_ids.length) {
        return res.status(404).json({
          message: 'Pending subject load was not found.'
        });
      }

      const { data: updated, error } = await supabase
        .from('enrollments')
        .update({ status: 'enrolled' })
        .in('enrollment_id', group.enrollment_ids)
        .eq('student_id', studentId)
        .eq('status', 'pending')
        .select('enrollment_id');

      if (error) {
        console.error('Enrollment confirmation error:', error);

        return res.status(500).json({
          message: 'Unable to confirm enrollment.'
        });
      }

      if (
        !updated ||
        updated.length !== group.enrollment_ids.length
      ) {
        return res.status(409).json({
          message:
            'Some enrollment records changed during confirmation. Refresh the page and review the current status.'
        });
      }

      return res.json({
        message: 'Student enrollment confirmed successfully.',
        confirmed_subjects: updated.length,
        student_id: studentId,
        period_id: periodId,
        section_id: sectionId
      });
    } catch (error) {
      console.error('Confirm enrollment error:', error);

      return res.status(500).json({
        message:
          error.message || 'Unable to confirm enrollment.'
      });
    }
  }
);

module.exports = router;
