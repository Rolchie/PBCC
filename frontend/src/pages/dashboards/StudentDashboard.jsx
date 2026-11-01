
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  GraduationCap,
  UserRound,
  LogOut,
  Menu,
  X,
  ChevronRight,
  CalendarDays,
  Clock3,
  ShieldCheck,
  Info,
  School,
} from 'lucide-react';

import { AuthContext } from '../../context/auth-context';
import './StudentDashboard.css';

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'enrollment', label: 'Enrollment', icon: ClipboardList },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'grades', label: 'Grades', icon: GraduationCap },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

const pageDescriptions = {
  dashboard: 'Overview of student academic information and enrollment.',
  enrollment: 'View enrollment information and application status.',
  subjects: 'View subjects assigned for the academic term.',
  grades: 'View academic grades and results.',
  profile: 'View student account and academic information.',
};

function StudentDashboard() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const user = auth?.user;
  const displayName = user?.username || 'Student';

  const currentPage =
    navigation.find((item) => item.id === activeSection) ||
    navigation[0];

  function changeSection(section) {
    setActiveSection(section);
    setSidebarOpen(false);
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
            alt="Pangantucan Bukidnon Community College Seal"
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
            value="—"
            description="Subject information not yet connected"
          />

          <OverviewCard
            icon={GraduationCap}
            label="Academic Grades"
            value="—"
            description="Grade information not yet connected"
          />

          <OverviewCard
            icon={CalendarDays}
            label="Academic Term"
            value="Not assigned"
            description="Academic calendar not yet configured"
          />
        </section>

        <div className="student-dashboard-columns">
          <section className="student-panel">
            <div className="student-panel-heading">
              <div>
                <h3>Academic Overview</h3>
                <p>
                  Student academic information will
                  appear here once available.
                </p>
              </div>

              <School size={21} />
            </div>

            <div className="student-information-list">
              <InformationRow
                label="Student Number"
                value="Not assigned"
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
                      onClick={() => changeSection(item.id)}
                      className="student-quick-link"
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
              The student portal interface is currently
              being prepared. Enrollment, subject, and
              grade information will be connected during
              the next development phase.
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
            <p>
              Review enrollment details and academic status.
            </p>
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
          description="Online enrollment details and enrollment processing will be available once this module is implemented."
        />
      </section>
    );
  }

  function renderSubjects() {
    return (
      <section className="student-panel">
        <div className="student-panel-heading">
          <div>
            <h3>Subjects</h3>
            <p>
              View enrolled subjects for the selected
              academic term.
            </p>
          </div>

          <BookOpen size={22} />
        </div>

        <div className="student-table-wrapper">
          <table className="student-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Subject Description</th>
                <th>Units</th>
                <th>Instructor</th>
                <th>Schedule</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={BookOpen}
                    title="No subjects to display"
                    description="Enrolled subjects will appear here once the enrollment module is connected."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderGrades() {
    return (
      <section className="student-panel">
        <div className="student-panel-heading">
          <div>
            <h3>Academic Grades</h3>
            <p>
              Review grades recorded for enrolled subjects.
            </p>
          </div>

          <GraduationCap size={22} />
        </div>

        <div className="student-table-wrapper">
          <table className="student-table">
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
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={GraduationCap}
                    title="No grades to display"
                    description="Academic grades will appear here once the grade management module is connected."
                  />
                </td>
              </tr>
            </tbody>
          </table>
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
              <p>
                Account and academic profile overview.
              </p>
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
              value="Not assigned"
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
    <div className="student-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="student-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`student-sidebar ${
          sidebarOpen ? 'student-sidebar-open' : ''
        }`}
      >
        <div className="student-brand">
          <img
            src="/pbcc-logo.png"
            alt="PBCC Logo"
          />

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
              className="student-menu-button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={23} />
            </button>

            <div>
              <h1>{currentPage.label}</h1>
              <p>{pageDescriptions[activeSection]}</p>
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

function OverviewCard({
  icon: Icon,
  label,
  value,
  description,
}) {
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

function EmptyState({
  icon: Icon,
  title,
  description,
}) {
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

export default StudentDashboard;
