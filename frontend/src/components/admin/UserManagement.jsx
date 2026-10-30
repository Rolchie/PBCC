
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  UserRound,
  X,
  Database,
  AlertCircle,
  RefreshCw,
  Pencil,
  CheckCircle2,
  LoaderCircle,
} from 'lucide-react';

import { adminUsersApi } from '../../Services/api';
import { useAuth } from '../../context/useAuth';
import './UserManagement.css';

const ROLE_OPTIONS = [
  'Student',
  'Faculty',
  'Registrar Personnel',
  'Program Office Personnel',
  'Administrator',
];

const STATUS_OPTIONS = ['active', 'inactive'];

const EMPTY_CREATE_FORM = {
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  role: 'Student',
};

function getErrorMessage(error) {
  return (
    error?.message ||
    'Something went wrong. Please try again.'
  );
}

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function getFullName(user) {
  return [
    user.first_name,
    user.middle_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(' ');
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modalMode, setModalMode] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [createForm, setCreateForm] = useState({
    ...EMPTY_CREATE_FORM,
  });

  const [editForm, setEditForm] = useState({
    role: 'Student',
    status: 'active',
  });

  const [modalError, setModalError] = useState('');

  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const triggerRef = useRef(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await adminUsersApi.list();

      setUsers(
        Array.isArray(response.data?.users)
          ? response.data.users
          : []
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const username = String(
        user.username || ''
      ).toLowerCase();

      const fullName = getFullName(user).toLowerCase();

      const matchesSearch =
        username.includes(query) ||
        fullName.includes(query);

      const matchesRole =
        roleFilter === 'all' ||
        user.role === roleFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        normalizeStatus(user.status) === statusFilter;

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  const activeCount = users.filter(
    (user) => normalizeStatus(user.status) === 'active'
  ).length;

  const inactiveCount = users.filter(
    (user) => normalizeStatus(user.status) === 'inactive'
  ).length;

  const isEditingSelf =
    modalMode === 'edit' &&
    selectedUser &&
    Number(selectedUser.user_id) ===
      Number(currentUser?.user_id);

  function openCreateModal(event) {
    triggerRef.current = event?.currentTarget || null;

    setModalError('');
    setCreateForm({ ...EMPTY_CREATE_FORM });
    setSelectedUser(null);
    setModalMode('create');
  }

  function openEditModal(user, event) {
    triggerRef.current = event?.currentTarget || null;

    setModalError('');
    setSelectedUser(user);

    setEditForm({
      role: user.role,
      status: normalizeStatus(user.status),
    });

    setModalMode('edit');
  }

  function closeModal() {
    if (saving) return;

    setModalMode(null);
    setSelectedUser(null);
    setModalError('');

    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }

  useEffect(() => {
    if (!modalMode) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !saving) {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        modalRef.current?.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled)'
        ) || []
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

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
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [modalMode, saving]);

  async function handleCreate(event) {
    event.preventDefault();

    if (saving) return;

    const firstName = createForm.first_name.trim();
    const middleName = createForm.middle_name.trim();
    const lastName = createForm.last_name.trim();
    const email = createForm.email.trim().toLowerCase();

    if (!firstName || !lastName) {
      setModalError(
        'First name and last name are required.'
      );
      return;
    }

    if (!email) {
      setModalError('Email address is required.');
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setModalError(
        'Please enter a valid email address.'
      );
      return;
    }

    if (!ROLE_OPTIONS.includes(createForm.role)) {
      setModalError('Please select a valid user role.');
      return;
    }

    setSaving(true);
    setModalError('');
    setSuccess('');

    try {
      await adminUsersApi.create({
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        email,
        role: createForm.role,
      });

      setModalMode(null);
      setCreateForm({ ...EMPTY_CREATE_FORM });

      setSuccess(
        'User account created successfully. The initial password is assigned automatically. The user must change it on first login.'
      );

      await loadUsers();
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();

    if (saving || !selectedUser) return;

    if (
      isEditingSelf &&
      (
        editForm.role !== 'Administrator' ||
        editForm.status !== 'active'
      )
    ) {
      setModalError(
        'You cannot remove your own Administrator access.'
      );
      return;
    }

    setSaving(true);
    setModalError('');
    setSuccess('');

    try {
      await adminUsersApi.update(
        selectedUser.user_id,
        {
          role: editForm.role,
          status: editForm.status,
        }
      );

      setModalMode(null);
      setSelectedUser(null);

      setSuccess(
        'User account updated successfully.'
      );

      await loadUsers();
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function updateCreateField(field, value) {
    setCreateForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  return (
    <div className="pbcc-users-page">
      <section className="pbcc-users-heading">
        <div>
          <div className="pbcc-users-eyebrow">
            <ShieldCheck size={15} />
            ADMINISTRATOR ACCESS
          </div>

          <h2>User Management</h2>

          <p>
            Manage PBCC system accounts, predefined user
            roles, and account status.
          </p>
        </div>

        <button
          type="button"
          className="pbcc-users-primary-button"
          onClick={openCreateModal}
        >
          <UserPlus size={18} />
          Add User
        </button>
      </section>

      {error && (
        <div
          className="pbcc-users-feedback is-error"
          role="alert"
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          className="pbcc-users-feedback is-success"
          role="status"
        >
          <CheckCircle2 size={18} />

          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="pbcc-users-stat-grid">
        <div className="pbcc-users-stat">
          <div className="pbcc-users-stat-top">
            <span>Total Accounts</span>
            <Users size={21} />
          </div>

          <strong>
            {loading ? '—' : users.length}
          </strong>

          <small>Registered PBCC accounts</small>
        </div>

        <div className="pbcc-users-stat">
          <div className="pbcc-users-stat-top">
            <span>Active Accounts</span>
            <ShieldCheck size={21} />
          </div>

          <strong>
            {loading ? '—' : activeCount}
          </strong>

          <small>Accounts with active status</small>
        </div>

        <div className="pbcc-users-stat">
          <div className="pbcc-users-stat-top">
            <span>Inactive Accounts</span>
            <UserRound size={21} />
          </div>

          <strong>
            {loading ? '—' : inactiveCount}
          </strong>

          <small>Accounts with inactive status</small>
        </div>
      </section>

      <section className="pbcc-users-panel">
        <div className="pbcc-users-panel-heading">
          <div>
            <h3>System Accounts</h3>

            <p>
              Search and filter accounts by role and status.
            </p>
          </div>

          <div className="pbcc-users-panel-actions">
            <span className="pbcc-users-count">
              {filteredUsers.length} result
              {filteredUsers.length === 1 ? '' : 's'}
            </span>

            <button
              type="button"
              className="pbcc-users-refresh"
              onClick={loadUsers}
              disabled={loading}
              aria-label="Refresh user accounts"
              title="Refresh accounts"
            >
              <RefreshCw
                size={18}
                className={
                  loading
                    ? 'pbcc-users-spinning'
                    : ''
                }
              />
            </button>
          </div>
        </div>

        <div className="pbcc-users-filters">
          <label className="pbcc-users-search">
            <Search size={18} />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by name, username or email"
              aria-label="Search users"
            />
          </label>

          <label className="pbcc-users-select-wrap">
            <Filter size={17} />

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value)
              }
              aria-label="Filter by role"
            >
              <option value="all">All Roles</option>

              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label className="pbcc-users-select-wrap">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        <div className="pbcc-users-table-scroll">
          <table className="pbcc-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Account ID</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                filteredUsers.map((user) => {
                  const fullName = getFullName(user);

                  return (
                    <tr key={user.user_id}>
                      <td>
                        <div className="pbcc-users-person">
                          <span className="pbcc-users-avatar">
                            <UserRound size={18} />
                          </span>

                          <span>
                            {fullName ? (
                              <span>
                                <strong>{fullName}</strong>
                                <small
                                  style={{
                                    display: 'block',
                                    marginTop: '4px',
                                    color: '#64748b',
                                  }}
                                >
                                  {user.username}
                                </small>
                              </span>
                            ) : (
                              user.username || 'Unnamed user'
                            )}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="pbcc-users-role">
                          {user.role || 'Unassigned'}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`pbcc-users-status ${
                            normalizeStatus(user.status) ===
                            'active'
                              ? 'is-active'
                              : 'is-inactive'
                          }`}
                        >
                          {user.status || 'Unknown'}
                        </span>
                      </td>

                      <td>
                        {user.user_id ?? '—'}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="pbcc-users-edit-button"
                          onClick={(event) =>
                            openEditModal(user, event)
                          }
                        >
                          <Pencil size={15} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {loading && (
            <div
              className="pbcc-users-empty"
              role="status"
            >
              <LoaderCircle
                size={34}
                className="pbcc-users-spinning"
              />

              <h4>Loading accounts...</h4>

              <p>
                Retrieving user records from PBCC.
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            filteredUsers.length === 0 && (
              <div className="pbcc-users-empty">
                <Database
                  size={35}
                  strokeWidth={1.5}
                />

                <h4>
                  {users.length === 0
                    ? 'No user accounts found'
                    : 'No matching accounts'}
                </h4>

                <p>
                  {users.length === 0
                    ? 'No account records were returned by the backend.'
                    : 'Try changing your search or filter settings.'}
                </p>
              </div>
            )}
        </div>
      </section>

      {modalMode && (
        <div className="pbcc-users-modal-overlay">
          <div
            ref={modalRef}
            className="pbcc-users-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pbcc-user-modal-title"
          >
            <div className="pbcc-users-modal-heading">
              <div>
                <h3 id="pbcc-user-modal-title">
                  {modalMode === 'create'
                    ? 'Add User Account'
                    : 'Edit User Account'}
                </h3>

                <p>
                  {modalMode === 'create'
                    ? 'Create a new authorized PBCC system account.'
                    : `Update access for ${
                        selectedUser?.username ||
                        'this account'
                      }.`}
                </p>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                className="pbcc-users-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
              >
                <X size={21} />
              </button>
            </div>

            {modalError && (
              <div
                className="pbcc-users-feedback is-error"
                role="alert"
              >
                <AlertCircle size={18} />
                <span>{modalError}</span>
              </div>
            )}

            <form
              onSubmit={
                modalMode === 'create'
                  ? handleCreate
                  : handleUpdate
              }
            >
              <div className="pbcc-users-form">
                {modalMode === 'create' && (
                  <>
                    <label>
                      First Name
                      <input
                        type="text"
                        value={createForm.first_name}
                        onChange={(event) =>
                          updateCreateField(
                            'first_name',
                            event.target.value
                          )
                        }
                        placeholder="Enter first name"
                        maxLength={100}
                        autoComplete="off"
                        disabled={saving}
                        required
                      />
                    </label>

                    <label>
                      Middle Name (Optional)
                      <input
                        type="text"
                        value={createForm.middle_name}
                        onChange={(event) =>
                          updateCreateField(
                            'middle_name',
                            event.target.value
                          )
                        }
                        placeholder="Enter middle name"
                        maxLength={100}
                        autoComplete="off"
                        disabled={saving}
                      />
                    </label>

                    <label>
                      Last Name
                      <input
                        type="text"
                        value={createForm.last_name}
                        onChange={(event) =>
                          updateCreateField(
                            'last_name',
                            event.target.value
                          )
                        }
                        placeholder="Enter last name"
                        maxLength={100}
                        autoComplete="off"
                        disabled={saving}
                        required
                      />
                    </label>

                    <label>
                      Email Address
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(event) =>
                          updateCreateField(
                            'email',
                            event.target.value
                          )
                        }
                        placeholder="e.g., student@example.com"
                        autoComplete="off"
                        disabled={saving}
                        required
                      />
                    </label>
                  </>
                )}

                <label>
                  User Role

                  <select
                    value={
                      modalMode === 'create'
                        ? createForm.role
                        : editForm.role
                    }
                    onChange={(event) => {
                      const value = event.target.value;

                      if (modalMode === 'create') {
                        updateCreateField('role', value);
                      } else {
                        setEditForm((previous) => ({
                          ...previous,
                          role: value,
                        }));
                      }
                    }}
                    disabled={saving || isEditingSelf}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option
                        key={role}
                        value={role}
                      >
                        {role}
                      </option>
                    ))}
                  </select>
                </label>

                {modalMode === 'edit' && (
                  <label>
                    Account Status

                    <select
                      value={editForm.status}
                      onChange={(event) =>
                        setEditForm((previous) => ({
                          ...previous,
                          status: event.target.value,
                        }))
                      }
                      disabled={saving || isEditingSelf}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status === 'active'
                            ? 'Active'
                            : 'Inactive'}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="pbcc-users-modal-notice">
                <AlertCircle size={18} />

                <span>
                  {isEditingSelf
                    ? 'For security, you cannot change your own Administrator role or active status.'
                    : modalMode === 'create'
                      ? 'New accounts are automatically Active. The system assigns the initial password, and users must change it on their first login.'
                      : 'Changes to account role or status affect the user’s system access.'}
                </span>
              </div>

              <div className="pbcc-users-modal-actions">
                <button
                  type="button"
                  className="pbcc-users-secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="pbcc-users-primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="pbcc-users-spinning"
                      />
                      Saving...
                    </>
                  ) : modalMode === 'create' ? (
                    <>
                      <UserPlus size={17} />
                      Create Account
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
