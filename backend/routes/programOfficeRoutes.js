
const express = require('express');
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(
  authenticateUser,
  requireRole('Program Office Personnel')
);

const STUDENT_COLUMNS = `
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
`;

function parseId(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0
    ? number
    : null;
}

function normalizeTerm(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function sameTerm(a, b) {
  return normalizeTerm(a) === normalizeTerm(b);
}

async function getAssignedProgramIds(userId) {
  const { data, error } = await supabase
    .from('user_program_assignments')
    .select('program_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) throw error;

  return [
    ...new Set(
      (data || [])
        .map((row) => Number(row.program_id))
        .filter((id) => Number.isSafeInteger(id) && id > 0)
    )
  ];
}

router.use(async (req, res, next) => {
  try {
    const programIds = await getAssignedProgramIds(
      req.user.user_id
    );

    if (!programIds.length) {
      return res.status(403).json({
        message:
          'Your account has no active program assignment. Contact the administrator.'
      });
    }

    req.assignedProgramIds = programIds;
    next();
  } catch (error) {
    console.error('Program assignment lookup error:', error);

    return res.status(500).json({
      message: 'Unable to verify your program access.'
    });
  }
});

async function findAuthorizedSection(sectionId, programIds) {
  const { data, error } = await supabase
    .from('sections')
    .select(
      'section_id, section_code, program_id, year_level, period_id, capacity, status'
    )
    .eq('section_id', sectionId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return { section: null, reason: 'not_found' };
  }

  if (!programIds.includes(Number(data.program_id))) {
    return { section: null, reason: 'forbidden' };
  }

  return { section: data, reason: null };
}

// STUDENT RECORDS
router.get('/students', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select(STUDENT_COLUMNS)
      .in('program_id', req.assignedProgramIds)
      .order('student_id', { ascending: false });

    if (error) throw error;

    return res.json({
      message: 'Student records retrieved successfully.',
      students: data || []
    });
  } catch (error) {
    console.error('Fetch program students error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve student records.'
    });
  }
});

// ASSIGNED PROGRAMS
router.get('/programs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('programs')
      .select(
        'program_id, program_code, program_name, degree_level, status'
      )
      .in('program_id', req.assignedProgramIds)
      .eq('status', 'active')
      .order('program_name');

    if (error) throw error;

    return res.json({
      message: 'Programs retrieved successfully.',
      programs: data || []
    });
  } catch (error) {
    console.error('Fetch assigned programs error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve programs.'
    });
  }
});

// ASSIGNED CURRICULA
router.get('/curricula', async (req, res) => {
  try {
    let programIds = req.assignedProgramIds;

    if (req.query.program_id !== undefined) {
      const programId = parseId(req.query.program_id);

      if (!programId) {
        return res.status(400).json({
          message: 'Invalid program ID.'
        });
      }

      if (!programIds.includes(programId)) {
        return res.status(403).json({
          message: 'You are not assigned to this program.'
        });
      }

      programIds = [programId];
    }

    const { data, error } = await supabase
      .from('curricula')
      .select(
        'curriculum_id, program_id, curriculum_year, description, status'
      )
      .in('program_id', programIds)
      .eq('status', 'active')
      .order('curriculum_year', { ascending: false });

    if (error) throw error;

    return res.json({
      message: 'Curricula retrieved successfully.',
      curricula: data || []
    });
  } catch (error) {
    console.error('Fetch assigned curricula error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve curricula.'
    });
  }
});

// APPROVED CURRICULUM SUBJECTS
router.get('/curriculum-subjects', async (req, res) => {
  try {
    const curriculumId = parseId(req.query.curriculum_id);

    if (!curriculumId) {
      return res.status(400).json({
        message: 'A valid curriculum ID is required.'
      });
    }

    const {
      data: curriculum,
      error: curriculumError
    } = await supabase
      .from('curricula')
      .select(
        'curriculum_id, program_id, curriculum_year, description, status'
      )
      .eq('curriculum_id', curriculumId)
      .maybeSingle();

    if (curriculumError) throw curriculumError;

    if (
      !curriculum ||
      String(curriculum.status).toLowerCase() !== 'active'
    ) {
      return res.status(404).json({
        message: 'Active curriculum not found.'
      });
    }

    if (
      !req.assignedProgramIds.includes(
        Number(curriculum.program_id)
      )
    ) {
      return res.status(403).json({
        message: 'You are not authorized to view this curriculum.'
      });
    }

    const { data: links, error: linksError } = await supabase
      .from('curriculum_subjects')
      .select(
        'curriculum_id, subject_id, year_level, semester, is_required'
      )
      .eq('curriculum_id', curriculumId)
      .order('year_level', { ascending: true });

    if (linksError) throw linksError;

    const subjectIds = [
      ...new Set(
        (links || []).map((link) => Number(link.subject_id))
      )
    ];

    if (!subjectIds.length) {
      return res.json({
        message: 'No subjects are linked to this curriculum.',
        curriculum,
        subjects: []
      });
    }

    const { data: subjects, error: subjectsError } =
      await supabase
        .from('subjects')
        .select(
          'subject_id, subject_code, subject_title, units, status'
        )
        .in('subject_id', subjectIds);

    if (subjectsError) throw subjectsError;

    const subjectMap = new Map(
      (subjects || []).map((subject) => [
        Number(subject.subject_id),
        subject
      ])
    );

    const records = (links || [])
      .map((link) => {
        const subject = subjectMap.get(
          Number(link.subject_id)
        );

        if (!subject) return null;

        return {
          ...link,
          curriculum_subject_id:
            `${link.curriculum_id}-${link.subject_id}-${link.year_level}-${link.semester}`,
          subject_code: subject.subject_code,
          subject_title: subject.subject_title,
          units: subject.units,
          subject_status: subject.status
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const yearDifference =
          Number(a.year_level) - Number(b.year_level);

        if (yearDifference !== 0) return yearDifference;

        const order = {
          'first semester': 1,
          'second semester': 2,
          summer: 3
        };

        const termDifference =
          (order[normalizeTerm(a.semester)] || 99) -
          (order[normalizeTerm(b.semester)] || 99);

        if (termDifference !== 0) return termDifference;

        return String(a.subject_code).localeCompare(
          String(b.subject_code)
        );
      });

    return res.json({
      message:
        'Approved curriculum subjects retrieved successfully.',
      curriculum,
      subjects: records
    });
  } catch (error) {
    console.error('Fetch curriculum subjects error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve curriculum subjects.'
    });
  }
});

// ACADEMIC PERIODS
router.get('/academic-periods', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('academic_periods')
      .select(
        'period_id, school_year, semester, start_date, end_date, status'
      )
      .order('school_year', { ascending: false });

    if (error) throw error;

    const order = {
      'first semester': 1,
      'second semester': 2,
      summer: 3
    };

    const periods = (data || []).sort((a, b) => {
      const yearCompare =
        String(b.school_year).localeCompare(
          String(a.school_year)
        );

      return (
        yearCompare ||
        (order[normalizeTerm(a.semester)] || 99) -
          (order[normalizeTerm(b.semester)] || 99)
      );
    });

    return res.json({ periods });
  } catch (error) {
    console.error('Fetch academic periods error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve academic periods.'
    });
  }
});

// VIEW SECTIONS
router.get('/sections', async (req, res) => {
  try {
    let query = supabase
      .from('sections')
      .select(
        'section_id, section_code, program_id, year_level, period_id, capacity, status'
      )
      .in('program_id', req.assignedProgramIds);

    if (req.query.period_id !== undefined) {
      const periodId = parseId(req.query.period_id);

      if (!periodId) {
        return res.status(400).json({
          message: 'Invalid academic period ID.'
        });
      }

      query = query.eq('period_id', periodId);
    }

    const { data, error } = await query.order(
      'year_level',
      { ascending: true }
    );

    if (error) throw error;

    const sections = (data || []).sort(
      (a, b) =>
        Number(a.year_level) - Number(b.year_level) ||
        String(a.section_code).localeCompare(
          String(b.section_code),
          undefined,
          { numeric: true }
        )
    );

    return res.json({ sections });
  } catch (error) {
    console.error('Fetch sections error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve sections.'
    });
  }
});

// CREATE SECTION
router.post('/sections', async (req, res) => {
  try {
    const programId = parseId(req.body?.program_id);
    const periodId = parseId(req.body?.period_id);
    const yearLevel = parseId(req.body?.year_level);
    const capacity = parseId(req.body?.capacity);

    const letter = String(
      req.body?.section_letter || ''
    ).trim().toUpperCase();

    if (
      !programId ||
      !req.assignedProgramIds.includes(programId)
    ) {
      return res.status(403).json({
        message: 'You are not assigned to this program.'
      });
    }

    if (
      !periodId ||
      !yearLevel ||
      yearLevel > 4 ||
      !capacity ||
      capacity > 500 ||
      !/^[A-Z]$/.test(letter)
    ) {
      return res.status(400).json({
        message:
          'Provide a valid academic period, year level (1–4), section letter (A–Z), and capacity (1–500).'
      });
    }

    const { data: program, error: programError } =
      await supabase
        .from('programs')
        .select('program_id, program_code, status')
        .eq('program_id', programId)
        .maybeSingle();

    if (programError) throw programError;

    if (
      !program ||
      String(program.status).toLowerCase() !== 'active'
    ) {
      return res.status(400).json({
        message: 'The selected program is not active.'
      });
    }

    const { data: period, error: periodError } =
      await supabase
        .from('academic_periods')
        .select('period_id, status')
        .eq('period_id', periodId)
        .maybeSingle();

    if (periodError) throw periodError;

    if (
      !period ||
      String(period.status).toLowerCase() !== 'active'
    ) {
      return res.status(400).json({
        message: 'Choose an active academic period.'
      });
    }

    const programCode = String(
      program.program_code || ''
    ).trim().toUpperCase();

    if (!/^[A-Z0-9-]+$/.test(programCode)) {
      return res.status(400).json({
        message: 'The program has no valid code.'
      });
    }

    const sectionCode =
      `${programCode} ${yearLevel}-${letter}`;

    const { data: existing, error: existingError } =
      await supabase
        .from('sections')
        .select('section_id')
        .eq('program_id', programId)
        .eq('period_id', periodId)
        .eq('section_code', sectionCode)
        .limit(1);

    if (existingError) throw existingError;

    if (existing?.length) {
      return res.status(409).json({
        message:
          `${sectionCode} already exists for this academic period.`
      });
    }

    const { data: section, error: insertError } =
      await supabase
        .from('sections')
        .insert({
          section_code: sectionCode,
          program_id: programId,
          year_level: yearLevel,
          period_id: periodId,
          capacity,
          status: 'active'
        })
        .select(
          'section_id, section_code, program_id, year_level, period_id, capacity, status'
        )
        .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({
          message: 'This section already exists.'
        });
      }

      throw insertError;
    }

    return res.status(201).json({
      message: `${sectionCode} created successfully.`,
      section
    });
  } catch (error) {
    console.error('Create section error:', error);

    return res.status(500).json({
      message: 'Failed to create section.'
    });
  }
});

// VIEW SUBJECT LOADS FOR A SECTION
router.get('/subject-loads', async (req, res) => {
  try {
    const sectionId = parseId(req.query.section_id);

    if (!sectionId) {
      return res.status(400).json({
        message: 'A valid section ID is required.'
      });
    }

    const { section, reason } =
      await findAuthorizedSection(
        sectionId,
        req.assignedProgramIds
      );

    if (!section) {
      return res.status(
        reason === 'forbidden' ? 403 : 404
      ).json({
        message:
          reason === 'forbidden'
            ? 'You are not authorized to access this section.'
            : 'Section not found.'
      });
    }

    const { data: offerings, error: offeringError } =
      await supabase
        .from('subject_offerings')
        .select(
          'offering_id, subject_id, section_id, period_id, faculty_id, schedule, room, max_slots, status'
        )
        .eq('section_id', sectionId)
        .eq('period_id', section.period_id)
        .order('offering_id', { ascending: true });

    if (offeringError) throw offeringError;

    const subjectIds = [
      ...new Set(
        (offerings || []).map((row) =>
          Number(row.subject_id)
        )
      )
    ];

    let subjects = [];

    if (subjectIds.length) {
      const result = await supabase
        .from('subjects')
        .select(
          'subject_id, subject_code, subject_title, units'
        )
        .in('subject_id', subjectIds);

      if (result.error) throw result.error;
      subjects = result.data || [];
    }

    const subjectMap = new Map(
      subjects.map((subject) => [
        Number(subject.subject_id),
        subject
      ])
    );

    const records = (offerings || []).map((offering) => ({
      ...offering,
      subject:
        subjectMap.get(Number(offering.subject_id)) ||
        null
    }));

    return res.json({
      message: 'Subject loads retrieved successfully.',
      section,
      offerings: records
    });
  } catch (error) {
    console.error('Fetch subject loads error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve subject loads.'
    });
  }
});

// ASSIGN APPROVED SUBJECTS TO A SECTION
router.post('/subject-loads', async (req, res) => {
  try {
    const sectionId = parseId(req.body?.section_id);
    const rawIds = req.body?.subject_ids;

    if (
      !sectionId ||
      !Array.isArray(rawIds) ||
      !rawIds.length ||
      rawIds.length > 100
    ) {
      return res.status(400).json({
        message:
          'Select a valid section and at least one subject.'
      });
    }

    const subjectIds = rawIds.map(parseId);

    if (
      subjectIds.some((id) => !id) ||
      new Set(subjectIds).size !== subjectIds.length
    ) {
      return res.status(400).json({
        message:
          'Subject IDs must be valid and cannot contain duplicates.'
      });
    }

    const { section, reason } =
      await findAuthorizedSection(
        sectionId,
        req.assignedProgramIds
      );

    if (!section) {
      return res.status(
        reason === 'forbidden' ? 403 : 404
      ).json({
        message:
          reason === 'forbidden'
            ? 'You are not authorized to modify this section.'
            : 'Section not found.'
      });
    }

    if (normalizeTerm(section.status) !== 'active') {
      return res.status(400).json({
        message: 'Only active sections can receive subjects.'
      });
    }

    const { data: period, error: periodError } =
      await supabase
        .from('academic_periods')
        .select('period_id, semester, status')
        .eq('period_id', section.period_id)
        .maybeSingle();

    if (periodError) throw periodError;

    if (
      !period ||
      normalizeTerm(period.status) !== 'active'
    ) {
      return res.status(400).json({
        message: 'The academic period is not active.'
      });
    }

    const { data: curricula, error: curriculaError } =
      await supabase
        .from('curricula')
        .select('curriculum_id')
        .eq('program_id', section.program_id)
        .eq('status', 'active');

    if (curriculaError) throw curriculaError;

    const curriculumIds = (curricula || []).map(
      (item) => item.curriculum_id
    );

    if (!curriculumIds.length) {
      return res.status(400).json({
        message:
          'No active curriculum exists for this program.'
      });
    }

    const { data: links, error: linksError } =
      await supabase
        .from('curriculum_subjects')
        .select(
          'subject_id, year_level, semester'
        )
        .in('curriculum_id', curriculumIds)
        .in('subject_id', subjectIds)
        .eq('year_level', section.year_level);

    if (linksError) throw linksError;

    const allowedIds = new Set(
      (links || [])
        .filter((link) =>
          sameTerm(link.semester, period.semester)
        )
        .map((link) => Number(link.subject_id))
    );

    const invalidIds = subjectIds.filter(
      (id) => !allowedIds.has(id)
    );

    if (invalidIds.length) {
      return res.status(400).json({
        message:
          'Some selected subjects are not approved for this program, year level, and semester.'
      });
    }

    const { data: subjectRecords, error: subjectError } =
      await supabase
        .from('subjects')
        .select('subject_id, status')
        .in('subject_id', subjectIds);

    if (subjectError) throw subjectError;

    const activeSubjectIds = new Set(
      (subjectRecords || [])
        .filter(
          (subject) =>
            normalizeTerm(subject.status) === 'active'
        )
        .map((subject) => Number(subject.subject_id))
    );

    if (
      subjectIds.some(
        (id) => !activeSubjectIds.has(id)
      )
    ) {
      return res.status(400).json({
        message:
          'One or more selected subjects are inactive or unavailable.'
      });
    }

    const { data: existing, error: existingError } =
      await supabase
        .from('subject_offerings')
        .select('subject_id')
        .eq('section_id', sectionId)
        .eq('period_id', section.period_id)
        .in('subject_id', subjectIds);

    if (existingError) throw existingError;

    if (existing?.length) {
      return res.status(409).json({
        message:
          'One or more selected subjects are already assigned to this section. Refresh and try again.'
      });
    }

    const slots = Number(section.capacity);

    const records = subjectIds.map((subjectId) => ({
      subject_id: subjectId,
      section_id: sectionId,
      period_id: section.period_id,
      faculty_id: null,
      schedule: null,
      room: null,
      max_slots:
        Number.isSafeInteger(slots) && slots > 0
          ? slots
          : null,
      status: 'active'
    }));

    const { data: inserted, error: insertError } =
      await supabase
        .from('subject_offerings')
        .insert(records)
        .select(
          'offering_id, subject_id, section_id, period_id, faculty_id, schedule, room, max_slots, status'
        );

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({
          message:
            'One or more subjects are already assigned. Refresh and try again.'
        });
      }

      throw insertError;
    }

    return res.status(201).json({
      message:
        `${inserted?.length || records.length} subject(s) assigned successfully to ${section.section_code}.`,
      offerings: inserted || []
    });
  } catch (error) {
    console.error('Assign subject loads error:', error);

    return res.status(500).json({
      message: 'Failed to assign subjects to section.'
    });
  }
});

// Registrar controls official student records.
// Program Office Personnel cannot create students here.

module.exports = router;
router.use(require('./studentLoadRoutes'));
