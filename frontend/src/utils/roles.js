// Central place mapping each backend role string to its dashboard
// route. If your backend's /api/auth/me or /api/auth/login response
// uses different exact role strings than these, update ROLE_HOME here
// — every other file reads from this one map.
export const ROLES = {
  STUDENT: 'Student',
  FACULTY: 'Faculty',
  REGISTRAR: 'Registrar Personnel',
  PROGRAM_OFFICE: 'Program Office Personnel',
  ADMIN: 'Administrator',
};

export const ROLE_HOME = {
  [ROLES.STUDENT]: '/student',
  [ROLES.FACULTY]: '/faculty',
  [ROLES.REGISTRAR]: '/registrar',
  [ROLES.PROGRAM_OFFICE]: '/program-office',
  [ROLES.ADMIN]: '/admin',
};

export function getRoleHome(role) {
  return ROLE_HOME[role] ?? '/';
}