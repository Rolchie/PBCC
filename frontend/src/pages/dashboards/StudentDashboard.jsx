
import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  GraduationCap,
  UserRound,
  LogOut,
  Menu,
  PanelLeftClose,
  X,
  ChevronRight,
  CalendarDays,
  Clock3,
  ShieldCheck,
  Info,
  School,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

import { AuthContext } from '../../context/auth-context';
import './StudentDashboard.css';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '');

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'enrollment', label: 'Enrollment', icon: ClipboardList },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'grades', label: 'Grades', icon: GraduationCap },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

const descriptions = {
  dashboard: 'Overview of student academic information and enrollment.',
  enrollment: 'View enrollment information and application status.',
  subjects: 'View subjects enrolled for an academic semester.',
  grades: 'View officially released academic grades by semester.',
  profile: 'View student account and academic information.',
};

function StudentDashboard() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [periodsStatus, setPeriodsStatus] = useState('idle');

  const [subjects, setSubjects] = useState([]);
  const [subjectsStatus, setSubjectsStatus] = useState('idle');

  const [grades, setGrades] = useState([]);
  const [gradesStatus, setGradesStatus] = useState('idle');

  const [periodsError, setPeriodsError] = useState('');
  const [subjectsError, setSubjectsError] = useState('');
  const [gradesError, setGradesError] = useState('');
  const [studentNumber, setStudentNumber] = useState('');

  const periodsRequestRef = useRef(0);
  const subjectsRequestRef = useRef(0);
  const gradesRequestRef = useRef(0);

  const displayName = auth?.user?.username || 'Student';

  const currentPage =
    navigation.find((item) => item.id === activeSection) ||
    navigation[0];

  const selectedPeriod = periods.find(
    (period) => String(period.period_id) === selectedPeriodId
  );

  const filteredSubjects = subjects.filter(
    (item) => String(item.period_id) === selectedPeriodId
  );

  const filteredGrades = grades.filter(
    (item) => String(item.period_id) === selectedPeriodId
  );

  async function studentGet(path) {
    const token = localStorage.getItem('pbcc_access_token');

    if (!token) {
      throw new Error(
        'Your session is unavailable. Please log in again.'
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/api/student/${path}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.message || 'Unable to retrieve student records.'
      );
    }

    return result;
  }

  async function loadPeriods() {
    const requestId = ++periodsRequestRef.current;

    setPeriodsStatus('loading');
    setPeriodsError('');

    try {
      const result = await studentGet('periods');

      if (requestId !== periodsRequestRef.current) return;

      const rows = Array.isArray(result.periods)
        ? result.periods
        : [];

      setPeriods(rows);
      setStudentNumber(result.student_no || '');
      setPeriodsStatus('success');

      setSelectedPeriodId((previous) => {
        if (
          rows.some(
            (period) =>
              String(period.period_id) === previous
          )
        ) {
          return previous;
        }

        return rows.length
          ? String(rows[0].period_id)
          : '';
      });
    } catch (error) {
      if (requestId !== periodsRequestRef.current) return;

      setPeriodsError(error.message);
      setPeriodsStatus('error');
    }
  }

  async function loadSubjects() {
    const requestId = ++subjectsRequestRef.current;

    setSubjectsStatus('loading');
    setSubjectsError('');

    try {
      const result = await studentGet('subjects');

      if (requestId !== subjectsRequestRef.current) return;

      setSubjects(
        Array.isArray(result.subjects) ? result.subjects : []
      );
      setStudentNumber(result.student_no || '');
      setSubjectsStatus('success');
    } catch (error) {
      if (requestId !== subjectsRequestRef.current) return;

      setSubjectsError(error.message);
      setSubjectsStatus('error');
    }
  }

  async function loadGrades() {
    const requestId = ++gradesRequestRef.current;

    setGradesStatus('loading');
    setGradesError('');

    try {
      const result = await studentGet('grades');

      if (requestId !== gradesRequestRef.current) return;

      setGrades(
        Array.isArray(result.grades) ? result.grades : []
      );
      setStudentNumber(result.student_no || '');
      setGradesStatus('success');
    } catch (error) {
      if (requestId !== gradesRequestRef.current) return;

      setGradesError(error.message);
      setGradesStatus('error');
    }
  }

  useEffect(() => {
    if (
      ['subjects', 'grades'].includes(activeSection) &&
      periodsStatus === 'idle'
    ) {
      loadPeriods();
    }
  }, [activeSection, periodsStatus]);

  useEffect(() => {
    if (
      activeSection === 'subjects' &&
      subjectsStatus === 'idle'
    ) {
      loadSubjects();
    }
  }, [activeSection, subjectsStatus]);

  useEffect(() => {
    if (
      activeSection === 'grades' &&
      gradesStatus === 'idle'
    ) {
      loadGrades();
    }
  }, [activeSection, gradesStatus]);

  const subjectsLoading =
    periodsStatus === 'loading' ||
    subjectsStatus === 'loading';

  const gradesLoading =
    periodsStatus === 'loading' ||
    gradesStatus === 'loading';

  function changeSection(section) {
    setActiveSection(section);
    setSidebarOpen(false);
  }

  async function refreshCurrentSection() {
    const requests = [loadPeriods()];

    if (activeSection === 'subjects') {
      requests.push(loadSubjects());
    }

    if (activeSection === 'grades') {
      requests.push(loadGrades());
    }

    await Promise.all(requests);
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      if (typeof auth?.logout === 'function') {
        await auth.logout();
      }

      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  }

  function renderPeriodSelector() {
    const busy =
      activeSection === 'subjects'
        ? subjectsLoading
        : gradesLoading;

    return (
      <div className="student-grades-toolbar">
        <div className="student-grades-heading">
          <strong>
            {activeSection === 'grades'
              ? 'Report of Grades'
              : 'Subject Enrollment List'}
          </strong>

          <span>
            {studentNumber
              ? `Student No. ${studentNumber}`
              : 'Official student records'}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <select
            aria-label="Select academic semester"
            value={selectedPeriodId}
            onChange={(event) =>
              setSelectedPeriodId(event.target.value)
            }
            disabled={
              busy ||
              periodsStatus !== 'success' ||
              periods.length === 0
            }
            style={{
              minHeight: 40,
              minWidth: 230,
              maxWidth: '100%',
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 7,
              backgroundColor: '#fff',
              color: '#172b4d',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {periods.length === 0 && (
              <option value="">
                {periodsStatus === 'loading'
                  ? 'Loading semesters...'
                  : 'No enrolled semester'}
              </option>
            )}

            {periods.map((period) => (
              <option
                key={period.period_id}
                value={String(period.period_id)}
              >
                {period.label ||
                  `${period.school_year} ${period.semester}`}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="student-grades-refresh"
            onClick={refreshCurrentSection}
            disabled={busy}
          >
            <RefreshCw
              size={16}
              className={
                busy ? 'student-grades-spinning' : ''
              }
            />
            Refresh
          </button>
        </div>
      </div>
    );
  }

  function renderDashboard() {
    return (
      <>
        <section className="student-welcome">
          <div>
            <span className="student-eyebrow">
              STUDENT PORTAL
            </span>

            <h2>Welcome to PBCC!</h2>

            <p>
              Access enrollment information, subjects,
              academic grades, and student records in
              one convenient portal.
            </p>
          </div>

          <img
            src="/pbcc-logo.png"
            alt="PBCC Seal"
            className="student-welcome-logo"
          />
        </section>

        <section className="student-overview-grid">
          <OverviewCard
            icon={ClipboardList}
            label="Enrollment Status"
            value="Not available"
            description="Awaiting enrollment module"
          />

          <OverviewCard
            icon={BookOpen}
            label="Enrolled Subjects"
            value={
              subjectsStatus === 'success'
                ? String(filteredSubjects.length)
                : '—'
            }
            description="Open Subjects to view records"
          />

          <OverviewCard
            icon={GraduationCap}
            label="Academic Grades"
            value={
              gradesStatus === 'success'
                ? String(filteredGrades.length)
                : '—'
            }
            description="Released grades only"
          />

          <OverviewCard
            icon={CalendarDays}
            label="Academic Term"
            value={selectedPeriod?.school_year || 'Not assigned'}
            description={
              selectedPeriod?.semester ||
              'Select an academic term'
            }
          />
        </section>

        <div className="student-dashboard-columns">
          <section className="student-panel">
            <div className="student-panel-heading">
              <div>
                <h3>Academic Overview</h3>
                <p>Student academic information.</p>
              </div>

              <School size={21} />
            </div>

            <div className="student-information-list">
              <InformationRow
                label="Student Number"
                value={studentNumber || 'Not assigned'}
              />
              <InformationRow
                label="Program"
                value="Not assigned"
              />
              <InformationRow
                label="Year Level"
                value="Not assigned"
              />
              <InformationRow
                label="Enrollment"
                value="Not available"
              />
            </div>
          </section>

          <section className="student-panel">
            <div className="student-panel-heading">
              <div>
                <h3>Quick Access</h3>
                <p>Navigate to student services.</p>
              </div>
            </div>

            <div className="student-quick-links">
              {navigation
                .filter((item) => item.id !== 'dashboard')
                .map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="student-quick-link"
                      onClick={() => changeSection(item.id)}
                    >
                      <span className="student-quick-icon">
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

        <section className="student-notice">
          <Info size={20} />

          <div>
            <strong>Portal Development Notice</strong>
            <p>
              Enrolled subjects and released grades are
              available through their respective pages.
            </p>
          </div>
        </section>
      </>
    );
  }

  function renderEnrollment() {
    return (
      <section className="student-panel">
        <div className="student-panel-heading">
          <div>
            <h3>Enrollment Information</h3>
            <p>Review enrollment details and status.</p>
          </div>

          <ClipboardList size={22} />
        </div>

        <div className="student-information-list">
          <InformationRow
            label="Enrollment Status"
            value="Not available"
          />
          <InformationRow
            label="Academic Year"
            value="Not assigned"
          />
          <InformationRow
            label="Semester"
            value="Not assigned"
          />
          <InformationRow
            label="Program"
            value="Not assigned"
          />
        </div>

        <EmptyState
          icon={Clock3}
          title="Enrollment module coming soon"
          description="Online enrollment details will be available once this module is implemented."
        />
      </section>
    );
  }

  function renderSubjects() {
    let content = null;
    const error = periodsError || subjectsError;

    if (subjectsLoading) {
      content = (
        <LoadingMessage text="Loading enrolled subjects..." />
      );
    } else if (error) {
      content = <ErrorMessage message={error} />;
    } else if (
      periodsStatus === 'success' &&
      subjectsStatus === 'success'
    ) {
      if (filteredSubjects.length === 0) {
        content = (
          <div className="student-grades-empty">
            <div className="student-grades-empty-icon">
              <BookOpen size={30} />
            </div>

            <h4>No enrolled subjects found</h4>
            <p>
              No subjects were found for the selected semester.
            </p>
          </div>
        );
      } else {
        content = (
          <>
            <div className="student-grades-summary">
              <div>
                <span>Enrolled Subjects</span>
                <strong>{filteredSubjects.length}</strong>
              </div>

              <div>
                <span>Total Units</span>
                <strong>
                  {filteredSubjects.reduce(
                    (sum, item) =>
                      sum + (Number(item.units) || 0),
                    0
                  )}
                </strong>
              </div>
            </div>

            <div className="student-table-wrapper student-grades-table-wrapper">
              <table className="student-table student-grades-table">
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Description</th>
                    <th>Units</th>
                    <th>Instructor</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSubjects.map((item) => (
                    <tr key={item.enrollment_id}>
                      <td>
                        <strong>
                          {item.subject_code || '—'}
                        </strong>
                      </td>

                      <td>{item.subject_title || '—'}</td>

                      <td>{item.units ?? '—'}</td>

                      <td>
                        {item.instructor || 'Not available'}
                      </td>

                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color:
                              item.load_status === 'Regular'
                                ? '#166534'
                                : item.load_status === 'Irregular'
                                ? '#b45309'
                                : '#64748b',
                          }}
                        >
                          {item.load_status || 'Not determined'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      }
    }

    return (
      <section className="student-panel">
        <div className="student-panel-heading">
          <div>
            <h3>My Enrolled Subjects</h3>
            <p>
              View your subjects by academic year and
              semester. This information is read-only.
            </p>
          </div>

          <BookOpen size={22} />
        </div>

        {renderPeriodSelector()}
        {content}

        <div className="student-grades-note">
          <ShieldCheck size={17} />
          <p>
            Academic load status is determined from the
            prescribed curriculum and enrolled subjects.
          </p>
        </div>
      </section>
    );
  }

  function renderGrades() {
    let content = null;
    const error = periodsError || gradesError;

    if (gradesLoading) {
      content = (
        <LoadingMessage text="Loading academic grades..." />
      );
    } else if (error) {
      content = <ErrorMessage message={error} />;
    } else if (
      periodsStatus === 'success' &&
      gradesStatus === 'success'
    ) {
      if (filteredGrades.length === 0) {
        content = (
          <div className="student-grades-empty">
            <div className="student-grades-empty-icon">
              <GraduationCap size={30} />
            </div>

            <h4>No released grades yet</h4>
            <p>
              Officially released grades for this semester
              will appear here when available.
            </p>
          </div>
        );
      } else {
        content = (
          <>
            <div className="student-grades-summary">
              <div>
                <span>Released Grades</span>
                <strong>{filteredGrades.length}</strong>
              </div>

              <div>
                <span>Academic Record</span>
                <strong>
                  <CheckCircle2 size={16} />
                  Available
                </strong>
              </div>
            </div>

            <div className="student-table-wrapper student-grades-table-wrapper">
              <table className="student-table student-grades-table">
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Description</th>
                    <th>Units</th>
                    <th>Grade</th>
                    <th>Remarks</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredGrades.map((item) => {
                    const remark = String(
                      item.remarks || ''
                    ).trim();

                    const normalized = remark.toLowerCase();

                    const remarkClass =
                      normalized === 'passed'
                        ? 'student-grade-passed'
                        : normalized === 'failed'
                        ? 'student-grade-failed'
                        : normalized === 'inc'
                        ? 'student-grade-inc'
                        : normalized === 'dropped'
                        ? 'student-grade-dropped'
                        : 'student-grade-neutral';

                    return (
                      <tr key={item.enrollment_id}>
                        <td>
                          <strong>
                            {item.subject_code || '—'}
                          </strong>
                        </td>

                        <td>{item.subject_title || '—'}</td>
                        <td>{item.units ?? '—'}</td>

                        <td>
                          <span className="student-grade-value">
                            {item.grade || '—'}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`student-grade-remark ${remarkClass}`}
                          >
                            {remark || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        );
      }
    }

    return (
      <section className="student-panel">
        <div className="student-panel-heading">
          <div>
            <h3>Academic Grades</h3>
            <p>
              View officially released grades by semester.
              Draft, submitted, and validated grades are hidden.
            </p>
          </div>

          <GraduationCap size={22} />
        </div>

        {renderPeriodSelector()}
        {content}

        <div className="student-grades-note">
          <ShieldCheck size={17} />
          <p>
            Only officially released grades are shown.
            For questions, contact the appropriate college office.
          </p>
        </div>
      </section>
    );
  }

  function renderProfile() {
    return (
      <div className="student-profile-layout">
        <section className="student-panel student-profile-card">
          <div className="student-profile-avatar">
            <UserRound size={40} />
          </div>

          <h3>{displayName}</h3>
          <p>Student Account</p>

          <span className="student-profile-label">
            Pangantucan Bukidnon Community College
          </span>
        </section>

        <section className="student-panel">
          <div className="student-panel-heading">
            <div>
              <h3>Student Information</h3>
              <p>Account and academic profile overview.</p>
            </div>

            <ShieldCheck size={22} />
          </div>

          <div className="student-information-list">
            <InformationRow
              label="Account Name"
              value={displayName}
            />
            <InformationRow
              label="Student Number"
              value={studentNumber || 'Not assigned'}
            />
            <InformationRow
              label="Program"
              value="Not assigned"
            />
            <InformationRow
              label="Year Level"
              value="Not assigned"
            />
            <InformationRow
              label="Account Role"
              value="Student"
            />
          </div>

          <div className="student-profile-note">
            <Info size={17} />
            Student profile details will be connected
            to official records in a future update.
          </div>
        </section>
      </div>
    );
  }

  function renderContent() {
    switch (activeSection) {
      case 'enrollment':
        return renderEnrollment();

      case 'subjects':
        return renderSubjects();

      case 'grades':
        return renderGrades();

      case 'profile':
        return renderProfile();

      default:
        return renderDashboard();
    }
  }

  return (
    <div className={`student-layout ${sidebarCollapsed ? 'student-layout-collapsed' : ''}`}>
      {sidebarOpen && (
        <button
          type="button"
          className="student-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        id="student-sidebar"
        className={`student-sidebar ${
          sidebarOpen ? 'student-sidebar-open' : ''
        }`}
      >
        <div className="student-brand">
          <img src="/pbcc-logo.png" alt="PBCC Logo" />

          <div>
            <strong>PBCC</strong>
            <span>Student Portal</span>
          </div>

          <button
            type="button"
            className="student-sidebar-close"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={21} />
          </button>
        </div>

        <div className="student-sidebar-label">
          MAIN NAVIGATION
        </div>

        <nav
          className="student-navigation"
          aria-label="Student navigation"
        >
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => changeSection(item.id)}
                className={`student-nav-item ${
                  activeSection === item.id
                    ? 'student-nav-active'
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

        <div className="student-sidebar-bottom">
          <div className="student-sidebar-account">
            <div className="student-account-avatar">
              <UserRound size={20} />
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>Student</span>
            </div>
          </div>

          <button
            type="button"
            className="student-logout-button"
            onClick={() => setShowLogoutModal(true)}
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      <div className="student-main">
        <header className="student-topbar">
          <div className="student-topbar-left">
            <button
              type="button"
              className="student-desktop-sidebar-toggle"
              aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              aria-expanded={!sidebarCollapsed}
              aria-controls="student-sidebar"
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              onClick={() => setSidebarCollapsed((previous) => !previous)}
            >
              {sidebarCollapsed ? <Menu size={22} /> : <PanelLeftClose size={22} />}
            </button>

            <button
              type="button"
              className="student-menu-button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={23} />
            </button>

            <div>
              <h1>{currentPage.label}</h1>
              <p>{descriptions[activeSection]}</p>
            </div>
          </div>

          <div className="student-topbar-account">
            <div className="student-topbar-avatar">
              <UserRound size={20} />
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>Student</span>
            </div>
          </div>
        </header>

        <main className="student-content">
          {renderContent()}
        </main>

        <footer className="student-footer">
          © {new Date().getFullYear()} Pangantucan
          Bukidnon Community College
        </footer>
      </div>

      {showLogoutModal && (
        <div className="student-modal-overlay">
          <div
            className="student-logout-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="student-logout-title"
          >
            <div className="student-modal-icon">
              <LogOut size={27} />
            </div>

            <h2 id="student-logout-title">
              Log out of your account?
            </h2>

            <p>
              Are you sure you want to log out of
              the Student Portal?
            </p>

            <div className="student-modal-actions">
              <button
                type="button"
                className="student-modal-cancel"
                onClick={() => setShowLogoutModal(false)}
                disabled={loggingOut}
              >
                Cancel
              </button>

              <button
                type="button"
                className="student-modal-confirm"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut
                  ? 'Logging out...'
                  : 'Yes, Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value, description }) {
  return (
    <article className="student-overview-card">
      <div className="student-overview-top">
        <span>{label}</span>

        <span className="student-overview-icon">
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
    <div className="student-information-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="student-empty-state">
      <div className="student-empty-icon">
        <Icon size={29} />
      </div>

      <h4>{title}</h4>
      <p>{description}</p>

      <span className="student-coming-soon">
        Interface Preview
      </span>
    </div>
  );
}

function ErrorMessage({ message }) {
  return (
    <div className="student-grades-error" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  );
}

function LoadingMessage({ text }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '30px 16px',
        color: '#64748b',
        fontSize: 14,
      }}
    >
      <RefreshCw
        size={17}
        className="student-grades-spinning"
      />
      <span>{text}</span>
    </div>
  );
}

export default StudentDashboard;
