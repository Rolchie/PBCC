
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Search,
  RefreshCw,
  AlertCircle,
  Info,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Sun,
  Layers,
} from 'lucide-react';

import api from '../Services/api';

const NAVY = '#102a4c';
const GOLD = '#b48727';
const BORDER = '#dce4ee';
const MUTED = '#64748b';

const TERM_ORDER = [
  'First Semester',
  'Second Semester',
  'Summer',
];

const YEAR_LABELS = {
  1: 'First Year',
  2: 'Second Year',
  3: 'Third Year',
  4: 'Fourth Year',
};

const fieldStyle = {
  padding: '11px 12px',
  border: `1px solid ${BORDER}`,
  borderRadius: 9,
  background: '#fff',
  color: NAVY,
  font: 'inherit',
  fontSize: 13,
  minHeight: 43,
  width: '100%',
  boxSizing: 'border-box',
};

function getTermOrder(term) {
  const index = TERM_ORDER.findIndex(
    (item) =>
      item.toLowerCase() ===
      String(term || '').trim().toLowerCase()
  );

  return index === -1 ? 99 : index;
}

function formatUnits(units) {
  const number = Number(units || 0);
  return Number.isInteger(number)
    ? String(number)
    : number.toFixed(1);
}

function SubjectOfferings() {
  const [programs, setPrograms] = useState([]);
  const [curricula, setCurricula] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedCurriculum, setSelectedCurriculum] = useState('');

  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [termFilter, setTermFilter] = useState('all');

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [error, setError] = useState('');

  const [expandedSections, setExpandedSections] = useState({});

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    setError('');

    try {
      const [programResponse, curriculumResponse] =
        await Promise.all([
          api.get('/api/program-office/programs'),
          api.get('/api/program-office/curricula'),
        ]);

      const availablePrograms =
        programResponse.data?.programs || [];

      const availableCurricula =
        curriculumResponse.data?.curricula || [];

      setPrograms(availablePrograms);
      setCurricula(availableCurricula);

      setSelectedProgram((previous) => {
        const exists = availablePrograms.some(
          (program) =>
            String(program.program_id) === previous
        );

        return exists
          ? previous
          : String(availablePrograms[0]?.program_id || '');
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load assigned programs.'
      );
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const availableCurricula = useMemo(() => {
    return curricula.filter(
      (curriculum) =>
        String(curriculum.program_id) === selectedProgram
    );
  }, [curricula, selectedProgram]);

  useEffect(() => {
    setSelectedCurriculum((previous) => {
      const exists = availableCurricula.some(
        (curriculum) =>
          String(curriculum.curriculum_id) === previous
      );

      return exists
        ? previous
        : String(availableCurricula[0]?.curriculum_id || '');
    });
  }, [availableCurricula]);

  const loadSubjects = useCallback(async () => {
    if (!selectedCurriculum) {
      setSubjects([]);
      return;
    }

    setLoadingSubjects(true);
    setError('');
    setSubjects([]);

    try {
      const response = await api.get(
        '/api/program-office/curriculum-subjects',
        {
          params: {
            curriculum_id: selectedCurriculum,
          },
        }
      );

      setSubjects(
        Array.isArray(response.data?.subjects)
          ? response.data.subjects
          : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to retrieve curriculum subjects.'
      );
    } finally {
      setLoadingSubjects(false);
    }
  }, [selectedCurriculum]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const selectedCurriculumInfo = availableCurricula.find(
    (curriculum) =>
      String(curriculum.curriculum_id) === selectedCurriculum
  );

  const selectedProgramInfo = programs.find(
    (program) =>
      String(program.program_id) === selectedProgram
  );

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return subjects.filter((subject) => {
      const matchesSearch =
        String(subject.subject_code || '')
          .toLowerCase()
          .includes(query) ||
        String(subject.subject_title || '')
          .toLowerCase()
          .includes(query);

      const matchesYear =
        yearFilter === 'all' ||
        String(subject.year_level) === yearFilter;

      const matchesTerm =
        termFilter === 'all' ||
        String(subject.semester || '')
          .toLowerCase() === termFilter.toLowerCase();

      return matchesSearch && matchesYear && matchesTerm;
    });
  }, [subjects, search, yearFilter, termFilter]);

  const groupedSubjects = useMemo(() => {
    const yearMap = new Map();

    filteredSubjects.forEach((subject) => {
      const year = Number(subject.year_level);
      const term = String(subject.semester || 'Unspecified');

      if (!yearMap.has(year)) {
        yearMap.set(year, new Map());
      }

      const termMap = yearMap.get(year);

      if (!termMap.has(term)) {
        termMap.set(term, []);
      }

      termMap.get(term).push(subject);
    });

    return [...yearMap.entries()]
      .sort(([yearA], [yearB]) => yearA - yearB)
      .map(([year, termMap]) => {
        const terms = [...termMap.entries()]
          .sort(
            ([termA], [termB]) =>
              getTermOrder(termA) - getTermOrder(termB)
          )
          .map(([term, items]) => ({
            term,
            subjects: [...items].sort((a, b) =>
              String(a.subject_code || '').localeCompare(
                String(b.subject_code || '')
              )
            ),
            units: items.reduce(
              (sum, item) =>
                sum + Number(item.units || 0),
              0
            ),
          }));

        return {
          year,
          label: YEAR_LABELS[year] || `Year ${year}`,
          terms,
          count: terms.reduce(
            (sum, term) =>
              sum + term.subjects.length,
            0
          ),
          units: terms.reduce(
            (sum, term) => sum + term.units,
            0
          ),
        };
      });
  }, [filteredSubjects]);

  const totalUnits = filteredSubjects.reduce(
    (sum, subject) =>
      sum + Number(subject.units || 0),
    0
  );

  const summerSubjects = filteredSubjects.filter(
    (subject) =>
      String(subject.semester || '')
        .toLowerCase() === 'summer'
  );

  const toggleSection = (sectionKey) => {
    setExpandedSections((previous) => ({
      ...previous,
      [sectionKey]: previous[sectionKey] === false,
    }));
  };

  const expandAll = () => {
    setExpandedSections({});
  };

  const collapseAll = () => {
    const collapsed = {};

    groupedSubjects.forEach((year) => {
      year.terms.forEach((term) => {
        collapsed[`${year.year}-${term.term}`] = false;
      });
    });

    setExpandedSections(collapsed);
  };

  const resetFilters = () => {
    setSearch('');
    setYearFilter('all');
    setTermFilter('all');
    setExpandedSections({});
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    yearFilter !== 'all' ||
    termFilter !== 'all';

  return (
    <section
      className="program-panel"
      style={{
        padding: 26,
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* PAGE HEADING */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
            }}
          >
            <BookOpen size={23} color={GOLD} />

            <h2
              style={{
                color: NAVY,
                fontSize: 19,
                fontWeight: 800,
                margin: 0,
              }}
            >
              Subject Offerings
            </h2>
          </div>

          <p
            style={{
              color: MUTED,
              fontSize: 13,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Browse approved curriculum subjects,
            organized by year level and semester.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOptions}
          disabled={loadingOptions}
          style={{
            ...fieldStyle,
            width: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: loadingOptions
              ? 'not-allowed'
              : 'pointer',
            fontWeight: 700,
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* INFORMATION NOTICE */}
      <div
        style={{
          display: 'flex',
          gap: 11,
          padding: 15,
          borderRadius: 10,
          background: '#f4f7fb',
          color: '#4e647f',
          fontSize: 12,
          lineHeight: 1.7,
          marginBottom: 22,
          border: '1px solid #e7edf5',
        }}
      >
        <Info
          size={19}
          style={{ flexShrink: 0, marginTop: 2 }}
        />

        <span>
          These are{' '}
          <strong>approved curriculum subjects</strong>.
          They are not automatically scheduled or
          available for enrollment. Actual subject
          offerings, sections, faculty assignments,
          and academic periods will be connected
          in a later development step.
        </span>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#fff1f0',
            color: '#a52727',
            padding: 14,
            borderRadius: 9,
            marginBottom: 18,
            fontSize: 13,
          }}
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* PROGRAM AND CURRICULUM SELECTORS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 15,
          marginBottom: 20,
        }}
      >
        <label
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: NAVY,
          }}
        >
          Program
          <select
            value={selectedProgram}
            onChange={(event) => {
              setSelectedProgram(event.target.value);
              resetFilters();
            }}
            disabled={loadingOptions}
            style={{ ...fieldStyle, marginTop: 7 }}
          >
            {programs.length === 0 && (
              <option value="">
                No assigned programs
              </option>
            )}

            {programs.map((program) => (
              <option
                key={program.program_id}
                value={program.program_id}
              >
                {program.program_code} —{' '}
                {program.program_name}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: NAVY,
          }}
        >
          Curriculum
          <select
            value={selectedCurriculum}
            onChange={(event) => {
              setSelectedCurriculum(event.target.value);
              resetFilters();
            }}
            disabled={
              loadingOptions ||
              availableCurricula.length === 0
            }
            style={{ ...fieldStyle, marginTop: 7 }}
          >
            {availableCurricula.length === 0 && (
              <option value="">
                No curricula available
              </option>
            )}

            {availableCurricula.map((curriculum) => (
              <option
                key={curriculum.curriculum_id}
                value={curriculum.curriculum_id}
              >
                {curriculum.description} (
                {curriculum.curriculum_year})
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* CURRICULUM SUMMARY */}
      {selectedCurriculumInfo && (
        <div
          style={{
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 22,
            background: '#fff',
          }}
        >
          <div
            style={{
              background: NAVY,
              padding: '15px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 11,
            }}
          >
            <GraduationCap size={21} color="#e2b449" />

            <div>
              <div
                style={{
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                {selectedCurriculumInfo.description}
              </div>

              <div
                style={{
                  color: '#c6d5e7',
                  fontSize: 12,
                  marginTop: 3,
                }}
              >
                {selectedProgramInfo?.program_code ||
                  'Program'}{' '}
                · Curriculum{' '}
                {selectedCurriculumInfo.curriculum_year}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(3, minmax(0, 1fr))',
              gap: 1,
              background: BORDER,
            }}
          >
            {[
              {
                label: 'Subjects',
                value: filteredSubjects.length,
              },
              {
                label: 'Total Units',
                value: formatUnits(totalUnits),
              },
              {
                label: 'Summer Subjects',
                value: summerSubjects.length,
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: '#fff',
                  padding: '17px 10px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    color: NAVY,
                    fontSize: 23,
                    fontWeight: 800,
                  }}
                >
                  {item.value}
                </div>

                <div
                  style={{
                    color: MUTED,
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div
        style={{
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 17,
          background: '#fbfcfe',
          marginBottom: 23,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: NAVY,
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            <Layers size={17} color={GOLD} />
            Browse and Filter Subjects
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#956b17',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <label
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: NAVY,
            }}
          >
            Year Level
            <select
              value={yearFilter}
              onChange={(event) =>
                setYearFilter(event.target.value)
              }
              style={{ ...fieldStyle, marginTop: 7 }}
            >
              <option value="all">
                All Year Levels
              </option>

              {[1, 2, 3, 4].map((year) => (
                <option key={year} value={year}>
                  {YEAR_LABELS[year]}
                </option>
              ))}
            </select>
          </label>

          <label
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: NAVY,
            }}
          >
            Semester
            <select
              value={termFilter}
              onChange={(event) =>
                setTermFilter(event.target.value)
              }
              style={{ ...fieldStyle, marginTop: 7 }}
            >
              <option value="all">
                All Semesters
              </option>

              {TERM_ORDER.map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          style={{
            position: 'relative',
            marginTop: 13,
          }}
        >
          <Search
            size={18}
            color={MUTED}
            style={{
              position: 'absolute',
              left: 13,
              top: 13,
            }}
          />

          <input
            type="search"
            placeholder="Search subject code or title..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            style={{
              ...fieldStyle,
              paddingLeft: 42,
            }}
          />
        </div>
      </div>

      {/* SECTION HEADING */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h3
            style={{
              color: NAVY,
              fontSize: 16,
              fontWeight: 800,
              margin: '0 0 5px',
            }}
          >
            Curriculum Subjects by Year
          </h3>

          <p
            style={{
              color: MUTED,
              fontSize: 12,
              margin: 0,
            }}
          >
            {filteredSubjects.length} subjects found
            across {groupedSubjects.length} year
            {groupedSubjects.length === 1 ? '' : 's'}.
          </p>
        </div>

        {groupedSubjects.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={expandAll}
              style={{
                ...fieldStyle,
                width: 'auto',
                minHeight: 35,
                padding: '7px 11px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Expand All
            </button>

            <button
              type="button"
              onClick={collapseAll}
              style={{
                ...fieldStyle,
                width: 'auto',
                minHeight: 35,
                padding: '7px 11px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      {/* YEAR-LEVEL AND SEMESTER SECTIONS */}
      {!loadingOptions &&
        !loadingSubjects &&
        groupedSubjects.map((yearGroup) => (
          <div
            key={yearGroup.year}
            style={{
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              background: '#fff',
              marginBottom: 20,
              overflow: 'hidden',
              boxShadow:
                '0 3px 12px rgba(16,42,76,0.035)',
            }}
          >
            {/* YEAR HEADER */}
            <div
              style={{
                background: '#edf3fa',
                borderBottom: `1px solid ${BORDER}`,
                padding: '15px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 35,
                    height: 35,
                    borderRadius: 9,
                    background: NAVY,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  {yearGroup.year}
                </div>

                <div>
                  <div
                    style={{
                      color: NAVY,
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    {yearGroup.label}
                  </div>

                  <div
                    style={{
                      color: MUTED,
                      fontSize: 11,
                      marginTop: 3,
                    }}
                  >
                    {yearGroup.count} subjects
                    {' · '}
                    {formatUnits(yearGroup.units)} units
                  </div>
                </div>
              </div>

              <span
                style={{
                  background: '#fff',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 20,
                  padding: '6px 11px',
                  color: NAVY,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {yearGroup.terms.length} Semester
                {yearGroup.terms.length === 1
                  ? ''
                  : ' Sections'}
              </span>
            </div>

            {/* SEMESTER SECTIONS */}
            <div style={{ padding: 14 }}>
              {yearGroup.terms.map((termGroup) => {
                const sectionKey =
                  `${yearGroup.year}-${termGroup.term}`;

                const isExpanded =
                  expandedSections[sectionKey] !== false;

                const isSummer =
                  termGroup.term.toLowerCase() ===
                  'summer';

                return (
                  <div
                    key={sectionKey}
                    style={{
                      border: `1px solid ${BORDER}`,
                      borderRadius: 10,
                      overflow: 'hidden',
                      marginBottom: 12,
                      background: '#fff',
                    }}
                  >
                    {/* CLICKABLE SEMESTER HEADER */}
                    <button
                      type="button"
                      onClick={() =>
                        toggleSection(sectionKey)
                      }
                      aria-expanded={isExpanded}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: isSummer
                          ? '#fff7e7'
                          : '#f8fafc',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                        textAlign: 'left',
                        font: 'inherit',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown
                            size={17}
                            color={NAVY}
                          />
                        ) : (
                          <ChevronRight
                            size={17}
                            color={NAVY}
                          />
                        )}

                        {isSummer ? (
                          <Sun size={18} color={GOLD} />
                        ) : (
                          <CalendarDays
                            size={18}
                            color={GOLD}
                          />
                        )}

                        <span
                          style={{
                            color: NAVY,
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          {termGroup.term}
                        </span>
                      </div>

                      <span
                        style={{
                          color: MUTED,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {termGroup.subjects.length}{' '}
                        subject
                        {termGroup.subjects.length === 1
                          ? ''
                          : 's'}
                        {' · '}
                        {formatUnits(termGroup.units)} units
                      </span>
                    </button>

                    {/* SEMESTER SUBJECT TABLE */}
                    {isExpanded && (
                      <div
                        style={{
                          overflowX: 'auto',
                        }}
                      >
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: 12,
                            textAlign: 'left',
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                background: '#fff',
                                borderBottom:
                                  `1px solid ${BORDER}`,
                              }}
                            >
                              <th
                                style={{
                                  padding: '12px 16px',
                                  color: MUTED,
                                  fontWeight: 700,
                                  width: '25%',
                                }}
                              >
                                Subject Code
                              </th>

                              <th
                                style={{
                                  padding: '12px 16px',
                                  color: MUTED,
                                  fontWeight: 700,
                                }}
                              >
                                Subject Title
                              </th>

                              <th
                                style={{
                                  padding: '12px 16px',
                                  color: MUTED,
                                  fontWeight: 700,
                                  textAlign: 'right',
                                  width: 90,
                                }}
                              >
                                Units
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {termGroup.subjects.map(
                              (subject, index) => (
                                <tr
                                  key={
                                    subject.curriculum_subject_id ||
                                    `${subject.subject_id}-${index}`
                                  }
                                  style={{
                                    borderBottom:
                                      '1px solid #edf1f5',
                                  }}
                                >
                                  <td
                                    style={{
                                      padding:
                                        '12px 16px',
                                      color: NAVY,
                                      fontWeight: 800,
                                      whiteSpace:
                                        'nowrap',
                                    }}
                                  >
                                    {subject.subject_code}
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        '12px 16px',
                                      color: '#334155',
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {subject.subject_title}
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        '12px 16px',
                                      color: NAVY,
                                      textAlign: 'right',
                                      fontWeight: 700,
                                    }}
                                  >
                                    {formatUnits(
                                      subject.units
                                    )}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>

                          <tfoot>
                            <tr
                              style={{
                                background: '#f8fafc',
                              }}
                            >
                              <td
                                colSpan={2}
                                style={{
                                  padding:
                                    '12px 16px',
                                  textAlign: 'right',
                                  color: NAVY,
                                  fontWeight: 800,
                                }}
                              >
                                Semester Total
                              </td>

                              <td
                                style={{
                                  padding:
                                    '12px 16px',
                                  textAlign: 'right',
                                  color: NAVY,
                                  fontWeight: 800,
                                }}
                              >
                                {formatUnits(
                                  termGroup.units
                                )}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {/* LOADING STATE */}
      {(loadingOptions || loadingSubjects) && (
        <div
          style={{
            textAlign: 'center',
            padding: 35,
            color: MUTED,
            fontSize: 13,
          }}
        >
          <RefreshCw
            size={22}
            style={{ marginBottom: 10 }}
          />

          <div>Loading curriculum subjects...</div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loadingOptions &&
        !loadingSubjects &&
        groupedSubjects.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              border: `1px dashed ${BORDER}`,
              borderRadius: 12,
              color: MUTED,
              fontSize: 13,
            }}
          >
            <BookOpen
              size={30}
              color={GOLD}
              style={{ marginBottom: 12 }}
            />

            <div
              style={{
                fontWeight: 700,
                color: NAVY,
                marginBottom: 6,
              }}
            >
              No subjects found
            </div>

            <div>
              Try another curriculum or adjust your
              search and filters.
            </div>
          </div>
        )}
    </section>
  );
}

export default SubjectOfferings;
