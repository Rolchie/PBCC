
const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

const id = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

const norm = (value) => String(value ?? '').trim().toLowerCase();

const term = (value) => {
  const v = norm(value);
  if (['1', '1st', 'first', 'first semester'].includes(v)) return 'first';
  if (['2', '2nd', 'second', 'second semester'].includes(v)) return 'second';
  if (['summer', 'summer term'].includes(v)) return 'summer';
  return v;
};

const passed = (value, maximum = 3) => {
  if (value === null || value === undefined || value === '') return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= maximum;
};

const failed = (value) => Number(value) === 5;

function fail(status, message) {
  const error = new Error(message);
  error.http = status;
  throw error;
}

async function rows(table, columns, filters = {}) {
  let query = supabase.from(table).select(columns);
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function byIds(table, columns, column, values) {
  const ids = [...new Set(values.map(Number).filter(Boolean))];
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

async function context(req, studentId, periodId) {
  const student = (await rows(
    'students',
    'student_id,student_no,first_name,middle_name,last_name,program_id,curriculum_id,year_level,status',
    { student_id: studentId }
  ))[0];

  if (!student || !req.assignedProgramIds.includes(Number(student.program_id))) {
    fail(403, 'Student not found in your assigned program.');
  }

  const curriculum = (await rows(
    'curricula',
    'curriculum_id,program_id,description,status',
    { curriculum_id: student.curriculum_id }
  ))[0];

  if (!curriculum ||
      Number(curriculum.program_id) !== Number(student.program_id) ||
      norm(curriculum.status) !== 'active') {
    fail(400, 'Student has no valid active curriculum.');
  }

  const period = (await rows(
    'academic_periods',
    'period_id,school_year,semester,status',
    { period_id: periodId }
  ))[0];

  if (!period) fail(404, 'Academic period not found.');

  return { student, curriculum, period };
}

async function sectionData(programId, periodId) {
  const sections = await rows(
    'sections',
    'section_id,section_code,program_id,year_level,period_id,capacity,status',
    { period_id: periodId }
  );

  const relevant = sections.filter(
    s => Number(s.program_id) === Number(programId)
  );

  const offerings = await rows(
    'subject_offerings',
    'offering_id,subject_id,section_id,period_id,status,max_slots',
    { period_id: periodId }
  );

  const sectionIds = new Set(relevant.map(s => Number(s.section_id)));
  const relevantOfferings = offerings.filter(
    o => sectionIds.has(Number(o.section_id))
  );

  const enrollments = await byIds(
    'enrollments',
    'student_id,offering_id,status',
    'offering_id',
    relevantOfferings.map(o => o.offering_id)
  );

  const offeringSection = new Map(
    relevantOfferings.map(o => [Number(o.offering_id), Number(o.section_id)])
  );

  const memberSets = new Map(
    relevant.map(s => [Number(s.section_id), new Set()])
  );

  for (const enrollment of enrollments) {
    if (!['pending', 'enrolled'].includes(norm(enrollment.status))) continue;
    const sid = offeringSection.get(Number(enrollment.offering_id));
    if (memberSets.has(sid)) {
      memberSets.get(sid).add(Number(enrollment.student_id));
    }
  }

  return {
    sections: relevant.map(s => ({
      ...s,
      enrolled_count: memberSets.get(Number(s.section_id))?.size || 0,
      remaining_slots: Math.max(
        0,
        Number(s.capacity || 0) -
        (memberSets.get(Number(s.section_id))?.size || 0)
      )
    })),
    offerings: relevantOfferings,
    enrollments,
    memberSets
  };
}

async function buildLoad(req, studentId, periodId) {
  const { student, curriculum, period } =
    await context(req, studentId, periodId);

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
      'subject_id,year_level,semester,is_required',
      { curriculum_id: curriculum.curriculum_id }
    ),
    rows(
      'subject_prerequisites',
      'subject_id,prerequisite_subject_id,minimum_grade,status'
    ),
    rows(
      'subjects',
      'subject_id,subject_code,subject_title,units,status'
    ),
    rows(
      'enrollments',
      'enrollment_id,student_id,offering_id,status',
      { student_id: studentId }
    ),
    rows(
      'student_credited_subjects',
      'subject_id,grade_value,status,validated_at',
      { student_id: studentId }
    ),
    sectionData(student.program_id, periodId)
  ]);

  const subjectMap = new Map(subjects.map(s => [Number(s.subject_id), s]));

  const historicalOfferings = await byIds(
    'subject_offerings',
    'offering_id,subject_id,section_id,period_id',
    'offering_id',
    studentEnrollments.map(e => e.offering_id)
  );

  const historicalMap = new Map(
    historicalOfferings.map(o => [Number(o.offering_id), o])
  );

  const grades = await byIds(
    'grades',
    'enrollment_id,grade,status',
    'enrollment_id',
    studentEnrollments.map(e => e.enrollment_id)
  );

  const gradesMap = new Map();
  for (const g of grades) {
    const key = Number(g.enrollment_id);
    if (!gradesMap.has(key)) gradesMap.set(key, []);
    gradesMap.get(key).push(g);
  }

  const completed = new Map();
  const failures = new Set();
  const alreadyEnrolled = new Set();
  const currentSectionIds = new Set();
  const prepared = [];

  for (const enrollment of studentEnrollments) {
    const offering = historicalMap.get(Number(enrollment.offering_id));
    if (!offering) continue;

    const subjectId = Number(offering.subject_id);
    const enrollmentStatus = norm(enrollment.status);
    const enrollmentGrades = gradesMap.get(Number(enrollment.enrollment_id)) || [];
    const finalGrades = enrollmentGrades.filter(
      g => ['finalized', 'posted', 'approved'].includes(norm(g.status))
    );

    if (
      Number(offering.period_id) === periodId &&
      ['pending', 'enrolled'].includes(enrollmentStatus)
    ) {
      alreadyEnrolled.add(subjectId);
      currentSectionIds.add(Number(offering.section_id));

      const s = subjectMap.get(subjectId);
      const sec = sectionInfo.sections.find(
        x => Number(x.section_id) === Number(offering.section_id)
      );

      prepared.push({
        enrollment_id: enrollment.enrollment_id,
        subject_id: subjectId,
        subject_code: s?.subject_code || '',
        subject_title: s?.subject_title || '',
        units: s?.units || 0,
        section_id: offering.section_id,
        section_code: sec?.section_code || '',
        status: enrollment.status
      });
    }

    if (enrollmentStatus === 'enrolled' && finalGrades.length === 0) {
      alreadyEnrolled.add(subjectId);
    }

    if (enrollmentStatus !== 'enrolled') continue;

    for (const grade of finalGrades) {
      if (passed(grade.grade)) {
        const previous = completed.get(subjectId);
        const value = Number(grade.grade);
        if (previous === undefined || value < previous) {
          completed.set(subjectId, value);
        }
      }
      if (failed(grade.grade)) failures.add(subjectId);
    }
  }

  for (const credit of credits) {
    if (
      !['approved', 'validated'].includes(norm(credit.status)) ||
      !credit.validated_at ||
      !passed(credit.grade_value)
    ) continue;

    const sid = Number(credit.subject_id);
    const grade = Number(credit.grade_value);
    const previous = completed.get(sid);

    if (previous === undefined || grade < previous) {
      completed.set(sid, grade);
    }
  }

  const uniqueLinks = new Map();
  for (const link of links) {
    uniqueLinks.set(Number(link.subject_id), link);
  }

  const loadSubjects = [...uniqueLinks.values()].map(link => {
    const subjectId = Number(link.subject_id);
    const subject = subjectMap.get(subjectId);
    if (!subject) return null;

    const required = prerequisites.filter(
      p =>
        Number(p.subject_id) === subjectId &&
        !['inactive', 'disabled'].includes(norm(p.status))
    );

    const missing = required.filter(p => {
      const minimum = p.minimum_grade == null ||
        String(p.minimum_grade).trim() === ''
        ? 3
        : Number(p.minimum_grade);
      const actual = completed.get(Number(p.prerequisite_subject_id));
      return actual === undefined ||
        !Number.isFinite(minimum) ||
        actual > minimum;
    }).map(p =>
      subjectMap.get(Number(p.prerequisite_subject_id))?.subject_code ||
      `Subject #${p.prerequisite_subject_id}`
    );

    const alreadyPassed = completed.has(subjectId);
    const enrolled = alreadyEnrolled.has(subjectId);
    const inactive = ['inactive', 'disabled'].includes(norm(subject.status));

    let reason = '';
    if (inactive) reason = 'Subject is inactive.';
    else if (alreadyPassed) reason = 'Already passed or credited.';
    else if (enrolled) reason = 'Already pending or enrolled.';
    else if (missing.length) reason = `Unmet prerequisites: ${missing.join(', ')}`;

    const eligible = !inactive && !alreadyPassed && !enrolled && !missing.length;

    return {
      ...subject,
      curriculum_year_level: link.year_level,
      curriculum_semester: link.semester,
      previously_failed: failures.has(subjectId) && !alreadyPassed,
      already_passed: alreadyPassed,
      already_enrolled: enrolled,
      unmet_prerequisites: missing,
      academically_eligible: eligible,
      eligible,
      reason
    };
  }).filter(Boolean).sort(
    (a, b) =>
      Number(a.curriculum_year_level) - Number(b.curriculum_year_level) ||
      String(a.subject_code).localeCompare(String(b.subject_code))
  );

  const existingSectionIds = [...currentSectionIds];

  return {
    student,
    curriculum,
    period,
    subjects: loadSubjects,
    sections: sectionInfo.sections.filter(
      s =>
        Number(s.year_level) === Number(student.year_level) &&
        norm(s.status) === 'active'
    ),
    prepared,
    existing_section_id:
      existingSectionIds.length === 1 ? existingSectionIds[0] : null,
    conflicting_sections: existingSectionIds.length > 1
  };
}

router.get('/student-loads', async (req, res) => {
  try {
    const studentId = id(req.query.student_id);
    const periodId = id(req.query.period_id);
    if (!studentId || !periodId) {
      fail(400, 'Student and academic period are required.');
    }

    return res.json(await buildLoad(req, studentId, periodId));
  } catch (error) {
    console.error('Load student subjects:', error);
    return res.status(error.http || 500).json({
      message: error.http ? error.message : 'Unable to load student subjects.'
    });
  }
});

// Existing route retained for compatibility.
// It creates offerings only; it never enrolls students.
router.post('/student-loads/setup-offerings', async (req, res) => {
  try {
    const studentId = id(req.body?.student_id);
    const periodId = id(req.body?.period_id);
    const sectionId = id(req.body?.section_id);
    const subjectIds = req.body?.subject_ids;

    if (!studentId || !periodId || !sectionId ||
        !Array.isArray(subjectIds) || !subjectIds.length) {
      fail(400, 'Student, period, section and subjects are required.');
    }

    const load = await buildLoad(req, studentId, periodId);
    if (norm(load.period.status) !== 'active') fail(400, 'Inactive period.');

    const section = load.sections.find(s => Number(s.section_id) === sectionId);
    if (!section) fail(400, 'Invalid or inactive section.');

    const requested = subjectIds.map(id);
    if (requested.some(x => !x) ||
        new Set(requested).size !== requested.length ||
        requested.length > 100) {
      fail(400, 'Invalid subject selection.');
    }

    for (const sid of requested) {
      const subject = load.subjects.find(s => Number(s.subject_id) === sid);
      if (!subject ||
          Number(subject.curriculum_year_level) !== Number(load.student.year_level) ||
          term(subject.curriculum_semester) !== term(load.period.semester)) {
        fail(400, 'Subject is not in this year and semester.');
      }
    }

    const existing = await rows(
      'subject_offerings',
      'subject_id',
      { section_id: sectionId, period_id: periodId }
    );

    const existingIds = new Set(existing.map(x => Number(x.subject_id)));
    const missing = requested.filter(sid => !existingIds.has(sid));

    if (missing.length) {
      const { error } = await supabase.from('subject_offerings').insert(
        missing.map(sid => ({
          subject_id: sid,
          section_id: sectionId,
          period_id: periodId,
          faculty_id: null,
          schedule: null,
          room: null,
          max_slots: Number(section.capacity) || null,
          status: 'active'
        }))
      );
      if (error) throw error;
    }

    return res.json({
      message: `${missing.length} missing offering(s) created.`,
      created_count: missing.length
    });
  } catch (error) {
    console.error('Setup offerings:', error);
    return res.status(error.http || 500).json({
      message: error.http ? error.message : 'Unable to set up offerings.'
    });
  }
});

// Prepare selected subjects first, then automatically resolve
// the offerings for the single section selected afterward.
router.post('/student-loads', async (req, res) => {
  try {
    const studentId = id(req.body?.student_id);
    const periodId = id(req.body?.period_id);
    let sectionId = id(req.body?.section_id);
    const offeringId = id(req.body?.offering_id);

    if (!studentId || !periodId) {
      fail(400, 'Student and period are required.');
    }

    // Preserve compatibility with the previous offering_id request.
    let subjectIds;
    if (offeringId) {
      const offering = (await rows(
        'subject_offerings',
        'offering_id,subject_id,section_id,period_id',
        { offering_id: offeringId }
      ))[0];

      if (!offering || Number(offering.period_id) !== periodId) {
        fail(400, 'Invalid offering.');
      }

      sectionId = Number(offering.section_id);
      subjectIds = [Number(offering.subject_id)];
    } else {
      if (!Array.isArray(req.body?.subject_ids)) {
        fail(400, 'Select at least one subject.');
      }
      subjectIds = req.body.subject_ids.map(id);
    }

    if (!sectionId || !subjectIds.length ||
        subjectIds.length > 100 ||
        subjectIds.some(x => !x) ||
        new Set(subjectIds).size !== subjectIds.length) {
      fail(400, 'Choose a section and valid subjects.');
    }

    const load = await buildLoad(req, studentId, periodId);

    if (norm(load.period.status) !== 'active') {
      fail(400, 'Academic period is inactive.');
    }

    if (load.conflicting_sections) {
      fail(409, 'Student has existing loads in multiple sections. Registrar review is required.');
    }

    if (load.existing_section_id &&
        Number(load.existing_section_id) !== sectionId) {
      fail(409, 'Student already has a different section this period.');
    }

    const section = load.sections.find(
      s => Number(s.section_id) === sectionId
    );

    if (!section) {
      fail(400, 'Section must match the student’s program, year and period.');
    }

    const selected = subjectIds.map(sid =>
      load.subjects.find(s => Number(s.subject_id) === sid)
    );

    for (const subject of selected) {
      if (!subject || !subject.academically_eligible) {
        fail(409, `${subject?.subject_code || 'Subject'} is not eligible.`);
      }

      const regular =
        Number(subject.curriculum_year_level) === Number(load.student.year_level) &&
        term(subject.curriculum_semester) === term(load.period.semester);

      if (!regular && !subject.previously_failed) {
        fail(400, `${subject.subject_code} is not a regular subject or eligible retake.`);
      }
    }

    // Count each student only once, regardless of subject count.
    const sectionInfo = await sectionData(load.student.program_id, periodId);
    const members = sectionInfo.memberSets.get(sectionId) || new Set();

    if (!members.has(studentId) &&
        members.size >= Number(section.capacity)) {
      fail(409, `${section.section_code} is full (${members.size}/${section.capacity}).`);
    }

    // Prevent re-enrolling subjects that became pending during the request.
    const fresh = await buildLoad(req, studentId, periodId);
    for (const sid of subjectIds) {
      const subject = fresh.subjects.find(s => Number(s.subject_id) === sid);
      if (!subject?.academically_eligible) {
        fail(409, 'Student load changed. Refresh and try again.');
      }
    }

    const existing = await rows(
      'subject_offerings',
      'offering_id,subject_id,section_id,period_id,status,max_slots',
      { section_id: sectionId, period_id: periodId }
    );

    const chosen = new Map();

    for (const sid of subjectIds) {
      const active = existing.find(
        o => Number(o.subject_id) === sid && norm(o.status) === 'active'
      );

      if (active) {
        chosen.set(sid, active);
        continue;
      }

      const inactive = existing.find(o => Number(o.subject_id) === sid);
      if (inactive) {
        fail(409, `Offering for subject #${sid} is inactive. Ask the Registrar to review it.`);
      }

      // Missing offering is automatically created.
      const { data, error } = await supabase
        .from('subject_offerings')
        .insert({
          subject_id: sid,
          section_id: sectionId,
          period_id: periodId,
          faculty_id: null,
          schedule: null,
          room: null,
          max_slots: Number(section.capacity),
          status: 'active'
        })
        .select('offering_id,subject_id,max_slots')
        .single();

      if (error) {
        if (error.code === '23505') {
          fail(409, 'Offering was created concurrently. Refresh and retry.');
        }
        throw error;
      }

      chosen.set(sid, data);
    }

    // Re-check slots for each offering.
    const offeringIds = [...chosen.values()].map(o => Number(o.offering_id));

    const occupied = await byIds(
      'enrollments',
      'student_id,offering_id,status',
      'offering_id',
      offeringIds
    );

    for (const subject of selected) {
      const offering = chosen.get(Number(subject.subject_id));
      const count = occupied.filter(
        e =>
          Number(e.offering_id) === Number(offering.offering_id) &&
          ['pending', 'enrolled'].includes(norm(e.status))
      ).length;

      const limit = Number(offering.max_slots || section.capacity);

      if (limit > 0 && count >= limit) {
        fail(409, `${subject.subject_code} has reached its offering capacity.`);
      }
    }

    const records = subjectIds.map(sid => ({
      student_id: studentId,
      offering_id: chosen.get(sid).offering_id,
      enrollment_date: new Date().toISOString().slice(0, 10),
      status: 'pending'
    }));

    const { data, error } = await supabase
      .from('enrollments')
      .insert(records)
      .select('enrollment_id,student_id,offering_id,status');

    if (error) {
      if (error.code === '23505') {
        fail(409, 'Duplicate enrollment detected. Refresh and retry.');
      }
      throw error;
    }

    return res.status(201).json({
      message:
        `${data.length} subject(s) prepared for ${section.section_code}. ` +
        'Pending Registrar confirmation.',
      enrollments: data,
      section_code: section.section_code
    });
  } catch (error) {
    console.error('Prepare student load:', error);
    return res.status(error.http || 500).json({
      message: error.http ? error.message : 'Unable to prepare enrollment.'
    });
  }
});

module.exports = router;
