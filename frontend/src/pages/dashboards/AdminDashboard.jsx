
import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ChartNoAxesColumn,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  UserRound,
  UserCheck,
  GraduationCap,
  Activity,
  ArrowRight,
  ChevronRight,
  Database,
  AlertCircle,
} from 'lucide-react';

import { AuthContext } from '../../context/auth-context';
import './AdminDashboard.css';

const navigation = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: ChartNoAxesColumn,
  },
  {
    id: 'audit',
    label: 'Audit Logs',
    icon: History,
  },
  {
    id: 'settings',
    label: 'System Settings',
    icon: Settings,
  },
];

const statistics = [
  {
    title: 'Total Users',
    icon: Users,
    description: 'Awaiting database integration',
  },
  {
    title: 'Active Accounts',
    icon: UserCheck,
    description: 'Awaiting database integration',
  },
  {
    title: 'Enrollment Records',
    icon: GraduationCap,
    description: 'Awaiting database integration',
  },
  {
    title: 'Recent Activities',
    icon: Activity,
    description: 'Awaiting audit log integration',
  },
];

const modules = [
  {
    id: 'users',
    title: 'User Management',
    icon: Users,
    description:
      'Create user accounts, assign predefined roles, and manage account status.',
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: ChartNoAxesColumn,
    description:
      'Review enrollment and academic information through reports.',
  },
  {
    id: 'audit',
    title: 'Audit Logs',
    icon: History,
    description:
      'Review important system activities and user actions.',
  },
  {
    id: 'settings',
    title: 'System Settings',
    icon: Settings,
    description:
      'Access authorized system configuration options.',
  },
];

const moduleDescriptions = {
  users:
    'User account creation, predefined role assignment, account status, and user listing will be implemented here.',
  reports:
    'Institutional reports will be connected to enrollment and academic records.',
  audit:
    'Audit records will appear here after the existing database table is connected to the backend.',
  settings:
    'Authorized system configuration options will be available here.',
};

function AdminDashboard() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const logoutCancelRef = useRef(null);
  const logoutConfirmRef = useRef(null);
  const logoutTriggerRef = useRef(null);
  const logoutDialogRef = useRef(null);

  const user = auth?.user;
  const logout = auth?.logout;

  const displayName = user?.username || 'Administrator';

  const currentSection =
    navigation.find((item) => item.id === activeSection) ||
    navigation[0];

  function changeSection(section) {
    setActiveSection(section);
    setSidebarOpen(false);
  }

  function openLogoutModal() {
    setShowLogoutModal(true);
    setSidebarOpen(false);
  }

  function closeLogoutModal() {
    if (loggingOut) return;

    setShowLogoutModal(false);

    requestAnimationFrame(() => {
      logoutTriggerRef.current?.focus();
    });
  }

  async function confirmLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      if (typeof logout === 'function') {
        await logout();
      }

      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  }

  useEffect(() => {
    if (!showLogoutModal) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;

    document.body.style.overflow = 'hidden';

    logoutCancelRef.current?.focus();

    function handleModalKeyDown(event) {
      if (event.key === 'Escape') {
        if (!loggingOut) {
          event.preventDefault();
          setShowLogoutModal(false);
          requestAnimationFrame(() => {
            logoutTriggerRef.current?.focus();
          });
        }
        return;
      }

      if (event.key !== 'Tab') return;

      const firstElement = logoutCancelRef.current;
      const lastElement = logoutConfirmRef.current;

      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleModalKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleModalKeyDown);

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus();
      }
    };
  }, [showLogoutModal, loggingOut]);

  function renderDashboard() {
    return (
      <>
        <section className="admin-welcome">
          <div className="admin-welcome-content">
            <span className="admin-eyebrow">
              ADMINISTRATION OVERVIEW
            </span>

            <h2>Welcome back, Administrator!</h2>

            <p>
              Manage system access, monitor institutional
              information, and oversee administrative operations
              for Pangantucan Bukidnon Community College.
            </p>
          </div>

          <div className="admin-welcome-emblem">
            <img
              src="/pbcc-logo.png"
              alt="Pangantucan Bukidnon Community College Seal"
            />
          </div>
        </section>

        <section className="admin-stats-grid">
          {statistics.map((stat) => {
            const Icon = stat.icon;

            return (
              <div className="admin-stat-card" key={stat.title}>
                <div className="admin-stat-top">
                  <span className="admin-stat-label">
                    {stat.title}
                  </span>

                  <span className="admin-stat-icon">
                    <Icon size={21} strokeWidth={1.8} />
                  </span>
                </div>

                <strong className="admin-stat-value">—</strong>

                <small>{stat.description}</small>
              </div>
            );
          })}
        </section>

        <section className="admin-modules-section">
          <div className="admin-section-heading">
            <h3>Administrative Modules</h3>

            <p>
              Access the main administrative functions of the
              college system.
            </p>
          </div>

          <div className="admin-modules-grid">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <button
                  key={module.id}
                  type="button"
                  className="admin-module-card"
                  onClick={() => changeSection(module.id)}
                >
                  <span className="admin-module-icon">
                    <Icon size={25} strokeWidth={1.8} />
                  </span>

                  <strong>{module.title}</strong>

                  <p>{module.description}</p>

                  <span className="admin-module-link">
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

  function renderPendingModule() {
    const Icon = currentSection.icon;

    return (
      <section className="admin-panel admin-empty-panel">
        <div className="admin-empty-icon">
          <Icon size={38} strokeWidth={1.6} />
        </div>

        <h3>{currentSection.label}</h3>

        <p>
          {moduleDescriptions[activeSection] ||
            'This module is under development.'}
        </p>

        <span className="admin-development-tag">
          <Database size={14} strokeWidth={1.8} />
          Pending backend integration
        </span>
      </section>
    );
  }

  function renderContent() {
    if (activeSection === 'dashboard') {
      return renderDashboard();
    }

    return renderPendingModule();
  }

  return (
    <div className="admin-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className="admin-app-content"
        inert={showLogoutModal ? true : undefined}
      >
        <aside
          className={`admin-sidebar ${
            sidebarOpen ? 'admin-sidebar-open' : ''
          }`}
        >
          <div className="admin-brand">
            <img
              src="/pbcc-logo.png"
              alt="Pangantucan Bukidnon Community College Logo"
              className="admin-brand-logo"
            />

            <div className="admin-brand-text">
              <strong>
                Pangantucan Bukidnon Community College
              </strong>

              <span>Administration Portal</span>
            </div>

            <button
              type="button"
              className="admin-sidebar-close"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={21} />
            </button>
          </div>

          <div className="admin-sidebar-caption">
            MAIN NAVIGATION
          </div>

          <nav
            className="admin-navigation"
            aria-label="Administrator navigation"
          >
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-nav-item ${
                    activeSection === item.id
                      ? 'admin-nav-active'
                      : ''
                  }`}
                  onClick={() => changeSection(item.id)}
                  aria-current={
                    activeSection === item.id
                      ? 'page'
                      : undefined
                  }
                >
                  <span className="admin-nav-icon">
                    <Icon size={19} strokeWidth={1.8} />
                  </span>

                  <span className="admin-nav-label">
                    {item.label}
                  </span>

                  {activeSection === item.id && (
                    <ChevronRight
                      className="admin-nav-arrow"
                      size={15}
                      strokeWidth={1.8}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="admin-sidebar-bottom">
            <div className="admin-sidebar-profile">
              <div className="admin-profile-avatar">
                <UserRound size={20} strokeWidth={1.8} />
              </div>

              <div className="admin-profile-details">
                <strong title={displayName}>
                  {displayName}
                </strong>

                <span>Administrator</span>
              </div>
            </div>

            <button
              ref={logoutTriggerRef}
              type="button"
              className="admin-logout-button"
              onClick={openLogoutModal}
            >
              <LogOut size={18} strokeWidth={1.8} />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        <div className="admin-main">
          <header className="admin-topbar">
            <div className="admin-topbar-left">
              <button
                type="button"
                className="admin-menu-button"
                aria-label="Open navigation"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={24} strokeWidth={1.8} />
              </button>

              <div className="admin-topbar-heading">
                <h1>{currentSection.label}</h1>

                <p>
                  Pangantucan Bukidnon Community College
                </p>
              </div>
            </div>

            <div className="admin-topbar-account">
              <div className="admin-topbar-avatar">
                <UserRound size={20} strokeWidth={1.8} />
              </div>

              <div className="admin-topbar-user-details">
                <strong title={displayName}>
                  {displayName}
                </strong>

                <span>Administrator</span>
              </div>
            </div>
          </header>

          <main className="admin-content">
            {renderContent()}
          </main>

          <footer className="admin-footer">
            © {new Date().getFullYear()} Pangantucan
            Bukidnon Community College
          </footer>
        </div>
      </div>

      {showLogoutModal && (
        <div className="admin-modal-overlay">
          <div
            ref={logoutDialogRef}
            className="admin-logout-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="admin-logout-title"
            aria-describedby="admin-logout-description"
          >
            <div className="admin-modal-icon">
              <LogOut size={28} strokeWidth={1.8} />
            </div>

            <h2 id="admin-logout-title">
              Log out of your account?
            </h2>

            <p id="admin-logout-description">
              Are you sure you want to log out? You will
              need to sign in again to access your dashboard.
            </p>

            <div className="admin-modal-notice">
              <AlertCircle size={17} strokeWidth={1.8} />
              <span>
                Your current session will be ended.
              </span>
            </div>

            <div className="admin-modal-actions">
              <button
                ref={logoutCancelRef}
                type="button"
                className="admin-modal-cancel"
                onClick={closeLogoutModal}
                disabled={loggingOut}
              >
                Cancel
              </button>

              <button
                ref={logoutConfirmRef}
                type="button"
                className="admin-modal-confirm"
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

export default AdminDashboard;
