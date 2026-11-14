import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Info,
  Layers,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

import api from '../Services/api';

const NAVY = '#102a4c';
const GOLD = '#b48727';
const BORDER = '#dce4ee';
const MUTED = '#64748b';

const field = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  border: `1px solid ${BORDER}`,
  borderRadius: 9,
  background: '#fff',
  color: NAVY,
  font: 'inherit',
  fontSize: 13,
  minHeight: 43
};

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const label = {
  display: 'block',
  color: NAVY,
  fontSize: 12,
  fontWeight: 700
};

export default function SubjectLoads() {
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [sections, setSections] = useState([]);

  const [programId, setProgramId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [yearLevel, setYearLevel] = useState('1');
  const [letter, setLetter] = useState('A');
  const [capacity, setCapacity] = useState('40');

  const [loading, setLoading] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [programResponse, periodResponse] =
        await Promise.all([
          api.get('/api/program-office/programs'),
          api.get('/api/program-office/academic-periods')
        ]);

      const nextPrograms =
        programResponse.data?.programs || [];

      const nextPeriods =
        periodResponse.data?.periods || [];

      setPrograms(nextPrograms);
      setPeriods(nextPeriods);

      setProgramId((previous) =>
        nextPrograms.some(
          (p) => String(p.program_id) === previous
        )
          ? previous
          : String(nextPrograms[0]?.program_id || '')
      );

      setPeriodId((previous) =>
        nextPeriods.some(
          (p) => String(p.period_id) === previous
        )
          ? previous
          : String(
              nextPeriods.find(
                (p) =>
                  String(p.status).toLowerCase() === 'active'
              )?.period_id ||
                nextPeriods[0]?.period_id ||
                ''
            )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load programs and academic periods.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSections = useCallback(async () => {
    if (!periodId) {
      setSections([]);
      return;
    }

    setLoadingSections(true);

    try {
      const response = await api.get(
        '/api/program-office/sections',
        {
          params: { period_id: periodId }
        }
      );

      setSections(response.data?.sections || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load sections.'
      );
    } finally {
      setLoadingSections(false);
    }
  }, [periodId]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  const currentProgram = programs.find(
    (p) => String(p.program_id) === programId
  );

  const currentPeriod = periods.find(
    (p) => String(p.period_id) === periodId
  );

  const visibleSections = useMemo(
    () =>
      sections.filter(
        (s) => String(s.program_id) === programId
      ),
    [sections, programId]
  );

  const proposedCode =
    `${String(
      currentProgram?.program_code || ''
    ).toUpperCase()} ${yearLevel}-${letter}`.trim();

  const isDuplicate = visibleSections.some(
    (s) => s.section_code === proposedCode
  );

  const periodIsActive =
    String(currentPeriod?.status || '').toLowerCase() ===
    'active';

  async function createSection(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (isDuplicate) {
      setError(
        `${proposedCode} already exists for this academic period.`
      );
      return;
    }

    setSaving(true);

    try {
      const response = await api.post(
        '/api/program-office/sections',
        {
          program_id: Number(programId),
          period_id: Number(periodId),
          year_level: Number(yearLevel),
          section_letter: letter,
          capacity: Number(capacity)
        }
      );

      setSuccess(
        response.data?.message ||
          'Section created successfully.'
      );

      await loadSections();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to create section.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="program-panel"
      style={{ padding: 26, minWidth: 0 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: 20
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9
            }}
          >
            <ClipboardList size={23} color={GOLD} />
            <h2
              style={{
                margin: 0,
                fontSize: 19,
                color: NAVY
              }}
            >
              Subject Loads
            </h2>
          </div>

          <p
            style={{
              fontSize: 13,
              color: MUTED,
              margin: '8px 0 0'
            }}
          >
            Step 1: Prepare class sections for an
            academic period.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSuccess('');
            loadOptions();
            loadSections();
          }}
          disabled={loading || loadingSections}
          style={{
            ...field,
            width: 'auto',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: 14,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          background: '#f4f7fb',
          color: '#4e647f',
          fontSize: 12,
          lineHeight: 1.7,
          marginBottom: 20
        }}
      >
        <Info size={19} style={{ flexShrink: 0 }} />

        <span>
          Sections are containers for future class
          offerings. Creating a section does{' '}
          <strong>not</strong> enroll students or
          assign subjects or faculty. Those steps
          will be added separately.
        </span>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: 13,
            marginBottom: 15,
            background: '#fff1f0',
            color: '#a52727',
            borderRadius: 9,
            fontSize: 13
          }}
        >
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: 13,
            marginBottom: 15,
            background: '#eef8f0',
            color: '#176534',
            borderRadius: 9,
            fontSize: 13
          }}
        >
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 15,
          marginBottom: 20
        }}
      >
        <label style={label}>
          Assigned Program
          <select
            value={programId}
            onChange={(e) => {
              setProgramId(e.target.value);
              setSuccess('');
            }}
            style={{ ...field, marginTop: 7 }}
            disabled={loading}
          >
            {programs.length === 0 && (
              <option value="">
                No assigned programs
              </option>
            )}

            {programs.map((p) => (
              <option
                key={p.program_id}
                value={p.program_id}
              >
                {p.program_code} — {p.program_name}
              </option>
            ))}
          </select>
        </label>

        <label style={label}>
          School Year and Semester
          <select
            value={periodId}
            onChange={(e) => {
              setPeriodId(e.target.value);
              setSuccess('');
            }}
            style={{ ...field, marginTop: 7 }}
            disabled={loading}
          >
            {periods.length === 0 && (
              <option value="">
                No academic periods
              </option>
            )}

            {periods.map((p) => (
              <option
                key={p.period_id}
                value={p.period_id}
              >
                {p.school_year} — {p.semester}
                {String(p.status).toLowerCase() === 'active'
                  ? ''
                  : ` (${p.status || 'inactive'})`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <form
        onSubmit={createSection}
        style={{
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 18,
          marginBottom: 24,
          background: '#fbfcfe'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            marginBottom: 16
          }}
        >
          <Plus size={19} color={GOLD} />

          <h3
            style={{
              color: NAVY,
              fontSize: 15,
              margin: 0
            }}
          >
            Create a Class Section
          </h3>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(145px, 1fr))',
            gap: 14
          }}
        >
          <label style={label}>
            Year Level
            <select
              value={yearLevel}
              onChange={(e) =>
                setYearLevel(e.target.value)
              }
              style={{ ...field, marginTop: 7 }}
            >
              {[1, 2, 3, 4].map((year) => (
                <option key={year} value={year}>
                  Year {year}
                </option>
              ))}
            </select>
          </label>

          <label style={label}>
            Section Letter
            <select
              value={letter}
              onChange={(e) =>
                setLetter(e.target.value)
              }
              style={{ ...field, marginTop: 7 }}
            >
              {letters.map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  Section {value}
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
              step="1"
              required
              value={capacity}
              onChange={(e) =>
                setCapacity(e.target.value)
              }
              style={{ ...field, marginTop: 7 }}
            />
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginTop: 18
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: MUTED
            }}
          >
            Generated code:{' '}
            <strong style={{ color: NAVY }}>
              {proposedCode}
            </strong>

            {isDuplicate && (
              <span
                style={{
                  color: '#a52727',
                  marginLeft: 8
                }}
              >
                Already exists
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              saving ||
              !programId ||
              !periodId ||
              !periodIsActive ||
              isDuplicate ||
              !capacity
            }
            style={{
              background: NAVY,
              color: '#fff',
              border: 0,
              borderRadius: 9,
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 700,
              cursor: 'pointer',
              opacity:
                loading ||
                saving ||
                !periodIsActive ||
                isDuplicate
                  ? 0.55
                  : 1
            }}
          >
            <Plus size={17} />
            {saving
              ? 'Creating...'
              : 'Create Section'}
          </button>
        </div>

        {!periodIsActive && currentPeriod && (
          <p
            style={{
              fontSize: 12,
              color: '#a52727',
              margin: '10px 0 0'
            }}
          >
            This academic period is not active.
            Select an active period to create sections.
          </p>
        )}
      </form>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 12
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9
          }}
        >
          <Layers size={19} color={GOLD} />

          <h3
            style={{
              margin: 0,
              color: NAVY,
              fontSize: 15
            }}
          >
            Existing Sections
          </h3>
        </div>

        <span
          style={{
            fontSize: 12,
            color: MUTED
          }}
        >
          {visibleSections.length} section
          {visibleSections.length === 1 ? '' : 's'}
        </span>
      </div>

      <div
        style={{
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          overflowX: 'auto'
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
            textAlign: 'left'
          }}
        >
          <thead>
            <tr
              style={{
                background: '#edf3fa',
                color: NAVY
              }}
            >
              {[
                'Section Code',
                'Year Level',
                'Capacity',
                'Status'
              ].map((heading) => (
                <th
                  key={heading}
                  style={{
                    padding: '13px 15px',
                    borderBottom:
                      `1px solid ${BORDER}`
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleSections.map((s) => (
              <tr
                key={s.section_id}
                style={{
                  borderBottom:
                    '1px solid #edf1f5'
                }}
              >
                <td
                  style={{
                    padding: '13px 15px',
                    fontWeight: 800,
                    color: NAVY
                  }}
                >
                  {s.section_code}
                </td>

                <td
                  style={{
                    padding: '13px 15px'
                  }}
                >
                  Year {s.year_level}
                </td>

                <td
                  style={{
                    padding: '13px 15px'
                  }}
                >
                  {s.capacity ?? '—'}
                </td>

                <td
                  style={{
                    padding: '13px 15px'
                  }}
                >
                  {s.status || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(loadingSections ||
          visibleSections.length === 0) && (
          <div
            style={{
              padding: 25,
              textAlign: 'center',
              color: MUTED,
              fontSize: 13
            }}
          >
            {loadingSections
              ? 'Loading sections...'
              : 'No sections created for this program and academic period yet.'}
          </div>
        )}
      </div>
    </section>
  );
}