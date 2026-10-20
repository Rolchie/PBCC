
import './DashboardSkeleton.css';

function DashboardSkeleton() {
  return (
    <div
      className="pbcc-skeleton-layout"
      role="status"
      aria-label="Loading dashboard"
      aria-live="polite"
    >
      <aside className="pbcc-skeleton-sidebar">
        <div className="pbcc-skeleton-brand">
          <img
            src="/pbcc-logo.png"
            alt="PBCC Logo"
            className="pbcc-skeleton-logo"
          />

          <div className="pbcc-skeleton-brand-text">
            <span className="pbcc-skeleton-line pbcc-skeleton-brand-title" />
            <span className="pbcc-skeleton-line pbcc-skeleton-brand-subtitle" />
          </div>
        </div>

        <div className="pbcc-skeleton-navigation">
          <span className="pbcc-skeleton-line pbcc-skeleton-nav-heading" />

          {Array.from({ length: 6 }, (_, index) => (
            <div className="pbcc-skeleton-nav-item" key={index}>
              <span className="pbcc-skeleton-line pbcc-skeleton-nav-icon" />
              <span className="pbcc-skeleton-line pbcc-skeleton-nav-label" />
            </div>
          ))}
        </div>

        <div className="pbcc-skeleton-sidebar-bottom">
          <span className="pbcc-skeleton-line pbcc-skeleton-avatar" />
          <div className="pbcc-skeleton-profile-lines">
            <span className="pbcc-skeleton-line" />
            <span className="pbcc-skeleton-line" />
          </div>
        </div>
      </aside>

      <div className="pbcc-skeleton-main">
        <header className="pbcc-skeleton-topbar">
          <div className="pbcc-skeleton-heading">
            <span className="pbcc-skeleton-line pbcc-skeleton-page-title" />
            <span className="pbcc-skeleton-line pbcc-skeleton-page-subtitle" />
          </div>

          <span className="pbcc-skeleton-line pbcc-skeleton-top-avatar" />
        </header>

        <main className="pbcc-skeleton-content">
          <div className="pbcc-skeleton-welcome">
            <span className="pbcc-skeleton-line pbcc-skeleton-eyebrow" />
            <span className="pbcc-skeleton-line pbcc-skeleton-welcome-title" />
            <span className="pbcc-skeleton-line pbcc-skeleton-welcome-description" />
            <span className="pbcc-skeleton-line pbcc-skeleton-welcome-description short" />
          </div>

          <div className="pbcc-skeleton-stats">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="pbcc-skeleton-stat-card" key={index}>
                <span className="pbcc-skeleton-line pbcc-skeleton-stat-icon" />
                <span className="pbcc-skeleton-line pbcc-skeleton-stat-label" />
                <span className="pbcc-skeleton-line pbcc-skeleton-stat-number" />
                <span className="pbcc-skeleton-line pbcc-skeleton-stat-footer" />
              </div>
            ))}
          </div>

          <div className="pbcc-skeleton-section-heading">
            <span className="pbcc-skeleton-line pbcc-skeleton-section-title" />
            <span className="pbcc-skeleton-line pbcc-skeleton-section-description" />
          </div>

          <div className="pbcc-skeleton-modules">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="pbcc-skeleton-module-card" key={index}>
                <span className="pbcc-skeleton-line pbcc-skeleton-module-icon" />
                <span className="pbcc-skeleton-line pbcc-skeleton-module-title" />
                <span className="pbcc-skeleton-line pbcc-skeleton-module-description" />
                <span className="pbcc-skeleton-line pbcc-skeleton-module-description short" />
              </div>
            ))}
          </div>
        </main>
      </div>

      <span className="pbcc-skeleton-sr-only">
        Loading your PBCC dashboard. Please wait.
      </span>
    </div>
  );
}

export default DashboardSkeleton;
