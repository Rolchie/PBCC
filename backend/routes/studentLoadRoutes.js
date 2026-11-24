const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

const id = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const n = Number(value);

  return Number.isSafeInteger(n) && n > 0
    ? n
    : null;
};

const norm = (value) =>
  String(value ?? '').trim().toLowerCase();

const term = (value) => {
  const v = norm(value);

  if (
    ['1', '1st', 'first', 'first semester'].includes(v)
  ) {
    return 'first';
  }

  if (
    ['2', '2nd', 'second', 'second semester'].includes(v)
  ) {
    return 'second';
  }

  if (['summer', 'summer term'].includes(v)) {
    return 'summer';
  }

  return v;
};

const passed = (value, maximum = 3) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return false;
  }

  const n = Number(value);

  return (
    Number.isFinite(n) &&
    n >= 1 &&
    n <= maximum
  );
};

const failed = (value) => Number(value) === 5;

function fail(status, message) {
  const error = new Error(message);
  error.http = status;
  throw error;
}

async function rows(table, columns, filters = {}) {
  let query = supabase
    .from(table)
    .select(columns);

  for (const [key, value] of Object.entries(filters)) {
    query = value === null
      ? query.is(key, null)
      : query.eq(key, value);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function byIds(
  table,
  columns,
  column,
  values
) {
  const ids = [
    ...new Set(
      values.map(Number).filter(Boolean)
    )
  ];

  const result = [];

  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .in(column, ids.slice(i, i + 100));

    if (error) throw error;

    result.push(...(data || []));
  }

  return result;
}

function assignedPrograms(req) {
  return Array.isArray(req.assignedProgramIds)
    ? req.assignedProgramIds.map(Number)
    : [];
}

function requestInput(req) {
  return req.method === 'GET'
    ? req.query || {}
    : req.body || {};
}

// ======================================================
// STUDENT ACADEMIC CONTEXT
// ======================================================

async function context(req, studentId, periodId) {
  const input = requestInput(req);

  const authorizedPrograms = assignedPrograms(req);

  const student = (
    await rows(
      'students',
      `
        student_id,
        student_no,
        first_name,
        middle_name,
        last_name,
        program_id,
        curriculum_id,
        year_level,
        student_type,
        status
      `,
      { student_id: studentId }
    )
  )[0];

  if (!student) {
    fail(404, 'Student not found.');
  }

  const officialProgramId = id(student.program_id);
  const officialCurriculumId = id(student.curriculum_id);

  const requestedProgramId = id(input.program_id);
  const requestedCurriculumId = id(input.curriculum_id);

  const unassigned = officialProgramId === null;

  if (
    unassigned &&
    norm(student.status) !== 'pending'
  ) {
    fail(
      403,
      'Student is not awaiting initial enrollment.'
    );
  }

  const programId = unassigned
    ? requestedProgramId
    : officialProgramId;

  if (!programId) {
    fail(400, 'Select a program for the student.');
  }

  if (!authorizedPrograms.includes(programId)) {
    fail(
      403,
      'You are not authorized to manage this program.'
    );
  }

  if (
    requestedProgramId &&
    requestedProgramId !== programId
  ) {
    fail(
      400,
      'Selected program does not match the student.'
    );
  }

  const yearLevel = id(student.year_level);

  if (!yearLevel) {
    fail(
      400,
      'Student has no recorded year level. ' +
      'Contact the Administrator or Registrar.'
    );
  }

  const studentType = String(
    student.student_type || ''
  ).trim();

  if (!studentType) {
    fail(
      400,
      'Student has no recorded student type. ' +
      'Contact the Administrator or Registrar.'
    );
  }

  const program = (
    await rows(
      'programs',
      'program_id,program_code,status',
      { program_id: programId }
    )
  )[0];

  if (
    !program ||
    norm(program.status) !== 'active'
  ) {
    fail(400, 'Selected program is inactive.');
  }

  const period = (
    await rows(
      'academic_periods',
      `
        period_id,
        school_year,
        semester,
        status
      `,
      { period_id: periodId }
    )
  )[0];

  if (!period) {
    fail(404, 'Academic period not found.');
  }

  // Determine whether the student already has a
  // pending or confirmed load for this academic period.

  const studentEnrollments = await rows(
    'enrollments',
    'enrollment_id,offering_id,status',
    { student_id: studentId }
  );

  const currentEnrollments = studentEnrollments.filter(
    enrollment =>
      ['pending', 'enrolled'].includes(
        norm(enrollment.status)
      )
  );

  const currentOfferings = await byIds(
    'subject_offerings',
    'offering_id,subject_id,section_id,period_id',
    'offering_id',
    currentEnrollments.map(
      enrollment => enrollment.offering_id
    )
  );

  const periodOfferings = currentOfferings.filter(
    offering =>
      Number(offering.period_id) === periodId
  );

  const existingSections = await byIds(
    'sections',
    'section_id,program_id,year_level,period_id',
    'section_id',
    periodOfferings.map(
      offering => offering.section_id
    )
  );

  const existingProgramIds = [
    ...new Set(
      existingSections
        .map(section => id(section.program_id))
        .filter(Boolean)
    )
  ];

  if (existingProgramIds.length > 1) {
    fail(
      409,
      'Student has existing enrollments in multiple ' +
      'programs. Registrar review is required.'
    );
  }

  if (
    existingProgramIds.length === 1 &&
    existingProgramIds[0] !== programId
  ) {
    fail(
      409,
      'Student already has a prepared enrollment ' +
      'under another program for this academic period.'
    );
  }

  // Retrieve active curricula dynamically.

  const availableCurricula = await rows(
    'curricula',
    `
      curriculum_id,
      program_id,
      curriculum_year,
      description,
      status
    `,
    { program_id: programId }
  );

  const activeCurricula = availableCurricula.filter(
    curriculum =>
      norm(curriculum.status) === 'active'
  );

  if (
    officialCurriculumId &&
    requestedCurriculumId &&
    officialCurriculumId !== requestedCurriculumId
  ) {
    fail(
      400,
      'Selected curriculum does not match ' +
      'the student’s official curriculum.'
    );
  }

  const curriculumId =
    officialCurriculumId ||
    requestedCurriculumId;

  let curriculum = null;

  if (curriculumId) {
    curriculum = activeCurricula.find(
      item =>
        Number(item.curriculum_id) === curriculumId
    );
  } else if (activeCurricula.length === 1) {
    curriculum = activeCurricula[0];
  } else if (activeCurricula.length > 1) {
    fail(
      400,
      'Multiple active curricula are available. ' +
      'Select the appropriate curriculum.'
    );
  }

  if (!curriculum) {
    fail(
      400,
      'No valid active curriculum is available ' +
      'for the selected program.'
    );
  }

  if (
    Number(curriculum.program_id) !== programId
  ) {
    fail(
      400,
      'Curriculum does not belong to the selected program.'
    );
  }

  // Ensure existing prepared subjects remain compatible
  // with the selected curriculum.

  if (periodOfferings.length > 0) {
    const curriculumSubjects = await rows(
      'curriculum_subjects',
      'subject_id',
      {
        curriculum_id: curriculum.curriculum_id
      }
    );

    const curriculumSubjectIds = new Set(
      curriculumSubjects.map(
        item => Number(item.subject_id)
      )
    );

    const incompatibleSubjects = periodOfferings.filter(
      offering =>
        !curriculumSubjectIds.has(
          Number(offering.subject_id)
        )
    );

    if (incompatibleSubjects.length > 0) {
      fail(
        409,
        'Existing prepared subjects do not match ' +
        'the selected curriculum. Registrar review ' +
        'is required.'
      );
    }
  }

  // Program and curriculum are resolved for preparation
  // only. The official student record is not updated.

  return {
    student: {
      ...student,
      year_level: yearLevel,
      student_type: studentType,
      program_id: programId,
      curriculum_id: curriculum.curriculum_id,
      official_program_id: officialProgramId,
      official_curriculum_id: officialCurriculumId,
      is_unassigned: unassigned
    },
    program,
    curriculum,
    period
  };
}

// ======================================================
// AVAILABLE CURRICULA
// ======================================================

router.get('/student-loads/curricula', async (req, res) => {
  try {
    const programId = id(req.query.program_id);

    if (!programId) {
      fail(400, 'Program is required.');
    }

    if (!assignedPrograms(req).includes(programId)) {
      fail(
        403,
        'You are not authorized to manage this program.'
      );
    }

    const curricula = await rows(
      'curricula',
      `
        curriculum_id,
        program_id,
        curriculum_year,
        description,
        status
      `,
      { program_id: programId }
    );

    const activeCurricula = curricula
      .filter(
        curriculum =>
          norm(curriculum.status) === 'active'
      )
      .sort(
        (a, b) =>
          String(b.curriculum_year || '').localeCompare(
            String(a.curriculum_year || ''),
            undefined,
            { numeric: true }
          )
      );

    return res.json({
      curricula: activeCurricula
    });
  } catch (error) {
    console.error('Load available curricula:', error);

    return res.status(error.http || 500).json({
      message: error.http
        ? error.message
        : 'Unable to retrieve available curricula.'
    });
  }
});

// ======================================================
// SECTION DATA AND CAPACITY
// ======================================================

async function sectionData(programId, periodId) {
  const sections = await rows(
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
    { period_id: periodId }
  );

  const relevant = sections.filter(
    section =>
      Number(section.program_id) === Number(programId)
  );

  const offerings = await rows(
    'subject_offerings',
    `
      offering_id,
      subject_id,
      section_id,
      period_id,
      status,
      max_slots
    `,
    { period_id: periodId }
  );

  const sectionIds = new Set(
    relevant.map(
      section => Number(section.section_id)
    )
  );

  const relevantOfferings = offerings.filter(
    offering =>
      sectionIds.has(
        Number(offering.section_id)
      )
  );

  const enrollments = await byIds(
    'enrollments',
    'student_id,offering_id,status',
    'offering_id',
    relevantOfferings.map(
      offering => offering.offering_id
    )
  );

  const offeringSection = new Map(
    relevantOfferings.map(
      offering => [
        Number(offering.offering_id),
        Number(offering.section_id)
      ]
    )
  );

  const memberSets = new Map(
    relevant.map(
      section => [
        Number(section.section_id),
        new Set()
      ]
    )
  );

  for (const enrollment of enrollments) {
    if (
      !['pending', 'enrolled'].includes(
        norm(enrollment.status)
      )
    ) {
      continue;
    }

    const sectionId = offeringSection.get(
      Number(enrollment.offering_id)
    );

    if (memberSets.has(sectionId)) {
      memberSets.get(sectionId).add(
        Number(enrollment.student_id)
      );
    }
  }

  return {
    sections: relevant.map(section => {
      const enrolledCount =
        memberSets.get(
          Number(section.section_id)
        )?.size || 0;

      return {
        ...section,
        enrolled_count: enrolledCount,
        remaining_slots: Math.max(
          0,
          Number(section.capacity || 0) -
          enrolledCount
        )
      };
    }),

    offerings: relevantOfferings,
    enrollments,
    memberSets
  };
}

// ======================================================
// BUILD STUDENT SUBJECT LOAD
// ======================================================

async function buildLoad(req, studentId, periodId) {
  const {
    student,
    program,
    curriculum,
    period
  } = await context(
    req,
    studentId,
    periodId
  );

  const [
    links,
    prerequisites,
    subjects,
    studentEnrollments,
    credits,
    sectionInfo
  ] = await Promise.all([
    rows(
      'curriculum_subjects',
      `
        subject_id,
        year_level,
        semester,
        is_required
      `,
      {
        curriculum_id: curriculum.curriculum_id
      }
    ),

    rows(
      'subject_prerequisites',
      `
        subject_id,
        prerequisite_subject_id,
        minimum_grade,
        status
      `
    ),

    rows(
      'subjects',
      `
        subject_id,
        subject_code,
        subject_title,
        units,
        status
      `
    ),

    rows(
      'enrollments',
      `
        enrollment_id,
        student_id,
        offering_id,
        status
      `,
      { student_id: studentId }
    ),

    rows(
      'student_credited_subjects',
      `
        subject_id,
        grade_value,
        status,
        validated_at
      `,
      { student_id: studentId }
    ),

    sectionData(
      student.program_id,
      periodId
    )
  ]);

  const subjectMap = new Map(
    subjects.map(
      subject => [
        Number(subject.subject_id),
        subject
      ]
    )
  );

  const historicalOfferings = await byIds(
    'subject_offerings',
    `
      offering_id,
      subject_id,
      section_id,
      period_id
    `,
    'offering_id',
    studentEnrollments.map(
      enrollment => enrollment.offering_id
    )
  );

  const historicalMap = new Map(
    historicalOfferings.map(
      offering => [
        Number(offering.offering_id),
        offering
      ]
    )
  );

  const grades = await byIds(
    'grades',
    'enrollment_id,grade,status',
    'enrollment_id',
    studentEnrollments.map(
      enrollment => enrollment.enrollment_id
    )
  );

  const gradesMap = new Map();

  for (const grade of grades) {
    const key = Number(grade.enrollment_id);

    if (!gradesMap.has(key)) {
      gradesMap.set(key, []);
    }

    gradesMap.get(key).push(grade);
  }

  const completed = new Map();
  const failures = new Set();
  const alreadyEnrolled = new Set();
  const currentSectionIds = new Set();
  const prepared = [];

  for (const enrollment of studentEnrollments) {
    const offering = historicalMap.get(
      Number(enrollment.offering_id)
    );

    if (!offering) continue;

    const subjectId = Number(
      offering.subject_id
    );

    const enrollmentStatus = norm(
      enrollment.status
    );

    const enrollmentGrades =
      gradesMap.get(
        Number(enrollment.enrollment_id)
      ) || [];

    const finalGrades = enrollmentGrades.filter(
      grade =>
        [
          'finalized',
          'posted',
          'approved'
        ].includes(norm(grade.status))
    );

    const isCurrentPeriod =
      Number(offering.period_id) === periodId;

    if (
      isCurrentPeriod &&
      ['pending', 'enrolled'].includes(
        enrollmentStatus
      )
    ) {
      alreadyEnrolled.add(subjectId);

      currentSectionIds.add(
        Number(offering.section_id)
      );

      const subject = subjectMap.get(subjectId);

      const section = sectionInfo.sections.find(
        item =>
          Number(item.section_id) ===
          Number(offering.section_id)
      );

      prepared.push({
        enrollment_id: enrollment.enrollment_id,
        subject_id: subjectId,
        subject_code: subject?.subject_code || '',
        subject_title: subject?.subject_title || '',
        units: subject?.units || 0,
        section_id: offering.section_id,
        section_code: section?.section_code || '',
        status: enrollment.status
      });
    }

    if (
      enrollmentStatus === 'enrolled' &&
      finalGrades.length === 0
    ) {
      alreadyEnrolled.add(subjectId);
    }

    if (enrollmentStatus !== 'enrolled') {
      continue;
    }

    for (const grade of finalGrades) {
      if (passed(grade.grade)) {
        const previous = completed.get(subjectId);

        const value = Number(grade.grade);

        if (
          previous === undefined ||
          value < previous
        ) {
          completed.set(subjectId, value);
        }
      }

      if (failed(grade.grade)) {
        failures.add(subjectId);
      }
    }
  }

  // Include validated credited subjects.

  for (const credit of credits) {
    if (
      !['approved', 'validated'].includes(
        norm(credit.status)
      ) ||
      !credit.validated_at ||
      !passed(credit.grade_value)
    ) {
      continue;
    }

    const subjectId = Number(credit.subject_id);

    const grade = Number(credit.grade_value);

    const previous = completed.get(subjectId);

    if (
      previous === undefined ||
      grade < previous
    ) {
      completed.set(subjectId, grade);
    }
  }

  const uniqueLinks = new Map();

  for (const link of links) {
    uniqueLinks.set(
      Number(link.subject_id),
      link
    );
  }

  const loadSubjects = [...uniqueLinks.values()]
    .map(link => {
      const subjectId = Number(link.subject_id);

      const subject = subjectMap.get(subjectId);

      if (!subject) return null;

      const required = prerequisites.filter(
        prerequisite =>
          Number(prerequisite.subject_id) === subjectId &&
          !['inactive', 'disabled'].includes(
            norm(prerequisite.status)
          )
      );

      const missing = required
        .filter(prerequisite => {
          const minimum =
            prerequisite.minimum_grade == null ||
            String(
              prerequisite.minimum_grade
            ).trim() === ''
              ? 3
              : Number(
                  prerequisite.minimum_grade
                );

          const actual = completed.get(
            Number(
              prerequisite.prerequisite_subject_id
            )
          );

          return (
            actual === undefined ||
            !Number.isFinite(minimum) ||
            actual > minimum
          );
        })
        .map(prerequisite =>
          subjectMap.get(
            Number(
              prerequisite.prerequisite_subject_id
            )
          )?.subject_code ||
          `Subject #${prerequisite.prerequisite_subject_id}`
        );

      const alreadyPassed = completed.has(
        subjectId
      );

      const enrolled = alreadyEnrolled.has(
        subjectId
      );

      const inactive = [
        'inactive',
        'disabled'
      ].includes(norm(subject.status));

      let reason = '';

      if (inactive) {
        reason = 'Subject is inactive.';
      } else if (alreadyPassed) {
        reason = 'Already passed or credited.';
      } else if (enrolled) {
        reason = 'Already pending or enrolled.';
      } else if (missing.length) {
        reason =
          `Unmet prerequisites: ${missing.join(', ')}`;
      }

      const eligible =
        !inactive &&
        !alreadyPassed &&
        !enrolled &&
        !missing.length;

      return {
        ...subject,

        curriculum_year_level:
          link.year_level,

        curriculum_semester:
          link.semester,

        previously_failed:
          failures.has(subjectId) &&
          !alreadyPassed,

        already_passed: alreadyPassed,

        already_enrolled: enrolled,

        unmet_prerequisites: missing,

        academically_eligible: eligible,

        eligible,

        reason
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        Number(a.curriculum_year_level) -
        Number(b.curriculum_year_level) ||
        String(a.subject_code).localeCompare(
          String(b.subject_code)
        )
    );

  const existingSectionIds = [
    ...currentSectionIds
  ];

  // Determine available year levels from the
  // curriculum instead of hardcoding them.

  const curriculumYearLevels = [
    ...new Set(
      links
        .map(link => id(link.year_level))
        .filter(Boolean)
    )
  ].sort((a, b) => a - b);

  return {
    student,

    program,

    curriculum,

    period,

    curriculum_year_levels:
      curriculumYearLevels,

    subjects: loadSubjects,

    sections: sectionInfo.sections.filter(
      section =>
        Number(section.year_level) ===
          Number(student.year_level) &&
        norm(section.status) === 'active'
    ),

    prepared,

    existing_section_id:
      existingSectionIds.length === 1
        ? existingSectionIds[0]
        : null,

    conflicting_sections:
      existingSectionIds.length > 1
  };
}

// ======================================================
// GET STUDENT SUBJECT LOAD
// ======================================================

router.get('/student-loads', async (req, res) => {
  try {
    const studentId = id(
      req.query.student_id
    );

    const periodId = id(
      req.query.period_id
    );

    if (!studentId || !periodId) {
      fail(
        400,
        'Student and academic period are required.'
      );
    }

    const load = await buildLoad(
      req,
      studentId,
      periodId
    );

    return res.json(load);
  } catch (error) {
    console.error(
      'Load student subjects:',
      error
    );

    return res.status(
      error.http || 500
    ).json({
      message: error.http
        ? error.message
        : 'Unable to load student subjects.'
    });
  }
});

// ======================================================
// SETUP SUBJECT OFFERINGS
// ======================================================

// This route creates offerings only.
// It does not enroll students or update student profiles.

router.post(
  '/student-loads/setup-offerings',
  async (req, res) => {
    try {
      const studentId = id(
        req.body?.student_id
      );

      const periodId = id(
        req.body?.period_id
      );

      const sectionId = id(
        req.body?.section_id
      );

      const subjectIds =
        req.body?.subject_ids;

      if (
        !studentId ||
        !periodId ||
        !sectionId ||
        !Array.isArray(subjectIds) ||
        !subjectIds.length
      ) {
        fail(
          400,
          'Student, period, section and subjects ' +
          'are required.'
        );
      }

      const load = await buildLoad(
        req,
        studentId,
        periodId
      );

      if (
        norm(load.period.status) !== 'active'
      ) {
        fail(
          400,
          'Academic period is inactive.'
        );
      }

      const section = load.sections.find(
        item =>
          Number(item.section_id) === sectionId
      );

      if (!section) {
        fail(
          400,
          'Invalid or inactive section.'
        );
      }

      if (load.conflicting_sections) {
        fail(
          409,
          'Student has existing loads in multiple ' +
          'sections. Registrar review is required.'
        );
      }

      if (
        load.existing_section_id &&
        Number(load.existing_section_id) !== sectionId
      ) {
        fail(
          409,
          'Student already has a different section ' +
          'for this academic period.'
        );
      }

      const requested = subjectIds.map(id);

      if (
        requested.some(item => !item) ||
        new Set(requested).size !== requested.length ||
        requested.length > 100
      ) {
        fail(
          400,
          'Invalid subject selection.'
        );
      }

      for (const subjectId of requested) {
        const subject = load.subjects.find(
          item =>
            Number(item.subject_id) === subjectId
        );

        if (
          !subject ||
          Number(subject.curriculum_year_level) !==
            Number(load.student.year_level) ||
          term(subject.curriculum_semester) !==
            term(load.period.semester)
        ) {
          fail(
            400,
            'Subject is not in this year and semester.'
          );
        }
      }

      const existing = await rows(
        'subject_offerings',
        'subject_id',
        {
          section_id: sectionId,
          period_id: periodId
        }
      );

      const existingIds = new Set(
        existing.map(
          item => Number(item.subject_id)
        )
      );

      const missing = requested.filter(
        subjectId =>
          !existingIds.has(subjectId)
      );

      if (missing.length) {
        const { error } = await supabase
          .from('subject_offerings')
          .insert(
            missing.map(subjectId => ({
              subject_id: subjectId,
              section_id: sectionId,
              period_id: periodId,
              faculty_id: null,
              schedule: null,
              room: null,
              max_slots:
                Number(section.capacity) || null,
              status: 'active'
            }))
          );

        if (error) throw error;
      }

      return res.json({
        message:
          `${missing.length} missing offering(s) created.`,

        created_count: missing.length
      });
    } catch (error) {
      console.error(
        'Setup offerings:',
        error
      );

      return res.status(
        error.http || 500
      ).json({
        message: error.http
          ? error.message
          : 'Unable to set up offerings.'
      });
    }
  }
);

// ======================================================
// PREPARE STUDENT ENROLLMENT
// ======================================================

router.post('/student-loads', async (req, res) => {
  try {
    const studentId = id(
      req.body?.student_id
    );

    const periodId = id(
      req.body?.period_id
    );

    let sectionId = id(
      req.body?.section_id
    );

    const offeringId = id(
      req.body?.offering_id
    );

    if (!studentId || !periodId) {
      fail(
        400,
        'Student and academic period are required.'
      );
    }

    let subjectIds;

    // Maintain compatibility with previous
    // offering_id requests.

    if (offeringId) {
      const offering = (
        await rows(
          'subject_offerings',
          `
            offering_id,
            subject_id,
            section_id,
            period_id
          `,
          {
            offering_id: offeringId
          }
        )
      )[0];

      if (
        !offering ||
        Number(offering.period_id) !== periodId
      ) {
        fail(400, 'Invalid offering.');
      }

      sectionId = Number(
        offering.section_id
      );

      subjectIds = [
        Number(offering.subject_id)
      ];
    } else {
      if (
        !Array.isArray(req.body?.subject_ids)
      ) {
        fail(
          400,
          'Select at least one subject.'
        );
      }

      subjectIds = req.body.subject_ids.map(id);
    }

    if (
      !sectionId ||
      !subjectIds.length ||
      subjectIds.length > 100 ||
      subjectIds.some(item => !item) ||
      new Set(subjectIds).size !== subjectIds.length
    ) {
      fail(
        400,
        'Choose a section and valid subjects.'
      );
    }

    const load = await buildLoad(
      req,
      studentId,
      periodId
    );

    if (
      norm(load.period.status) !== 'active'
    ) {
      fail(
        400,
        'Academic period is inactive.'
      );
    }

    if (load.conflicting_sections) {
      fail(
        409,
        'Student has existing loads in multiple ' +
        'sections. Registrar review is required.'
      );
    }

    if (
      load.existing_section_id &&
      Number(load.existing_section_id) !== sectionId
    ) {
      fail(
        409,
        'Student already has a different section ' +
        'for this academic period.'
      );
    }

    const section = load.sections.find(
      item =>
        Number(item.section_id) === sectionId
    );

    if (!section) {
      fail(
        400,
        'Section must match the student’s ' +
        'program, year level and academic period.'
      );
    }

    const selected = subjectIds.map(
      subjectId =>
        load.subjects.find(
          subject =>
            Number(subject.subject_id) === subjectId
        )
    );

    // Validate academic eligibility.

    for (const subject of selected) {
      if (
        !subject ||
        !subject.academically_eligible
      ) {
        fail(
          409,
          `${subject?.subject_code || 'Subject'} ` +
          'is not eligible.'
        );
      }

      const regular =
        Number(subject.curriculum_year_level) ===
          Number(load.student.year_level) &&
        term(subject.curriculum_semester) ===
          term(load.period.semester);

      if (
        !regular &&
        !subject.previously_failed
      ) {
        fail(
          400,
          `${subject.subject_code} is not a regular ` +
          'subject or eligible retake.'
        );
      }
    }

    // Count each student only once regardless
    // of the number of enrolled subjects.

    const sectionInfo = await sectionData(
      load.student.program_id,
      periodId
    );

    const members =
      sectionInfo.memberSets.get(sectionId) ||
      new Set();

    const sectionCapacity = Number(
      section.capacity || 0
    );

    if (
      !Number.isFinite(sectionCapacity) ||
      sectionCapacity <= 0
    ) {
      fail(
        400,
        'Selected section has an invalid capacity.'
      );
    }

    if (
      !members.has(studentId) &&
      members.size >= sectionCapacity
    ) {
      fail(
        409,
        `${section.section_code} is full ` +
        `(${members.size}/${sectionCapacity}).`
      );
    }

    // Refresh academic information before preparing
    // enrollment to detect intervening changes.

    const fresh = await buildLoad(
      req,
      studentId,
      periodId
    );

    if (
      norm(fresh.period.status) !== 'active'
    ) {
      fail(
        409,
        'Academic period is no longer active.'
      );
    }

    if (
      Number(fresh.student.year_level) !==
        Number(load.student.year_level) ||
      Number(fresh.student.program_id) !==
        Number(load.student.program_id) ||
      Number(fresh.student.curriculum_id) !==
        Number(load.student.curriculum_id) ||
      norm(fresh.student.student_type) !==
        norm(load.student.student_type)
    ) {
      fail(
        409,
        'Student academic information has changed. ' +
        'Refresh and try again.'
      );
    }

    if (
      fresh.conflicting_sections ||
      (
        fresh.existing_section_id &&
        Number(fresh.existing_section_id) !== sectionId
      )
    ) {
      fail(
        409,
        'Student section assignment has changed. ' +
        'Refresh and try again.'
      );
    }

    const freshSection = fresh.sections.find(
      item =>
        Number(item.section_id) === sectionId
    );

    if (!freshSection) {
      fail(
        409,
        'Selected section is no longer available.'
      );
    }

    for (const subjectId of subjectIds) {
      const subject = fresh.subjects.find(
        item =>
          Number(item.subject_id) === subjectId
      );

      if (!subject?.academically_eligible) {
        fail(
          409,
          'Student load has changed. ' +
          'Refresh and try again.'
        );
      }
    }

    // Retrieve existing offerings.

    const existing = await rows(
      'subject_offerings',
      `
        offering_id,
        subject_id,
        section_id,
        period_id,
        status,
        max_slots
      `,
      {
        section_id: sectionId,
        period_id: periodId
      }
    );

    const chosen = new Map();

    for (const subjectId of subjectIds) {
      const active = existing.find(
        offering =>
          Number(offering.subject_id) === subjectId &&
          norm(offering.status) === 'active'
      );

      if (active) {
        chosen.set(subjectId, active);
        continue;
      }

      const inactive = existing.find(
        offering =>
          Number(offering.subject_id) === subjectId
      );

      if (inactive) {
        fail(
          409,
          `Offering for subject #${subjectId} ` +
          'is inactive. Ask the Registrar to review it.'
        );
      }

      // Automatically create missing offerings.

      const { data, error } = await supabase
        .from('subject_offerings')
        .insert({
          subject_id: subjectId,
          section_id: sectionId,
          period_id: periodId,
          faculty_id: null,
          schedule: null,
          room: null,
          max_slots: Number(
            freshSection.capacity
          ),
          status: 'active'
        })
        .select(
          'offering_id,subject_id,max_slots'
        )
        .single();

      if (error) {
        if (error.code === '23505') {
          fail(
            409,
            'Offering was created concurrently. ' +
            'Refresh and retry.'
          );
        }

        throw error;
      }

      chosen.set(subjectId, data);
    }

    // Recheck section capacity.

    const latestSectionInfo = await sectionData(
      load.student.program_id,
      periodId
    );

    const latestSection =
      latestSectionInfo.sections.find(
        item =>
          Number(item.section_id) === sectionId
      );

    if (
      !latestSection ||
      norm(latestSection.status) !== 'active'
    ) {
      fail(
        409,
        'Selected section is no longer active.'
      );
    }

    const latestMembers =
      latestSectionInfo.memberSets.get(sectionId) ||
      new Set();

    const latestCapacity = Number(
      latestSection.capacity || 0
    );

    if (
      latestCapacity <= 0 ||
      (
        !latestMembers.has(studentId) &&
        latestMembers.size >= latestCapacity
      )
    ) {
      fail(
        409,
        'Selected section has reached its capacity.'
      );
    }

    // Recheck individual subject offering capacity.

    const offeringIds = [
      ...chosen.values()
    ].map(
      offering =>
        Number(offering.offering_id)
    );

    const occupied = await byIds(
      'enrollments',
      'student_id,offering_id,status',
      'offering_id',
      offeringIds
    );

    for (const subject of selected) {
      const offering = chosen.get(
        Number(subject.subject_id)
      );

      const activeEnrollments = occupied.filter(
        enrollment =>
          Number(enrollment.offering_id) ===
            Number(offering.offering_id) &&
          ['pending', 'enrolled'].includes(
            norm(enrollment.status)
          )
      );

      const duplicate = activeEnrollments.some(
        enrollment =>
          Number(enrollment.student_id) === studentId
      );

      if (duplicate) {
        fail(
          409,
          `${subject.subject_code} is already ` +
          'pending or enrolled.'
        );
      }

      const limit = Number(
        offering.max_slots ||
        latestCapacity
      );

      if (
        limit > 0 &&
        activeEnrollments.length >= limit
      ) {
        fail(
          409,
          `${subject.subject_code} has reached ` +
          'its offering capacity.'
        );
      }
    }

    // Use Philippine local date for enrollment records.

    const dateParts = new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    ).formatToParts(new Date());

    const dateValue = type =>
      dateParts.find(
        part => part.type === type
      )?.value;

    const enrollmentDate =
      `${dateValue('year')}-` +
      `${dateValue('month')}-` +
      `${dateValue('day')}`;

    // Only existing enrollment columns are used.
    // No new columns or tables are required.

    const records = subjectIds.map(
      subjectId => ({
        student_id: studentId,

        offering_id:
          chosen.get(subjectId).offering_id,

        enrollment_date: enrollmentDate,

        status: 'pending'
      })
    );

    const { data, error } = await supabase
      .from('enrollments')
      .insert(records)
      .select(
        `
          enrollment_id,
          student_id,
          offering_id,
          status
        `
      );

    if (error) {
      if (error.code === '23505') {
        fail(
          409,
          'Duplicate enrollment detected. ' +
          'Refresh and retry.'
        );
      }

      throw error;
    }

    // Do not update the student's official program,
    // curriculum, year level or student type here.
    //
    // Official academic assignment is handled by
    // the Registrar during enrollment confirmation.

    return res.status(201).json({
      message:
        `${data.length} subject(s) prepared for ` +
        `${section.section_code}. ` +
        'Pending Registrar confirmation.',

      enrollments: data,

      section_code: section.section_code,

      student_id: studentId,

      program_id: load.student.program_id,

      curriculum_id: load.student.curriculum_id,

      year_level: load.student.year_level,

      student_type: load.student.student_type,

      period_id: periodId,

      school_year: load.period.school_year,

      semester: load.period.semester,

      requires_registrar_confirmation: true
    });
  } catch (error) {
    console.error(
      'Prepare student load:',
      error
    );

    return res.status(
      error.http || 500
    ).json({
      message: error.http
        ? error.message
        : 'Unable to prepare enrollment.'
    });
  }
});

module.exports = router;