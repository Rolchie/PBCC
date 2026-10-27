
import { useCallback, useEffect, useMemo, useState } from 'react';
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

function getFullName(student) {
  return [
    student.first_name,
    student.middle_name,
    student.last_name,
  ]
    .filter(Boolean)
    .join(' ') || 'Not provided';
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
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

function StudentRecords() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [studentType, setStudentType] = useState('');
  const [program, setProgram] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [status, setStatus] = useState('');

  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchStudents = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await api.get('/api/program-office/students');

      const records = response.data?.students;

      setStudents(Array.isArray(records) ? records : []);
    } catch (requestError) {
      setError(
        requestError?.message ||
          'Unable to load student records. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (!selectedStudent) return;

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setSelectedStudent(null);
      }
    }

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [selectedStudent]);

  const programOptions = useMemo(() => {
    return [...new Set(
      students
        .map((student) => student.program_id)
        .filter((value) => value !== null && value !== undefined)
        .map(String)
    )].sort((a, b) => Number(a) - Number(b));
  }, [students]);

  const yearOptions = useMemo(() => {
    return [...new Set(
      students
        .map((student) => student.year_level)
        .filter((value) => value !== null && value !== undefined)
        .map(String)
    )].sort((a, b) => Number(a) - Number(b));
  }, [students]);

  const statusOptions = useMemo(() => {
    return [...new Set(
      students
        .map((student) => student.status)
        .filter(Boolean)
    )].sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return students.filter((student) => {
      const fullName = getFullName(student).toLowerCase();

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
        String(student.student_type || '').toLowerCase() ===
          studentType.toLowerCase();

      const matchesProgram =
        !program || String(student.program_id) === program;

      const matchesYear =
        !yearLevel || String(student.year_level) === yearLevel;

      const matchesStatus =
        !status ||
        String(student.status || '').toLowerCase() ===
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
    search || studentType || program || yearLevel || status
  );

  function clearFilters() {
    setSearch('');
    setStudentType('');
    setProgram('');
    setYearLevel('');
    setStatus('');
  }

  return (
    <div className="student-records">
      <div className="student-records-heading">
        <div>
          <span className="student-records-eyebrow">
            PROGRAM OFFICE
          </span>

          <h2>Student Records</h2>

          <p>
            View student information and academic classifications
            for enrollment preparation.
          </p>
        </div>

        <button
          type="button"
          className="student-records-refresh"
          onClick={() => fetchStudents(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw
            size={17}
            className={refreshing ? 'student-records-spin' : ''}
          />
          {refreshing ? 'Refreshing...' : 'Refresh Records'}
        </button>
      </div>

      <div className="student-records-summary">
        <div className="student-records-summary-icon">
          <Users size={24} />
        </div>

        <div>
          <span>Total Student Records</span>
          <strong>{students.length}</strong>
        </div>
      </div>

      <section className="student-records-panel">
        <div className="student-records-panel-heading">
          <div>
            <h3>Student Directory</h3>
            <p>
              Search and filter existing student records.
            </p>
          </div>

          <span className="student-records-count">
            {filteredStudents.length} record
            {filteredStudents.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="student-records-filters">
          <label className="student-records-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search name, student number, or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search student records"
            />
          </label>

          <select
            value={studentType}
            onChange={(event) => setStudentType(event.target.value)}
            aria-label="Filter by student type"
          >
            <option value="">All Student Types</option>
            {STUDENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={program}
            onChange={(event) => setProgram(event.target.value)}
            aria-label="Filter by program"
          >
            <option value="">All Programs</option>
            {programOptions.map((id) => (
              <option key={id} value={id}>
                Program ID {id}
              </option>
            ))}
          </select>

          <select
            value={yearLevel}
            onChange={(event) => setYearLevel(event.target.value)}
            aria-label="Filter by year level"
          >
            <option value="">All Year Levels</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                Year {year}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((value) => (
              <option key={value} value={value}>
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
            <h3>Unable to load student records</h3>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => fetchStudents()}
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
            <h3>Loading student records...</h3>
            <p>Please wait while records are retrieved.</p>
          </div>
        ) : students.length === 0 ? (
          <div className="student-records-message">
            <Database size={39} />
            <h3>No student records yet</h3>
            <p>
              The student records database is connected, but
              there are no student records to display.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="student-records-message">
            <Search size={39} />
            <h3>No matching students</h3>
            <p>
              Try another search or adjust your filters.
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
                {filteredStudents.map((student) => (
                  <tr key={student.student_id}>
                    <td>
                      <strong>
                        {formatValue(student.student_no)}
                      </strong>
                    </td>

                    <td>
                      <div className="student-records-name">
                        <span className="student-records-avatar">
                          <GraduationCap size={17} />
                        </span>

                        <span>
                          <strong>{getFullName(student)}</strong>
                          <small>
                            {formatValue(student.email)}
                          </small>
                        </span>
                      </div>
                    </td>

                    <td>
                      {student.program_id != null
                        ? `Program ID ${student.program_id}`
                        : 'Not assigned'}
                    </td>

                    <td>
                      {student.year_level != null
                        ? `Year ${student.year_level}`
                        : 'Not assigned'}
                    </td>

                    <td>
                      {formatValue(student.student_type)}
                    </td>

                    <td>
                      <span className="student-records-status">
                        {formatValue(student.status)}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="student-records-view"
                        onClick={() => setSelectedStudent(student)}
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedStudent && (
        <div
          className="student-records-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
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
                onClick={() => setSelectedStudent(null)}
                aria-label="Close student details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="student-records-modal-body">
              <h3>Personal Information</h3>

              <div className="student-records-details-grid">
                <Detail
                  label="Student Number"
                  value={selectedStudent.student_no}
                />
                <Detail
                  label="Full Name"
                  value={getFullName(selectedStudent)}
                />
                <Detail
                  label="Sex"
                  value={selectedStudent.sex}
                />
                <Detail
                  label="Birthdate"
                  value={formatDate(selectedStudent.birthdate)}
                />
                <Detail
                  label="Email"
                  value={selectedStudent.email}
                />
                <Detail
                  label="Contact Number"
                  value={selectedStudent.contact_number}
                />
                <Detail
                  label="Address"
                  value={selectedStudent.address}
                />
              </div>

              <h3>Academic Information</h3>

              <div className="student-records-details-grid">
                <Detail
                  label="Program"
                  value={
                    selectedStudent.program_id != null
                      ? `Program ID ${selectedStudent.program_id}`
                      : null
                  }
                />
                <Detail
                  label="Curriculum"
                  value={
                    selectedStudent.curriculum_id != null
                      ? `Curriculum ID ${selectedStudent.curriculum_id}`
                      : null
                  }
                />
                <Detail
                  label="Year Level"
                  value={
                    selectedStudent.year_level != null
                      ? `Year ${selectedStudent.year_level}`
                      : null
                  }
                />
                <Detail
                  label="Student Type"
                  value={selectedStudent.student_type}
                />
                <Detail
                  label="Status"
                  value={selectedStudent.status}
                />
              </div>
            </div>

            <div className="student-records-modal-footer">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
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
      <strong>{formatValue(value)}</strong>
    </div>
  );
}

export default StudentRecords;
