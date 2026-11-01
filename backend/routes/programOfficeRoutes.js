
const express = require('express');
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const router = express.Router();

// ========================================
// PROGRAM OFFICE ACCESS CONTROL
// ========================================

router.use(
  authenticateUser,
  requireRole('Program Office Personnel')
);

// ========================================
// CONSTANTS
// ========================================

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

const STUDENT_TYPES = [
  'Incoming',
  'Continuing',
  'Returning',
  'Transferee',
  'Shiftee',
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(value) {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function parsePositiveInteger(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function isValidDate(value) {
  if (typeof value !== 'string') return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function isDuplicateError(error) {
  return error?.code === '23505';
}

function isForeignKeyError(error) {
  return error?.code === '23503';
}

// ========================================
// STUDENT RECORDS
// ========================================

// GET all student records
router.get('/students', async (req, res) => {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select(STUDENT_COLUMNS)
      .order('student_id', { ascending: false });

    if (error) {
      console.error('Fetch students error:', error);

      return res.status(500).json({
        message: 'Failed to retrieve student records.',
      });
    }

    return res.status(200).json({
      message: 'Student records retrieved successfully.',
      students: students || [],
    });
  } catch (error) {
    console.error('Student records error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve student records.',
    });
  }
});

// ========================================
// PROGRAM OPTIONS
// ========================================

// GET available programs for student forms
router.get('/programs', async (req, res) => {
  try {
    const { data: programs, error } = await supabase
      .from('programs')
      .select(`
        program_id,
        program_code,
        program_name,
        degree_level,
        status
      `)
      .eq('status', 'active')
      .order('program_name', { ascending: true });

    if (error) {
      console.error('Fetch programs error:', error);

      return res.status(500).json({
        message: 'Failed to retrieve programs.',
      });
    }

    return res.status(200).json({
      message: 'Programs retrieved successfully.',
      programs: programs || [],
    });
  } catch (error) {
    console.error('Programs error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve programs.',
    });
  }
});

// ========================================
// CURRICULUM OPTIONS
// ========================================

// GET available curricula, optionally filtered by program
router.get('/curricula', async (req, res) => {
  try {
    const programId = req.query.program_id;

    let query = supabase
      .from('curricula')
      .select(`
        curriculum_id,
        program_id,
        curriculum_year,
        description,
        status
      `)
      .eq('status', 'active')
      .order('curriculum_year', { ascending: false });

    if (
      programId !== undefined &&
      programId !== ''
    ) {
      const parsedProgramId = parsePositiveInteger(programId);

      if (!parsedProgramId) {
        return res.status(400).json({
          message: 'Invalid program ID.',
        });
      }

      query = query.eq('program_id', parsedProgramId);
    }

    const { data: curricula, error } = await query;

    if (error) {
      console.error('Fetch curricula error:', error);

      return res.status(500).json({
        message: 'Failed to retrieve curricula.',
      });
    }

    return res.status(200).json({
      message: 'Curricula retrieved successfully.',
      curricula: curricula || [],
    });
  } catch (error) {
    console.error('Curricula error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve curricula.',
    });
  }
});

// ========================================
// ADD STUDENT
// ========================================

// POST create a new student record
router.post('/students', async (req, res) => {
  try {
    const {
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
    } = req.body || {};

    // ----------------------------------------
    // Validate required student information
    // ----------------------------------------

    const studentNo = cleanText(student_no);
    const firstName = cleanText(first_name);
    const lastName = cleanText(last_name);

    if (!studentNo || !firstName || !lastName) {
      return res.status(400).json({
        message:
          'Student number, first name, and last name are required.',
      });
    }

    if (
      studentNo.length > 100 ||
      firstName.length > 100 ||
      lastName.length > 100
    ) {
      return res.status(400).json({
        message: 'One or more fields exceed the allowed length.',
      });
    }

    const middleName = optionalText(middle_name);
    const studentEmail = optionalText(email)?.toLowerCase() || null;
    const studentSex = optionalText(sex);
    const studentBirthdate = optionalText(birthdate);
    const studentAddress = optionalText(address);
    const contactNumber = optionalText(contact_number);
    const studentType = optionalText(student_type);

    if (middleName && middleName.length > 100) {
      return res.status(400).json({
        message: 'Middle name is too long.',
      });
    }

    if (
      studentEmail &&
      !EMAIL_PATTERN.test(studentEmail)
    ) {
      return res.status(400).json({
        message: 'Please provide a valid email address.',
      });
    }

    if (
      studentBirthdate &&
      !isValidDate(studentBirthdate)
    ) {
      return res.status(400).json({
        message: 'Birthdate must be a valid date in YYYY-MM-DD format.',
      });
    }

    if (
      studentType &&
      !STUDENT_TYPES.includes(studentType)
    ) {
      return res.status(400).json({
        message: 'Please select a valid student type.',
      });
    }

    // ----------------------------------------
    // Validate academic information
    // ----------------------------------------

    const programId = parsePositiveInteger(program_id);
    const curriculumId = parsePositiveInteger(curriculum_id);
    const yearLevel = parsePositiveInteger(year_level);

    if (!programId) {
      return res.status(400).json({
        message: 'Please select a program.',
      });
    }

    if (!curriculumId) {
      return res.status(400).json({
        message: 'Please select a curriculum.',
      });
    }

    if (!yearLevel || yearLevel > 6) {
      return res.status(400).json({
        message: 'Please select a valid year level.',
      });
    }

    // ----------------------------------------
    // Check duplicate student number
    // ----------------------------------------

    const {
      data: existingStudent,
      error: duplicateCheckError,
    } = await supabase
      .from('students')
      .select('student_id')
      .eq('student_no', studentNo)
      .maybeSingle();

    if (duplicateCheckError) {
      console.error(
        'Check student number error:',
        duplicateCheckError
      );

      return res.status(500).json({
        message: 'Unable to validate the student number.',
      });
    }

    if (existingStudent) {
      return res.status(409).json({
        message: 'This student number is already registered.',
      });
    }

    // ----------------------------------------
    // Verify selected program
    // ----------------------------------------

    const {
      data: selectedProgram,
      error: programError,
    } = await supabase
      .from('programs')
      .select('program_id, status')
      .eq('program_id', programId)
      .maybeSingle();

    if (programError) {
      console.error('Validate program error:', programError);

      return res.status(500).json({
        message: 'Unable to validate the selected program.',
      });
    }

    if (
      !selectedProgram ||
      selectedProgram.status !== 'active'
    ) {
      return res.status(400).json({
        message: 'Please select an active program.',
      });
    }

    // ----------------------------------------
    // Verify selected curriculum belongs
    // to the selected program
    // ----------------------------------------

    const {
      data: selectedCurriculum,
      error: curriculumError,
    } = await supabase
      .from('curricula')
      .select('curriculum_id, program_id, status')
      .eq('curriculum_id', curriculumId)
      .maybeSingle();

    if (curriculumError) {
      console.error(
        'Validate curriculum error:',
        curriculumError
      );

      return res.status(500).json({
        message: 'Unable to validate the selected curriculum.',
      });
    }

    if (
      !selectedCurriculum ||
      selectedCurriculum.status !== 'active' ||
      Number(selectedCurriculum.program_id) !== programId
    ) {
      return res.status(400).json({
        message:
          'Please select an active curriculum belonging to the chosen program.',
      });
    }

    // ----------------------------------------
    // Create student record
    // ----------------------------------------

    const newStudent = {
      student_no: studentNo,
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      sex: studentSex,
      birthdate: studentBirthdate,
      address: studentAddress,
      contact_number: contactNumber,
      email: studentEmail,
      program_id: programId,
      curriculum_id: curriculumId,
      year_level: yearLevel,
      student_type: studentType,
      status: 'active',
    };

    const {
      data: createdStudent,
      error: insertError,
    } = await supabase
      .from('students')
      .insert(newStudent)
      .select(STUDENT_COLUMNS)
      .single();

    if (insertError) {
      console.error('Create student error:', insertError);

      if (isDuplicateError(insertError)) {
        return res.status(409).json({
          message:
            'A student with this information already exists.',
        });
      }

      if (isForeignKeyError(insertError)) {
        return res.status(400).json({
          message:
            'The selected academic information is no longer valid.',
        });
      }

      return res.status(500).json({
        message: 'Failed to create the student record.',
      });
    }

    return res.status(201).json({
      message: 'Student record created successfully.',
      student: createdStudent,
    });
  } catch (error) {
    console.error('Add student error:', error);

    return res.status(500).json({
      message: 'Failed to create the student record.',
    });
  }
});

module.exports = router;
