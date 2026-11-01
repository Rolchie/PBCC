
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardPenLine,
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
  FileText,
} from 'lucide-react';

import { AuthContext } from '../../context/auth-context';
import './FacultyDashboard.css';

const navigation = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'classes',
    label: 'Assigned Classes',
    icon: BookOpen,
  },
  {
    id: 'class-lists',
    label: 'Class Lists',
    icon: Users,
  },
  {
    id: 'grades',
    label: 'Grade Management',
    icon: ClipboardPenLine,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: UserRound,
  },
];

const descriptions = {
  dashboard:
    'Overview of faculty teaching assignments and academic records.',
  classes:
    'View subjects and class sections assigned to faculty.',
  'class-lists':
    'View enrolled students in assigned classes.',
  grades:
    'View the grade management interface for assigned classes.',
  profile:
    'View faculty account and institutional information.',
};

function FacultyDashboard() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const currentPage =
    navigation.find((item) => item.id === activeSection) ||
    navigation[0];

  const facultyUser = auth?.user;

  const facultyName = [
    facultyUser?.first_name,
    facultyUser?.middle_name,
    facultyUser?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const displayName =
    facultyName ||
    facultyUser?.full_name ||
    facultyUser?.name ||
    'Faculty Account';

  const displayEmail =
    facultyUser?.email || 'Not available';

  function changeSection(section) {
    setActiveSection(section);
    setSidebarOpen(false);
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

      // Clears the PBCC access token and stored user.
      // Also updates authentication state.
      auth.logout();

      setShowLogoutModal(false);
      setSidebarOpen(false);

      // Redirect after the authentication state is cleared.
      navigate('/login', {
        replace: true,
      });
    } catch (error) {
      console.error('Faculty logout failed:', error);

      setLoggingOut(false);

      window.alert(
        'Unable to log out. Please try again.'
      );
    }
  }

  function renderDashboard() {
    return (
      <>
        <section className="faculty-welcome">
          <div>
            <span className="faculty-eyebrow">
              FACULTY PORTAL
            </span>

            <h2>Welcome to PBCC!</h2>

            <p>
              Manage your teaching responsibilities,
              review assigned classes, access class
              lists, and prepare academic grades
              through the Faculty Portal.
            </p>
          </div>

          <div className="faculty-welcome-emblem">
            <img
              src="/pbcc-logo.png"
              alt="PBCC Seal"
            />
          </div>
        </section>

        <section className="faculty-overview-grid">
          <OverviewCard
            icon={BookOpen}
            label="Assigned Classes"
            value="—"
            description="Not yet connected"
          />

          <OverviewCard
            icon={Users}
            label="Enrolled Students"
            value="—"
            description="Class lists not yet connected"
          />

          <OverviewCard
            icon={ClipboardPenLine}
            label="Grade Records"
            value="—"
            description="Grade module not yet connected"
          />

          <OverviewCard
            icon={CalendarDays}
            label="Academic Term"
            value="Not assigned"
            description="Academic term not yet configured"
          />
        </section>

        <div className="faculty-dashboard-columns">
          <section className="faculty-panel">
            <div className="faculty-panel-heading">
              <div>
                <h3>Teaching Overview</h3>

                <p>
                  Your teaching assignments and academic
                  information will appear here.
                </p>
              </div>

              <School size={22} />
            </div>

            <div className="faculty-information-list">
              <InformationRow
                label="Assigned Subjects"
                value="Not available"
              />

              <InformationRow
                label="Class Sections"
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
            </div>
          </section>

          <section className="faculty-panel">
            <div className="faculty-panel-heading">
              <div>
                <h3>Quick Access</h3>

                <p>
                  Navigate to faculty services.
                </p>
              </div>
            </div>

            <div className="faculty-quick-links">
              {navigation
                .filter(
                  (item) => item.id !== 'dashboard'
                )
                .map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="faculty-quick-link"
                      onClick={() =>
                        changeSection(item.id)
                      }
                    >
                      <span className="faculty-quick-icon">
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

        <section className="faculty-notice">
          <Info size={20} />

          <div>
            <strong>
              Faculty Portal Development Notice
            </strong>

            <p>
              This interface is currently under
              development. Class assignments, student
              lists, and grade records will be connected
              during a later development phase.
            </p>
          </div>
        </section>
      </>
    );
  }

  function renderAssignedClasses() {
    return (
      <section className="faculty-panel">
        <div className="faculty-panel-heading">
          <div>
            <h3>Assigned Classes</h3>

            <p>
              Subjects and class sections assigned
              to your faculty account.
            </p>
          </div>

          <BookOpen size={22} />
        </div>

        <div className="faculty-table-wrapper">
          <table className="faculty-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Subject Description</th>
                <th>Section</th>
                <th>Units</th>
                <th>Academic Term</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={BookOpen}
                    title="No assigned classes to display"
                    description="Faculty class assignments will appear here when official academic records are connected."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderClassLists() {
    return (
      <section className="faculty-panel">
        <div className="faculty-panel-heading">
          <div>
            <h3>Class Lists</h3>

            <p>
              View students officially enrolled
              in your assigned classes.
            </p>
          </div>

          <Users size={22} />
        </div>

        <div className="faculty-filter-preview">
          <div>
            <label htmlFor="faculty-class-filter">
              Select Class
            </label>

            <select
              id="faculty-class-filter"
              disabled
              defaultValue=""
            >
              <option value="">
                No classes available
              </option>
            </select>
          </div>

          <span className="faculty-preview-label">
            Interface Preview
          </span>
        </div>

        <div className="faculty-table-wrapper">
          <table className="faculty-table">
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Student Name</th>
                <th>Program</th>
                <th>Year Level</th>
                <th>Enrollment Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={Users}
                    title="No students to display"
                    description="Class lists will become available after enrollment and faculty class assignments are connected."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderGradeManagement() {
    return (
      <section className="faculty-panel">
        <div className="faculty-panel-heading">
          <div>
            <h3>Grade Management</h3>

            <p>
              View the grade recording interface
              for assigned subjects.
            </p>
          </div>

          <ClipboardPenLine size={22} />
        </div>

        <div className="faculty-filter-preview">
          <div>
            <label htmlFor="faculty-grade-class">
              Assigned Class
            </label>

            <select
              id="faculty-grade-class"
              disabled
              defaultValue=""
            >
              <option value="">
                No assigned classes available
              </option>
            </select>
          </div>

          <button
            type="button"
            className="faculty-primary-button"
            disabled
            title="Grade submission is not yet available."
          >
            <FileText size={17} />
            Submit Grades
          </button>
        </div>

        <div className="faculty-table-wrapper">
          <table className="faculty-table">
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Student Name</th>
                <th>Grade</th>
                <th>Remarks</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={GraduationCap}
                    title="Grade management coming soon"
                    description="Grade entry and submission will be implemented after the academic enrollment and class assignment modules are ready."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="faculty-inline-note">
          <Info size={18} />

          <p>
            Grade entry and submission controls are
            intentionally unavailable in this
            interface-only version.
          </p>
        </div>
      </section>
    );
  }

  function renderProfile() {
    return (
      <div className="faculty-profile-layout">
        <section className="faculty-panel faculty-profile-card">
          <div className="faculty-profile-avatar">
            <UserRound size={42} />
          </div>

          <h3>{displayName}</h3>

          <p>Faculty Account</p>

          <span className="faculty-profile-label">
            Pangantucan Bukidnon Community College
          </span>
        </section>

        <section className="faculty-panel">
          <div className="faculty-panel-heading">
            <div>
              <h3>Faculty Information</h3>

              <p>
                Account and institutional profile.
              </p>
            </div>

            <ShieldCheck size={22} />
          </div>

          <div className="faculty-information-list">
            <InformationRow
              label="Account Role"
              value="Faculty"
            />

            <InformationRow
              label="Faculty Name"
              value={displayName}
            />

            <InformationRow
              label="Email Address"
              value={displayEmail}
            />

            <InformationRow
              label="Assigned College"
              value="Not assigned"
            />

            <InformationRow
              label="Department / Program"
              value="Not assigned"
            />
          </div>

          <div className="faculty-inline-note">
            <Info size={18} />

            <p>
              Official faculty assignment information
              will appear here when academic records
              are connected.
            </p>
          </div>
        </section>
      </div>
    );
  }

  function renderContent() {
    switch (activeSection) {
      case 'classes':
        return renderAssignedClasses();

      case 'class-lists':
        return renderClassLists();

      case 'grades':
        return renderGradeManagement();

      case 'profile':
        return renderProfile();

      default:
        return renderDashboard();
    }
  }

  return (
    <div className="faculty-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="faculty-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`faculty-sidebar ${
          sidebarOpen
            ? 'faculty-sidebar-open'
            : ''
        }`}
      >
        <div className="faculty-brand">
          <img
            src="/pbcc-logo.png"
            alt="PBCC Logo"
          />

          <div>
            <strong>PBCC</strong>
            <span>Faculty Portal</span>
          </div>

          <button
            type="button"
            className="faculty-sidebar-close"
            aria-label="Close navigation"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <X size={21} />
          </button>
        </div>

        <div className="faculty-sidebar-label">
          MAIN NAVIGATION
        </div>

        <nav
          className="faculty-navigation"
          aria-label="Faculty navigation"
        >
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  changeSection(item.id)
                }
                className={`faculty-nav-item ${
                  activeSection === item.id
                    ? 'faculty-nav-active'
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

        <div className="faculty-sidebar-bottom">
          <div className="faculty-sidebar-account">
            <div className="faculty-account-avatar">
              <UserRound size={21} />
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>Faculty</span>
            </div>
          </div>

          <button
            type="button"
            className="faculty-logout-button"
            onClick={() =>
              setShowLogoutModal(true)
            }
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      <div className="faculty-main">
        <header className="faculty-topbar">
          <div className="faculty-topbar-left">
            <button
              type="button"
              className="faculty-menu-button"
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

          <div className="faculty-topbar-account">
            <div className="faculty-topbar-avatar">
              <UserRound size={20} />
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>Faculty</span>
            </div>
          </div>
        </header>

        <main className="faculty-content">
          {renderContent()}
        </main>

        <footer className="faculty-footer">
          © {new Date().getFullYear()} Pangantucan
          Bukidnon Community College
        </footer>
      </div>

      {showLogoutModal && (
        <div className="faculty-modal-overlay">
          <div
            className="faculty-logout-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="faculty-logout-title"
          >
            <div className="faculty-modal-icon">
              <LogOut size={27} />
            </div>

            <h2 id="faculty-logout-title">
              Log out of your account?
            </h2>

            <p>
              Are you sure you want to leave
              the Faculty Portal?
            </p>

            <div className="faculty-modal-actions">
              <button
                type="button"
                className="faculty-modal-cancel"
                onClick={() =>
                  setShowLogoutModal(false)
                }
                disabled={loggingOut}
              >
                Cancel
              </button>

              <button
                type="button"
                className="faculty-modal-confirm"
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

function OverviewCard({
  icon: Icon,
  label,
  value,
  description,
}) {
  return (
    <article className="faculty-overview-card">
      <div className="faculty-overview-top">
        <span>{label}</span>

        <span className="faculty-overview-icon">
          <Icon size={21} />
        </span>
      </div>

      <strong>{value}</strong>

      <small>{description}</small>
    </article>
  );
}

function InformationRow({
  label,
  value,
}) {
  return (
    <div className="faculty-information-row">
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
    <div className="faculty-empty-state">
      <div className="faculty-empty-icon">
        <Icon size={29} />
      </div>

      <h4>{title}</h4>

      <p>{description}</p>

      <span className="faculty-coming-soon">
        Interface Preview
      </span>
    </div>
  );
}

export default FacultyDashboard;
