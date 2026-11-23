
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardPenLine,
  UserRound,
  LogOut,
  Menu,
  PanelLeftClose,
  X,
  ChevronRight,
  GraduationCap,
  CalendarDays,
  School,
  Info,
  ShieldCheck,
  Save,
  RefreshCw,
  AlertCircle,
  LoaderCircle,
  Send
} from 'lucide-react';

import { AuthContext } from '../../context/auth-context';
import './FacultyDashboard.css';

const API_BASE = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '');

const navigation = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    id: 'classes',
    label: 'Assigned Classes',
    icon: BookOpen
  },
  {
    id: 'class-lists',
    label: 'Class Lists',
    icon: Users
  },
  {
    id: 'grades',
    label: 'Grade Management',
    icon: ClipboardPenLine
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: UserRound
  }
];

const descriptions = {
  dashboard:
    'Overview of faculty teaching assignments and academic records.',
  classes:
    'View subjects and class sections assigned to faculty.',
  'class-lists':
    'View students in your assigned classes.',
  grades:
    'Encode, save, and submit grades for your assigned subjects.',
  profile:
    'View faculty account and institutional information.'
};

const GRADE_OPTIONS = [
  ...Array.from(
    { length: 21 },
    (_, index) => (1 + index / 10).toFixed(1)
  ),
  '5.0',
  'INC',
  'DROPPED'
];

function gradeDetails(value) {
  const grade = String(value ?? '').trim().toUpperCase();

  if (!grade) {
    return {
      equivalent: '—',
      remarks: 'Not encoded'
    };
  }

  if (grade === 'INC') {
    return {
      equivalent: '—',
      remarks: 'INC'
    };
  }

  if (grade === 'DROPPED') {
    return {
      equivalent: '—',
      remarks: 'Dropped'
    };
  }

  if (grade === '5.0') {
    return {
      equivalent: '74 and below',
      remarks: 'Failed'
    };
  }

  if (!GRADE_OPTIONS.includes(grade)) {
    return {
      equivalent: '—',
      remarks: 'Invalid grade'
    };
  }

  const numeric = Number(grade);

  return {
    equivalent:
      numeric === 1
        ? '95 and above'
        : String(95 - Math.round((numeric - 1) * 10)),
    remarks: 'Passed'
  };
}

function studentName(student) {
  if (!student) {
    return 'Student record unavailable';
  }

  const surname = student.last_name || '';

  const given = [
    student.first_name,
    student.middle_name
  ]
    .filter(Boolean)
    .join(' ');

  return (
    [surname, given].filter(Boolean).join(', ') ||
    'Unnamed Student'
  );
}

function classLabel(item) {
  return [
    item.subject?.subject_code || 'Unknown subject',
    item.section?.section_code || 'No section',
    item.academic_period?.school_year,
    item.academic_period?.semester
  ]
    .filter(Boolean)
    .join(' • ');
}

async function facultyRequest(path, options = {}) {
  const token = localStorage.getItem('pbcc_access_token');

  if (!token) {
    throw new Error(
      'Your session is missing. Please log in again.'
    );
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers
    }
  });

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
      `Request failed (${response.status}).`
    );
  }

  return data;
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  description
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

function InformationRow({ label, value }) {
  return (
    <div className="faculty-information-row">
      <span>{label}</span>

      <strong>
        {value === null ||
        value === undefined ||
        value === ''
          ? 'Not available'
          : value}
      </strong>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  loading = false
}) {
  return (
    <div className="faculty-empty-state">
      <div className="faculty-empty-icon">
        {loading ? (
          <LoaderCircle
            size={29}
            className="faculty-refresh-spin"
          />
        ) : (
          <Icon size={29} />
        )}
      </div>

      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  );
}

function FacultyDashboard() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  // GENERAL PORTAL
  const [activeSection, setActiveSection] =
    useState('dashboard');

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  // Desktop sidebar can be collapsed independently of mobile navigation.
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  // ASSIGNED CLASSES
  const [classes, setClasses] = useState([]);
  const [facultyProfile, setFacultyProfile] =
    useState(null);

  const [loadingClasses, setLoadingClasses] =
    useState(true);

  const [classesError, setClassesError] =
    useState('');

  // CLASS LISTS: INDEPENDENT STATE
  const [
    classListOfferingId,
    setClassListOfferingId
  ] = useState('');

  const [
    classListRecords,
    setClassListRecords
  ] = useState([]);

  const [
    loadingClassList,
    setLoadingClassList
  ] = useState(false);

  const [
    refreshingClassList,
    setRefreshingClassList
  ] = useState(false);

  const [
    classListError,
    setClassListError
  ] = useState('');

  // GRADE MANAGEMENT: INDEPENDENT STATE
  const [
    gradeOfferingId,
    setGradeOfferingId
  ] = useState('');

  const [
    gradeSheet,
    setGradeSheet
  ] = useState([]);

  const [
    loadingGradeSheet,
    setLoadingGradeSheet
  ] = useState(false);

  const [
    refreshingGradeSheet,
    setRefreshingGradeSheet
  ] = useState(false);

  const [
    gradeSheetError,
    setGradeSheetError
  ] = useState('');

  const [
    gradeInputs,
    setGradeInputs
  ] = useState({});

  const [
    savingIds,
    setSavingIds
  ] = useState([]);

  const [
    rowMessages,
    setRowMessages
  ] = useState({});

  // GRADE SUBMISSION
  const [
    showSubmitModal,
    setShowSubmitModal
  ] = useState(false);

  const [
    submittingGrades,
    setSubmittingGrades
  ] = useState(false);

  const [
    submissionMessage,
    setSubmissionMessage
  ] = useState(null);

  // REQUEST TRACKING
  const classListRequestId = useRef(0);
  const gradeSheetRequestId = useRef(0);
  const gradeOfferingRef = useRef('');
  const mountedRef = useRef(true);
  const savingIdsRef = useRef(new Set());
  const submittingRef = useRef(false);

  const currentPage =
    navigation.find(
      item => item.id === activeSection
    ) || navigation[0];

  const accountName = [
    auth?.user?.first_name,
    auth?.user?.middle_name,
    auth?.user?.last_name
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const profileName = [
    facultyProfile?.first_name,
    facultyProfile?.middle_name,
    facultyProfile?.last_name
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const displayName =
    profileName ||
    accountName ||
    auth?.user?.full_name ||
    auth?.user?.name ||
    'Faculty Account';

  const displayEmail =
    facultyProfile?.email ||
    auth?.user?.email ||
    'Not available';

  const selectedGradeClass = useMemo(
    () =>
      classes.find(
        item =>
          String(item.offering_id) === gradeOfferingId
      ) || null,
    [classes, gradeOfferingId]
  );

  const totalDrafts = gradeSheet.filter(
    row =>
      String(
        row.grade?.status || ''
      ).toLowerCase() === 'draft'
  ).length;

  const totalRecorded = gradeSheet.filter(
    row => Boolean(row.grade?.grade)
  ).length;

  const totalSubmitted = gradeSheet.filter(
    row =>
      String(
        row.grade?.status || ''
      ).toLowerCase() === 'submitted'
  ).length;

  const missingGrades = gradeSheet.filter(
    row =>
      !row.grade ||
      !GRADE_OPTIONS.includes(
        String(row.grade.grade || '').toUpperCase()
      )
  );

  const unsavedGrades = gradeSheet.filter(
    row =>
      (gradeInputs[row.enrollment_id] || '') !==
      (row.grade?.grade || '')
  );

  const hasNonDraftGrades = gradeSheet.some(
    row =>
      row.grade &&
      String(
        row.grade.status || ''
      ).toLowerCase() !== 'draft'
  );

  const canSubmitGrades =
    Boolean(gradeOfferingId) &&
    gradeSheet.length > 0 &&
    missingGrades.length === 0 &&
    unsavedGrades.length === 0 &&
    !hasNonDraftGrades &&
    !loadingGradeSheet &&
    savingIds.length === 0 &&
    !submittingGrades;

  const uniquePeriods = useMemo(
    () => [
      ...new Set(
        classes
          .map(item => {
            const period = item.academic_period;

            return period
              ? `${period.school_year} ${period.semester}`
              : '';
          })
          .filter(Boolean)
      )
    ],
    [classes]
  );

  // LOAD ASSIGNED CLASSES AND PROFILE
  async function loadClasses() {
    setLoadingClasses(true);
    setClassesError('');

    try {
      const [
        classesResponse,
        profileResponse
      ] = await Promise.all([
        facultyRequest(
          '/api/faculty/assigned-classes'
        ),
        facultyRequest(
          '/api/faculty/profile'
        )
      ]);

      if (!mountedRef.current) return;

      setClasses(
        classesResponse.classes || []
      );

      setFacultyProfile(
        profileResponse.faculty || null
      );
    } catch (error) {
      if (mountedRef.current) {
        setClassesError(error.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoadingClasses(false);
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    loadClasses();

    return () => {
      mountedRef.current = false;
      classListRequestId.current += 1;
      gradeSheetRequestId.current += 1;
    };
  }, []);

  // CLASS LISTS REQUEST
  async function loadClassList(
    offeringId,
    isRefresh = false
  ) {
    const requestId =
      ++classListRequestId.current;

    if (!offeringId) {
      setClassListRecords([]);
      setClassListError('');
      setLoadingClassList(false);
      setRefreshingClassList(false);
      return;
    }

    setLoadingClassList(true);
    setRefreshingClassList(isRefresh);
    setClassListError('');

    if (!isRefresh) {
      setClassListRecords([]);
    }

    try {
      const response = await facultyRequest(
        `/api/faculty/grade-sheet/${encodeURIComponent(
          offeringId
        )}`
      );

      if (
        !mountedRef.current ||
        requestId !== classListRequestId.current
      ) {
        return;
      }

      setClassListRecords(
        response.records || []
      );
    } catch (error) {
      if (
        !mountedRef.current ||
        requestId !== classListRequestId.current
      ) {
        return;
      }

      setClassListError(error.message);
    } finally {
      if (
        mountedRef.current &&
        requestId === classListRequestId.current
      ) {
        setLoadingClassList(false);
        setRefreshingClassList(false);
      }
    }
  }

  function selectClassList(offeringId) {
    setClassListOfferingId(offeringId);
    loadClassList(offeringId);
  }

  // GRADE MANAGEMENT REQUEST
  async function loadGradeSheet(
    offeringId,
    isRefresh = false
  ) {
    const requestId =
      ++gradeSheetRequestId.current;

    if (!offeringId) {
      setGradeSheet([]);
      setGradeInputs({});
      setRowMessages({});
      setGradeSheetError('');
      setLoadingGradeSheet(false);
      setRefreshingGradeSheet(false);
      return;
    }

    setLoadingGradeSheet(true);
    setRefreshingGradeSheet(isRefresh);
    setGradeSheetError('');

    if (!isRefresh) {
      setGradeSheet([]);
      setGradeInputs({});
      setRowMessages({});
    }

    try {
      const response = await facultyRequest(
        `/api/faculty/grade-sheet/${encodeURIComponent(
          offeringId
        )}`
      );

      if (
        !mountedRef.current ||
        requestId !== gradeSheetRequestId.current
      ) {
        return;
      }

      const records =
        response.records || [];

      const initialInputs = {};

      records.forEach(row => {
        initialInputs[row.enrollment_id] =
          row.grade?.grade || '';
      });

      setGradeSheet(records);
      setGradeInputs(initialInputs);
      setRowMessages({});
    } catch (error) {
      if (
        !mountedRef.current ||
        requestId !== gradeSheetRequestId.current
      ) {
        return;
      }

      setGradeSheetError(error.message);
    } finally {
      if (
        mountedRef.current &&
        requestId === gradeSheetRequestId.current
      ) {
        setLoadingGradeSheet(false);
        setRefreshingGradeSheet(false);
      }
    }
  }

  function selectGradeClass(offeringId) {
    gradeOfferingRef.current = offeringId;

    setGradeOfferingId(offeringId);
    setSubmissionMessage(null);
    setShowSubmitModal(false);

    loadGradeSheet(offeringId);
  }

  // NAVIGATION
  function changeSection(section) {
    setActiveSection(section);
    setSidebarOpen(false);
  }

  // GRADE ENCODING
  function updateGrade(enrollmentId, value) {
    setGradeInputs(previous => ({
      ...previous,
      [enrollmentId]: value
    }));

    setSubmissionMessage(null);

    setRowMessages(previous => ({
      ...previous,
      [enrollmentId]: null
    }));
  }

  async function saveGrade(row) {
    const enrollmentId =
      row.enrollment_id;

    const selectedGrade =
      gradeInputs[enrollmentId];

    if (
      !GRADE_OPTIONS.includes(selectedGrade)
    ) {
      setRowMessages(previous => ({
        ...previous,
        [enrollmentId]: {
          type: 'error',
          text: 'Select a valid PBCC grade.'
        }
      }));

      return;
    }

    if (
      savingIdsRef.current.has(enrollmentId) ||
      submittingRef.current
    ) {
      return;
    }

    savingIdsRef.current.add(enrollmentId);

    setSavingIds(previous => [
      ...previous,
      enrollmentId
    ]);

    setRowMessages(previous => ({
      ...previous,
      [enrollmentId]: null
    }));

    const offeringAtSave =
      gradeOfferingRef.current;

    try {
      const response = await facultyRequest(
        `/api/faculty/grades/${enrollmentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            grade: selectedGrade
          })
        }
      );

      if (
        !mountedRef.current ||
        gradeOfferingRef.current !==
          offeringAtSave
      ) {
        return;
      }

      setGradeSheet(previous =>
        previous.map(item =>
          item.enrollment_id === enrollmentId
            ? {
                ...item,
                grade: response.grade
              }
            : item
        )
      );

      setRowMessages(previous => ({
        ...previous,
        [enrollmentId]: {
          type: 'success',
          text: 'Draft saved.'
        }
      }));
    } catch (error) {
      if (
        !mountedRef.current ||
        gradeOfferingRef.current !==
          offeringAtSave
      ) {
        return;
      }

      setRowMessages(previous => ({
        ...previous,
        [enrollmentId]: {
          type: 'error',
          text: error.message
        }
      }));
    } finally {
      savingIdsRef.current.delete(
        enrollmentId
      );

      if (mountedRef.current) {
        setSavingIds(previous =>
          previous.filter(
            id => id !== enrollmentId
          )
        );
      }
    }
  }

  // SUBMISSION VALIDATION
  function openSubmitModal() {
    setSubmissionMessage(null);

    if (!gradeOfferingId) {
      setSubmissionMessage({
        type: 'error',
        text: 'Select an assigned subject first.'
      });
      return;
    }

    if (!gradeSheet.length) {
      setSubmissionMessage({
        type: 'error',
        text: 'This subject has no enrolled students.'
      });
      return;
    }

    if (
      loadingGradeSheet ||
      savingIds.length > 0 ||
      submittingGrades
    ) {
      setSubmissionMessage({
        type: 'error',
        text:
          'Wait for the current operation to finish.'
      });
      return;
    }

    if (missingGrades.length > 0) {
      setSubmissionMessage({
        type: 'error',
        text:
          `${missingGrades.length} student(s) do not have ` +
          'a valid saved grade. Complete all grades first.'
      });
      return;
    }

    if (unsavedGrades.length > 0) {
      setSubmissionMessage({
        type: 'error',
        text:
          `${unsavedGrades.length} student(s) have unsaved ` +
          'changes. Save all draft grades first.'
      });
      return;
    }

    if (hasNonDraftGrades) {
      setSubmissionMessage({
        type: 'error',
        text:
          'This grade sheet contains locked or already ' +
          'submitted grades and cannot be submitted again.'
      });
      return;
    }

    setShowSubmitModal(true);
  }

  // SUBMIT GRADE SHEET
  async function submitGrades() {
    if (
      submittingRef.current ||
      !canSubmitGrades
    ) {
      return;
    }

    const offeringAtSubmission =
      gradeOfferingRef.current;

    submittingRef.current = true;
    setSubmittingGrades(true);
    setSubmissionMessage(null);

    try {
      const response = await facultyRequest(
        `/api/faculty/submit-grades/${encodeURIComponent(
          offeringAtSubmission
        )}`,
        {
          method: 'POST'
        }
      );

      if (
        !mountedRef.current ||
        gradeOfferingRef.current !==
          offeringAtSubmission
      ) {
        return;
      }

      setShowSubmitModal(false);

      // Reload authoritative statuses from the backend.
      await loadGradeSheet(
        offeringAtSubmission,
        true
      );

      if (
        !mountedRef.current ||
        gradeOfferingRef.current !==
          offeringAtSubmission
      ) {
        return;
      }

      setSubmissionMessage({
        type: 'success',
        text:
          `${response.submitted_count} grade(s) submitted ` +
          'successfully. These grades are locked and ' +
          'awaiting validation.'
      });
    } catch (error) {
      if (
        mountedRef.current &&
        gradeOfferingRef.current ===
          offeringAtSubmission
      ) {
        setShowSubmitModal(false);

        setSubmissionMessage({
          type: 'error',
          text: error.message
        });
      }
    } finally {
      submittingRef.current = false;

      if (mountedRef.current) {
        setSubmittingGrades(false);
      }
    }
  }

  // LOGOUT
  function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      if (
        typeof auth?.logout !== 'function'
      ) {
        throw new Error(
          'Logout function is unavailable.'
        );
      }

      auth.logout();

      setShowLogoutModal(false);
      setSidebarOpen(false);

      navigate('/login', {
        replace: true
      });
    } catch (error) {
      console.error(
        'Faculty logout failed:',
        error
      );

      setLoggingOut(false);

      window.alert(
        'Unable to log out. Please try again.'
      );
    }
  }

  // CLASS LIST SELECTOR
  function renderClassListSelector() {
    return (
      <div className="faculty-filter-preview">
        <div>
          <label htmlFor="faculty-class-list-subject">
            Assigned Subject
          </label>

          <select
            id="faculty-class-list-subject"
            value={classListOfferingId}
            onChange={event =>
              selectClassList(
                event.target.value
              )
            }
            disabled={
              loadingClasses ||
              loadingClassList
            }
          >
            <option value="">
              {loadingClasses
                ? 'Loading assigned subjects...'
                : 'Select an assigned subject'}
            </option>

            {classes.map(item => (
              <option
                key={item.offering_id}
                value={String(
                  item.offering_id
                )}
              >
                {classLabel(item)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="faculty-primary-button faculty-refresh-button"
          onClick={() =>
            loadClassList(
              classListOfferingId,
              true
            )
          }
          disabled={
            !classListOfferingId ||
            loadingClassList
          }
          aria-label="Refresh class list"
          aria-busy={refreshingClassList}
        >
          <RefreshCw
            size={17}
            className={
              refreshingClassList
                ? 'faculty-refresh-spin'
                : ''
            }
          />
          Refresh
        </button>
      </div>
    );
  }

  // GRADE MANAGEMENT SELECTOR
  function renderGradeSelector() {
    return (
      <div className="faculty-filter-preview">
        <div>
          <label htmlFor="faculty-grade-subject">
            Assigned Subject
          </label>

          <select
            id="faculty-grade-subject"
            value={gradeOfferingId}
            onChange={event =>
              selectGradeClass(
                event.target.value
              )
            }
            disabled={
              loadingClasses ||
              loadingGradeSheet ||
              savingIds.length > 0 ||
              submittingGrades
            }
          >
            <option value="">
              {loadingClasses
                ? 'Loading assigned subjects...'
                : 'Select an assigned subject'}
            </option>

            {classes.map(item => (
              <option
                key={item.offering_id}
                value={String(
                  item.offering_id
                )}
              >
                {classLabel(item)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="faculty-primary-button faculty-refresh-button"
          onClick={() => {
            setSubmissionMessage(null);

            loadGradeSheet(
              gradeOfferingId,
              true
            );
          }}
          disabled={
            !gradeOfferingId ||
            loadingGradeSheet ||
            savingIds.length > 0 ||
            submittingGrades
          }
          aria-label="Refresh grade sheet"
          aria-busy={refreshingGradeSheet}
        >
          <RefreshCw
            size={17}
            className={
              refreshingGradeSheet
                ? 'faculty-refresh-spin'
                : ''
            }
          />
          Refresh
        </button>
      </div>
    );
  }

  // DASHBOARD
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
              View your teaching assignments,
              manage draft grades, and submit
              completed grade sheets.
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
            value={
              loadingClasses
                ? '—'
                : classes.length
            }
            description="Subjects assigned to your account"
          />

          <OverviewCard
            icon={Users}
            label="Class List Students"
            value={
              classListOfferingId
                ? classListRecords.length
                : '—'
            }
            description="Students in the selected class list"
          />

          <OverviewCard
            icon={ClipboardPenLine}
            label="Saved Draft Grades"
            value={
              gradeOfferingId
                ? totalDrafts
                : '—'
            }
            description="Drafts in the selected grade sheet"
          />

          <OverviewCard
            icon={CalendarDays}
            label="Academic Terms"
            value={
              loadingClasses
                ? '—'
                : uniquePeriods.length
            }
            description="Terms represented by your assignments"
          />
        </section>

        <div className="faculty-dashboard-columns">
          <section className="faculty-panel">
            <div className="faculty-panel-heading">
              <div>
                <h3>Teaching Overview</h3>
                <p>
                  Your assigned academic information.
                </p>
              </div>

              <School size={22} />
            </div>

            <div className="faculty-information-list">
              <InformationRow
                label="Assigned Subjects"
                value={
                  loadingClasses
                    ? 'Loading...'
                    : classes.length
                }
              />

              <InformationRow
                label="Department"
                value={
                  facultyProfile?.department
                }
              />

              <InformationRow
                label="Academic Terms"
                value={
                  uniquePeriods.join(', ') ||
                  'Not assigned'
                }
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
                  item =>
                    item.id !== 'dashboard'
                )
                .map(item => {
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

                      <span>
                        {item.label}
                      </span>

                      <ChevronRight size={17} />
                    </button>
                  );
                })}
            </div>
          </section>
        </div>

        {classesError && (
          <div
            className="faculty-inline-note"
            role="alert"
          >
            <AlertCircle size={18} />
            <p>{classesError}</p>
          </div>
        )}

        <section className="faculty-notice">
          <Info size={20} />

          <div>
            <strong>
              Grade Management Notice
            </strong>

            <p>
              Faculty can save draft grades
              and submit completed grade sheets.
              Submitted grades are locked
              and are not yet official or
              visible to students.
            </p>
          </div>
        </section>
      </>
    );
  }

  // ASSIGNED CLASSES
  function renderAssignedClasses() {
    return (
      <section className="faculty-panel">
        <div className="faculty-panel-heading">
          <div>
            <h3>Assigned Classes</h3>

            <p>
              Subjects officially assigned
              to your faculty account.
            </p>
          </div>

          <BookOpen size={22} />
        </div>

        {classesError && (
          <div
            className="faculty-inline-note"
            role="alert"
          >
            <AlertCircle size={18} />
            <p>{classesError}</p>
          </div>
        )}

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
              {classes.map(item => (
                <tr key={item.offering_id}>
                  <td>
                    {item.subject?.subject_code ||
                      '—'}
                  </td>

                  <td>
                    {item.subject?.subject_title ||
                      '—'}
                  </td>

                  <td>
                    {item.section?.section_code ||
                      '—'}
                  </td>

                  <td>
                    {item.subject?.units ?? '—'}
                  </td>

                  <td>
                    {item.academic_period
                      ? `${item.academic_period.school_year} — ${item.academic_period.semester}`
                      : '—'}
                  </td>
                </tr>
              ))}

              {!classes.length && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={BookOpen}
                      loading={loadingClasses}
                      title={
                        loadingClasses
                          ? 'Loading assigned classes'
                          : 'No assigned classes'
                      }
                      description={
                        loadingClasses
                          ? 'Please wait...'
                          : 'No subject offerings are linked to your faculty record.'
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

  // CLASS LISTS
  function renderClassLists() {
    return (
      <section className="faculty-panel">
        <div className="faculty-panel-heading">
          <div>
            <h3>Class Lists</h3>
            <p>
              Students in your assigned subjects.
            </p>
          </div>

          <Users size={22} />
        </div>

        {renderClassListSelector()}

        {classListError && (
          <div
            className="faculty-inline-note"
            role="alert"
          >
            <AlertCircle size={18} />
            <p>{classListError}</p>
          </div>
        )}

        <div className="faculty-table-wrapper">
          <table
            className="faculty-table"
            aria-busy={loadingClassList}
          >
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Student Name</th>
              </tr>
            </thead>

            <tbody>
              {classListRecords.map(row => (
                <tr key={row.enrollment_id}>
                  <td>
                    {row.student?.student_no ||
                      '—'}
                  </td>

                  <td>
                    {studentName(
                      row.student
                    )}
                  </td>
                </tr>
              ))}

              {!classListRecords.length && (
                <tr>
                  <td colSpan={2}>
                    <EmptyState
                      icon={Users}
                      loading={loadingClassList}
                      title={
                        loadingClassList
                          ? 'Loading students'
                          : 'No students to display'
                      }
                      description={
                        classListOfferingId
                          ? 'No eligible students found for this subject.'
                          : 'Select an assigned subject to view students.'
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

  // GRADE MANAGEMENT
  function renderGradeManagement() {
    return (
      <section className="faculty-panel">
        <div className="faculty-panel-heading">
          <div>
            <h3>Grade Management</h3>

            <p>
              Encode PBCC grades, save drafts,
              and submit completed grade sheets.
            </p>
          </div>

          <ClipboardPenLine size={22} />
        </div>

        {renderGradeSelector()}

        {classesError && (
          <div
            className="faculty-inline-note"
            role="alert"
          >
            <AlertCircle size={18} />
            <p>{classesError}</p>
          </div>
        )}

        {gradeSheetError && (
          <div
            className="faculty-inline-note"
            role="alert"
          >
            <AlertCircle size={18} />
            <p>{gradeSheetError}</p>
          </div>
        )}

        {submissionMessage && (
          <div
            className="faculty-inline-note"
            role={
              submissionMessage.type === 'error'
                ? 'alert'
                : 'status'
            }
          >
            {submissionMessage.type ===
            'success' ? (
              <ShieldCheck size={18} />
            ) : (
              <AlertCircle size={18} />
            )}

            <p>
              {submissionMessage.text}
            </p>
          </div>
        )}

        {selectedGradeClass && (
          <div className="faculty-information-list">
            <InformationRow
              label="Subject"
              value={`${selectedGradeClass.subject?.subject_code || ''} — ${selectedGradeClass.subject?.subject_title || ''}`}
            />

            <InformationRow
              label="Section"
              value={
                selectedGradeClass.section?.section_code
              }
            />

            <InformationRow
              label="Academic Term"
              value={
                selectedGradeClass.academic_period
                  ? `${selectedGradeClass.academic_period.school_year} — ${selectedGradeClass.academic_period.semester}`
                  : 'Not available'
              }
            />

            <InformationRow
              label="Recorded Grades"
              value={`${totalRecorded} of ${gradeSheet.length}`}
            />

            <InformationRow
              label="Draft Grades"
              value={totalDrafts}
            />

            <InformationRow
              label="Submitted Grades"
              value={totalSubmitted}
            />
          </div>
        )}

        <div className="faculty-table-wrapper">
          <table
            className="faculty-table"
            aria-busy={loadingGradeSheet}
          >
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Student Name</th>
                <th>Mark / Grade</th>
                <th>Numerical Equivalent</th>
                <th>Remarks</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {gradeSheet.map(row => {
                const enrollmentId =
                  row.enrollment_id;

                const selectedGrade =
                  gradeInputs[enrollmentId] ||
                  '';

                const details =
                  gradeDetails(selectedGrade);

                const status = String(
                  row.grade?.status ||
                    'Not encoded'
                );

                const locked =
                  Boolean(row.grade) &&
                  status.toLowerCase() !==
                    'draft';

                const saving =
                  savingIds.includes(
                    enrollmentId
                  );

                const message =
                  rowMessages[enrollmentId];

                return (
                  <tr key={enrollmentId}>
                    <td>
                      {row.student?.student_no ||
                        '—'}
                    </td>

                    <td>
                      {studentName(
                        row.student
                      )}
                    </td>

                    <td>
                      <select
                        className="faculty-grade-select"
                        aria-label={`Grade for ${studentName(row.student)}`}
                        value={selectedGrade}
                        disabled={
                          locked ||
                          saving ||
                          loadingGradeSheet ||
                          submittingGrades
                        }
                        onChange={event =>
                          updateGrade(
                            enrollmentId,
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          Select
                        </option>

                        {GRADE_OPTIONS.map(
                          grade => (
                            <option
                              key={grade}
                              value={grade}
                            >
                              {grade}
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    <td>
                      {details.equivalent}
                    </td>

                    <td>
                      <span
                        className={`faculty-remark faculty-remark-${details.remarks
                          .toLowerCase()
                          .replace(/\s+/g, '-')}`}
                      >
                        {details.remarks}
                      </span>
                    </td>

                    <td>
                      <span className="faculty-status-text">
                        {status}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="faculty-primary-button faculty-save-button"
                        disabled={
                          locked ||
                          saving ||
                          loadingGradeSheet ||
                          submittingGrades ||
                          !selectedGrade ||
                          selectedGrade ===
                            row.grade?.grade
                        }
                        onClick={() =>
                          saveGrade(row)
                        }
                      >
                        {saving ? (
                          <LoaderCircle
                            size={15}
                            className="faculty-refresh-spin"
                          />
                        ) : (
                          <Save size={15} />
                        )}

                        {saving
                          ? 'Saving...'
                          : locked
                            ? 'Locked'
                            : 'Save Draft'}
                      </button>

                      {message && (
                        <div
                          className={`faculty-row-message faculty-message-${message.type}`}
                          role={
                            message.type ===
                            'error'
                              ? 'alert'
                              : 'status'
                          }
                        >
                          {message.text}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!gradeSheet.length && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={GraduationCap}
                      loading={loadingGradeSheet}
                      title={
                        loadingGradeSheet
                          ? 'Loading grade sheet'
                          : 'No grade records to display'
                      }
                      description={
                        gradeOfferingId
                          ? 'No eligible student records were found for this subject.'
                          : 'Select an assigned subject to begin grade encoding.'
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {gradeOfferingId &&
          !loadingGradeSheet &&
          gradeSheet.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginTop: '20px',
                marginBottom: '18px'
              }}
            >
              <span
                style={{
                  color: '#64748b',
                  fontSize: '13px'
                }}
              >
                {totalSubmitted ===
                gradeSheet.length
                  ? 'All grades submitted'
                  : `${totalRecorded} of ${gradeSheet.length} grades recorded`}
              </span>

              <button
                type="button"
                className="faculty-primary-button"
                onClick={openSubmitModal}
                disabled={
                  submittingGrades ||
                  loadingGradeSheet ||
                  savingIds.length > 0 ||
                  totalSubmitted ===
                    gradeSheet.length
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '9px',
                  padding: '11px 18px'
                }}
              >
                <Send size={17} />

                {totalSubmitted ===
                gradeSheet.length
                  ? 'Submitted'
                  : 'Submit Grades'}
              </button>
            </div>
          )}

        <div className="faculty-inline-note">
          <Info size={18} />

          <p>
            PBCC marks: 1.0–3.0 (Passed),
            5.0 (Failed), INC (Incomplete),
            and DROPPED (officially withdrawn).
            Save every grade as a draft before
            submitting. Submitted grades are
            locked and are not yet visible
            to students.
          </p>
        </div>
      </section>
    );
  }

  // PROFILE
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
            Pangantucan Bukidnon
            Community College
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
              label="Employee Number"
              value={
                facultyProfile?.employee_no
              }
            />

            <InformationRow
              label="Department"
              value={
                facultyProfile?.department
              }
            />

            <InformationRow
              label="Faculty Status"
              value={
                facultyProfile?.status
              }
            />
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
    <div className={`faculty-layout ${sidebarCollapsed ? 'faculty-layout-collapsed' : ''}`}>
      {sidebarOpen && (
        <button
          type="button"
          className="faculty-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      <aside
        id="faculty-sidebar"
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
          {navigation.map(item => {
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

                {activeSection ===
                  item.id && (
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
              <strong>
                {displayName}
              </strong>

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
              className="faculty-desktop-sidebar-toggle"
              aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              aria-expanded={!sidebarCollapsed}
              aria-controls="faculty-sidebar"
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              onClick={() => setSidebarCollapsed(previous => !previous)}
            >
              {sidebarCollapsed ? <Menu size={22} /> : <PanelLeftClose size={22} />}
            </button>

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
              <h1>
                {currentPage.label}
              </h1>

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
              <strong>
                {displayName}
              </strong>

              <span>Faculty</span>
            </div>
          </div>
        </header>

        <main className="faculty-content">
          {renderContent()}
        </main>

        <footer className="faculty-footer">
          © {new Date().getFullYear()}{' '}
          Pangantucan Bukidnon
          Community College
        </footer>
      </div>

      {/* SUBMIT GRADES CONFIRMATION */}
      {showSubmitModal && (
        <div className="faculty-modal-overlay">
          <div
            className="faculty-logout-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="faculty-submit-title"
          >
            <div className="faculty-modal-icon">
              <Send size={27} />
            </div>

            <h2 id="faculty-submit-title">
              Submit Grades?
            </h2>

            <p>
              You are about to submit
              {' '}
              <strong>
                {gradeSheet.length}
              </strong>
              {' '}
              grade(s) for
              {' '}
              <strong>
                {selectedGradeClass?.subject
                  ?.subject_code ||
                  'the selected subject'}
              </strong>
              {' — '}
              <strong>
                {selectedGradeClass?.section
                  ?.section_code ||
                  'the selected section'}
              </strong>
              .
            </p>

            <p>
              Once submitted, these grades
              will be locked and cannot
              be edited by faculty.
            </p>

            <p>
              They will remain unavailable
              to students until officially
              validated and released.
            </p>

            <div className="faculty-modal-actions">
              <button
                type="button"
                className="faculty-modal-cancel"
                onClick={() =>
                  setShowSubmitModal(false)
                }
                disabled={submittingGrades}
              >
                Cancel
              </button>

              <button
                type="button"
                className="faculty-modal-confirm"
                onClick={submitGrades}
                disabled={
                  submittingGrades ||
                  !canSubmitGrades
                }
              >
                {submittingGrades
                  ? 'Submitting...'
                  : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION */}
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
              Are you sure you want to
              leave the Faculty Portal?
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

export default FacultyDashboard;
