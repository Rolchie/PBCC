
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
  BookOpen
} from 'lucide-react';

import { AuthContext } from '../../context/auth-context';
import api from '../../Services/api';
import './RegistrarDashboard.css';

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

function errorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    'Something went wrong.'
  );
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function StatusBadge({ status }) {
  const approved = normalize(status) === 'enrolled';

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '5px 10px',
        borderRadius: 20,
        background: approved ? '#e9f7ee' : '#fff5df',
        color: approved ? '#176534' : '#936000',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'capitalize'
      }}
    >
      {status || 'Unknown'}
    </span>
  );
}

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
        background: success ? '#edf8f0' : '#fff1f0',
        color: success ? '#176534' : '#a52727',
        fontSize: 12
      }}
    >
      {success
        ? <CheckCircle2 size={18} />
        : <AlertCircle size={18} />}

      <span style={{ flex: 1 }}>{children}</span>

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

function SubjectDetails({ group }) {
  return (
    <div
      style={{
        padding: '16px 18px',
        background: '#f6f8fc',
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        margin: '8px 0 14px'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 15
        }}
      >
        <div>
          <strong
            style={{
              display: 'block',
              color: NAVY,
              fontSize: 14
            }}
          >
            {group.student_name}
          </strong>

          <span
            style={{
              display: 'block',
              marginTop: 5,
              fontSize: 12,
              color: MUTED
            }}
          >
            {group.student_no}
            {' · '}
            {group.program_code}
            {' · '}
            Year {group.year_level}
          </span>
        </div>

        <div style={{ textAlign: 'right' }}>
          <strong style={{ fontSize: 13, color: NAVY }}>
            {group.subject_count} subjects
          </strong>

          <div
            style={{
              marginTop: 5,
              fontSize: 12,
              color: MUTED
            }}
          >
            {group.total_units} total units
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 15,
          marginBottom: 13,
          fontSize: 12,
          color: NAVY
        }}
      >
        <span>
          <strong>Period:</strong>{' '}
          {group.school_year} — {group.semester}
        </span>

        <span>
          <strong>Section:</strong>{' '}
          {group.section_code}
        </span>

        <span>
          <strong>Status:</strong>{' '}
          <StatusBadge status={group.status} />
        </span>
      </div>

      <div
        style={{
          overflowX: 'auto',
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          background: '#fff'
        }}
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
            {group.subjects.map(subject => (
              <tr key={subject.enrollment_id}>
                <td>
                  <strong>{subject.subject_code}</strong>
                </td>
                <td>{subject.subject_title}</td>
                <td>{subject.units}</td>
                <td>
                  <StatusBadge status={subject.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RegistrarDashboard() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const [activeSection, setActiveSection] =
    useState('dashboard');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] =
    useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [dashboard, setDashboard] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [expandedGroup, setExpandedGroup] = useState('');
  const [confirmationGroup, setConfirmationGroup] =
    useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentPage =
    navigation.find(item => item.id === activeSection) ||
    navigation[0];

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
    registrarUser?.email || 'Not available';

  const loadData = useCallback(async (section) => {
    if (section === 'profile') return;

    setLoading(true);
    setError('');

    const endpoints = {
      dashboard: '/api/registrar/dashboard',
      'enrollment-review':
        '/api/registrar/enrollment-reviews',
      'enrollment-records':
        '/api/registrar/enrollment-records',
      'student-records':
        '/api/registrar/students'
    };

    try {
      const response = await api.get(endpoints[section]);

      if (section === 'dashboard') {
        setDashboard(response.data);
      }

      if (section === 'enrollment-review') {
        setReviews(response.data?.reviews || []);
      }

      if (section === 'enrollment-records') {
        setRecords(response.data?.records || []);
      }

      if (section === 'student-records') {
        setStudents(response.data?.students || []);
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

  const filteredReviews = useMemo(() => {
    const query = normalize(searchTerm);

    return reviews.filter(group => {
      if (!query) return true;

      return [
        group.student_no,
        group.student_name,
        group.program_code,
        group.section_code,
        group.school_year,
        group.semester
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
        student.program_code
      ].some(value =>
        normalize(value).includes(query)
      );
    });
  }, [students, searchTerm]);

  function changeSection(section) {
    setActiveSection(section);
    setSidebarOpen(false);
    setSearchTerm('');
    setExpandedGroup('');
    setConfirmationGroup(null);
    setError('');
    setSuccess('');
  }

  async function confirmEnrollment() {
    if (!confirmationGroup || confirming) return;

    setConfirming(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(
        '/api/registrar/enrollment-reviews/confirm',
        {
          student_id: confirmationGroup.student_id,
          period_id: confirmationGroup.period_id,
          section_id: confirmationGroup.section_id
        }
      );

      setConfirmationGroup(null);
      setExpandedGroup('');

      setSuccess(
        response.data?.message ||
        'Enrollment confirmed successfully.'
      );

      await loadData('enrollment-review');
    } catch (err) {
      setConfirmationGroup(null);
      setError(errorMessage(err));

      await loadData('enrollment-review');
    } finally {
      setConfirming(false);
    }
  }

  function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      if (typeof auth?.logout !== 'function') {
        throw new Error(
          'Authentication logout function is unavailable.'
        );
      }

      auth.logout();

      setShowLogoutModal(false);
      setSidebarOpen(false);

      navigate('/login', {
        replace: true
      });
    } catch (err) {
      console.error('Registrar logout failed:', err);
      setLoggingOut(false);

      window.alert(
        'Unable to log out. Please try again.'
      );
    }
  }

  function renderDashboard() {
    const activePeriod = dashboard?.active_period;

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
            description="Confirmed student-period records"
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
            value={activePeriod?.semester || 'Not assigned'}
            description={
              activePeriod?.school_year ||
              'No active academic period'
            }
          />
        </section>

        <div className="registrar-dashboard-columns">
          <section className="registrar-panel">
            <div className="registrar-panel-heading">
              <div>
                <h3>Enrollment Overview</h3>

                <p>
                  Current enrollment verification and
                  registrar activities.
                </p>
              </div>

              <School size={22} />
            </div>

            <div className="registrar-information-list">
              <InformationRow
                label="Pending Enrollment Reviews"
                value={dashboard?.pending_reviews ?? '—'}
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
                  activePeriod?.school_year || 'Not assigned'
                }
              />

              <InformationRow
                label="Semester"
                value={
                  activePeriod?.semester || 'Not assigned'
                }
              />
            </div>
          </section>

          <section className="registrar-panel">
            <div className="registrar-panel-heading">
              <div>
                <h3>Quick Access</h3>

                <p>
                  Navigate to registrar services.
                </p>
              </div>
            </div>

            <div className="registrar-quick-links">
              {navigation
                .filter(item => item.id !== 'dashboard')
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
              Subject loads prepared by Program Office
              Personnel appear in Enrollment Review.
              Confirmed loads become official enrolled
              records and appear in Enrollment Records.
            </p>
          </div>
        </section>
      </>
    );
  }

  function renderEnrollmentReview() {
    return (
      <section className="registrar-panel">
        <div className="registrar-panel-heading">
          <div>
            <h3>Enrollment Review</h3>

            <p>
              Review pending student subject loads
              before official enrollment confirmation.
            </p>
          </div>

          <ClipboardCheck size={22} />
        </div>

        <div className="registrar-toolbar">
          <div className="registrar-search-field">
            <Search size={18} />

            <input
              type="text"
              value={searchTerm}
              onChange={event =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search student, number, or section"
              aria-label="Search enrollment reviews"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              loadData('enrollment-review')
            }
            disabled={loading}
            style={smallButton}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <div className="registrar-table-wrapper">
          <table className="registrar-table">
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Student Name</th>
                <th>Program</th>
                <th>Year Level</th>
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
                  <td>{group.student_no}</td>
                  <td>
                    <strong>{group.student_name}</strong>
                  </td>
                  <td>{group.program_code}</td>
                  <td>Year {group.year_level}</td>
                  <td>
                    {group.school_year}
                    <div
                      style={{
                        fontSize: 11,
                        color: MUTED,
                        marginTop: 4
                      }}
                    >
                      {group.semester}
                    </div>
                  </td>
                  <td>{group.section_code}</td>
                  <td>
                    {group.subject_count}
                    {' · '}
                    {group.total_units} units
                  </td>
                  <td>
                    <StatusBadge status={group.status} />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGroup(previous =>
                          previous === group.group_id
                            ? ''
                            : group.group_id
                        )
                      }
                      style={smallButton}
                    >
                      <Eye size={15} />
                      Review
                    </button>
                  </td>
                </tr>
              ))}

              {!filteredReviews.length && (
                <tr>
                  <td colSpan={9}>
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

        {filteredReviews
          .filter(group =>
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
                  Confirmation applies to all pending
                  subjects for this student and period.
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setConfirmationGroup(group)
                  }
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
            Only authorized Registrar Personnel can
            confirm pending enrollments. Confirmation
            changes subject enrollment status to enrolled.
          </p>
        </div>
      </section>
    );
  }

  function renderEnrollmentRecords() {
    return (
      <section className="registrar-panel">
        <div className="registrar-panel-heading">
          <div>
            <h3>Enrollment Records</h3>

            <p>
              View confirmed enrollment records
              and individual student subject loads.
            </p>
          </div>

          <FolderOpen size={22} />
        </div>

        <div className="registrar-toolbar">
          <div className="registrar-search-field">
            <Search size={18} />

            <input
              type="text"
              value={searchTerm}
              onChange={event =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search confirmed enrollment records"
              aria-label="Search enrollment records"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              loadData('enrollment-records')
            }
            disabled={loading}
            style={smallButton}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <div className="registrar-table-wrapper">
          <table className="registrar-table">
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Student Name</th>
                <th>Program</th>
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
                  <td>{group.student_no}</td>
                  <td>
                    <strong>{group.student_name}</strong>
                  </td>
                  <td>{group.program_code}</td>
                  <td>{group.school_year}</td>
                  <td>{group.semester}</td>
                  <td>{group.section_code}</td>
                  <td>
                    {group.subject_count}
                    {' · '}
                    {group.total_units} units
                  </td>
                  <td>
                    <StatusBadge status={group.status} />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGroup(previous =>
                          previous === group.group_id
                            ? ''
                            : group.group_id
                        )
                      }
                      style={smallButton}
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
                  <td colSpan={9}>
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
          .filter(group =>
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

  function renderStudentRecords() {
    return (
      <section className="registrar-panel">
        <div className="registrar-panel-heading">
          <div>
            <h3>Student Records</h3>

            <p>
              Access the student directory for
              registrar verification.
            </p>
          </div>

          <Users size={22} />
        </div>

        <div className="registrar-toolbar">
          <div className="registrar-search-field">
            <Search size={18} />

            <input
              type="text"
              value={searchTerm}
              onChange={event =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search student name, email, or number"
              aria-label="Search student records"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              loadData('student-records')
            }
            disabled={loading}
            style={smallButton}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <div className="registrar-table-wrapper">
          <table className="registrar-table">
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Student Name</th>
                <th>Email</th>
                <th>Program</th>
                <th>Year Level</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.student_id}>
                  <td>{student.student_no}</td>
                  <td>
                    <strong>
                      {student.student_name}
                    </strong>
                  </td>
                  <td>{student.email || '—'}</td>
                  <td>{student.program_code}</td>
                  <td>Year {student.year_level}</td>
                  <td>{student.status || '—'}</td>
                </tr>
              ))}

              {!filteredStudents.length && (
                <tr>
                  <td colSpan={6}>
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
      </section>
    );
  }

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
          <div className="registrar-panel-heading">
            <div>
              <h3>Personnel Information</h3>

              <p>
                Account and personnel profile overview.
              </p>
            </div>

            <ShieldCheck size={22} />
          </div>

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

  return (
    <div className="registrar-layout">
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

      <aside
        className={`registrar-sidebar ${
          sidebarOpen
            ? 'registrar-sidebar-open'
            : ''
        }`}
      >
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
            onClick={() =>
              setShowLogoutModal(true)
            }
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      <div className="registrar-main">
        <header className="registrar-topbar">
          <div className="registrar-topbar-left">
            <button
              type="button"
              className="registrar-menu-button"
              aria-label="Open navigation"
              onClick={() =>
                setSidebarOpen(true)
              }
            >
              <Menu size={23} />
            </button>

            <div>
              <h1>{currentPage.label}</h1>

              <p>
                {descriptions[activeSection]}
              </p>
            </div>
          </div>

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

        <footer className="registrar-footer">
          © {new Date().getFullYear()} Pangantucan
          Bukidnon Community College
        </footer>
      </div>

      {confirmationGroup && (
        <div className="registrar-modal-overlay">
          <div
            className="registrar-logout-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="registrar-confirm-title"
          >
            <div className="registrar-modal-icon">
              <BookOpen size={27} />
            </div>

            <h2 id="registrar-confirm-title">
              Confirm Student Enrollment?
            </h2>

            <p>
              You are about to officially enroll
              {' '}
              <strong>
                {confirmationGroup.student_name}
              </strong>
              {' '}
              in {confirmationGroup.subject_count}
              {' '}
              pending subjects for
              {' '}
              {confirmationGroup.school_year}
              {' '}
              {confirmationGroup.semester}.
            </p>

            <p>
              Section:
              {' '}
              <strong>
                {confirmationGroup.section_code}
              </strong>
              {' · '}
              Total Units:
              {' '}
              <strong>
                {confirmationGroup.total_units}
              </strong>
            </p>

            <div className="registrar-modal-actions">
              <button
                type="button"
                className="registrar-modal-cancel"
                onClick={() =>
                  setConfirmationGroup(null)
                }
                disabled={confirming}
              >
                Cancel
              </button>

              <button
                type="button"
                className="registrar-modal-confirm"
                onClick={confirmEnrollment}
                disabled={confirming}
              >
                {confirming
                  ? 'Confirming...'
                  : 'Yes, Confirm Enrollment'}
              </button>
            </div>
          </div>
        </div>
      )}

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
