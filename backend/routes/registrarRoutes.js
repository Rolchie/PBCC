const express = require('express');
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/authMiddleware');

const router = express.Router();

// ======================================================
// AUTHENTICATION AND AUTHORIZATION
// ======================================================

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

// ======================================================
// HELPERS
// ======================================================

function norm(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function validId(value) {
  const number = Number(value);

  return Number.isSafeInteger(number) &&
    number > 0
    ? number
    : null;
}

function unique(values) {
  return [...new Set(
    values.filter(
      value =>
        value !== null &&
        value !== undefined
    )
  )];
}

function mapBy(items, key) {
  return new Map(
    items.map(item => [
      String(item[key]),
      item
    ])
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
  console.error(
    'Registrar database error:',
    error
  );

  return new Error(
    'Unable to process registrar records.'
  );
}

function fail(status, message) {
  const error = new Error(message);
  error.http = status;
  throw error;
}

function sendError(res, error, fallback) {
  console.error(fallback, error);

  return res.status(
    error.http || 500
  ).json({
    message: error.http
      ? error.message
      : fallback
  });
}

async function getRows(
  table,
  columns,
  ids,
  key
) {
  const values = unique(ids);

  if (!values.length) {
    return [];
  }

  const result = [];

  for (
    let index = 0;
    index < values.length;
    index += 100
  ) {
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .in(
          key,
          values.slice(index, index + 100)
        )
        .order(key, { ascending: true })
        .range(offset, offset + 499);

      if (error) {
        throw databaseError(error);
      }

      const batch = data || [];

      result.push(...batch);

      if (batch.length < 500) {
        break;
      }

      offset += batch.length;
    }
  }

  return result;
}

async function getAllEnrollments() {
  const result = [];

  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        enrollment_id,
        student_id,
        offering_id,
        enrollment_date,
        status
      `)
      .in('status', ['pending', 'enrolled'])
      .order(
        'enrollment_id',
        { ascending: false }
      )
      .range(offset, offset + 499);

    if (error) {
      throw databaseError(error);
    }

    const batch = data || [];

    result.push(...batch);

    if (batch.length < 500) {
      break;
    }

    offset += batch.length;
  }

  return result;
}

// ======================================================
// CURRICULUM VALIDATION
// ======================================================

async function getCompatibleCurricula(
  programId,
  subjectIds,
  officialCurriculumId = null
) {
  if (!programId || !subjectIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('curricula')
    .select(`
      curriculum_id,
      program_id,
      curriculum_year,
      description,
      status
    `)
    .eq('program_id', programId)
    .eq('status', 'active')
    .order(
      'curriculum_year',
      { ascending: false }
    );

  if (error) {
    throw databaseError(error);
  }

  let curricula = data || [];

  // Existing students must retain their
  // officially assigned curriculum.

  if (officialCurriculumId) {
    curricula = curricula.filter(
      item =>
        Number(item.curriculum_id) ===
        Number(officialCurriculumId)
    );
  }

  if (!curricula.length) {
    return [];
  }

  const curriculumSubjects = await getRows(
    'curriculum_subjects',
    'curriculum_id, subject_id',
    curricula.map(
      item => item.curriculum_id
    ),
    'curriculum_id'
  );

  const subjectMap = new Map();

  for (const item of curriculumSubjects) {
    const key = Number(item.curriculum_id);

    if (!subjectMap.has(key)) {
      subjectMap.set(key, new Set());
    }

    subjectMap.get(key).add(
      Number(item.subject_id)
    );
  }

  // Every prepared subject must belong
  // to the selected curriculum.

  return curricula.filter(curriculum => {
    const subjects = subjectMap.get(
      Number(curriculum.curriculum_id)
    );

    if (!subjects) {
      return false;
    }

    return subjectIds.every(
      subjectId =>
        subjects.has(Number(subjectId))
    );
  });
}

// ======================================================
// BUILD ENROLLMENT GROUPS
// ======================================================

async function buildEnrollmentGroups() {
  const enrollmentRows =
    await getAllEnrollments();

  if (!enrollmentRows.length) {
    return [];
  }

  const [
    students,
    offerings
  ] = await Promise.all([
    getRows(
      'students',
      `
        student_id,
        student_no,
        first_name,
        middle_name,
        last_name,
        email,
        program_id,
        curriculum_id,
        year_level,
        student_type,
        status
      `,
      unique(
        enrollmentRows.map(
          row => row.student_id
        )
      ),
      'student_id'
    ),

    getRows(
      'subject_offerings',
      `
        offering_id,
        subject_id,
        section_id,
        period_id,
        status
      `,
      unique(
        enrollmentRows.map(
          row => row.offering_id
        )
      ),
      'offering_id'
    )
  ]);

  const [
    subjects,
    sections,
    periods
  ] = await Promise.all([
    getRows(
      'subjects',
      `
        subject_id,
        subject_code,
        subject_title,
        units
      `,
      unique(
        offerings.map(
          row => row.subject_id
        )
      ),
      'subject_id'
    ),

    getRows(
      'sections',
      `
        section_id,
        section_code,
        program_id,
        year_level,
        period_id,
        capacity,
        status
      `,
      unique(
        offerings.map(
          row => row.section_id
        )
      ),
      'section_id'
    ),

    getRows(
      'academic_periods',
      `
        period_id,
        school_year,
        semester,
        status
      `,
      unique(
        offerings.map(
          row => row.period_id
        )
      ),
      'period_id'
    )
  ]);

  // Include programs belonging to sections.
  //
  // Pending unassigned students do not yet
  // have an official program_id.

  const programIds = unique([
    ...students.map(
      row => row.program_id
    ),

    ...sections.map(
      row => row.program_id
    )
  ]);

  const programs = await getRows(
    'programs',
    `
      program_id,
      program_code,
      program_name,
      status
    `,
    programIds,
    'program_id'
  );

  const studentMap = mapBy(
    students,
    'student_id'
  );

  const offeringMap = mapBy(
    offerings,
    'offering_id'
  );

  const subjectMap = mapBy(
    subjects,
    'subject_id'
  );

  const sectionMap = mapBy(
    sections,
    'section_id'
  );

  const periodMap = mapBy(
    periods,
    'period_id'
  );

  const programMap = mapBy(
    programs,
    'program_id'
  );

  const groups = new Map();

  for (const enrollment of enrollmentRows) {
    const student = studentMap.get(
      String(enrollment.student_id)
    );

    const offering = offeringMap.get(
      String(enrollment.offering_id)
    );

    if (!student || !offering) {
      throw new Error(
        'Enrollment contains missing related records.'
      );
    }

    const subject = subjectMap.get(
      String(offering.subject_id)
    );

    const section = sectionMap.get(
      String(offering.section_id)
    );

    const period = periodMap.get(
      String(offering.period_id)
    );

    // The enrollment program is determined
    // through the selected section.
    //
    // This also preserves the program
    // associated with historical enrollments.

    const selectedProgramId =
      section?.program_id ??
      student.program_id ??
      null;

    const program = programMap.get(
      String(selectedProgramId)
    );

    const key = [
      enrollment.student_id,
      offering.period_id,
      offering.section_id,
      norm(enrollment.status)
    ].join(':');

    if (!groups.has(key)) {
      groups.set(key, {
        group_id: key,

        student_id:
          enrollment.student_id,

        student_no:
          student.student_no,

        student_name:
          fullName(student),

        email:
          student.email,

        year_level:
          student.year_level,

        student_type:
          student.student_type,

        student_status:
          student.status,

        official_program_id:
          student.program_id,

        official_curriculum_id:
          student.curriculum_id,

        is_unassigned:
          student.program_id == null,

        program_id:
          selectedProgramId,

        program_code:
          program?.program_code || '—',

        program_name:
          program?.program_name || '—',

        program_status:
          program?.status || '',

        period_id:
          offering.period_id,

        school_year:
          period?.school_year || '—',

        semester:
          period?.semester || '—',

        period_status:
          period?.status || '',

        section_id:
          offering.section_id,

        section_code:
          section?.section_code || '—',

        section_year_level:
          section?.year_level ?? null,

        section_period_id:
          section?.period_id ?? null,

        section_status:
          section?.status || '',

        status:
          enrollment.status,

        subjects: [],

        subject_count: 0,

        total_units: 0,

        enrollment_ids: []
      });
    }

    const group = groups.get(key);

    group.subjects.push({
      enrollment_id:
        enrollment.enrollment_id,

      offering_id:
        enrollment.offering_id,

      subject_id:
        offering.subject_id,

      subject_code:
        subject?.subject_code || '—',

      subject_title:
        subject?.subject_title ||
        'Unknown Subject',

      units:
        Number(subject?.units || 0),

      offering_status:
        offering.status,

      status:
        enrollment.status,

      enrollment_date:
        enrollment.enrollment_date
    });

    group.enrollment_ids.push(
      enrollment.enrollment_id
    );

    group.total_units += Number(
      subject?.units || 0
    );

    group.subject_count += 1;
  }

  return [...groups.values()].map(
    group => ({
      ...group,

      subjects: group.subjects.sort(
        (a, b) =>
          String(a.subject_code).localeCompare(
            String(b.subject_code),
            undefined,
            { numeric: true }
          )
      )
    })
  );
}

// ======================================================
// REGISTRAR DASHBOARD
// ======================================================

router.get('/dashboard', async (req, res) => {
  try {
    const groups =
      await buildEnrollmentGroups();

    const pending = groups.filter(
      group =>
        norm(group.status) === 'pending'
    );

    const confirmed = groups.filter(
      group =>
        norm(group.status) === 'enrolled'
    );

    const { count, error } = await supabase
      .from('students')
      .select('student_id', {
        count: 'exact',
        head: true
      });

    if (error) {
      throw databaseError(error);
    }

    const {
      data: activePeriods,
      error: periodError
    } = await supabase
      .from('academic_periods')
      .select(`
        period_id,
        school_year,
        semester,
        status
      `)
      .eq('status', 'active')
      .order(
        'period_id',
        { ascending: false }
      );

    if (periodError) {
      throw databaseError(periodError);
    }

    return res.json({
      pending_reviews:
        pending.length,

      confirmed_enrollments:
        confirmed.length,

      student_records:
        count || 0,

      active_period:
        activePeriods?.[0] || null,

      recent_pending:
        pending.slice(0, 5)
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to load registrar dashboard.'
    );
  }
});

// ======================================================
// PENDING ENROLLMENT REVIEWS
// ======================================================

router.get(
  '/enrollment-reviews',
  async (req, res) => {
    try {
      const groups =
        await buildEnrollmentGroups();

      const pending = groups.filter(
        group =>
          norm(group.status) === 'pending'
      );

      return res.json({
        reviews: pending
      });
    } catch (error) {
      return sendError(
        res,
        error,
        'Unable to load enrollment reviews.'
      );
    }
  }
);

// ======================================================
// AVAILABLE CURRICULA FOR ENROLLMENT CONFIRMATION
// ======================================================

router.get(
  '/enrollment-reviews/curricula',
  async (req, res) => {
    try {
      const studentId = validId(
        req.query.student_id
      );

      const periodId = validId(
        req.query.period_id
      );

      const sectionId = validId(
        req.query.section_id
      );

      if (
        !studentId ||
        !periodId ||
        !sectionId
      ) {
        fail(
          400,
          'Valid student, period and section are required.'
        );
      }

      const groups =
        await buildEnrollmentGroups();

      const group = groups.find(
        item =>
          Number(item.student_id) === studentId &&
          Number(item.period_id) === periodId &&
          Number(item.section_id) === sectionId &&
          norm(item.status) === 'pending'
      );

      if (!group) {
        fail(
          404,
          'Pending enrollment was not found.'
        );
      }

      const curricula =
        await getCompatibleCurricula(
          group.program_id,

          group.subjects.map(
            item => item.subject_id
          ),

          group.official_curriculum_id
        );

      return res.json({
        student_id:
          studentId,

        program_id:
          group.program_id,

        official_curriculum_id:
          group.official_curriculum_id,

        curricula,

        requires_selection:
          curricula.length > 1,

        suggested_curriculum_id:
          curricula.length === 1
            ? curricula[0].curriculum_id
            : null
      });
    } catch (error) {
      return sendError(
        res,
        error,
        'Unable to retrieve compatible curricula.'
      );
    }
  }
);

// ======================================================
// CONFIRMED ENROLLMENT RECORDS
// ======================================================

router.get(
  '/enrollment-records',
  async (req, res) => {
    try {
      const groups =
        await buildEnrollmentGroups();

      return res.json({
        records: groups.filter(
          group =>
            norm(group.status) === 'enrolled'
        )
      });
    } catch (error) {
      return sendError(
        res,
        error,
        'Unable to load enrollment records.'
      );
    }
  }
);

// ======================================================
// STUDENT RECORDS
// ======================================================

router.get('/students', async (req, res) => {
  try {
    const students = [];

    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from('students')
        .select(`
          student_id,
          student_no,
          first_name,
          middle_name,
          last_name,
          email,
          program_id,
          curriculum_id,
          year_level,
          student_type,
          status
        `)
        .order(
          'last_name',
          { ascending: true }
        )
        .order(
          'student_id',
          { ascending: true }
        )
        .range(offset, offset + 499);

      if (error) {
        throw databaseError(error);
      }

      const batch = data || [];

      students.push(...batch);

      if (batch.length < 500) {
        break;
      }

      offset += batch.length;
    }

    const [
      programs,
      curricula
    ] = await Promise.all([
      getRows(
        'programs',
        `
          program_id,
          program_code,
          program_name
        `,
        unique(
          students.map(
            row => row.program_id
          )
        ),
        'program_id'
      ),

      getRows(
        'curricula',
        `
          curriculum_id,
          curriculum_year,
          description
        `,
        unique(
          students.map(
            row => row.curriculum_id
          )
        ),
        'curriculum_id'
      )
    ]);

    const programMap = mapBy(
      programs,
      'program_id'
    );

    const curriculumMap = mapBy(
      curricula,
      'curriculum_id'
    );

    return res.json({
      students: students.map(student => {
        const program = programMap.get(
          String(student.program_id)
        );

        const curriculum = curriculumMap.get(
          String(student.curriculum_id)
        );

        return {
          ...student,

          student_name:
            fullName(student),

          program_code:
            program?.program_code || '—',

          program_name:
            program?.program_name ||
            'Not assigned',

          curriculum_year:
            curriculum?.curriculum_year ||
            null,

          curriculum_description:
            curriculum?.description ||
            null
        };
      })
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Unable to load student records.'
    );
  }
});

// ======================================================
// CONFIRM STUDENT ENROLLMENT
// ======================================================

router.post(
  '/enrollment-reviews/confirm',
  async (req, res) => {
    try {
      const {
        student_id,
        period_id,
        section_id,
        curriculum_id
      } = req.body || {};

      const studentId =
        validId(student_id);

      const periodId =
        validId(period_id);

      const sectionId =
        validId(section_id);

      const requestedCurriculumId =
        validId(curriculum_id);

      if (
        !studentId ||
        !periodId ||
        !sectionId
      ) {
        fail(
          400,
          'Valid student, period and section are required.'
        );
      }

      if (
        curriculum_id != null &&
        curriculum_id !== '' &&
        !requestedCurriculumId
      ) {
        fail(
          400,
          'Invalid curriculum selection.'
        );
      }

      // Retrieve current enrollment records.

      const groups =
        await buildEnrollmentGroups();

      const studentPeriodGroups =
        groups.filter(
          group =>
            Number(group.student_id) === studentId &&
            Number(group.period_id) === periodId
        );

      const pendingGroups =
        studentPeriodGroups.filter(
          group =>
            norm(group.status) === 'pending'
        );

      if (!pendingGroups.length) {
        fail(
          409,
          'No pending enrollment remains. Refresh the page.'
        );
      }

      // Prevent mixed-section enrollment.

      if (
        studentPeriodGroups.some(
          group =>
            Number(group.section_id) !== sectionId
        )
      ) {
        fail(
          409,
          'The student has subjects in multiple sections. Resolve the conflict before confirmation.'
        );
      }

      const group = pendingGroups.find(
        item =>
          Number(item.section_id) === sectionId
      );

      if (
        !group ||
        !group.enrollment_ids.length
      ) {
        fail(
          404,
          'Pending subject load was not found.'
        );
      }

      // ==================================================
      // VALIDATE ACADEMIC PERIOD
      // ==================================================

      if (
        norm(group.period_status) !== 'active'
      ) {
        fail(
          400,
          'Enrollment cannot be confirmed for an inactive academic period.'
        );
      }

      // ==================================================
      // VALIDATE STUDENT INFORMATION
      // ==================================================

      const yearLevel = validId(
        group.year_level
      );

      const studentType = String(
        group.student_type || ''
      ).trim();

      if (!yearLevel) {
        fail(
          400,
          'Student has no recorded year level.'
        );
      }

      if (!studentType) {
        fail(
          400,
          'Student has no recorded student type.'
        );
      }

      if (
        !['pending', 'active'].includes(
          norm(group.student_status)
        )
      ) {
        fail(
          409,
          'Student status does not permit enrollment confirmation.'
        );
      }

      // ==================================================
      // VALIDATE SECTION
      // ==================================================

      if (
        norm(group.section_status) !== 'active'
      ) {
        fail(
          400,
          'The selected section is inactive.'
        );
      }

      if (
        Number(group.section_period_id) !==
        periodId
      ) {
        fail(
          409,
          'Section does not belong to the selected academic period.'
        );
      }

      if (
        Number(group.section_year_level) !==
        yearLevel
      ) {
        fail(
          409,
          'Section year level does not match the student year level.'
        );
      }

      // ==================================================
      // DETERMINE OFFICIAL PROGRAM
      // ==================================================

      const programId = validId(
        group.program_id
      );

      if (!programId) {
        fail(
          400,
          'Unable to determine the selected program.'
        );
      }

      if (
        norm(group.program_status) !== 'active'
      ) {
        fail(
          400,
          'The selected program is inactive.'
        );
      }

      const officialProgramId = validId(
        group.official_program_id
      );

      if (
        officialProgramId &&
        officialProgramId !== programId
      ) {
        fail(
          409,
          'The prepared enrollment does not match the official student program.'
        );
      }

      if (
        !officialProgramId &&
        norm(group.student_status) !== 'pending'
      ) {
        fail(
          409,
          'An unassigned student must have pending status.'
        );
      }

      // ==================================================
      // VALIDATE SUBJECT OFFERINGS
      // ==================================================

      if (
        group.subjects.some(
          subject =>
            norm(subject.offering_status) !==
            'active'
        )
      ) {
        fail(
          409,
          'One or more subject offerings are inactive.'
        );
      }

      const allPeriodSubjects =
        studentPeriodGroups.flatMap(
          item => item.subjects
        );

      const subjectIds =
        allPeriodSubjects.map(
          subject => Number(subject.subject_id)
        );

      if (
        new Set(subjectIds).size !==
        subjectIds.length
      ) {
        fail(
          409,
          'Duplicate subjects exist in this enrollment.'
        );
      }

      // ==================================================
      // DETERMINE OFFICIAL CURRICULUM
      // ==================================================

      const officialCurriculumId = validId(
        group.official_curriculum_id
      );

      if (
        officialCurriculumId &&
        requestedCurriculumId &&
        officialCurriculumId !==
          requestedCurriculumId
      ) {
        fail(
          409,
          'The selected curriculum does not match the official student curriculum.'
        );
      }

      const compatibleCurricula =
        await getCompatibleCurricula(
          programId,
          subjectIds,
          officialCurriculumId
        );

      if (!compatibleCurricula.length) {
        fail(
          409,
          'No active curriculum matches the prepared subject load.'
        );
      }

      let selectedCurriculum = null;

      const effectiveCurriculumId =
        officialCurriculumId ||
        requestedCurriculumId;

      if (effectiveCurriculumId) {
        selectedCurriculum =
          compatibleCurricula.find(
            item =>
              Number(item.curriculum_id) ===
              effectiveCurriculumId
          );
      } else if (
        compatibleCurricula.length === 1
      ) {
        selectedCurriculum =
          compatibleCurricula[0];
      } else {
        return res.status(409).json({
          code: 'CURRICULUM_SELECTION_REQUIRED',

          message:
            'Multiple curricula match the prepared subjects. Select the correct curriculum before confirmation.',

          curricula:
            compatibleCurricula
        });
      }

      if (!selectedCurriculum) {
        fail(
          400,
          'Selected curriculum is not compatible with the prepared subjects.'
        );
      }

      const selectedCurriculumId = Number(
        selectedCurriculum.curriculum_id
      );

      // ==================================================
      // OFFICIALLY UPDATE STUDENT PROFILE
      // ==================================================

      // Preserve the permanent student number,
      // existing year level and student type.
      //
      // No new student profile is created.

      let profileQuery = supabase
        .from('students')
        .update({
          program_id: programId,

          curriculum_id:
            selectedCurriculumId,

          status: 'active'
        })
        .eq('student_id', studentId)
        .eq('year_level', yearLevel)
        .eq('student_type', studentType)
        .eq(
          'status',
          group.student_status
        );

      // Ensure academic assignment has not
      // changed since the enrollment was reviewed.

      profileQuery =
        officialProgramId === null
          ? profileQuery.is(
              'program_id',
              null
            )
          : profileQuery.eq(
              'program_id',
              officialProgramId
            );

      profileQuery =
        officialCurriculumId === null
          ? profileQuery.is(
              'curriculum_id',
              null
            )
          : profileQuery.eq(
              'curriculum_id',
              officialCurriculumId
            );

      const {
        data: updatedStudent,
        error: studentError
      } = await profileQuery.select(`
        student_id,
        student_no,
        program_id,
        curriculum_id,
        year_level,
        student_type,
        status
      `);

      if (studentError) {
        throw databaseError(studentError);
      }

      if (
        !updatedStudent ||
        updatedStudent.length !== 1
      ) {
        fail(
          409,
          'Student academic information changed during confirmation. Refresh and review again.'
        );
      }

      // ==================================================
      // CONFIRM PREPARED SUBJECTS
      // ==================================================

      const {
        data: updated,
        error: enrollmentError
      } = await supabase
        .from('enrollments')
        .update({
          status: 'enrolled'
        })
        .in(
          'enrollment_id',
          group.enrollment_ids
        )
        .eq('student_id', studentId)
        .eq('status', 'pending')
        .select(`
          enrollment_id,
          student_id,
          offering_id,
          status
        `);

      if (enrollmentError) {
        console.error(
          'Enrollment confirmation failed after profile update:',
          enrollmentError
        );

        return res.status(500).json({
          code: 'PARTIAL_CONFIRMATION',

          message:
            'Student academic information was saved, but subject confirmation failed. Refresh and review the enrollment before retrying.'
        });
      }

      if (
        !updated ||
        updated.length !==
          group.enrollment_ids.length
      ) {
        return res.status(409).json({
          code: 'CONFIRMATION_CONFLICT',

          message:
            'Some enrollment records changed during confirmation. Refresh and review the current enrollment status.'
        });
      }

      // ==================================================
      // SUCCESSFUL CONFIRMATION
      // ==================================================

      return res.json({
        message:
          'Student enrollment confirmed successfully.',

        confirmed_subjects:
          updated.length,

        student_id:
          studentId,

        student_no:
          updatedStudent[0].student_no,

        program_id:
          programId,

        program_code:
          group.program_code,

        curriculum_id:
          selectedCurriculumId,

        curriculum_year:
          selectedCurriculum.curriculum_year,

        year_level:
          yearLevel,

        student_type:
          studentType,

        period_id:
          periodId,

        school_year:
          group.school_year,

        semester:
          group.semester,

        section_id:
          sectionId,

        section_code:
          group.section_code,

        student_status:
          'active',

        enrollment_status:
          'enrolled',

        student:
          updatedStudent[0],

        enrollments:
          updated
      });
    } catch (error) {
      return sendError(
        res,
        error,
        'Unable to confirm enrollment.'
      );
    }
  }
);

module.exports = router;