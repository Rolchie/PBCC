
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  ClipboardList,
  Search,
  X,
  RefreshCw,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Layers,
  Plus,
  Users,
  Info,
  ChevronDown,
  ChevronRight,
  GraduationCap
} from 'lucide-react';

import api from '../Services/api';

const NAVY = '#102a4c';
const GOLD = '#b48727';
const MUTED = '#64748b';
const BORDER = '#dce4ee';
const LIGHT = '#f6f8fc';

const field = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  minHeight: 41,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  background: '#fff',
  color: NAVY,
  fontSize: 13,
  fontFamily: 'inherit'
};

const panel = {
  padding: 20,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  marginBottom: 16,
  background: '#fff'
};

const label = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: NAVY
};

const primaryButton = {
  border: 0,
  borderRadius: 8,
  padding: '11px 18px',
  background: NAVY,
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer'
};

const tableHead = {
  padding: '11px 12px',
  background: '#edf2f8',
  color: NAVY,
  fontSize: 11,
  fontWeight: 800,
  textAlign: 'left',
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: 'nowrap'
};

const tableCell = {
  padding: '11px 12px',
  borderBottom: `1px solid #edf1f5`,
  fontSize: 12,
  verticalAlign: 'middle'
};

const norm = value =>
  String(value ?? '').trim().toLowerCase();

const messageOf = error =>
  error.response?.data?.message ||
  error.message ||
  'Something went wrong.';

const fullName = student =>
  `${student.last_name || ''}, ${student.first_name || ''}`.trim();

const studentNumber = student =>
  student.student_no || `#${student.student_id}`;

function sameSemester(a, b) {
  const normalize = value => {
    const v = norm(value);

    if (['1', '1st', 'first', 'first semester'].includes(v)) {
      return 'first';
    }

    if (['2', '2nd', 'second', 'second semester'].includes(v)) {
      return 'second';
    }

    if (['summer', 'summer term'].includes(v)) {
      return 'summer';
    }

    return v;
  };

  return normalize(a) === normalize(b);
}

function matchesStudent(student, query) {
  const q = norm(query);
  if (!q) return false;

  const first = norm(student.first_name);
  const middle = norm(student.middle_name);
  const last = norm(student.last_name);

  return [
    norm(studentNumber(student)),
    String(student.student_id),
    first,
    middle,
    last,
    `${last}, ${first}`,
    `${first} ${last}`,
    `${first} ${middle} ${last}`
  ].some(value => value.includes(q));
}

function sortStudents(a, b) {
  return (
    String(a.last_name || '').localeCompare(
      String(b.last_name || ''),
      undefined,
      { sensitivity: 'base' }
    ) ||
    String(a.first_name || '').localeCompare(
      String(b.first_name || ''),
      undefined,
      { sensitivity: 'base' }
    ) ||
    String(studentNumber(a)).localeCompare(
      String(studentNumber(b)),
      undefined,
      { numeric: true }
    )
  );
}

function StepTitle({ number, icon: Icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 17 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: '#fff7e6',
            color: GOLD,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Icon size={17} />
        </div>

        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              color: NAVY
            }}
          >
            Step {number} — {title}
          </h3>
        </div>
      </div>

      {subtitle && (
        <p
          style={{
            margin: '9px 0 0',
            color: MUTED,
            fontSize: 12,
            lineHeight: 1.6
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const value = norm(status);

  const colors =
    value === 'enrolled' || value === 'approved'
      ? {
          background: '#eaf7ee',
          color: '#176534'
        }
      : value === 'pending'
        ? {
            background: '#fff5df',
            color: '#966000'
          }
        : {
            background: '#f1f4f8',
            color: MUTED
          };

  return (
    <span
      style={{
        display: 'inline-block',
        borderRadius: 20,
        padding: '5px 10px',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'capitalize',
        ...colors
      }}
    >
      {status || 'Unknown'}
    </span>
  );
}

function CapacityBar({ section }) {
  const capacity = Number(section.capacity || 0);
  const enrolled = Number(section.enrolled_count || 0);
  const remaining = Math.max(0, capacity - enrolled);

  const percentage = capacity
    ? Math.min(100, (enrolled / capacity) * 100)
    : 0;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 9
        }}
      >
        <strong style={{ fontSize: 13 }}>
          {section.section_code}
        </strong>

        <strong style={{ fontSize: 13 }}>
          {enrolled}/{capacity} students
        </strong>
      </div>

      <div
        style={{
          height: 8,
          background: '#e5eaf0',
          borderRadius: 20,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: remaining === 0 ? '#b42318' : GOLD,
            borderRadius: 20
          }}
        />
      </div>

      <p
        style={{
          margin: '8px 0 0',
          fontSize: 11,
          color: remaining === 0 ? '#b42318' : MUTED
        }}
      >
        {remaining === 0
          ? 'Section is full'
          : `${remaining} slot${remaining === 1 ? '' : 's'} remaining`}
      </p>
    </div>
  );
}

function SubjectTable({
  subjects,
  selected,
  onChange,
  disabled,
  retake = false,
  emptyMessage
}) {
  if (!subjects.length) {
    return (
      <div
        style={{
          padding: 22,
          textAlign: 'center',
          background: LIGHT,
          borderRadius: 9,
          color: MUTED,
          fontSize: 12
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 9,
        overflowX: 'auto'
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          minWidth: 590
        }}
      >
        <thead>
          <tr>
            <th style={{ ...tableHead, width: 45, textAlign: 'center' }}>
              Add
            </th>
            <th style={{ ...tableHead, width: 120 }}>
              Subject Code
            </th>
            <th style={tableHead}>
              Subject Title
            </th>
            <th style={{ ...tableHead, width: 70, textAlign: 'center' }}>
              Units
            </th>
            <th style={{ ...tableHead, width: 115 }}>
              Eligibility
            </th>
          </tr>
        </thead>

        <tbody>
          {subjects.map(subject => {
            const eligible =
              subject.academically_eligible === true && !disabled;

            const checked = Boolean(selected[subject.subject_id]);

            return (
              <tr
                key={subject.subject_id}
                style={{
                  background: checked
                    ? '#f0f6ff'
                    : '#fff',
                  opacity: eligible ? 1 : 0.7
                }}
              >
                <td
                  style={{
                    ...tableCell,
                    textAlign: 'center'
                  }}
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ${subject.subject_code}`}
                    checked={checked}
                    disabled={!eligible}
                    onChange={event =>
                      onChange(
                        subject.subject_id,
                        event.target.checked
                      )
                    }
                    style={{
                      width: 16,
                      height: 16,
                      accentColor: NAVY,
                      cursor: eligible ? 'pointer' : 'not-allowed'
                    }}
                  />
                </td>

                <td
                  style={{
                    ...tableCell,
                    fontWeight: 700,
                    color: NAVY
                  }}
                >
                  {subject.subject_code}
                </td>

                <td style={tableCell}>
                  <div style={{ color: NAVY, fontWeight: 600 }}>
                    {subject.subject_title}
                  </div>

                  {retake && (
                    <div
                      style={{
                        color: MUTED,
                        fontSize: 11,
                        marginTop: 4
                      }}
                    >
                      Retake · Year {subject.curriculum_year_level}
                      {' · '}
                      {subject.curriculum_semester}
                    </div>
                  )}

                  {!subject.academically_eligible && subject.reason && (
                    <div
                      style={{
                        color: '#955d0a',
                        fontSize: 11,
                        marginTop: 4
                      }}
                    >
                      {subject.reason}
                    </div>
                  )}
                </td>

                <td
                  style={{
                    ...tableCell,
                    textAlign: 'center',
                    fontWeight: 700
                  }}
                >
                  {subject.units}
                </td>

                <td style={tableCell}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      background: subject.academically_eligible
                        ? '#eaf7ee'
                        : '#fff5df',
                      color: subject.academically_eligible
                        ? '#176534'
                        : '#966000'
                    }}
                  >
                    {subject.academically_eligible
                      ? 'Eligible'
                      : 'Not eligible'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SubjectLoads() {
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);

  const [programId, setProgramId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);

  const [load, setLoad] = useState(null);
  const [selected, setSelected] = useState({});

  const [loading, setLoading] = useState(true);
  const [loadingLoad, setLoadingLoad] = useState(false);
  const [saving, setSaving] = useState(false);

  const [yearLevel, setYearLevel] = useState('1');
  const [sectionLetter, setSectionLetter] = useState('A');
  const [capacity, setCapacity] = useState('40');
  const [creatingSection, setCreatingSection] = useState(false);

  const [showRetakes, setShowRetakes] = useState(false);
  const [showSectionManagement, setShowSectionManagement] =
    useState(false);
  const [showPrepared, setShowPrepared] = useState(true);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const searchRef = useRef(null);
  const requestRef = useRef(0);

  const loadOptions = useCallback(async () => {
    setLoading(true);

    try {
      const [p, a, s] = await Promise.all([
        api.get('/api/program-office/programs'),
        api.get('/api/program-office/academic-periods'),
        api.get('/api/program-office/students')
      ]);

      const nextPrograms = p.data?.programs || [];
      const nextPeriods = a.data?.periods || [];

      setPrograms(nextPrograms);
      setPeriods(nextPeriods);
      setStudents(s.data?.students || []);

      setProgramId(previous =>
        nextPrograms.some(
          item => String(item.program_id) === previous
        )
          ? previous
          : String(nextPrograms[0]?.program_id || '')
      );

      setPeriodId(previous =>
        nextPeriods.some(
          item => String(item.period_id) === previous
        )
          ? previous
          : String(
              nextPeriods.find(
                item => norm(item.status) === 'active'
              )?.period_id ||
              nextPeriods[0]?.period_id ||
              ''
            )
      );
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSections = useCallback(async () => {
    if (!periodId) {
      setSections([]);
      return;
    }

    try {
      const response = await api.get(
        '/api/program-office/sections',
        {
          params: {
            period_id: periodId
          }
        }
      );

      setSections(response.data?.sections || []);
    } catch (err) {
      setError(messageOf(err));
    }
  }, [periodId]);

  const refreshStudentLoad = useCallback(async () => {
    const request = ++requestRef.current;

    if (!studentId || !periodId) {
      setLoad(null);
      setLoadingLoad(false);
      return;
    }

    setLoadingLoad(true);

    try {
      const response = await api.get(
        '/api/program-office/student-loads',
        {
          params: {
            student_id: studentId,
            period_id: periodId
          }
        }
      );

      if (request === requestRef.current) {
        setLoad(response.data);
      }
    } catch (err) {
      if (request === requestRef.current) {
        setLoad(null);
        setError(messageOf(err));
      }
    } finally {
      if (request === requestRef.current) {
        setLoadingLoad(false);
      }
    }
  }, [studentId, periodId]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  useEffect(() => {
    setSelected({});
    setSectionId('');
    setLoad(null);
    refreshStudentLoad();

    return () => {
      requestRef.current += 1;
    };
  }, [refreshStudentLoad]);

  useEffect(() => {
    const handler = event => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handler);

    return () =>
      document.removeEventListener('mousedown', handler);
  }, []);

  const currentPeriod = periods.find(
    item => String(item.period_id) === periodId
  );

  const currentProgram = programs.find(
    item => String(item.program_id) === programId
  );

  const periodActive =
    norm(currentPeriod?.status) === 'active';

  const programStudents = useMemo(
    () =>
      students
        .filter(
          item => String(item.program_id) === programId
        )
        .sort(sortStudents),
    [students, programId]
  );

  const matchingStudents = useMemo(() => {
    if (!search.trim() || studentId) return [];

    return programStudents.filter(item =>
      matchesStudent(item, search)
    );
  }, [programStudents, search, studentId]);

  const student = programStudents.find(
    item => String(item.student_id) === studentId
  );

  const studentYear = Number(
    load?.student?.year_level ||
    student?.year_level ||
    0
  );

  const allSubjects = load?.subjects || [];

  const semesterSubjects = allSubjects.filter(
    item =>
      Number(item.curriculum_year_level) === studentYear &&
      sameSemester(
        item.curriculum_semester,
        currentPeriod?.semester
      )
  );

  const regularSubjects = semesterSubjects.filter(
    item =>
      !item.already_passed &&
      !item.already_enrolled &&
      !item.unmet_prerequisites?.length
  );

  const blockedSubjects = semesterSubjects.filter(
    item =>
      item.unmet_prerequisites?.length > 0 &&
      !item.already_passed &&
      !item.already_enrolled
  );

  const retakeSubjects = allSubjects.filter(
    item =>
      item.previously_failed &&
      item.academically_eligible &&
      !semesterSubjects.some(
        other =>
          Number(other.subject_id) ===
          Number(item.subject_id)
      )
  );

  const selectable = [
    ...regularSubjects,
    ...retakeSubjects
  ];

  const selectedSubjects = selectable.filter(
    item =>
      selected[item.subject_id] &&
      item.academically_eligible &&
      periodActive
  );

  const selectedUnits = selectedSubjects.reduce(
    (total, item) =>
      total + Number(item.units || 0),
    0
  );

  const visibleSections = sections.filter(
    item => String(item.program_id) === programId
  );

  const studentSections = (load?.sections || []).filter(
    item => Number(item.year_level) === studentYear
  );

  const existingSectionId = load?.existing_section_id
    ? String(load.existing_section_id)
    : '';

  const effectiveSectionId =
    existingSectionId || sectionId;

  const chosenSection = studentSections.find(
    item =>
      String(item.section_id) === effectiveSectionId
  );

  const sectionFull =
    chosenSection &&
    Number(chosenSection.enrolled_count) >=
      Number(chosenSection.capacity);

  const alreadyMember = Boolean(existingSectionId);

  const canPrepare =
    Boolean(student) &&
    Boolean(effectiveSectionId) &&
    !load?.conflicting_sections &&
    periodActive &&
    !saving &&
    !loadingLoad &&
    selectedSubjects.length > 0 &&
    (!sectionFull || alreadyMember);

  const proposedCode =
    `${String(
      currentProgram?.program_code || ''
    ).toUpperCase()} ${yearLevel}-${sectionLetter}`;

  const duplicateSection = visibleSections.some(
    item => item.section_code === proposedCode
  );

  const regularEligible = regularSubjects.filter(
    item => item.academically_eligible
  );

  const allRegularSelected =
    regularEligible.length > 0 &&
    regularEligible.every(
      item => selected[item.subject_id]
    );

  const preparedSubjects = load?.prepared || [];

  function clearStudent() {
    requestRef.current += 1;
    setStudentId('');
    setSectionId('');
    setSearch('');
    setShowResults(false);
    setLoad(null);
    setSelected({});
    setLoadingLoad(false);
    setError('');
    setSuccess('');
  }

  function chooseStudent(item) {
    requestRef.current += 1;

    setStudentId(String(item.student_id));
    setSectionId('');
    setSearch(
      `${studentNumber(item)} — ${fullName(item)}`
    );
    setShowResults(false);
    setLoad(null);
    setSelected({});
    setError('');
    setSuccess('');
  }

  function toggleSubject(subjectId, checked) {
    setSelected(previous => ({
      ...previous,
      [subjectId]: checked
    }));
  }

  function toggleAll(checked) {
    const next = {};

    regularSubjects.forEach(item => {
      if (
        item.academically_eligible &&
        periodActive
      ) {
        next[item.subject_id] = checked;
      }
    });

    setSelected(previous => ({
      ...previous,
      ...next
    }));
  }

  async function prepareEnrollment() {
    if (!canPrepare) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(
        '/api/program-office/student-loads',
        {
          student_id: Number(studentId),
          period_id: Number(periodId),
          section_id: Number(effectiveSectionId),
          subject_ids: selectedSubjects.map(
            item => Number(item.subject_id)
          )
        }
      );

      setSelected({});
      await refreshStudentLoad();

      setSuccess(
        response.data?.message ||
        'Student load prepared for Registrar confirmation.'
      );
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  async function createSection(event) {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (duplicateSection) {
      setError(`${proposedCode} already exists.`);
      return;
    }

    setCreatingSection(true);

    try {
      const response = await api.post(
        '/api/program-office/sections',
        {
          program_id: Number(programId),
          period_id: Number(periodId),
          year_level: Number(yearLevel),
          section_letter: sectionLetter,
          capacity: Number(capacity)
        }
      );

      setSuccess(
        response.data?.message ||
        'Section created successfully.'
      );

      await loadSections();
      await refreshStudentLoad();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setCreatingSection(false);
    }
  }

  async function refreshAll() {
    setError('');
    setSuccess('');

    await Promise.all([
      loadOptions(),
      loadSections(),
      refreshStudentLoad()
    ]);
  }

  return (
    <section
      className="program-panel"
      style={{
        padding: '22px 24px',
        minWidth: 0,
        color: NAVY
      }}
    >
      {/* PAGE HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 19
        }}
      >
        <div>
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              margin: 0,
              fontSize: 20
            }}
          >
            <ClipboardList size={23} color={GOLD} />
            Student Subject Loads
          </h2>

          <p
            style={{
              color: MUTED,
              fontSize: 12,
              margin: '7px 0 0'
            }}
          >
            Manage student subject loads and section assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshAll}
          disabled={loading || loadingLoad || saving}
          style={{
            ...field,
            width: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* NOTIFICATIONS */}
      {error && (
        <div
          role="alert"
          style={{
            padding: 13,
            marginBottom: 14,
            borderRadius: 9,
            background: '#fff1f0',
            color: '#a52727',
            fontSize: 12
          }}
        >
          <AlertCircle
            size={16}
            style={{ verticalAlign: 'middle' }}
          />
          {' '}
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            padding: 13,
            marginBottom: 14,
            borderRadius: 9,
            background: '#eef8f0',
            color: '#176534',
            fontSize: 12
          }}
        >
          <CheckCircle2
            size={16}
            style={{ verticalAlign: 'middle' }}
          />
          {' '}
          {success}
        </div>
      )}

      {/* STEP 1 */}
      <div style={panel}>
        <StepTitle
          number="1"
          icon={Users}
          title="Student Information"
          subtitle="Find the student and select the academic period."
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 13
          }}
        >
          <label style={label}>
            Assigned Program
            <select
              style={{ ...field, marginTop: 7 }}
              value={programId}
              onChange={event => {
                clearStudent();
                setProgramId(event.target.value);
              }}
            >
              {programs.map(item => (
                <option
                  key={item.program_id}
                  value={item.program_id}
                >
                  {item.program_code} — {item.program_name}
                </option>
              ))}
            </select>
          </label>

          <label style={label}>
            Academic Period
            <select
              style={{ ...field, marginTop: 7 }}
              value={periodId}
              onChange={event => {
                requestRef.current += 1;
                setPeriodId(event.target.value);
                setSectionId('');
                setSelected({});
                setLoad(null);
                setError('');
                setSuccess('');
              }}
            >
              {periods.map(item => (
                <option
                  key={item.period_id}
                  value={item.period_id}
                >
                  {item.school_year} — {item.semester}
                </option>
              ))}
            </select>
          </label>

          <div
            ref={searchRef}
            style={{
              position: 'relative',
              minWidth: 0
            }}
          >
            <label
              style={label}
              htmlFor="student-search"
            >
              Search Student
            </label>

            <div
              style={{
                position: 'relative',
                marginTop: 7
              }}
            >
              <Search
                size={16}
                color={MUTED}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 12,
                  pointerEvents: 'none'
                }}
              />

              <input
                id="student-search"
                type="text"
                autoComplete="off"
                placeholder="Student ID or last name..."
                value={search}
                onChange={event => {
                  requestRef.current += 1;
                  setSearch(event.target.value);
                  setStudentId('');
                  setSectionId('');
                  setLoad(null);
                  setSelected({});
                  setLoadingLoad(false);
                  setShowResults(
                    Boolean(event.target.value.trim())
                  );
                }}
                onFocus={() => {
                  if (search.trim() && !studentId) {
                    setShowResults(true);
                  }
                }}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    setShowResults(false);
                  }

                  if (
                    event.key === 'Enter' &&
                    showResults &&
                    matchingStudents.length
                  ) {
                    event.preventDefault();
                    chooseStudent(matchingStudents[0]);
                  }
                }}
                style={{
                  ...field,
                  paddingLeft: 37,
                  paddingRight: 37
                }}
              />

              {search && (
                <button
                  type="button"
                  onClick={clearStudent}
                  aria-label="Clear student"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: 7,
                    padding: 5,
                    border: 0,
                    background: 'transparent',
                    color: MUTED,
                    cursor: 'pointer'
                  }}
                >
                  <X size={17} />
                </button>
              )}
            </div>

            {showResults &&
              search.trim() &&
              !studentId && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 5,
                    maxHeight: 250,
                    overflowY: 'auto',
                    background: '#fff',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 9,
                    boxShadow:
                      '0 10px 28px rgba(16,42,76,.15)',
                    zIndex: 30
                  }}
                >
                  {!matchingStudents.length ? (
                    <p
                      style={{
                        padding: 12,
                        fontSize: 12,
                        color: MUTED
                      }}
                    >
                      No matching students found.
                    </p>
                  ) : (
                    matchingStudents.map(item => (
                      <button
                        type="button"
                        key={item.student_id}
                        onClick={() => chooseStudent(item)}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '11px 13px',
                          textAlign: 'left',
                          border: 0,
                          borderBottom:
                            `1px solid ${BORDER}`,
                          background: '#fff',
                          color: NAVY,
                          cursor: 'pointer'
                        }}
                      >
                        <strong style={{ fontSize: 12 }}>
                          {fullName(item)}
                        </strong>

                        <div
                          style={{
                            fontSize: 11,
                            color: MUTED,
                            marginTop: 4
                          }}
                        >
                          {studentNumber(item)}
                          {' · '}
                          Year {item.year_level || 'Not set'}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
          </div>
        </div>

        {student && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 15,
              marginTop: 16,
              padding: '13px 15px',
              background: LIGHT,
              border: `1px solid ${BORDER}`,
              borderRadius: 9
            }}
          >
            {[
              ['Student', fullName(student)],
              ['Student No.', studentNumber(student)],
              ['Year Level', `Year ${studentYear || '—'}`],
              [
                'Curriculum',
                load?.curriculum?.description || 'Loading...'
              ],
              [
                'Semester',
                currentPeriod?.semester || 'Not selected'
              ]
            ].map(([heading, value]) => (
              <div key={heading}>
                <div
                  style={{
                    fontSize: 10,
                    color: MUTED,
                    marginBottom: 5
                  }}
                >
                  {heading}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: NAVY
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STEP 2 */}
      <div style={panel}>
        <StepTitle
          number="2"
          icon={BookOpen}
          title="Add Student Load"
          subtitle="Select eligible subjects from the student's curriculum. Missing class offerings are created automatically during enrollment preparation."
        />

        {!student && (
          <div
            style={{
              padding: 20,
              background: LIGHT,
              borderRadius: 9,
              textAlign: 'center',
              fontSize: 12,
              color: MUTED
            }}
          >
            Search and select a student to view subjects.
          </div>
        )}

        {student && loadingLoad && (
          <div
            style={{
              padding: 20,
              textAlign: 'center',
              color: MUTED,
              fontSize: 12
            }}
          >
            Checking curriculum and academic records...
          </div>
        )}

        {student && !loadingLoad && load && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 13
              }}
            >
              <div>
                <strong style={{ fontSize: 13 }}>
                  Year {studentYear} — {currentPeriod?.semester}
                </strong>

                <p
                  style={{
                    margin: '5px 0 0',
                    fontSize: 11,
                    color: MUTED
                  }}
                >
                  {regularEligible.length} eligible subject(s)
                  {' · '}
                  {selectedSubjects.length} selected
                </p>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={allRegularSelected}
                  onChange={event =>
                    toggleAll(event.target.checked)
                  }
                  disabled={
                    !periodActive ||
                    saving ||
                    regularEligible.length === 0
                  }
                  style={{ accentColor: NAVY }}
                />
                Select All Available
              </label>
            </div>

            <SubjectTable
              subjects={regularSubjects}
              selected={selected}
              onChange={toggleSubject}
              disabled={!periodActive || saving}
              emptyMessage="No uncompleted regular subjects for this semester."
            />

            {blockedSubjects.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 12,
                  padding: '10px 12px',
                  background: '#fff8eb',
                  color: '#865b14',
                  borderRadius: 8,
                  fontSize: 11
                }}
              >
                <ShieldCheck
                  size={15}
                  style={{ flexShrink: 0 }}
                />
                {blockedSubjects.length} subject(s) excluded
                because prerequisites are not satisfied.
              </div>
            )}

            {!periodActive && (
              <p
                style={{
                  color: '#a52727',
                  fontSize: 12
                }}
              >
                This academic period is inactive.
              </p>
            )}

            {/* COLLAPSIBLE RETAKES */}
            <div
              style={{
                marginTop: 16,
                borderTop: `1px solid ${BORDER}`,
                paddingTop: 13
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowRetakes(previous => !previous)
                }
                aria-expanded={showRetakes}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  width: '100%',
                  padding: 0,
                  border: 0,
                  background: 'transparent',
                  color: NAVY,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 12
                }}
              >
                {showRetakes
                  ? <ChevronDown size={16} />
                  : <ChevronRight size={16} />}

                <RefreshCw size={15} color={GOLD} />

                Retake / Irregular Subjects

                <span
                  style={{
                    marginLeft: 3,
                    background: '#edf2f8',
                    borderRadius: 20,
                    padding: '3px 9px',
                    color: MUTED,
                    fontSize: 10
                  }}
                >
                  {retakeSubjects.length}
                </span>
              </button>

              {showRetakes && (
                <div style={{ marginTop: 13 }}>
                  <p
                    style={{
                      color: MUTED,
                      fontSize: 11,
                      margin: '0 0 12px'
                    }}
                  >
                    Previously failed subjects can be selected
                    when their prerequisites are satisfied.
                  </p>

                  <SubjectTable
                    subjects={retakeSubjects}
                    selected={selected}
                    onChange={toggleSubject}
                    disabled={!periodActive || saving}
                    retake
                    emptyMessage="No eligible retake subjects found."
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* STEP 3 */}
      <div style={panel}>
        <StepTitle
          number="3"
          icon={Layers}
          title="Assign Section"
          subtitle="Choose one home section for the student. Capacity counts students, not individual subjects."
        />

        {!student ? (
          <p style={{ color: MUTED, fontSize: 12 }}>
            Search for a student first.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 18,
              alignItems: 'start'
            }}
          >
            <div>
              <label style={label}>
                Student Section
                <select
                  style={{ ...field, marginTop: 7 }}
                  value={effectiveSectionId}
                  disabled={
                    loadingLoad ||
                    saving ||
                    Boolean(existingSectionId)
                  }
                  onChange={event => {
                    setSectionId(event.target.value);
                    setError('');
                    setSuccess('');
                  }}
                >
                  <option value="">
                    Select a section...
                  </option>

                  {studentSections.map(item => {
                    const full =
                      Number(item.enrolled_count) >=
                      Number(item.capacity);

                    return (
                      <option
                        key={item.section_id}
                        value={item.section_id}
                        disabled={
                          full &&
                          String(item.section_id) !==
                            existingSectionId
                        }
                      >
                        {item.section_code}
                        {' — '}
                        {item.enrolled_count}/{item.capacity}
                        {' students'}
                        {full ? ' (Full)' : ''}
                      </option>
                    );
                  })}
                </select>
              </label>

              {existingSectionId && (
                <p
                  style={{
                    color: '#176534',
                    fontSize: 11,
                    marginTop: 10
                  }}
                >
                  The student's existing section is locked
                  to prevent mixed-section enrollments.
                </p>
              )}

              {load?.conflicting_sections && (
                <p
                  style={{
                    color: '#a52727',
                    fontSize: 11
                  }}
                >
                  Existing loads use multiple sections.
                  Registrar review is required.
                </p>
              )}

              {!studentSections.length &&
                !loadingLoad && (
                  <p
                    style={{
                      color: '#955d0a',
                      fontSize: 11
                    }}
                  >
                    No active section exists for this year.
                    Use Section Management below.
                  </p>
                )}
            </div>

            <div
              style={{
                padding: 15,
                background: LIGHT,
                border: `1px solid ${BORDER}`,
                borderRadius: 9,
                minHeight: 75
              }}
            >
              {chosenSection ? (
                <CapacityBar section={chosenSection} />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: MUTED,
                    fontSize: 12,
                    minHeight: 55
                  }}
                >
                  <Users size={19} />
                  Select a section to view its capacity.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* STEP 4 */}
      <div style={panel}>
        <StepTitle
          number="4"
          icon={CheckCircle2}
          title="Review and Prepare Enrollment"
          subtitle="Review the selected subjects and section before submitting them for Registrar confirmation."
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 15,
            padding: '15px 17px',
            background: LIGHT,
            border: `1px solid ${BORDER}`,
            borderRadius: 9
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 25
            }}
          >
            <div>
              <div
                style={{
                  color: MUTED,
                  fontSize: 10,
                  marginBottom: 5
                }}
              >
                Selected Subjects
              </div>

              <strong style={{ fontSize: 17 }}>
                {selectedSubjects.length}
              </strong>
            </div>

            <div>
              <div
                style={{
                  color: MUTED,
                  fontSize: 10,
                  marginBottom: 5
                }}
              >
                Total Units
              </div>

              <strong style={{ fontSize: 17 }}>
                {selectedUnits}
              </strong>
            </div>

            <div>
              <div
                style={{
                  color: MUTED,
                  fontSize: 10,
                  marginBottom: 5
                }}
              >
                Section
              </div>

              <strong style={{ fontSize: 13 }}>
                {chosenSection?.section_code || 'Not assigned'}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={prepareEnrollment}
            disabled={!canPrepare}
            style={{
              ...primaryButton,
              opacity: canPrepare ? 1 : 0.5
            }}
          >
            {saving
              ? 'Preparing Enrollment...'
              : 'Prepare Selected Subjects'}
          </button>
        </div>

        {selectedSubjects.length > 0 && (
          <div
            style={{
              marginTop: 14,
              padding: '12px 14px',
              border: `1px solid ${BORDER}`,
              borderRadius: 9
            }}
          >
            <strong
              style={{
                fontSize: 12,
                display: 'block',
                marginBottom: 9
              }}
            >
              Selected Subject Summary
            </strong>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 7
              }}
            >
              {selectedSubjects.map(item => (
                <span
                  key={item.subject_id}
                  title={item.subject_title}
                  style={{
                    padding: '6px 9px',
                    background: '#edf2f8',
                    color: NAVY,
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700
                  }}
                >
                  {item.subject_code}
                </span>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginTop: 12,
            color: MUTED,
            fontSize: 11
          }}
        >
          <Info size={15} style={{ flexShrink: 0 }} />
          Prepared subjects are saved as pending.
          Registrar confirmation is still required.
        </div>
      </div>

      {/* PREPARED LOADS */}
      <div style={panel}>
        <button
          type="button"
          onClick={() =>
            setShowPrepared(previous => !previous)
          }
          aria-expanded={showPrepared}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            width: '100%',
            padding: 0,
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            color: NAVY
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              fontSize: 14,
              fontWeight: 700
            }}
          >
            <GraduationCap size={19} color={GOLD} />
            Prepared Subject Load

            <span
              style={{
                padding: '4px 9px',
                borderRadius: 20,
                background: '#edf2f8',
                color: MUTED,
                fontSize: 10
              }}
            >
              {preparedSubjects.length}
            </span>
          </span>

          {showPrepared
            ? <ChevronDown size={17} />
            : <ChevronRight size={17} />}
        </button>

        {showPrepared && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                overflowX: 'auto',
                border: `1px solid ${BORDER}`,
                borderRadius: 9
              }}
            >
              <table
                style={{
                  width: '100%',
                  minWidth: 570,
                  borderCollapse: 'collapse',
                  textAlign: 'left'
                }}
              >
                <thead>
                  <tr>
                    {[
                      'Subject Code',
                      'Subject Title',
                      'Section',
                      'Status'
                    ].map(heading => (
                      <th
                        key={heading}
                        style={tableHead}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {preparedSubjects.map(item => (
                    <tr key={item.enrollment_id}>
                      <td
                        style={{
                          ...tableCell,
                          fontWeight: 700,
                          color: NAVY
                        }}
                      >
                        {item.subject_code}
                      </td>

                      <td style={tableCell}>
                        {item.subject_title}
                      </td>

                      <td style={tableCell}>
                        {item.section_code || '—'}
                      </td>

                      <td style={tableCell}>
                        <StatusPill status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!preparedSubjects.length && (
              <p
                style={{
                  textAlign: 'center',
                  padding: 12,
                  color: MUTED,
                  fontSize: 12
                }}
              >
                No prepared subjects for this period.
              </p>
            )}
          </div>
        )}
      </div>

      {/* COLLAPSIBLE SECTION MANAGEMENT */}
      <div style={panel}>
        <button
          type="button"
          onClick={() =>
            setShowSectionManagement(previous => !previous)
          }
          aria-expanded={showSectionManagement}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            padding: 0,
            border: 0,
            background: 'transparent',
            color: NAVY,
            cursor: 'pointer'
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              fontSize: 14,
              fontWeight: 700
            }}
          >
            <Layers size={19} color={GOLD} />
            Section Management
          </span>

          {showSectionManagement
            ? <ChevronDown size={17} />
            : <ChevronRight size={17} />}
        </button>

        {!showSectionManagement && (
          <p
            style={{
              color: MUTED,
              fontSize: 11,
              margin: '9px 0 0'
            }}
          >
            Expand to create sections or view existing sections.
          </p>
        )}

        {showSectionManagement && (
          <div style={{ marginTop: 18 }}>
            <p
              style={{
                fontSize: 12,
                color: MUTED,
                marginTop: 0
              }}
            >
              Create class sections for the selected program
              and academic period. Creating a section does
              not enroll students.
            </p>

            <form onSubmit={createSection}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(145px, 1fr))',
                  gap: 13,
                  marginTop: 15
                }}
              >
                <label style={label}>
                  Year Level
                  <select
                    style={{ ...field, marginTop: 7 }}
                    value={yearLevel}
                    onChange={event =>
                      setYearLevel(event.target.value)
                    }
                  >
                    {[1, 2, 3, 4].map(year => (
                      <option key={year} value={year}>
                        Year {year}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={label}>
                  Section Letter
                  <select
                    style={{ ...field, marginTop: 7 }}
                    value={sectionLetter}
                    onChange={event =>
                      setSectionLetter(event.target.value)
                    }
                  >
                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                      .split('')
                      .map(letter => (
                        <option
                          key={letter}
                          value={letter}
                        >
                          Section {letter}
                        </option>
                      ))}
                  </select>
                </label>

                <label style={label}>
                  Capacity
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    style={{ ...field, marginTop: 7 }}
                    value={capacity}
                    onChange={event =>
                      setCapacity(event.target.value)
                    }
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginTop: 16
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: MUTED
                  }}
                >
                  Section Code:{' '}
                  <strong style={{ color: NAVY }}>
                    {proposedCode}
                  </strong>
                  {duplicateSection && (
                    <span style={{ color: '#a52727' }}>
                      {' '}— Already exists
                    </span>
                  )}
                </span>

                <button
                  type="submit"
                  disabled={
                    !programId ||
                    !periodId ||
                    !periodActive ||
                    duplicateSection ||
                    creatingSection
                  }
                  style={{
                    ...primaryButton,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    opacity:
                      !periodActive ||
                      duplicateSection ||
                      creatingSection
                        ? 0.5
                        : 1
                  }}
                >
                  <Plus size={15} />
                  {creatingSection
                    ? 'Creating...'
                    : 'Create Section'}
                </button>
              </div>
            </form>

            <div
              style={{
                borderTop: `1px solid ${BORDER}`,
                marginTop: 20,
                paddingTop: 17
              }}
            >
              <h4
                style={{
                  margin: '0 0 12px',
                  fontSize: 13
                }}
              >
                Existing Sections
              </h4>

              <div
                style={{
                  overflowX: 'auto',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 9
                }}
              >
                <table
                  style={{
                    width: '100%',
                    minWidth: 600,
                    borderCollapse: 'collapse',
                    textAlign: 'left'
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        'Section',
                        'Year Level',
                        'Students / Capacity',
                        'Remaining',
                        'Status'
                      ].map(heading => (
                        <th
                          key={heading}
                          style={tableHead}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {visibleSections.map(item => {
                      const counted =
                        (load?.sections || []).find(
                          entry =>
                            Number(entry.section_id) ===
                            Number(item.section_id)
                        );

                      return (
                        <tr key={item.section_id}>
                          <td
                            style={{
                              ...tableCell,
                              fontWeight: 700
                            }}
                          >
                            {item.section_code}
                          </td>

                          <td style={tableCell}>
                            Year {item.year_level}
                          </td>

                          <td style={tableCell}>
                            {counted
                              ? `${counted.enrolled_count}/${item.capacity}`
                              : `— / ${item.capacity}`}
                          </td>

                          <td style={tableCell}>
                            {counted
                              ? counted.remaining_slots
                              : '—'}
                          </td>

                          <td style={tableCell}>
                            <StatusPill
                              status={item.status}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!visibleSections.length && (
                <p
                  style={{
                    textAlign: 'center',
                    padding: 13,
                    fontSize: 12,
                    color: MUTED
                  }}
                >
                  No sections for this academic period.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
