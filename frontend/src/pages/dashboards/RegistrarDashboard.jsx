
import { useContext, useState } from 'react';
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
} from 'lucide-react';

import { AuthContext } from '../../context/auth-context';
import './RegistrarDashboard.css';

const navigation = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'enrollment-review',
    label: 'Enrollment Review',
    icon: ClipboardCheck,
  },
  {
    id: 'enrollment-records',
    label: 'Enrollment Records',
    icon: FolderOpen,
  },
  {
    id: 'student-records',
    label: 'Student Records',
    icon: Users,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: UserRound,
  },
];

const descriptions = {
  dashboard:
    'Overview of enrollment verification and registrar records.',
  'enrollment-review':
    'Review student enrollments prepared for registrar confirmation.',
  'enrollment-records':
    'View enrollment records and their confirmation status.',
  'student-records':
    'Access student academic enrollment information.',
  profile:
    'View registrar personnel account information.',
};

function RegistrarDashboard() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const currentPage =
    navigation.find((item) => item.id === activeSection) ||
    navigation[0];

  const registrarUser = auth?.user;

  const registrarName = [
    registrarUser?.first_name,
    registrarUser?.middle_name,
    registrarUser?.last_name,
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

  function changeSection(section) {
    setActiveSection(section);
    setSidebarOpen(false);
    setSearchTerm('');
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
        replace: true,
      });
    } catch (error) {
      console.error('Registrar logout failed:', error);
      setLoggingOut(false);

      window.alert(
        'Unable to log out. Please try again.'
      );
    }
  }

  function renderDashboard() {
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
            value="—"
            description="Enrollment data not yet connected"
          />

          <OverviewCard
            icon={FileCheck2}
            label="Confirmed Enrollments"
            value="—"
            description="Confirmation records not yet connected"
          />

          <OverviewCard
            icon={Users}
            label="Student Records"
            value="—"
            description="Student records not yet connected"
          />

          <OverviewCard
            icon={CalendarDays}
            label="Academic Term"
            value="Not assigned"
            description="Academic term not yet configured"
          />
        </section>

        <div className="registrar-dashboard-columns">
          <section className="registrar-panel">
            <div className="registrar-panel-heading">
              <div>
                <h3>Enrollment Overview</h3>

                <p>
                  Summary of enrollment verification
                  and registrar activities.
                </p>
              </div>

              <School size={22} />
            </div>

            <div className="registrar-information-list">
              <InformationRow
                label="Enrollment Review"
                value="Not yet connected"
              />

              <InformationRow
                label="Confirmed Records"
                value="Not yet connected"
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
                .filter(
                  (item) => item.id !== 'dashboard'
                )
                .map((item) => {
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
              Registrar Portal Development Notice
            </strong>

            <p>
              This is an interface-only version.
              Enrollment review, confirmation,
              and student record retrieval will
              be connected to the approved academic
              workflow during backend integration.
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
              Review enrollments prepared by
              Program Office Personnel before
              registrar confirmation.
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
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search student name or number"
              aria-label="Search enrollment reviews"
            />
          </div>

          <span className="registrar-preview-label">
            Interface Preview
          </span>
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
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={ClipboardCheck}
                    title="No enrollments to review"
                    description="Prepared enrollment records will appear here when the Program Office and Registrar workflow is connected."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="registrar-inline-note">
          <Info size={18} />

          <p>
            Enrollment confirmation is not enabled
            in this interface-only version. No
            enrollment status will be changed.
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
              View and monitor student enrollment
              records and confirmation status.
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
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search enrollment records"
              aria-label="Search enrollment records"
            />
          </div>

          <span className="registrar-preview-label">
            Interface Preview
          </span>
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
                <th>Enrollment Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={FolderOpen}
                    title="No enrollment records available"
                    description="Enrollment history and confirmation records will appear here once connected to official academic data."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
              Access student enrollment information
              for registrar verification.
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
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search student name, email, or number"
              aria-label="Search student records"
            />
          </div>

          <span className="registrar-preview-label">
            Interface Preview
          </span>
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
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={GraduationCap}
                    title="No student records to display"
                    description="Official student records will appear here when the registrar student directory is connected."
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

          <div className="registrar-inline-note">
            <Info size={18} />

            <p>
              Personnel profile details will be connected
              to official records in a future update.
            </p>
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
          {navigation.map((item) => {
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
          {renderContent()}
        </main>

        <footer className="registrar-footer">
          © {new Date().getFullYear()} Pangantucan
          Bukidnon Community College
        </footer>
      </div>

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

function OverviewCard({
  icon: Icon,
  label,
  value,
  description,
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

function InformationRow({
  label,
  value,
}) {
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
  description,
}) {
  return (
    <div className="registrar-empty-state">
      <div className="registrar-empty-icon">
        <Icon size={29} />
      </div>

      <h4>{title}</h4>

      <p>{description}</p>

      <span className="registrar-coming-soon">
        Interface Preview
      </span>
    </div>
  );
}

export default RegistrarDashboard;
