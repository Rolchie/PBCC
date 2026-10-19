
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';

// Navigation items correspond to the landing page sections.
const navigationItems = [
  { id: 'home', label: 'Home' },
  { id: 'enrollment', label: 'Enrollment' },
  { id: 'programs', label: 'Programs' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'contact', label: 'Contact' },
];

// General enrollment guidance.
// Official procedures should be confirmed by PBCC.
const enrollmentSteps = [
  {
    number: '01',
    title: 'Prepare Your Documents',
    description:
      'Gather the enrollment documents required by the college.',
  },
  {
    number: '02',
    title: 'Submit Requirements',
    description:
      'Submit the required documents to the designated PBCC office.',
  },
  {
    number: '03',
    title: 'Document Verification',
    description:
      'Wait for the authorized personnel to review your submitted documents.',
  },
  {
    number: '04',
    title: 'Enrollment Processing',
    description:
      'Follow the remaining enrollment instructions provided by PBCC.',
  },
];

// Uniform solid silhouette icons.

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2H4Z" />
    </svg>
  );
}

function EnrollmentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.8V8h4.2L14 3.8ZM8 12v2h8v-2H8Zm0 4v2h8v-2H8Z" />
    </svg>
  );
}

function RequirementsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 2h6a2 2 0 0 1 2 2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2-2Zm0 3v2h6V5H9Zm-2 6v2h10v-2H7Zm0 4v2h10v-2H7Z" />
    </svg>
  );
}

function ProgramsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 1 8l11 6 9-4.9V16h2V8L12 2Zm-6 11v5c0 2.2 3.2 4 6 4s6-1.8 6-4v-5l-6 3.3L6 13Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 4 11.6 5.4 17.2 11H3v2h14.2l-5.6 5.6L13 20l9-8-9-8Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9v-2.9h2.5V9.9c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.8h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1.5 2L12 12.5 19.5 7h-15Zm15.5 2.2-7.4 5.4a1 1 0 0 1-1.2 0L4 9.2V17h16V9.2Z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.6 2.5a2 2 0 0 0-2.1.5L3 4.5a3 3 0 0 0-.8 2.7c1.5 7.5 7.1 13.1 14.6 14.6a3 3 0 0 0 2.7-.8l1.5-1.5a2 2 0 0 0 .5-2.1l-1-3a2 2 0 0 0-2.2-1.3l-2.8.5a14 14 0 0 1-5.1-5.1l.5-2.8a2 2 0 0 0-1.3-2.2l-3-1Z" />
    </svg>
  );
}

// Skeleton preview displayed before navigating to Login.
function LoginSkeleton() {
  return (
    <div
      className="pbcc-skeleton-overlay"
      role="status"
      aria-label="Loading login page"
      aria-live="polite"
    >
      <div className="pbcc-skeleton-card">
        <div className="pbcc-skeleton-top">
          <div className="pbcc-skeleton-logo pbcc-shimmer" />
          <div className="pbcc-skeleton-heading pbcc-shimmer" />
        </div>

        <div className="pbcc-skeleton-field">
          <div className="pbcc-skeleton-label pbcc-shimmer" />
          <div className="pbcc-skeleton-input pbcc-shimmer" />
        </div>

        <div className="pbcc-skeleton-field">
          <div className="pbcc-skeleton-label pbcc-shimmer" />
          <div className="pbcc-skeleton-input pbcc-shimmer" />
        </div>

        <div className="pbcc-skeleton-button pbcc-shimmer" />

        <div className="pbcc-skeleton-bottom">
          <div className="pbcc-skeleton-note pbcc-shimmer" />
          <div className="pbcc-skeleton-back pbcc-shimmer" />
        </div>
      </div>

      <span className="pbcc-skeleton-sr-only">
        Loading login page. Please wait.
      </span>
    </div>
  );
}

function Home() {
  const [activeSection, setActiveSection] = useState('home');
  const [showLoginSkeleton, setShowLoginSkeleton] = useState(false);

  const navigate = useNavigate();
  const loginTimerRef = useRef(null);

  // Display skeleton immediately when Login is clicked.
  function handleLoginClick(event) {
    // Allow normal browser behavior for modified clicks.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();

    // Prevent multiple timers from repeated clicks.
    if (showLoginSkeleton) {
      return;
    }

    setShowLoginSkeleton(true);

    // Visual transition: 1.5 seconds.
    loginTimerRef.current = window.setTimeout(() => {
      navigate('/login');
    }, 1500);
  }

  // Clean up the timer if the page unmounts.
  useEffect(() => {
    return () => {
      if (loginTimerRef.current !== null) {
        window.clearTimeout(loginTimerRef.current);
      }
    };
  }, []);

  // Track which landing page section is currently visible.
  useEffect(() => {
    const sectionIds = navigationItems.map((item) => item.id);

    const updateActiveSection = () => {
      const reachedBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 8;

      if (reachedBottom) {
        setActiveSection('contact');
        return;
      }

      const scrollPosition = window.scrollY + 130;
      let currentSection = 'home';

      sectionIds.forEach((id) => {
        const section = document.getElementById(id);

        if (section && section.offsetTop <= scrollPosition) {
          currentSection = id;
        }
      });

      setActiveSection(currentSection);
    };

    updateActiveSection();

    window.addEventListener('scroll', updateActiveSection, {
      passive: true,
    });

    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  return (
    <div className="pbcc-landing">
      {/* STICKY NAVIGATION */}
      <header className="pbcc-header">
        <div className="pbcc-header-inner">
          <a href="#home" className="pbcc-brand">
            <img
              src="/pbcc-logo.png"
              alt="PBCC official seal"
              className="pbcc-logo"
            />

            <div className="pbcc-brand-name">
              <span>PANGANTUCAN BUKIDNON</span>
              <span>COMMUNITY COLLEGE</span>
            </div>
          </a>

          <nav
            className="pbcc-navigation"
            aria-label="Main navigation"
          >
            {navigationItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={
                  activeSection === item.id
                    ? 'pbcc-nav-active'
                    : ''
                }
                aria-current={
                  activeSection === item.id
                    ? 'location'
                    : undefined
                }
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="pbcc-header-divider" />

          <Link
            to="/login"
            className="pbcc-login-button"
            onClick={handleLoginClick}
            aria-disabled={showLoginSkeleton}
          >
            <UserIcon />
            <span>Login</span>
          </Link>
        </div>
      </header>

      <main>
        {/* HOME / HERO */}
        <section
          id="home"
          className="pbcc-hero pbcc-scroll-section"
        >
          <div className="pbcc-hero-overlay" />

          <div className="pbcc-hero-inner">
            <div className="pbcc-hero-copy">
              <h1>
                Pangantucan Bukidnon
                <span>Community College</span>
              </h1>

              <div className="pbcc-gold-line" />

              <p>
                Welcome to PBCC! We are delighted to provide you
                a convenient and efficient way to begin your
                academic journey.
              </p>

              <p>
                Explore our programs, check the requirements,
                and start your enrollment with ease.
              </p>
            </div>
          </div>
        </section>

        {/* QUICK ACCESS CARDS */}
        <section className="pbcc-quick-access">
          <div className="pbcc-quick-access-inner">
            <a href="#enrollment" className="pbcc-info-card">
              <div className="pbcc-card-icon blue">
                <EnrollmentIcon />
              </div>

              <h2>Enrollment Procedure</h2>

              <p>
                Step-by-step guide on how to apply and enroll.
              </p>

              <span className="pbcc-view-more">
                View More <ArrowIcon />
              </span>
            </a>

            <a href="#requirements" className="pbcc-info-card">
              <div className="pbcc-card-icon green">
                <RequirementsIcon />
              </div>

              <h2>Requirements</h2>

              <p>
                Complete list of documents needed for application.
              </p>

              <span className="pbcc-view-more">
                View More <ArrowIcon />
              </span>
            </a>

            <a href="#programs" className="pbcc-info-card">
              <div className="pbcc-card-icon gold">
                <ProgramsIcon />
              </div>

              <h2>Academic Programs</h2>

              <p>
                Explore our courses and find the program that fits you.
              </p>

              <span className="pbcc-view-more">
                View More <ArrowIcon />
              </span>
            </a>
          </div>
        </section>

        {/* ENROLLMENT */}
        <section
          id="enrollment"
          className="pbcc-content-section pbcc-scroll-section"
        >
          <div className="pbcc-section-container">
            <div className="pbcc-section-heading">
              <span className="pbcc-section-eyebrow">
                GETTING STARTED
              </span>

              <h2>Enrollment Procedure</h2>

              <p>
                Learn about the general steps involved in
                beginning your enrollment journey at PBCC.
              </p>
            </div>

            <div className="pbcc-steps-grid">
              {enrollmentSteps.map((step) => (
                <article
                  key={step.number}
                  className="pbcc-step-card"
                >
                  <span className="pbcc-step-number">
                    {step.number}
                  </span>

                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>

            <p className="pbcc-section-note">
              Note: Detailed enrollment instructions and
              schedules are subject to official PBCC announcements.
            </p>
          </div>
        </section>

        {/* PROGRAMS */}
        <section
          id="programs"
          className="pbcc-content-section pbcc-section-alt pbcc-scroll-section"
        >
          <div className="pbcc-section-container">
            <div className="pbcc-section-heading">
              <span className="pbcc-section-eyebrow">
                ACADEMIC OPPORTUNITIES
              </span>

              <h2>Academic Programs</h2>

              <p>
                Explore the academic opportunities available at
                Pangantucan Bukidnon Community College.
              </p>
            </div>

            <div className="pbcc-program-placeholder">
              <div className="pbcc-program-symbol">
                <ProgramsIcon />
              </div>

              <div>
                <h3>Find Your Academic Path</h3>

                <p>
                  The official list of academic programs will
                  be displayed here once the college-approved
                  information has been added.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* REQUIREMENTS */}
        <section
          id="requirements"
          className="pbcc-content-section pbcc-scroll-section"
        >
          <div className="pbcc-section-container">
            <div className="pbcc-section-heading">
              <span className="pbcc-section-eyebrow">
                BEFORE YOU ENROLL
              </span>

              <h2>Enrollment Requirements</h2>

              <p>
                Prepare the documents required for enrollment
                and ensure that your submissions are complete.
              </p>
            </div>

            <div className="pbcc-requirements-panel">
              <div className="pbcc-requirements-icon">
                <RequirementsIcon />
              </div>

              <div>
                <h3>Prepare Your Documents</h3>

                <p>
                  The complete official list of enrollment
                  requirements will be provided here once
                  confirmed by the college.
                </p>

                <p>
                  For now, please coordinate with the
                  appropriate PBCC office for the latest
                  approved requirements.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section
          id="contact"
          className="pbcc-contact-section pbcc-scroll-section"
        >
          <div className="pbcc-section-container">
            <div className="pbcc-contact-content">
              <span className="pbcc-section-eyebrow">
                GET IN TOUCH
              </span>

              <h2>Contact PBCC</h2>

              <p>
                Have questions about enrollment, requirements,
                or academic programs? Please contact the
                appropriate college office for assistance.
              </p>

              <div className="pbcc-contact-card">
                <strong>
                  Pangantucan Bukidnon Community College
                </strong>

                <span>
                  Pangantucan, Bukidnon, Philippines
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="pbcc-footer">
        <div className="pbcc-footer-inner">
          <div
            className="pbcc-footer-social"
            aria-hidden="true"
          >
            <FacebookIcon />
            <MailIcon />
            <PhoneIcon />
          </div>

          <p>
            Copyright © {new Date().getFullYear()}.
            Pangantucan Bukidnon Community College.
            All Rights Reserved.
          </p>
        </div>
      </footer>

      {/* SKELETON OVERLAY */}
      {showLoginSkeleton && <LoginSkeleton />}
    </div>
  );
}

export default Home;
