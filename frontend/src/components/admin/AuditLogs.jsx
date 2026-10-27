
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  History,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Database,
  UserRound,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  LoaderCircle,
} from 'lucide-react';

import { adminAuditApi } from '../../Services/api';
import './AuditLogs.css';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE_USER', label: 'Account Created' },
  { value: 'UPDATE_USER_ROLE', label: 'Role Changed' },
  { value: 'UPDATE_USER_STATUS', label: 'Status Changed' },
];

const ACTION_LABELS = {
  CREATE_USER: 'Account Created',
  UPDATE_USER_ROLE: 'Role Changed',
  UPDATE_USER_STATUS: 'Status Changed',
};

function getErrorMessage(error) {
  return (
    error?.message ||
    'Unable to retrieve audit logs. Please try again.'
  );
}

function formatAction(action) {
  if (!action) return 'Unknown Action';

  return (
    ACTION_LABELS[action] ||
    String(action).replaceAll('_', ' ')
  );
}

// Our backend writes UTC into a PostgreSQL
// timestamp-without-time-zone column.
// Append Z to interpret those stored values as UTC.
function formatTimestamp(value) {
  if (!value) return 'Not recorded';

  const text = String(value).trim();

  const normalized = text.includes('T')
    ? text
    : text.replace(' ', 'T');

  const hasTimezone =
    /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);

  const date = new Date(
    hasTimezone ? normalized : `${normalized}Z`
  );

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await adminAuditApi.list({
        page,
        action: actionFilter,
      });

      setLogs(
        Array.isArray(response.data?.logs)
          ? response.data.logs
          : []
      );

      setPagination(
        response.data?.pagination || {
          page,
          limit: 20,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (err) {
      setLogs([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const visibleLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return logs;

    return logs.filter((log) => {
      const content = [
        log.audit_id,
        log.user_id,
        log.actor_username,
        log.action,
        formatAction(log.action),
        log.table_name,
        log.record_id,
        log.timestamp,
      ]
        .filter((value) => value != null)
        .join(' ')
        .toLowerCase();

      return content.includes(query);
    });
  }, [logs, search]);

  const totalPages = Math.max(
    1,
    Number(pagination.totalPages) || 1
  );

  function handleActionChange(event) {
    setActionFilter(event.target.value);
    setPage(1);
  }

  return (
    <div className="pbcc-audit-page">
      <section className="pbcc-audit-heading">
        <div>
          <div className="pbcc-audit-eyebrow">
            <ShieldCheck size={15} />
            ADMINISTRATOR ACCESS
          </div>

          <h2>Audit Logs</h2>

          <p>
            Review recorded account-management activities
            in the Pangantucan Bukidnon Community College
            system.
          </p>
        </div>

        <button
          type="button"
          className="pbcc-audit-refresh"
          onClick={loadLogs}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={
              loading ? 'pbcc-audit-spinning' : ''
            }
          />
          Refresh
        </button>
      </section>

      <section className="pbcc-audit-summary">
        <div className="pbcc-audit-summary-card">
          <span className="pbcc-audit-summary-icon">
            <History size={21} />
          </span>

          <div>
            <span>Total Matching Records</span>
            <strong>
              {loading ? '—' : pagination.total}
            </strong>
            <small>Recorded system activities</small>
          </div>
        </div>

        <div className="pbcc-audit-summary-card">
          <span className="pbcc-audit-summary-icon">
            <Database size={21} />
          </span>

          <div>
            <span>Records on This Page</span>
            <strong>
              {loading ? '—' : logs.length}
            </strong>
            <small>Current database page</small>
          </div>
        </div>

        <div className="pbcc-audit-summary-card">
          <span className="pbcc-audit-summary-icon">
            <Clock3 size={21} />
          </span>

          <div>
            <span>Latest Activity on Page</span>
            <strong className="pbcc-audit-latest">
              {loading || !logs.length
                ? '—'
                : formatTimestamp(logs[0].timestamp)}
            </strong>
            <small>Philippine Standard Time</small>
          </div>
        </div>
      </section>

      {error && (
        <div
          className="pbcc-audit-feedback"
          role="alert"
        >
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      <section className="pbcc-audit-panel">
        <div className="pbcc-audit-panel-heading">
          <div>
            <h3>System Activity History</h3>
            <p>
              A read-only record of actions performed
              within the system.
            </p>
          </div>

          <span className="pbcc-audit-readonly">
            <CheckCircle2 size={15} />
            Read-only
          </span>
        </div>

        <div className="pbcc-audit-toolbar">
          <label className="pbcc-audit-search">
            <Search size={18} />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search current page..."
              aria-label="Search audit logs on current page"
            />
          </label>

          <label className="pbcc-audit-filter">
            <Filter size={17} />

            <select
              value={actionFilter}
              onChange={handleActionChange}
              aria-label="Filter by action"
            >
              {ACTION_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="pbcc-audit-table-scroll">
          <table className="pbcc-audit-table">
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>Performed By</th>
                <th>Action</th>
                <th>Affected Table</th>
                <th>Record ID</th>
                <th>Date & Time</th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                visibleLogs.map((log) => (
                  <tr key={log.audit_id}>
                    <td>
                      <span className="pbcc-audit-id">
                        #{log.audit_id}
                      </span>
                    </td>

                    <td>
                      <div className="pbcc-audit-actor">
                        <span className="pbcc-audit-avatar">
                          <UserRound size={17} />
                        </span>

                        <span>
                          <strong>
                            {log.actor_username ||
                              'Unknown User'}
                          </strong>

                          <small>
                            User ID: {log.user_id ?? '—'}
                          </small>
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`pbcc-audit-action ${
                          log.action === 'CREATE_USER'
                            ? 'is-create'
                            : log.action ===
                                'UPDATE_USER_ROLE'
                              ? 'is-role'
                              : 'is-update'
                        }`}
                      >
                        {formatAction(log.action)}
                      </span>
                    </td>

                    <td>
                      {log.table_name || '—'}
                    </td>

                    <td>
                      {log.record_id ?? '—'}
                    </td>

                    <td className="pbcc-audit-date">
                      {formatTimestamp(log.timestamp)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {loading && (
            <div
              className="pbcc-audit-empty"
              role="status"
            >
              <LoaderCircle
                size={34}
                className="pbcc-audit-spinning"
              />

              <h4>Loading audit records...</h4>

              <p>
                Retrieving recorded system activities.
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            visibleLogs.length === 0 && (
              <div className="pbcc-audit-empty">
                <History
                  size={36}
                  strokeWidth={1.5}
                />

                <h4>
                  {logs.length === 0
                    ? 'No audit records found'
                    : 'No matching records'}
                </h4>

                <p>
                  {logs.length === 0
                    ? 'No activities match the selected action filter.'
                    : 'Try changing your search text.'}
                </p>
              </div>
            )}
        </div>

        <div className="pbcc-audit-pagination">
          <span>
            Page {pagination.page} of {totalPages}
            {' · '}
            {pagination.total} total records
          </span>

          <div className="pbcc-audit-pagination-buttons">
            <button
              type="button"
              onClick={() =>
                setPage((previous) =>
                  Math.max(1, previous - 1)
                )
              }
              disabled={loading || page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
              Previous
            </button>

            <button
              type="button"
              onClick={() =>
                setPage((previous) =>
                  Math.min(totalPages, previous + 1)
                )
              }
              disabled={
                loading || page >= totalPages
              }
              aria-label="Next page"
            >
              Next
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <p className="pbcc-audit-note">
        Audit records are displayed in Philippine Standard
        Time. Search applies to the current page;
        the action filter applies to all records.
      </p>
    </div>
  );
}
