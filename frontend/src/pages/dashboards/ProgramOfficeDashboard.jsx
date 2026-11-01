
import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  FileCheck2,
  LogOut,
  Menu,
  X,
  UserRound,
  GraduationCap,
  CalendarDays,
  ArrowRight,
  ChevronRight,
  Database,
  AlertTriangle,
  ListChecks,
  Layers,
  ShieldCheck,
  Info,
} from 'lucide-react';

import { AuthContext } from '../../context/auth-context';
import StudentRecords from '../../components/StudentRecords';
import './ProgramOfficeDashboard.css';

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students', label: 'Student Records', icon: Users },
  { id: 'offerings', label: 'Subject Offerings', icon: BookOpen },
  { id: 'loads', label: 'Subject Loads', icon: ClipboardList },
  { id: 'preparation', label: 'Enrollment Preparation', icon: FileCheck2 },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

const statistics = [
  {
    title: 'Student Records',
    icon: Users,
    description: 'Awaiting dashboard statistics integration',
  },
  {
    title: 'Subject Offerings',
    icon: BookOpen,
    description: 'Awaiting database integration',
  },
  {
    title: 'Enrollment Records',
    icon: GraduationCap,
    description: 'Awaiting database integration',
  },
  {
    title: 'Academic Period',
    icon: CalendarDays,
    description: 'Awaiting database integration',
  },
];

const modules = [
  {
    id: 'students',
    title: 'Student Records',
    icon: Users,
    description: 'Review student information for enrollment preparation.',
  },
  {
    id: 'offerings',
    title: 'Subject Offerings',
    icon: BookOpen,
    description: 'View available subjects, sections, and academic periods.',
  },
  {
    id: 'loads',
    title: 'Subject Loads',
    icon: ClipboardList,
    description:
      'Prepare subject loads, verify prerequisites, and assign sections.',
  },
  {
    id: 'preparation',
    title: 'Enrollment Preparation',
    icon: FileCheck2,
    description:
      'Review prepared enrollment records before Registrar confirmation.',
  },
];

const moduleDescriptions = {
  offerings:
    'Subject offerings will be retrieved from the subject_offerings, sections, and academic_periods tables.',
  preparation:
    'Prepared enrollment records will be reviewed here before they are forwarded for Registrar confirmation.',
};

function ProgramOfficeDashboard() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const cancelLogoutRef = useRef(null);
  const confirmLogoutRef = useRef(null);
  const logoutButtonRef = useRef(null);

  const user = auth?.user;

  const fullName = [
    user?.first_name,
    user?.middle_name,
    user?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const displayName =
    fullName ||
    user?.full_name ||
    user?.name ||
    user?.username ||
    'Program Office Personnel';

  const displayEmail = user?.email || 'Not available';

  const currentSection =
    navigation.find((item) => item.id === activeSection) ||
    navigation[0];

  function changeSection(section) {
    setActiveSection(section);
    setSidebarOpen(false);
  }

  function openLogoutModal() {
    setSidebarOpen(false);
    setShowLogoutModal(true);
  }

  function closeLogoutModal() {
    if (loggingOut) return;

    setShowLogoutModal(false);

    requestAnimationFrame(() => {
      logoutButtonRef.current?.focus();
    });
  }

  async function confirmLogout() {
    if (loggingOut) return;

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

      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Program Office logout error:', error);
      setLoggingOut(false);
      window.alert('Unable to log out. Please try again.');
    }
  }

  useEffect(() => {
    if (!showLogoutModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    cancelLogoutRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !loggingOut) {
        setShowLogoutModal(false);

        requestAnimationFrame(() => {
          logoutButtonRef.current?.focus();
        });

        return;
      }

      if (event.key !== 'Tab') return;

      const first = cancelLogoutRef.current;
      const last = confirmLogoutRef.current;

      if (!first || !last) return;

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showLogoutModal, loggingOut]);

  function renderDashboard() {
    return (
      <>
        <section className="program-welcome">
          <div className="program-welcome-content">
            <span className="program-eyebrow">
              PROGRAM OFFICE OVERVIEW
            </span>

            <h2>Welcome to the Program Office!</h2>

            <p>
              Prepare student enrollment records, review subject
              offerings, verify prerequisites, and organize
              subject loads for Pangantucan Bukidnon
              Community College.
            </p>
          </div>

          <div className="program-welcome-emblem">
            <img
              src="/pbcc-logo.png"
              alt="Pangantucan Bukidnon Community College Seal"
            />
          </div>
        </section>

        <section className="program-stats-grid">
          {statistics.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                className="program-stat-card"
                key={stat.title}
              >
                <div className="program-stat-top">
                  <span className="program-stat-label">
                    {stat.title}
                  </span>

                  <span className="program-stat-icon">
                    <Icon size={21} strokeWidth={1.8} />
                  </span>
                </div>

                <strong className="program-stat-value">
                  —
                </strong>

                <small>{stat.description}</small>
              </div>
            );
          })}
        </section>

        <section className="program-modules-section">
          <div className="program-section-heading">
            <h3>Enrollment Management Modules</h3>

            <p>
              Access the main enrollment preparation
              functions of the Program Office.
            </p>
          </div>

          <div className="program-modules-grid">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <button
                  key={module.id}
                  type="button"
                  className="program-module-card"
                  onClick={() => changeSection(module.id)}
                >
                  <span className="program-module-icon">
                    <Icon size={25} strokeWidth={1.8} />
                  </span>

                  <strong>{module.title}</strong>

                  <p>{module.description}</p>

                  <span className="program-module-link">
                    Open module
                    <ArrowRight size={15} strokeWidth={1.8} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </>
    );
  }

  function renderSubjectLoads() {
    return (
      <section className="program-panel program-empty-panel">
        <div className="program-empty-icon">
          <ClipboardList size={38} strokeWidth={1.6} />
        </div>

        <h3>Subject Loads</h3>

        <p>
          Prepare a student's subject load by selecting
          available subject offerings, verifying prerequisite
          requirements, and assigning appropriate sections.
        </p>

        <div className="program-load-steps">
          <div className="program-load-step">
            <BookOpen size={18} />
            Select Subjects
          </div>

          <div className="program-load-step">
            <ListChecks size={18} />
            Check Prerequisites
          </div>

          <div className="program-load-step">
            <Layers size={18} />
            Assign Sections
          </div>
        </div>

        <span className="program-development-tag">
          <Database size={14} strokeWidth={1.8} />
          Pending backend integration
        </span>
      </section>
    );
  }

  function renderPendingModule() {
    const Icon = currentSection.icon;

    return (
      <section className="program-panel program-empty-panel">
        <div className="program-empty-icon">
          <Icon size={38} strokeWidth={1.6} />
        </div>

        <h3>{currentSection.label}</h3>

        <p>
          {moduleDescriptions[activeSection] ||
            'This module is under development.'}
        </p>

        <span className="program-development-tag">
          <Database size={14} strokeWidth={1.8} />
          Pending backend integration
        </span>
      </section>
    );
  }

  // Profile uses the same two-card structure as StudentDashboard.
  function renderProfile() {
    return (
      <div className="program-profile-layout">
        <section className="program-panel program-profile-card">
          <div className="program-profile-avatar-large">
            <UserRound size={40} />
          </div>

          <h3>{displayName}</h3>
          <p>Program Office Personnel</p>

          <span className="program-profile-label">
            Pangantucan Bukidnon Community College
          </span>
        </section>

        <section className="program-panel program-profile-info-card">
          <div className="program-profile-panel-heading">
            <div>
              <h3>Personnel Information</h3>
              <p>Account and personnel profile overview.</p>
            </div>

            <ShieldCheck size={22} />
          </div>

          <div className="program-information-list">
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
              value="Program Office Personnel"
            />

            <InformationRow
              label="Institution"
              value="Pangantucan Bukidnon Community College"
            />
          </div>

          <div className="program-profile-note">
            <Info size={17} />
            <span>
              Personnel profile details will be connected
              to official records in a future update.
            </span>
          </div>
        </section>
      </div>
    );
  }

  function renderContent() {
    if (activeSection === 'dashboard') {
      return renderDashboard();
    }

    if (activeSection === 'students') {
      return <StudentRecords />;
    }

    if (activeSection === 'loads') {
      return renderSubjectLoads();
    }

    if (activeSection === 'profile') {
      return renderProfile();
    }

    return renderPendingModule();
  }

  return (
    <div className="program-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="program-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`program-sidebar ${
          sidebarOpen ? 'program-sidebar-open' : ''
        }`}
      >
        <div className="program-brand">
          <img
            src="/pbcc-logo.png"
            alt="PBCC Logo"
            className="program-brand-logo"
          />

          <div className="program-brand-text">
            <strong>
              Pangantucan Bukidnon Community College
            </strong>
            <span>Program Office Portal</span>
          </div>

          <button
            type="button"
            className="program-sidebar-close"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={21} />
          </button>
        </div>

        <div className="program-sidebar-caption">
          MAIN NAVIGATION
        </div>

        <nav
          className="program-navigation"
          aria-label="Program Office navigation"
        >
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={`program-nav-item ${
                  activeSection === item.id
                    ? 'program-nav-active'
                    : ''
                }`}
                onClick={() => changeSection(item.id)}
                aria-current={
                  activeSection === item.id
                    ? 'page'
                    : undefined
                }
              >
                <span className="program-nav-icon">
                  <Icon size={19} strokeWidth={1.8} />
                </span>

                <span className="program-nav-label">
                  {item.label}
                </span>

                {activeSection === item.id && (
                  <ChevronRight size={15} strokeWidth={1.8} />
                )}
              </button>
            );
          })}
        </nav>

        <div className="program-sidebar-bottom">
          <div className="program-sidebar-profile">
            <div className="program-profile-avatar">
              <UserRound size={20} strokeWidth={1.8} />
            </div>

            <div className="program-profile-details">
              <strong title={displayName}>
                {displayName}
              </strong>
              <span>Program Office Personnel</span>
            </div>
          </div>

          <button
            ref={logoutButtonRef}
            type="button"
            className="program-logout-button"
            onClick={openLogoutModal}
          >
            <LogOut size={18} strokeWidth={1.8} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      <div className="program-main">
        <header className="program-topbar">
          <div className="program-topbar-left">
            <button
              type="button"
              className="program-menu-button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} strokeWidth={1.8} />
            </button>

            <div className="program-topbar-heading">
              <h1>{currentSection.label}</h1>
              <p>
                Pangantucan Bukidnon Community College
              </p>
            </div>
          </div>

          <div className="program-topbar-account">
            <div className="program-topbar-avatar">
              <UserRound size={20} strokeWidth={1.8} />
            </div>

            <div className="program-topbar-user-details">
              <strong title={displayName}>
                {displayName}
              </strong>
              <span>Program Office Personnel</span>
            </div>
          </div>
        </header>

        <main className="program-content">
          {renderContent()}
        </main>

        <footer className="program-footer">
          © {new Date().getFullYear()}{' '}
          Pangantucan Bukidnon Community College
        </footer>
      </div>

      {showLogoutModal && (
        <div className="program-modal-overlay">
          <div
            className="program-logout-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="program-logout-title"
            aria-describedby="program-logout-description"
          >
            <div className="program-modal-icon">
              <LogOut size={27} strokeWidth={1.8} />
            </div>

            <h2 id="program-logout-title">
              Log out of your account?
            </h2>

            <p id="program-logout-description">
              Are you sure you want to log out?
              You will need to sign in again to access
              your Program Office dashboard.
            </p>

            <div className="program-modal-notice">
              <AlertTriangle size={17} strokeWidth={1.8} />
              <span>
                Your current session will be ended.
              </span>
            </div>

            <div className="program-modal-actions">
              <button
                ref={cancelLogoutRef}
                type="button"
                className="program-modal-cancel"
                onClick={closeLogoutModal}
                disabled={loggingOut}
              >
                Cancel
              </button>

              <button
                ref={confirmLogoutRef}
                type="button"
                className="program-modal-confirm"
                onClick={confirmLogout}
                disabled={loggingOut}
              >
                <LogOut size={17} strokeWidth={1.8} />
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

function InformationRow({ label, value }) {
  return (
    <div className="program-information-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default ProgramOfficeDashboard;
