import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import { useNavigate } from 'react-router-dom';

import {
  LayoutDashboard,
  ClipboardCheck,
  FolderOpen,
  Users,
  UserRound,
  LogOut,
  Menu,
  X,
  ChevronRight,
  GraduationCap,
  CalendarDays,
  School,
  Info,
  ShieldCheck,
  Search,
  FileCheck2,
  Clock3,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  ChevronDown,
  BookOpen,
  PanelLeftClose
} from 'lucide-react';

import { AuthContext } from '../../context/auth-context';
import api from '../../Services/api';
import './RegistrarDashboard.css';

// ======================================================
// NAVIGATION
// ======================================================

const navigation = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    id: 'enrollment-review',
    label: 'Enrollment Review',
    icon: ClipboardCheck
  },
  {
    id: 'enrollment-records',
    label: 'Enrollment Records',
    icon: FolderOpen
  },
  {
    id: 'student-records',
    label: 'Student Records',
    icon: Users
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: UserRound
  }
];

const descriptions = {
  dashboard:
    'Overview of enrollment verification and registrar records.',
  'enrollment-review':
    'Review student enrollments prepared for registrar confirmation.',
  'enrollment-records':
    'View confirmed enrollment records.',
  'student-records':
    'Access student academic enrollment information.',
  profile:
    'View registrar personnel account information.'
};

// ======================================================
// DESIGN CONSTANTS
// ======================================================

const NAVY = '#102a4c';
const GOLD = '#b48727';
const MUTED = '#64748b';
const BORDER = '#dce4ee';

const smallButton = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  border: `1px solid ${BORDER}`,
  background: '#fff',
  color: NAVY,
  padding: '9px 12px',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer'
};

const primaryButton = {
  ...smallButton,
  border: 'none',
  background: NAVY,
  color: '#fff'
};

const selectStyle = {
  width: '100%',
  padding: '11px 12px',
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  background: '#fff',
  color: NAVY,
  fontSize: 13,
  outline: 'none'
};

const secondaryText = {
  display: 'block',
  marginTop: 4,
  fontSize: 11,
  color: MUTED,
  lineHeight: 1.5
};

const pendingText = {
  display: 'block',
  marginTop: 5,
  color: GOLD,
  fontSize: 11,
  fontWeight: 700
};

// ======================================================
// HELPERS
// ======================================================

function errorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.raw?.response?.data?.message ||
    error?.message ||
    'Something went wrong.'
  );
}

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function formatYearLevel(value) {
  const year = Number(value);

  if (!Number.isInteger(year) || year < 1) {
    return 'Not recorded';
  }

  const labels = {
    1: '1st Year',
    2: '2nd Year',
    3: '3rd Year',
    4: '4th Year'
  };

  return labels[year] || `Year ${year}`;
}

function curriculumLabel(curriculum) {
  if (!curriculum) {
    return 'Not assigned';
  }

  return (
    [
      curriculum.curriculum_year,
      curriculum.description
    ]
      .filter(Boolean)
      .join(' — ') ||
    `Curriculum ${curriculum.curriculum_id}`
  );
}

// ======================================================
// STATUS BADGE
// ======================================================

function StatusBadge({ status }) {
  const value = normalize(status);

  const approved = [
    'enrolled',
    'active'
  ].includes(value);

  const pending = value === 'pending';

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '5px 10px',
        borderRadius: 20,
        background: approved
          ? '#e9f7ee'
          : pending
            ? '#fff5df'
            : '#eef2f7',
        color: approved
          ? '#176534'
          : pending
            ? '#936000'
            : MUTED,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap'
      }}
    >
      {status || 'Unknown'}
    </span>
  );
}

// ======================================================
// REUSABLE COMPONENTS
// ======================================================

function OverviewCard({
  icon: Icon,
  label,
  value,
  description
}) {
  return (
    <article className="registrar-overview-card">
      <div className="registrar-overview-top">
        <span>{label}</span>

        <span className="registrar-overview-icon">
          <Icon size={21} />
        </span>
      </div>

      <strong>{value}</strong>
      <small>{description}</small>
    </article>
  );
}

function InformationRow({ label, value }) {
  return (
    <div className="registrar-information-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EnrollmentDetailItem({ label, children }) {
  return (
    <div className="registrar-enrollment-detail-item">
      <span className="registrar-enrollment-detail-label">
        {label}
      </span>

      <div className="registrar-enrollment-detail-value">
        {children}
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description
}) {
  return (
    <div className="registrar-empty-state">
      <div className="registrar-empty-icon">
        <Icon size={29} />
      </div>

      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  );
}

function Notice({ type, children, onClose }) {
  const success = type === 'success';

  return (
    <div
      role={success ? 'status' : 'alert'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 17,
        padding: 14,
        borderRadius: 9,
        background: success
          ? '#edf8f0'
          : '#fff1f0',
        color: success
          ? '#176534'
          : '#a52727',
        fontSize: 12
      }}
    >
      {success ? (
        <CheckCircle2 size={18} />
      ) : (
        <AlertCircle size={18} />
      )}

      <span style={{ flex: 1 }}>
        {children}
      </span>

      {onClose && (
        <button
          type="button"
          aria-label="Dismiss message"
          onClick={onClose}
          style={{
            border: 0,
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function PanelHeading({
  title,
  description,
  icon: Icon
}) {
  return (
    <div className="registrar-panel-heading">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      {Icon && <Icon size={22} />}
    </div>
  );
}

function SearchToolbar({
  searchTerm,
  onSearch,
  placeholder,
  label,
  onRefresh,
  disabled
}) {
  return (
    <div className="registrar-toolbar">
      <div className="registrar-search-field">
        <Search size={18} />

        <input
          type="text"
          value={searchTerm}
          onChange={event =>
            onSearch(event.target.value)
          }
          placeholder={placeholder}
          aria-label={label}
        />
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={disabled}
        style={smallButton}
      >
        <RefreshCw size={15} />
        Refresh
      </button>
    </div>
  );
}

// ======================================================
// EXPANDED ENROLLMENT SUBJECT DETAILS
// ======================================================

function SubjectDetails({ group }) {
  const isPending =
    normalize(group.status) === 'pending';

  const yearLevel = formatYearLevel(
    group.section_year_level ??
    group.year_level
  );

  return (
    <div className="registrar-enrollment-details">

      {/* STUDENT INFORMATION HEADER */}

      <div className="registrar-enrollment-details-header">
        <div>
          <strong className="registrar-enrollment-student-name">
            {group.student_name}
          </strong>

          <span className="registrar-enrollment-student-meta">
            {group.student_no}
            {' · '}
            {group.program_code}
            {' · '}
            {yearLevel}
          </span>
        </div>

        <div className="registrar-enrollment-summary">
          <strong>
            {group.subject_count} subjects
          </strong>

          <span>
            {group.total_units} total units
          </span>
        </div>
      </div>

      {/* THREE-COLUMN INFORMATION GRID */}

      <div className="registrar-enrollment-information">
        <div className="registrar-enrollment-details-grid">

          <EnrollmentDetailItem label="Academic Period">
            {group.school_year || 'Not recorded'}

            <span className="registrar-enrollment-detail-secondary">
              {group.semester || 'Not recorded'}
            </span>
          </EnrollmentDetailItem>

          <EnrollmentDetailItem label="Enrollment Program">
            {group.program_name ||
              group.program_code ||
              'Not assigned'}
          </EnrollmentDetailItem>

          <EnrollmentDetailItem label="Section">
            {group.section_code || '—'}
          </EnrollmentDetailItem>

          <EnrollmentDetailItem label="Year Level">
            {yearLevel}
          </EnrollmentDetailItem>

          <EnrollmentDetailItem label="Student Type">
            {group.student_type || 'Not recorded'}
          </EnrollmentDetailItem>

          <EnrollmentDetailItem label="Enrollment Status">
            <StatusBadge status={group.status} />
          </EnrollmentDetailItem>

        </div>
      </div>

      {/* INITIAL PROGRAM ASSIGNMENT NOTICE */}

      {isPending && group.is_unassigned && (
        <div className="registrar-enrollment-assignment-notice">
          <Info size={18} />

          <span>
            This student does not yet have an
            officially assigned program. The program
            and compatible curriculum will be saved
            during Registrar enrollment confirmation.
          </span>
        </div>
      )}

      {/* SUBJECT LIST */}

      <div
        className="registrar-table-wrapper"
        style={{ marginTop: 0 }}
      >
        <table
          className="registrar-table"
          style={{ minWidth: 460 }}
        >
          <thead>
            <tr>
              <th>Subject Code</th>
              <th>Subject Title</th>
              <th>Units</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {(group.subjects || []).map(subject => (
              <tr key={subject.enrollment_id}>
                <td>
                  <strong>
                    {subject.subject_code}
                  </strong>
                </td>

                <td>{subject.subject_title}</td>

                <td>{subject.units}</td>

                <td>
                  <StatusBadge
                    status={subject.status}
                  />
                </td>
              </tr>
            ))}

            {!group.subjects?.length && (
              <tr>
                <td colSpan={4}>
                  No subjects available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ======================================================
// ENROLLMENT CONFIRMATION MODAL
// ======================================================

function EnrollmentConfirmationModal({
  group,
  confirming,
  onConfirm,
  onClose
}) {
  const [curricula, setCurricula] =
    useState([]);

  const [curriculumId, setCurriculumId] =
    useState('');

  const [loadingCurricula, setLoadingCurricula] =
    useState(true);

  const [curriculumError, setCurriculumError] =
    useState('');

  const [reloadKey, setReloadKey] =
    useState(0);

  const officialCurriculumId =
    group.official_curriculum_id;

  const hasOfficialCurriculum =
    officialCurriculumId !== null &&
    officialCurriculumId !== undefined &&
    Number(officialCurriculumId) > 0;

  useEffect(() => {
    let cancelled = false;

    async function loadCurricula() {
      setLoadingCurricula(true);
      setCurriculumError('');
      setCurricula([]);
      setCurriculumId('');

      try {
        const response = await api.get(
          '/api/registrar/enrollment-reviews/curricula',
          {
            params: {
              student_id: group.student_id,
              period_id: group.period_id,
              section_id: group.section_id
            }
          }
        );

        if (cancelled) return;

        const available = Array.isArray(
          response.data?.curricula
        )
          ? response.data.curricula
          : [];

        setCurricula(available);

        if (hasOfficialCurriculum) {
          const official = available.find(
            item =>
              Number(item.curriculum_id) ===
              Number(officialCurriculumId)
          );

          if (!official) {
            setCurriculumError(
              'The official student curriculum is not compatible with this prepared subject load.'
            );

            return;
          }

          setCurriculumId(
            String(official.curriculum_id)
          );

          return;
        }

        if (available.length === 1) {
          setCurriculumId(
            String(available[0].curriculum_id)
          );
        }

        if (!available.length) {
          setCurriculumError(
            'No active curriculum matches the prepared subjects. Return the subject load to Program Office Personnel for review.'
          );
        }
      } catch (err) {
        if (!cancelled) {
          setCurriculumError(
            errorMessage(err)
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCurricula(false);
        }
      }
    }

    loadCurricula();

    return () => {
      cancelled = true;
    };
  }, [
    group.student_id,
    group.period_id,
    group.section_id,
    officialCurriculumId,
    hasOfficialCurriculum,
    reloadKey
  ]);

  const selectedCurriculum = curricula.find(
    item =>
      String(item.curriculum_id) ===
      String(curriculumId)
  );

  const yearLevel = Number(group.year_level);

  const hasAcademicInformation =
    Number.isInteger(yearLevel) &&
    yearLevel > 0 &&
    Boolean(
      String(group.student_type || '').trim()
    );

  const canConfirm =
    !confirming &&
    !loadingCurricula &&
    !curriculumError &&
    hasAcademicInformation &&
    Boolean(selectedCurriculum) &&
    Number(group.subject_count) > 0;

  return (
    <div className="registrar-modal-overlay">
      <div
        className="registrar-logout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registrar-confirm-title"
        style={{
          width: 'min(560px, 94vw)',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div className="registrar-modal-icon">
          <BookOpen size={27} />
        </div>

        <h2 id="registrar-confirm-title">
          Confirm Student Enrollment?
        </h2>

        <p>
          Review the student's academic information
          and curriculum before confirming the
          prepared subject load.
        </p>

        {/* STUDENT CONFIRMATION INFORMATION */}

        <div
          style={{
            textAlign: 'left',
            padding: 15,
            margin: '18px 0',
            background: '#f6f8fc',
            border: `1px solid ${BORDER}`,
            borderRadius: 10
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: NAVY,
              marginBottom: 5
            }}
          >
            {group.student_name}
          </div>

          <div
            style={{
              fontSize: 12,
              color: MUTED,
              marginBottom: 13
            }}
          >
            {group.student_no}
          </div>

          <div className="registrar-information-list">
            <InformationRow
              label="Program"
              value={
                group.program_code ||
                group.program_name ||
                'Not assigned'
              }
            />

            <InformationRow
              label="Year Level"
              value={formatYearLevel(
                group.year_level
              )}
            />

            <InformationRow
              label="Student Type"
              value={
                group.student_type ||
                'Not recorded'
              }
            />

            <InformationRow
              label="Academic Year"
              value={group.school_year}
            />

            <InformationRow
              label="Semester"
              value={group.semester}
            />

            <InformationRow
              label="Section"
              value={group.section_code}
            />

            <InformationRow
              label="Pending Subjects"
              value={group.subject_count}
            />

            <InformationRow
              label="Total Units"
              value={group.total_units}
            />

            <InformationRow
              label="Student Status"
              value={
                <StatusBadge
                  status={group.student_status}
                />
              }
            />
          </div>
        </div>

        {/* CURRICULUM SELECTION */}

        <div
          style={{
            textAlign: 'left',
            marginBottom: 16
          }}
        >
          <label
            htmlFor="registrar-curriculum"
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: NAVY,
              marginBottom: 8
            }}
          >
            Official Curriculum

            <span style={{ color: '#b42318' }}>
              {' *'}
            </span>
          </label>

          {loadingCurricula ? (
            <div
              style={{
                padding: 13,
                background: '#f6f8fc',
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                color: MUTED,
                fontSize: 12
              }}
            >
              Retrieving compatible curricula...
            </div>
          ) : (
            <select
              id="registrar-curriculum"
              value={curriculumId}
              onChange={event =>
                setCurriculumId(event.target.value)
              }
              disabled={
                confirming ||
                hasOfficialCurriculum ||
                curricula.length <= 1
              }
              style={{
                ...selectStyle,
                background:
                  hasOfficialCurriculum ||
                  curricula.length <= 1
                    ? '#f6f8fc'
                    : '#fff'
              }}
            >
              <option value="">
                Select curriculum...
              </option>

              {curricula.map(curriculum => (
                <option
                  key={curriculum.curriculum_id}
                  value={String(
                    curriculum.curriculum_id
                  )}
                >
                  {curriculumLabel(curriculum)}
                </option>
              ))}
            </select>
          )}

          {!loadingCurricula && !curriculumError && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: MUTED,
                lineHeight: 1.6
              }}
            >
              {hasOfficialCurriculum
                ? 'The existing official student curriculum is retained.'
                : curricula.length === 1
                  ? 'The only compatible curriculum has been selected automatically.'
                  : 'Multiple curricula match the prepared subjects. Verify and select the correct curriculum before confirming.'}
            </div>
          )}

          {curriculumError && (
            <div style={{ marginTop: 12 }}>
              <Notice type="error">
                {curriculumError}
              </Notice>

              <button
                type="button"
                style={smallButton}
                disabled={confirming}
                onClick={() =>
                  setReloadKey(value => value + 1)
                }
              >
                <RefreshCw size={14} />
                Retry Curriculum Loading
              </button>
            </div>
          )}
        </div>

        {!hasAcademicInformation && (
          <Notice type="error">
            This student has incomplete academic
            information. Year level and student type
            must be recorded before confirmation.
          </Notice>
        )}

        {/* CONFIRMATION NOTICE */}

        <div
          className="registrar-enrollment-assignment-notice"
          style={{ textAlign: 'left' }}
        >
          <ShieldCheck size={19} />

          <span>
            {group.is_unassigned
              ? 'Confirmation will officially assign the selected program and curriculum to this student, activate the student profile, and confirm the pending subjects.'
              : 'Confirmation will retain the existing academic assignment and change the pending subject enrollments to enrolled.'}

            {' '}

            The student number, year level and
            student type will remain unchanged.
          </span>
        </div>

        {/* MODAL ACTIONS */}

        <div className="registrar-modal-actions">
          <button
            type="button"
            className="registrar-modal-cancel"
            onClick={onClose}
            disabled={confirming}
          >
            Cancel
          </button>

          <button
            type="button"
            className="registrar-modal-confirm"
            onClick={() =>
              onConfirm(Number(curriculumId))
            }
            disabled={!canConfirm}
            style={{
              opacity: canConfirm ? 1 : 0.55,
              cursor: canConfirm
                ? 'pointer'
                : 'not-allowed'
            }}
          >
            {confirming
              ? 'Confirming...'
              : 'Yes, Confirm Enrollment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// MAIN REGISTRAR DASHBOARD
// ======================================================

function RegistrarDashboard() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  // ====================================================
  // STATE
  // ====================================================

  const [activeSection, setActiveSection] =
    useState('dashboard');

  // Mobile sidebar

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  // Desktop sidebar

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState('');

  const [dashboard, setDashboard] =
    useState(null);

  const [reviews, setReviews] =
    useState([]);

  const [records, setRecords] =
    useState([]);

  const [students, setStudents] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [confirming, setConfirming] =
    useState(false);

  const [expandedGroup, setExpandedGroup] =
    useState('');

  const [confirmationGroup, setConfirmationGroup] =
    useState(null);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  // ====================================================
  // CURRENT USER
  // ====================================================

  const currentPage =
    navigation.find(
      item => item.id === activeSection
    ) || navigation[0];

  const registrarUser = auth?.user;

  const registrarName = [
    registrarUser?.first_name,
    registrarUser?.middle_name,
    registrarUser?.last_name
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const displayName =
    registrarName ||
    registrarUser?.full_name ||
    registrarUser?.name ||
    'Registrar Personnel';

  const displayEmail =
    registrarUser?.email ||
    registrarUser?.username ||
    'Not available';

  // ====================================================
  // LOAD DATA
  // ====================================================

  const loadData = useCallback(async (
    section,
    { clearError = true } = {}
  ) => {
    if (section === 'profile') return;

    const endpoints = {
      dashboard:
        '/api/registrar/dashboard',

      'enrollment-review':
        '/api/registrar/enrollment-reviews',

      'enrollment-records':
        '/api/registrar/enrollment-records',

      'student-records':
        '/api/registrar/students'
    };

    if (!endpoints[section]) return;

    setLoading(true);

    if (clearError) {
      setError('');
    }

    try {
      const response = await api.get(
        endpoints[section]
      );

      if (section === 'dashboard') {
        setDashboard(response.data);
      }

      if (section === 'enrollment-review') {
        setReviews(
          response.data?.reviews || []
        );
      }

      if (section === 'enrollment-records') {
        setRecords(
          response.data?.records || []
        );
      }

      if (section === 'student-records') {
        setStudents(
          response.data?.students || []
        );
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(activeSection);
  }, [activeSection, loadData]);

  // ====================================================
  // SIDEBAR RESPONSIVENESS
  // ====================================================

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 900) {
        setSidebarOpen(false);
      }
    }

    window.addEventListener(
      'resize',
      handleResize
    );

    return () => {
      window.removeEventListener(
        'resize',
        handleResize
      );
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, []);

  // ====================================================
  // SEARCH FILTERS
  // ====================================================

  const filteredReviews = useMemo(() => {
    const query = normalize(searchTerm);

    return reviews.filter(group => {
      if (!query) return true;

      return [
        group.student_no,
        group.student_name,
        group.program_code,
        group.program_name,
        group.section_code,
        group.school_year,
        group.semester,
        group.student_type,
        formatYearLevel(group.year_level)
      ].some(value =>
        normalize(value).includes(query)
      );
    });
  }, [reviews, searchTerm]);

  const filteredRecords = useMemo(() => {
    const query = normalize(searchTerm);

    return records.filter(group => {
      if (!query) return true;

      return [
        group.student_no,
        group.student_name,
        group.program_code,
        group.program_name,
        group.section_code,
        group.school_year,
        group.semester
      ].some(value =>
        normalize(value).includes(query)
      );
    });
  }, [records, searchTerm]);

  const filteredStudents = useMemo(() => {
    const query = normalize(searchTerm);

    return students.filter(student => {
      if (!query) return true;

      return [
        student.student_no,
        student.student_name,
        student.email,
        student.program_code,
        student.program_name,
        student.curriculum_year,
        student.student_type,
        student.status,
        formatYearLevel(student.year_level)
      ].some(value =>
        normalize(value).includes(query)
      );
    });
  }, [students, searchTerm]);

  // ====================================================
  // NAVIGATION ACTIONS
  // ====================================================

  function changeSection(section) {
    if (confirming) return;

    setActiveSection(section);
    setSidebarOpen(false);
    setSearchTerm('');
    setExpandedGroup('');
    setConfirmationGroup(null);
    setError('');
    setSuccess('');
  }

  function toggleDesktopSidebar() {
    setSidebarCollapsed(previous => !previous);
    setSidebarOpen(false);
  }

  function toggleExpandedGroup(groupId) {
    setExpandedGroup(previous =>
      previous === groupId
        ? ''
        : groupId
    );
  }

  // ====================================================
  // ENROLLMENT CONFIRMATION
  // ====================================================

  function openConfirmation(group) {
    if (confirming) return;

    setError('');
    setSuccess('');
    setConfirmationGroup(group);
  }

  function closeConfirmation() {
    if (confirming) return;

    setConfirmationGroup(null);
  }

  async function confirmEnrollment(curriculumId) {
    if (!confirmationGroup || confirming) {
      return;
    }

    if (
      !Number.isSafeInteger(curriculumId) ||
      curriculumId <= 0
    ) {
      setError(
        'Please select a valid curriculum.'
      );

      return;
    }

    setConfirming(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(
        '/api/registrar/enrollment-reviews/confirm',
        {
          student_id:
            confirmationGroup.student_id,

          period_id:
            confirmationGroup.period_id,

          section_id:
            confirmationGroup.section_id,

          curriculum_id:
            curriculumId
        }
      );

      setConfirmationGroup(null);
      setExpandedGroup('');

      setSuccess(
        response.data?.message ||
        'Enrollment confirmed successfully.'
      );

      await loadData('enrollment-review', {
        clearError: false
      });
    } catch (err) {
      const message = errorMessage(err);

      setConfirmationGroup(null);

      await loadData('enrollment-review', {
        clearError: false
      });

      setError(message);
    } finally {
      setConfirming(false);
    }
  }

  // ====================================================
  // LOGOUT
  // ====================================================

  async function handleLogout() {
    if (loggingOut || confirming) return;

    setLoggingOut(true);

    try {
      if (typeof auth?.logout !== 'function') {
        throw new Error(
          'Authentication logout function is unavailable.'
        );
      }

      await auth.logout();

      setShowLogoutModal(false);
      setSidebarOpen(false);

      navigate('/login', {
        replace: true
      });
    } catch (err) {
      console.error(
        'Registrar logout failed:',
        err
      );

      setLoggingOut(false);

      window.alert(
        'Unable to log out. Please try again.'
      );
    }
  }

  // ====================================================
  // DASHBOARD
  // ====================================================

  function renderDashboard() {
    const activePeriod =
      dashboard?.active_period;

    return (
      <>
        <section className="registrar-welcome">
          <div>
            <span className="registrar-eyebrow">
              REGISTRAR PERSONNEL PORTAL
            </span>

            <h2>Welcome to PBCC!</h2>

            <p>
              Review student enrollment requests,
              verify enrollment information, and
              access academic enrollment records
              through the Registrar Personnel Portal.
            </p>
          </div>

          <div className="registrar-welcome-emblem">
            <img
              src="/pbcc-logo.png"
              alt="PBCC Seal"
            />
          </div>
        </section>

        <section className="registrar-overview-grid">
          <OverviewCard
            icon={Clock3}
            label="Pending Reviews"
            value={
              loading
                ? '...'
                : dashboard?.pending_reviews ?? '—'
            }
            description="Student loads awaiting confirmation"
          />

          <OverviewCard
            icon={FileCheck2}
            label="Confirmed Enrollments"
            value={
              loading
                ? '...'
                : dashboard?.confirmed_enrollments ?? '—'
            }
            description="Confirmed student enrollment groups"
          />

          <OverviewCard
            icon={Users}
            label="Student Records"
            value={
              loading
                ? '...'
                : dashboard?.student_records ?? '—'
            }
            description="Students in the college directory"
          />

          <OverviewCard
            icon={CalendarDays}
            label="Academic Term"
            value={
              activePeriod?.semester ||
              'Not assigned'
            }
            description={
              activePeriod?.school_year ||
              'No active academic period'
            }
          />
        </section>

        <div className="registrar-dashboard-columns">
          <section className="registrar-panel">
            <PanelHeading
              title="Enrollment Overview"
              description="Current enrollment verification and registrar activities."
              icon={School}
            />

            <div className="registrar-information-list">
              <InformationRow
                label="Pending Enrollment Reviews"
                value={
                  dashboard?.pending_reviews ?? '—'
                }
              />

              <InformationRow
                label="Confirmed Enrollment Records"
                value={
                  dashboard?.confirmed_enrollments ?? '—'
                }
              />

              <InformationRow
                label="Academic Year"
                value={
                  activePeriod?.school_year ||
                  'Not assigned'
                }
              />

              <InformationRow
                label="Semester"
                value={
                  activePeriod?.semester ||
                  'Not assigned'
                }
              />
            </div>
          </section>

          <section className="registrar-panel">
            <PanelHeading
              title="Quick Access"
              description="Navigate to registrar services."
            />

            <div className="registrar-quick-links">
              {navigation
                .filter(
                  item => item.id !== 'dashboard'
                )
                .map(item => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="registrar-quick-link"
                      onClick={() =>
                        changeSection(item.id)
                      }
                    >
                      <span className="registrar-quick-icon">
                        <Icon size={19} />
                      </span>

                      <span>{item.label}</span>

                      <ChevronRight size={17} />
                    </button>
                  );
                })}
            </div>
          </section>
        </div>

        <section className="registrar-notice">
          <Info size={20} />

          <div>
            <strong>
              Registrar Enrollment Confirmation
            </strong>

            <p>
              Subject loads prepared by Program
              Office Personnel appear in Enrollment
              Review. Confirmation officially assigns
              the program and curriculum of newly
              assigned students and changes pending
              subject enrollments to enrolled.
            </p>
          </div>
        </section>
      </>
    );
  }

  // ====================================================
  // ENROLLMENT REVIEW
  // ====================================================

  function renderEnrollmentReview() {
    return (
      <section className="registrar-panel">
        <PanelHeading
          title="Enrollment Review"
          description="Review pending student subject loads before official enrollment confirmation."
          icon={ClipboardCheck}
        />

        <SearchToolbar
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          placeholder="Search student, number, or section"
          label="Search enrollment reviews"
          onRefresh={() =>
            loadData('enrollment-review')
          }
          disabled={loading || confirming}
        />

        {/* NAVY HEADER / GOLD LINE / ZEBRA TABLE */}

        <div className="registrar-table-wrapper">
          <table className="registrar-table">
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Student Name</th>
                <th>Program</th>
                <th>Year Level</th>
                <th>Student Type</th>
                <th>Academic Term</th>
                <th>Section</th>
                <th>Subjects</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredReviews.map(group => (
                <tr key={group.group_id}>
                  <td>
                    {group.student_no}
                  </td>

                  <td>
                    <strong>
                      {group.student_name}
                    </strong>

                    {group.is_unassigned && (
                      <span style={pendingText}>
                        Initial program assignment
                      </span>
                    )}
                  </td>

                  <td>
                    <strong>
                      {group.program_code}
                    </strong>

                    {group.is_unassigned && (
                      <span style={secondaryText}>
                        Pending assignment
                      </span>
                    )}
                  </td>

                  <td>
                    {formatYearLevel(
                      group.year_level
                    )}
                  </td>

                  <td>
                    {group.student_type ||
                      'Not recorded'}
                  </td>

                  <td>
                    {group.school_year}

                    <span style={secondaryText}>
                      {group.semester}
                    </span>
                  </td>

                  <td>
                    {group.section_code}
                  </td>

                  <td>
                    {group.subject_count}
                    {' · '}
                    {group.total_units} units
                  </td>

                  <td>
                    <StatusBadge
                      status={group.status}
                    />
                  </td>

                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        toggleExpandedGroup(
                          group.group_id
                        )
                      }
                      style={smallButton}
                      disabled={confirming}
                      aria-expanded={
                        expandedGroup === group.group_id
                      }
                    >
                      {expandedGroup === group.group_id
                        ? <ChevronDown size={15} />
                        : <Eye size={15} />}

                      Review
                    </button>
                  </td>
                </tr>
              ))}

              {!filteredReviews.length && (
                <tr>
                  <td colSpan={10}>
                    <EmptyState
                      icon={ClipboardCheck}
                      title={
                        loading
                          ? 'Loading pending enrollments...'
                          : 'No pending enrollments found'
                      }
                      description={
                        searchTerm
                          ? 'Try another search.'
                          : 'Student loads prepared by Program Office Personnel will appear here.'
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* EXPANDED SUBJECT DETAILS */}

        {filteredReviews
          .filter(
            group =>
              group.group_id === expandedGroup
          )
          .map(group => (
            <div
              key={group.group_id}
              style={{ marginTop: 16 }}
            >
              <SubjectDetails group={group} />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginTop: 13
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    color: MUTED,
                    fontSize: 12
                  }}
                >
                  <Info size={15} />

                  Confirmation applies to the
                  reviewed pending subject load.
                </span>

                <button
                  type="button"
                  onClick={() =>
                    openConfirmation(group)
                  }
                  disabled={confirming}
                  style={primaryButton}
                >
                  <CheckCircle2 size={16} />
                  Confirm Enrollment
                </button>
              </div>
            </div>
          ))}

        <div
          className="registrar-inline-note"
          style={{ marginTop: 18 }}
        >
          <ShieldCheck size={18} />

          <p>
            Only authorized Registrar Personnel
            can confirm pending enrollments.
            Confirmation officially assigns the
            program and curriculum of unassigned
            students and changes the pending
            subject enrollment status to enrolled.
          </p>
        </div>
      </section>
    );
  }

  // ====================================================
  // ENROLLMENT RECORDS
  // ====================================================

  function renderEnrollmentRecords() {
    return (
      <section className="registrar-panel">
        <PanelHeading
          title="Enrollment Records"
          description="View confirmed enrollment records and individual student subject loads."
          icon={FolderOpen}
        />

        <SearchToolbar
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          placeholder="Search confirmed enrollment records"
          label="Search enrollment records"
          onRefresh={() =>
            loadData('enrollment-records')
          }
          disabled={loading}
        />

        <div className="registrar-table-wrapper">
          <table className="registrar-table">
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Student Name</th>
                <th>Program</th>
                <th>Year Level</th>
                <th>Academic Year</th>
                <th>Semester</th>
                <th>Section</th>
                <th>Subjects</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map(group => (
                <tr key={group.group_id}>
                  <td>
                    {group.student_no}
                  </td>

                  <td>
                    <strong>
                      {group.student_name}
                    </strong>
                  </td>

                  <td>
                    {group.program_code}
                  </td>

                  <td>
                    {formatYearLevel(
                      group.section_year_level ??
                      group.year_level
                    )}
                  </td>

                  <td>
                    {group.school_year}
                  </td>

                  <td>
                    {group.semester}
                  </td>

                  <td>
                    {group.section_code}
                  </td>

                  <td>
                    {group.subject_count}
                    {' · '}
                    {group.total_units} units
                  </td>

                  <td>
                    <StatusBadge
                      status={group.status}
                    />
                  </td>

                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        toggleExpandedGroup(
                          group.group_id
                        )
                      }
                      style={smallButton}
                      aria-expanded={
                        expandedGroup === group.group_id
                      }
                    >
                      {expandedGroup === group.group_id
                        ? <ChevronDown size={15} />
                        : <Eye size={15} />}

                      View
                    </button>
                  </td>
                </tr>
              ))}

              {!filteredRecords.length && (
                <tr>
                  <td colSpan={10}>
                    <EmptyState
                      icon={FolderOpen}
                      title={
                        loading
                          ? 'Loading enrollment records...'
                          : 'No confirmed records found'
                      }
                      description={
                        searchTerm
                          ? 'Try another search.'
                          : 'Confirmed student enrollments will appear here.'
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredRecords
          .filter(
            group =>
              group.group_id === expandedGroup
          )
          .map(group => (
            <div
              key={group.group_id}
              style={{ marginTop: 16 }}
            >
              <SubjectDetails group={group} />
            </div>
          ))}
      </section>
    );
  }

  // ====================================================
  // STUDENT RECORDS
  // ====================================================

  function renderStudentRecords() {
    return (
      <section className="registrar-panel">
        <PanelHeading
          title="Student Records"
          description="Access the student directory and official academic assignments for registrar verification."
          icon={Users}
        />

        <SearchToolbar
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          placeholder="Search student name, email, or number"
          label="Search student records"
          onRefresh={() =>
            loadData('student-records')
          }
          disabled={loading}
        />

        <div className="registrar-table-wrapper">
          <table className="registrar-table">
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Student Name</th>
                <th>Email</th>
                <th>Program</th>
                <th>Curriculum</th>
                <th>Year Level</th>
                <th>Student Type</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.student_id}>
                  <td>
                    {student.student_no}
                  </td>

                  <td>
                    <strong>
                      {student.student_name}
                    </strong>
                  </td>

                  <td>
                    {student.email || '—'}
                  </td>

                  <td>
                    {student.program_id != null ? (
                      <>
                        <strong>
                          {student.program_code}
                        </strong>

                        <span style={secondaryText}>
                          {student.program_name}
                        </span>
                      </>
                    ) : (
                      <span style={pendingText}>
                        Not assigned
                      </span>
                    )}
                  </td>

                  <td>
                    {student.curriculum_id != null ? (
                      <>
                        <strong>
                          {student.curriculum_year ||
                            `Curriculum ${student.curriculum_id}`}
                        </strong>

                        {student.curriculum_description && (
                          <span style={secondaryText}>
                            {student.curriculum_description}
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={pendingText}>
                        Not assigned
                      </span>
                    )}
                  </td>

                  <td>
                    {formatYearLevel(
                      student.year_level
                    )}
                  </td>

                  <td>
                    {student.student_type ||
                      'Not recorded'}
                  </td>

                  <td>
                    <StatusBadge
                      status={student.status}
                    />
                  </td>
                </tr>
              ))}

              {!filteredStudents.length && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={GraduationCap}
                      title={
                        loading
                          ? 'Loading student records...'
                          : 'No student records found'
                      }
                      description={
                        searchTerm
                          ? 'Try another search.'
                          : 'Student directory records will appear here.'
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          className="registrar-inline-note"
          style={{ marginTop: 18 }}
        >
          <Info size={18} />

          <p>
            Newly created students may have no
            assigned program or curriculum.
            Official academic assignments are
            recorded during enrollment confirmation.
          </p>
        </div>
      </section>
    );
  }

  // ====================================================
  // REGISTRAR PROFILE
  // ====================================================

  function renderProfile() {
    return (
      <div className="registrar-profile-layout">
        <section className="registrar-panel registrar-profile-card">
          <div className="registrar-profile-avatar">
            <UserRound size={42} />
          </div>

          <h3>{displayName}</h3>

          <p>Registrar Personnel</p>

          <span className="registrar-profile-label">
            Pangantucan Bukidnon Community College
          </span>
        </section>

        <section className="registrar-panel">
          <PanelHeading
            title="Personnel Information"
            description="Account and personnel profile overview."
            icon={ShieldCheck}
          />

          <div className="registrar-information-list">
            <InformationRow
              label="Account Name"
              value={displayName}
            />

            <InformationRow
              label="Email Address"
              value={displayEmail}
            />

            <InformationRow
              label="Account Role"
              value="Registrar Personnel"
            />

            <InformationRow
              label="Institution"
              value="Pangantucan Bukidnon Community College"
            />
          </div>
        </section>
      </div>
    );
  }

  // ====================================================
  // PAGE CONTENT
  // ====================================================

  function renderContent() {
    switch (activeSection) {
      case 'enrollment-review':
        return renderEnrollmentReview();

      case 'enrollment-records':
        return renderEnrollmentRecords();

      case 'student-records':
        return renderStudentRecords();

      case 'profile':
        return renderProfile();

      default:
        return renderDashboard();
    }
  }

  // ====================================================
  // MAIN LAYOUT
  // ====================================================

  return (
    <div
      className={`registrar-layout ${
        sidebarCollapsed
          ? 'registrar-layout-collapsed'
          : ''
      }`}
    >

      {/* MOBILE SIDEBAR OVERLAY */}

      {sidebarOpen && (
        <button
          type="button"
          className="registrar-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      {/* SIDEBAR */}

      <aside
        id="registrar-sidebar"
        className={`registrar-sidebar ${
          sidebarOpen
            ? 'registrar-sidebar-open'
            : ''
        }`}
      >

        {/* PBCC BRAND */}

        <div className="registrar-brand">
          <img
            src="/pbcc-logo.png"
            alt="PBCC Logo"
          />

          <div>
            <strong>PBCC</strong>
            <span>Registrar Portal</span>
          </div>

          <button
            type="button"
            className="registrar-sidebar-close"
            aria-label="Close navigation"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <X size={21} />
          </button>
        </div>

        {/* NAVIGATION */}

        <div className="registrar-sidebar-label">
          MAIN NAVIGATION
        </div>

        <nav
          className="registrar-navigation"
          aria-label="Registrar navigation"
        >
          {navigation.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  changeSection(item.id)
                }
                disabled={confirming}
                className={`registrar-nav-item ${
                  activeSection === item.id
                    ? 'registrar-nav-active'
                    : ''
                }`}
                aria-current={
                  activeSection === item.id
                    ? 'page'
                    : undefined
                }
              >
                <Icon size={19} />

                <span>{item.label}</span>

                {activeSection === item.id && (
                  <ChevronRight size={16} />
                )}
              </button>
            );
          })}
        </nav>

        {/* SIDEBAR ACCOUNT */}

        <div className="registrar-sidebar-bottom">
          <div className="registrar-sidebar-account">
            <div className="registrar-account-avatar">
              <UserRound size={21} />
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>Registrar Personnel</span>
            </div>
          </div>

          <button
            type="button"
            className="registrar-logout-button"
            disabled={confirming}
            onClick={() =>
              setShowLogoutModal(true)
            }
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}

      <div className="registrar-main">

        {/* TOPBAR */}

        <header className="registrar-topbar">
          <div className="registrar-topbar-left">

            {/* DESKTOP SIDEBAR TOGGLE */}

            <button
              type="button"
              className="registrar-desktop-sidebar-toggle"
              onClick={toggleDesktopSidebar}
              aria-label={
                sidebarCollapsed
                  ? 'Expand sidebar'
                  : 'Collapse sidebar'
              }
              aria-expanded={!sidebarCollapsed}
              aria-controls="registrar-sidebar"
              title={
                sidebarCollapsed
                  ? 'Expand sidebar'
                  : 'Collapse sidebar'
              }
            >
              {sidebarCollapsed ? (
                <Menu size={22} />
              ) : (
                <PanelLeftClose size={22} />
              )}
            </button>

            {/* MOBILE SIDEBAR TOGGLE */}

            <button
              type="button"
              className="registrar-menu-button"
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              aria-controls="registrar-sidebar"
              onClick={() =>
                setSidebarOpen(true)
              }
            >
              <Menu size={23} />
            </button>

            {/* CURRENT PAGE TITLE */}

            <div>
              <h1>{currentPage.label}</h1>

              <p>
                {descriptions[activeSection]}
              </p>
            </div>
          </div>

          {/* TOPBAR ACCOUNT */}

          <div className="registrar-topbar-account">
            <div className="registrar-topbar-avatar">
              <UserRound size={20} />
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>Registrar Personnel</span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}

        <main className="registrar-content">
          {error && (
            <Notice
              type="error"
              onClose={() => setError('')}
            >
              {error}
            </Notice>
          )}

          {success && (
            <Notice
              type="success"
              onClose={() => setSuccess('')}
            >
              {success}
            </Notice>
          )}

          {renderContent()}
        </main>

        {/* FOOTER */}

        <footer className="registrar-footer">
          © {new Date().getFullYear()} Pangantucan
          Bukidnon Community College
        </footer>
      </div>

      {/* ENROLLMENT CONFIRMATION MODAL */}

      {confirmationGroup && (
        <EnrollmentConfirmationModal
          key={confirmationGroup.group_id}
          group={confirmationGroup}
          confirming={confirming}
          onConfirm={confirmEnrollment}
          onClose={closeConfirmation}
        />
      )}

      {/* LOGOUT CONFIRMATION MODAL */}

      {showLogoutModal && (
        <div className="registrar-modal-overlay">
          <div
            className="registrar-logout-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="registrar-logout-title"
          >
            <div className="registrar-modal-icon">
              <LogOut size={27} />
            </div>

            <h2 id="registrar-logout-title">
              Log out of your account?
            </h2>

            <p>
              Are you sure you want to leave
              the Registrar Personnel Portal?
            </p>

            <div className="registrar-modal-actions">
              <button
                type="button"
                className="registrar-modal-cancel"
                onClick={() =>
                  setShowLogoutModal(false)
                }
                disabled={loggingOut}
              >
                Cancel
              </button>

              <button
                type="button"
                className="registrar-modal-confirm"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut
                  ? 'Logging Out...'
                  : 'Yes, Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegistrarDashboard;