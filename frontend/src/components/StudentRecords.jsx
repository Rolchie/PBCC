
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Users,
  Search,
  RefreshCw,
  Eye,
  X,
  AlertCircle,
  Database,
  GraduationCap,
  FilterX,
  UserPlus,
  Save,
  LoaderCircle,
  CheckCircle2,
} from 'lucide-react';

import api from '../Services/api';
import './StudentRecords.css';

const STUDENT_TYPES = [
  'Incoming',
  'Continuing',
  'Returning',
  'Transferee',
  'Shiftee',
];

const YEAR_LEVELS = [1, 2, 3, 4, 5, 6];

const EMPTY_STUDENT_FORM = {
  student_no: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  sex: '',
  birthdate: '',
  address: '',
  contact_number: '',
  email: '',
  program_id: '',
  curriculum_id: '',
  year_level: '',
  student_type: '',
};

function getFullName(student) {
  return (
    [
      student.first_name,
      student.middle_name,
      student.last_name,
    ]
      .filter(Boolean)
      .join(' ') || 'Not provided'
  );
}

function formatValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 'Not provided';
  }

  return String(value);
}

function formatDate(value) {
  if (!value) return 'Not provided';

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getErrorMessage(error) {
  return (
    error?.message ||
    'Something went wrong. Please try again.'
  );
}

function StudentRecords() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [studentType, setStudentType] = useState('');
  const [program, setProgram] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [status, setStatus] = useState('');

  const [selectedStudent, setSelectedStudent] = useState(null);

  // Add Student modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentForm, setStudentForm] = useState({
    ...EMPTY_STUDENT_FORM,
  });

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Academic dropdown options
  const [programs, setPrograms] = useState([]);
  const [curricula, setCurricula] = useState([]);

  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingCurricula, setLoadingCurricula] = useState(false);
  const [academicError, setAcademicError] = useState('');

  // ========================================
  // LOAD STUDENT RECORDS
  // ========================================

  const fetchStudents = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const response = await api.get(
          '/api/program-office/students'
        );

        const records = response.data?.students;

        setStudents(
          Array.isArray(records) ? records : []
        );
      } catch (requestError) {
        setError(
          getErrorMessage(requestError)
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ========================================
  // LOAD PROGRAMS
  // ========================================

  const fetchPrograms = useCallback(async () => {
    setLoadingPrograms(true);
    setAcademicError('');

    try {
      const response = await api.get(
        '/api/program-office/programs'
      );

      const records = response.data?.programs;

      setPrograms(
        Array.isArray(records) ? records : []
      );
    } catch (requestError) {
      setPrograms([]);
      setAcademicError(
        `Unable to load programs: ${getErrorMessage(
          requestError
        )}`
      );
    } finally {
      setLoadingPrograms(false);
    }
  }, []);

  // ========================================
  // LOAD CURRICULA FOR SELECTED PROGRAM
  // ========================================

  const fetchCurricula = useCallback(
    async (programId) => {
      if (!programId) {
        setCurricula([]);
        setLoadingCurricula(false);
        return;
      }

      setLoadingCurricula(true);
      setAcademicError('');

      try {
        const response = await api.get(
          '/api/program-office/curricula',
          {
            params: {
              program_id: programId,
            },
          }
        );

        const records = response.data?.curricula;

        setCurricula(
          Array.isArray(records) ? records : []
        );
      } catch (requestError) {
        setCurricula([]);
        setAcademicError(
          `Unable to load curricula: ${getErrorMessage(
            requestError
          )}`
        );
      } finally {
        setLoadingCurricula(false);
      }
    },
    []
  );

  // ========================================
  // ADD STUDENT MODAL
  // ========================================

  function openAddModal() {
    setStudentForm({ ...EMPTY_STUDENT_FORM });
    setFormError('');
    setAcademicError('');
    setCurricula([]);
    setShowAddModal(true);

    fetchPrograms();
  }

  function closeAddModal() {
    if (saving) return;

    setShowAddModal(false);
    setFormError('');
    setAcademicError('');
    setStudentForm({ ...EMPTY_STUDENT_FORM });
    setCurricula([]);
  }

  function updateStudentField(field, value) {
    setStudentForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleProgramChange(value) {
    setStudentForm((previous) => ({
      ...previous,
      program_id: value,
      curriculum_id: '',
    }));

    setCurricula([]);
    fetchCurricula(value);
  }

  // ========================================
  // MODAL KEYBOARD HANDLING
  // ========================================

  useEffect(() => {
    if (!selectedStudent && !showAddModal) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    function handleEscape(event) {
      if (event.key !== 'Escape') return;

      if (showAddModal) {
        if (!saving) {
          closeAddModal();
        }
      } else {
        setSelectedStudent(null);
      }
    }

    document.addEventListener(
      'keydown',
      handleEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        'keydown',
        handleEscape
      );
    };
  }, [selectedStudent, showAddModal, saving]);

  // ========================================
  // SAVE NEW STUDENT
  // ========================================

  async function handleAddStudent(event) {
    event.preventDefault();

    if (saving) return;

    const studentNo =
      studentForm.student_no.trim();

    const firstName =
      studentForm.first_name.trim();

    const lastName =
      studentForm.last_name.trim();

    const email =
      studentForm.email.trim().toLowerCase();

    if (
      !studentNo ||
      !firstName ||
      !lastName
    ) {
      setFormError(
        'Student number, first name, and last name are required.'
      );
      return;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setFormError(
        'Please enter a valid email address.'
      );
      return;
    }

    if (!studentForm.program_id) {
      setFormError(
        'Please select a program.'
      );
      return;
    }

    if (!studentForm.curriculum_id) {
      setFormError(
        'Please select a curriculum.'
      );
      return;
    }

    if (!studentForm.year_level) {
      setFormError(
        'Please select a year level.'
      );
      return;
    }

    setSaving(true);
    setFormError('');
    setSuccess('');

    try {
      await api.post(
        '/api/program-office/students',
        {
          student_no: studentNo,
          first_name: firstName,
          middle_name:
            studentForm.middle_name.trim(),
          last_name: lastName,
          sex: studentForm.sex || null,
          birthdate:
            studentForm.birthdate || null,
          address:
            studentForm.address.trim(),
          contact_number:
            studentForm.contact_number.trim(),
          email,
          program_id:
            Number(studentForm.program_id),
          curriculum_id:
            Number(studentForm.curriculum_id),
          year_level:
            Number(studentForm.year_level),
          student_type:
            studentForm.student_type || null,
        }
      );

      setShowAddModal(false);
      setStudentForm({
        ...EMPTY_STUDENT_FORM,
      });

      setSuccess(
        'Student record created successfully.'
      );

      await fetchStudents();
    } catch (requestError) {
      setFormError(
        getErrorMessage(requestError)
      );
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // FILTER OPTIONS
  // ========================================

  const programOptions = useMemo(() => {
    return [
      ...new Set(
        students
          .map((student) => student.program_id)
          .filter(
            (value) =>
              value !== null &&
              value !== undefined
          )
          .map(String)
      ),
    ].sort(
      (a, b) => Number(a) - Number(b)
    );
  }, [students]);

  const yearOptions = useMemo(() => {
    return [
      ...new Set(
        students
          .map((student) => student.year_level)
          .filter(
            (value) =>
              value !== null &&
              value !== undefined
          )
          .map(String)
      ),
    ].sort(
      (a, b) => Number(a) - Number(b)
    );
  }, [students]);

  const statusOptions = useMemo(() => {
    return [
      ...new Set(
        students
          .map((student) => student.status)
          .filter(Boolean)
      ),
    ].sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return students.filter((student) => {
      const fullName =
        getFullName(student).toLowerCase();

      const matchesSearch =
        !keyword ||
        fullName.includes(keyword) ||
        String(student.student_no || '')
          .toLowerCase()
          .includes(keyword) ||
        String(student.email || '')
          .toLowerCase()
          .includes(keyword);

      const matchesType =
        !studentType ||
        String(
          student.student_type || ''
        ).toLowerCase() ===
          studentType.toLowerCase();

      const matchesProgram =
        !program ||
        String(student.program_id) ===
          program;

      const matchesYear =
        !yearLevel ||
        String(student.year_level) ===
          yearLevel;

      const matchesStatus =
        !status ||
        String(
          student.status || ''
        ).toLowerCase() ===
          status.toLowerCase();

      return (
        matchesSearch &&
        matchesType &&
        matchesProgram &&
        matchesYear &&
        matchesStatus
      );
    });
  }, [
    students,
    search,
    studentType,
    program,
    yearLevel,
    status,
  ]);

  const hasFilters = Boolean(
    search ||
    studentType ||
    program ||
    yearLevel ||
    status
  );

  function clearFilters() {
    setSearch('');
    setStudentType('');
    setProgram('');
    setYearLevel('');
    setStatus('');
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="student-records">
      <div className="student-records-heading">
        <div>
          <span className="student-records-eyebrow">
            PROGRAM OFFICE
          </span>

          <h2>Student Records</h2>

          <p>
            View and manage student information
            and academic classifications for
            enrollment preparation.
          </p>
        </div>

        <div className="student-records-heading-actions">
          <button
            type="button"
            className="student-records-refresh"
            onClick={() =>
              fetchStudents(true)
            }
            disabled={
              loading || refreshing
            }
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? 'student-records-spin'
                  : ''
              }
            />
            {refreshing
              ? 'Refreshing...'
              : 'Refresh Records'}
          </button>

          <button
            type="button"
            className="student-records-add-button"
            disabled
            title="Student enrollment is not yet available."
            >
          <UserPlus size={18} />
             Add Student (Coming Soon)
          </button>
        </div>
      </div>

      {success && (
        <div
          className="student-records-feedback is-success"
          role="status"
        >
          <CheckCircle2 size={19} />

          <span>{success}</span>

          <button
            type="button"
            onClick={() =>
              setSuccess('')
            }
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div className="student-records-summary">
        <div className="student-records-summary-icon">
          <Users size={24} />
        </div>

        <div>
          <span>Total Student Records</span>
          <strong>
            {students.length}
          </strong>
        </div>
      </div>

      <section className="student-records-panel">
        <div className="student-records-panel-heading">
          <div>
            <h3>Student Directory</h3>
            <p>
              Search and filter existing
              student records.
            </p>
          </div>

          <span className="student-records-count">
            {filteredStudents.length}{' '}
            record
            {filteredStudents.length === 1
              ? ''
              : 's'}
          </span>
        </div>

        <div className="student-records-filters">
          <label className="student-records-search">
            <Search size={18} />

            <input
              type="search"
              placeholder="Search name, student number, or email"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              aria-label="Search student records"
            />
          </label>

          <select
            value={studentType}
            onChange={(event) =>
              setStudentType(
                event.target.value
              )
            }
            aria-label="Filter by student type"
          >
            <option value="">
              All Student Types
            </option>

            {STUDENT_TYPES.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            ))}
          </select>

          <select
            value={program}
            onChange={(event) =>
              setProgram(
                event.target.value
              )
            }
            aria-label="Filter by program"
          >
            <option value="">
              All Programs
            </option>

            {programOptions.map((id) => (
              <option
                key={id}
                value={id}
              >
                Program ID {id}
              </option>
            ))}
          </select>

          <select
            value={yearLevel}
            onChange={(event) =>
              setYearLevel(
                event.target.value
              )
            }
            aria-label="Filter by year level"
          >
            <option value="">
              All Year Levels
            </option>

            {yearOptions.map((year) => (
              <option
                key={year}
                value={year}
              >
                Year {year}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value
              )
            }
            aria-label="Filter by status"
          >
            <option value="">
              All Statuses
            </option>

            {statusOptions.map((value) => (
              <option
                key={value}
                value={value}
              >
                {value}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              className="student-records-clear"
              onClick={clearFilters}
            >
              <FilterX size={16} />
              Clear
            </button>
          )}
        </div>

        {error ? (
          <div className="student-records-message">
            <AlertCircle size={35} />

            <h3>
              Unable to load student records
            </h3>

            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                fetchStudents()
              }
            >
              Try Again
            </button>
          </div>
        ) : loading ? (
          <div className="student-records-message">
            <RefreshCw
              size={34}
              className="student-records-spin"
            />

            <h3>
              Loading student records...
            </h3>

            <p>
              Please wait while records
              are retrieved.
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="student-records-message">
            <Database size={39} />

            <h3>
              No student records yet
            </h3>

            <p>
              There are currently no student
              records to display. Use
              Add Student to begin once
              official programs and curricula
              have been configured.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="student-records-message">
            <Search size={39} />

            <h3>
              No matching students
            </h3>

            <p>
              Try another search or
              adjust your filters.
            </p>

            <button
              type="button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="student-records-table-wrap">
            <table className="student-records-table">
              <thead>
                <tr>
                  <th>Student No.</th>
                  <th>Student Name</th>
                  <th>Program</th>
                  <th>Year Level</th>
                  <th>Student Type</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map(
                  (student) => (
                    <tr
                      key={
                        student.student_id
                      }
                    >
                      <td>
                        <strong>
                          {formatValue(
                            student.student_no
                          )}
                        </strong>
                      </td>

                      <td>
                        <div className="student-records-name">
                          <span className="student-records-avatar">
                            <GraduationCap
                              size={17}
                            />
                          </span>

                          <span>
                            <strong>
                              {getFullName(
                                student
                              )}
                            </strong>

                            <small>
                              {formatValue(
                                student.email
                              )}
                            </small>
                          </span>
                        </div>
                      </td>

                      <td>
                        {student.program_id !=
                        null
                          ? `Program ID ${student.program_id}`
                          : 'Not assigned'}
                      </td>

                      <td>
                        {student.year_level !=
                        null
                          ? `Year ${student.year_level}`
                          : 'Not assigned'}
                      </td>

                      <td>
                        {formatValue(
                          student.student_type
                        )}
                      </td>

                      <td>
                        <span className="student-records-status">
                          {formatValue(
                            student.status
                          )}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="student-records-view"
                          onClick={() =>
                            setSelectedStudent(
                              student
                            )
                          }
                        >
                          <Eye size={16} />
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===================================
          ADD STUDENT MODAL
      =================================== */}

      {showAddModal && (
        <div
          className="student-records-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeAddModal();
            }
          }}
        >
          <div
            className="student-records-modal student-records-add-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-student-title"
          >
            <div className="student-records-modal-header">
              <div>
                <span className="student-records-eyebrow">
                  PROGRAM OFFICE
                </span>

                <h2 id="add-student-title">
                  Add Student
                </h2>
              </div>

              <button
                type="button"
                onClick={closeAddModal}
                disabled={saving}
                aria-label="Close Add Student"
              >
                <X size={21} />
              </button>
            </div>

            <form
              className="student-records-add-form"
              onSubmit={handleAddStudent}
            >
              <div className="student-records-modal-body">
                {formError && (
                  <div
                    className="student-records-feedback is-error"
                    role="alert"
                  >
                    <AlertCircle
                      size={18}
                    />

                    <span>
                      {formError}
                    </span>
                  </div>
                )}

                <h3>
                  Student Information
                </h3>

                <div className="student-records-form-grid">
                  <label>
                    Student Number
                    <input
                      type="text"
                      value={
                        studentForm.student_no
                      }
                      onChange={(event) =>
                        updateStudentField(
                          'student_no',
                          event.target.value
                        )
                      }
                      placeholder="Enter student number"
                      maxLength={100}
                      disabled={saving}
                      required
                    />
                  </label>

                  <label>
                    First Name
                    <input
                      type="text"
                      value={
                        studentForm.first_name
                      }
                      onChange={(event) =>
                        updateStudentField(
                          'first_name',
                          event.target.value
                        )
                      }
                      placeholder="Enter first name"
                      maxLength={100}
                      disabled={saving}
                      required
                    />
                  </label>

                  <label>
                    Middle Name
                    <input
                      type="text"
                      value={
                        studentForm.middle_name
                      }
                      onChange={(event) =>
                        updateStudentField(
                          'middle_name',
                          event.target.value
                        )
                      }
                      placeholder="Optional"
                      maxLength={100}
                      disabled={saving}
                    />
                  </label>

                  <label>
                    Last Name
                    <input
                      type="text"
                      value={
                        studentForm.last_name
                      }
                      onChange={(event) =>
                        updateStudentField(
                          'last_name',
                          event.target.value
                        )
                      }
                      placeholder="Enter last name"
                      maxLength={100}
                      disabled={saving}
                      required
                    />
                  </label>

                  <label>
                    Sex
                    <select
                      value={
                        studentForm.sex
                      }
                      onChange={(event) =>
                        updateStudentField(
                          'sex',
                          event.target.value
                        )
                      }
                      disabled={saving}
                    >
                      <option value="">
                        Select sex
                      </option>
                      <option value="Male">
                        Male
                      </option>
                      <option value="Female">
                        Female
                      </option>
                    </select>
                  </label>

                  <label>
                    Birthdate
                    <input
                      type="date"
                      value={
                        studentForm.birthdate
                      }
                      onChange={(event) =>
                        updateStudentField(
                          'birthdate',
                          event.target.value
                        )
                      }
                      max={
                        new Date()
                          .toISOString()
                          .slice(0, 10)
                      }
                      disabled={saving}
                    />
                  </label>

                  <label>
                    Contact Number
                    <input
                      type="tel"
                      value={
                        studentForm.contact_number
                      }
                      onChange={(event) =>
                        updateStudentField(
                          'contact_number',
                          event.target.value
                        )
                      }
                      placeholder="Enter contact number"
                      disabled={saving}
                    />
                  </label>

                  <label>
                    Email Address
                    <input
                      type="email"
                      value={
                        studentForm.email
                      }
                      onChange={(event) =>
                        updateStudentField(
                          'email',
                          event.target.value
                        )
                      }
                      placeholder="student@example.com"
                      disabled={saving}
                    />
                  </label>

                  <label className="student-records-form-full">
                    Address
                    <textarea
                      rows={3}
                      value={
                        studentForm.address
                      }
                      onChange={(event) =>
                        updateStudentField(
                          'address',
                          event.target.value
                        )
                      }
                      placeholder="Enter complete address"
                      disabled={saving}
                    />
                  </label>
                </div>

                <h3>
                  Academic Information
                </h3>

                {academicError && (
                  <div
                    className="student-records-feedback is-error"
                    role="alert"
                  >
                    <AlertCircle
                      size={18}
                    />
                    <span>
                      {academicError}
                    </span>
                  </div>
                )}

                {!loadingPrograms &&
                  programs.length === 0 &&
                  !academicError && (
                    <div className="student-records-academic-notice">
                      <AlertCircle
                        size={19}
                      />

                      <span>
                        No active programs
                        are configured yet.
                        Official PBCC
                        programs and
                        curricula must be
                        added before a
                        student record
                        can be saved.
                      </span>
                    </div>
                  )}

                <div className="student-records-form-grid">
                  <label>
                    Program
                    <select
                      value={
                        studentForm.program_id
                      }
                      onChange={(event) =>
                        handleProgramChange(
                          event.target.value
                        )
                      }
                      disabled={
                        saving ||
                        loadingPrograms ||
                        programs.length === 0
                      }
                      required
                    >
                      <option value="">
                        {loadingPrograms
                          ? 'Loading programs...'
                          : 'Select program'}
                      </option>

                      {programs.map(
                        (item) => (
                          <option
                            key={
                              item.program_id
                            }
                            value={
                              item.program_id
                            }
                          >
                            {item.program_code}
                            {' — '}
                            {item.program_name}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    Curriculum
                    <select
                      value={
                        studentForm.curriculum_id
                      }
                      onChange={(event) =>
                        updateStudentField(
                          'curriculum_id',
                          event.target.value
                        )
                      }
                      disabled={
                        saving ||
                        !studentForm.program_id ||
                        loadingCurricula ||
                        curricula.length === 0
                      }
                      required
                    >
                      <option value="">
                        {loadingCurricula
                          ? 'Loading curricula...'
                          : 'Select curriculum'}
                      </option>

                      {curricula.map(
                        (item) => (
                          <option
                            key={
                              item.curriculum_id
                            }
                            value={
                              item.curriculum_id
                            }
                          >
                            {item.curriculum_year}
                            {item.description
                              ? ` — ${item.description}`
                              : ''}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  {studentForm.program_id &&
                    !loadingCurricula &&
                    curricula.length === 0 &&
                    !academicError && (
                      <p className="student-records-form-help student-records-form-full">
                        No active curricula
                        are available for
                        this program.
                      </p>
                    )}

                  <label>
                    Year Level
                    <select
                      value={
                        studentForm.year_level
                      }
                      onChange={(event) =>
                        updateStudentField(
                          'year_level',
                          event.target.value
                        )
                      }
                      disabled={saving}
                      required
                    >
                      <option value="">
                        Select year level
                      </option>

                      {YEAR_LEVELS.map(
                        (year) => (
                          <option
                            key={year}
                            value={year}
                          >
                            Year {year}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    Student Type
                    <select
                      value={
                        studentForm.student_type
                      }
                      onChange={(event) =>
                        updateStudentField(
                          'student_type',
                          event.target.value
                        )
                      }
                      disabled={saving}
                    >
                      <option value="">
                        Select student type
                      </option>

                      {STUDENT_TYPES.map(
                        (type) => (
                          <option
                            key={type}
                            value={type}
                          >
                            {type}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>

                <div className="student-records-academic-notice">
                  <AlertCircle
                    size={18}
                  />

                  <span>
                    New student records
                    are created with
                    Active status.
                    Creating a student
                    record does not
                    automatically create
                    a login account.
                  </span>
                </div>
              </div>

              <div className="student-records-modal-footer student-records-form-actions">
                <button
                  type="button"
                  className="student-records-cancel-button"
                  onClick={closeAddModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="student-records-save-button"
                  disabled={
                    saving ||
                    loadingPrograms ||
                    loadingCurricula ||
                    programs.length === 0 ||
                    curricula.length === 0
                  }
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="student-records-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      Save Student
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================
          VIEW STUDENT DETAILS
      =================================== */}

      {selectedStudent && (
        <div
          className="student-records-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedStudent(null);
            }
          }}
        >
          <div
            className="student-records-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-details-title"
          >
            <div className="student-records-modal-header">
              <div>
                <span className="student-records-eyebrow">
                  STUDENT INFORMATION
                </span>

                <h2 id="student-details-title">
                  Student Details
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedStudent(null)
                }
                aria-label="Close student details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="student-records-modal-body">
              <h3>
                Personal Information
              </h3>

              <div className="student-records-details-grid">
                <Detail
                  label="Student Number"
                  value={
                    selectedStudent.student_no
                  }
                />

                <Detail
                  label="Full Name"
                  value={getFullName(
                    selectedStudent
                  )}
                />

                <Detail
                  label="Sex"
                  value={
                    selectedStudent.sex
                  }
                />

                <Detail
                  label="Birthdate"
                  value={formatDate(
                    selectedStudent.birthdate
                  )}
                />

                <Detail
                  label="Email"
                  value={
                    selectedStudent.email
                  }
                />

                <Detail
                  label="Contact Number"
                  value={
                    selectedStudent.contact_number
                  }
                />

                <Detail
                  label="Address"
                  value={
                    selectedStudent.address
                  }
                />
              </div>

              <h3>
                Academic Information
              </h3>

              <div className="student-records-details-grid">
                <Detail
                  label="Program"
                  value={
                    selectedStudent.program_id !=
                    null
                      ? `Program ID ${selectedStudent.program_id}`
                      : null
                  }
                />

                <Detail
                  label="Curriculum"
                  value={
                    selectedStudent.curriculum_id !=
                    null
                      ? `Curriculum ID ${selectedStudent.curriculum_id}`
                      : null
                  }
                />

                <Detail
                  label="Year Level"
                  value={
                    selectedStudent.year_level !=
                    null
                      ? `Year ${selectedStudent.year_level}`
                      : null
                  }
                />

                <Detail
                  label="Student Type"
                  value={
                    selectedStudent.student_type
                  }
                />

                <Detail
                  label="Status"
                  value={
                    selectedStudent.status
                  }
                />
              </div>
            </div>

            <div className="student-records-modal-footer">
              <button
                type="button"
                onClick={() =>
                  setSelectedStudent(null)
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="student-records-detail">
      <span>{label}</span>

      <strong>
        {formatValue(value)}
      </strong>
    </div>
  );
}

export default StudentRecords;
