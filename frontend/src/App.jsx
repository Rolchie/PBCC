import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ROLES } from './utils/roles';
import Home from './pages/Home';
import Login from './pages/Login';
import ComingSoon from './pages/ComingSoon';
import NotFound from './pages/NotFound';
import ChangeInitialPassword from './pages/ChangeInitialPassword';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import FacultyDashboard from './pages/dashboards/FacultyDashboard';
import RegistrarDashboard from './pages/dashboards/RegistrarDashboard';
import ProgramOfficeDashboard from './pages/dashboards/ProgramOfficeDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/register"
            element={
              <ComingSoon
                title="Create Student Account"
                missingEndpoint="POST /api/auth/register (or equivalent Supabase sign-up flow)"
              />
            }
          />

          <Route
            path="/forgot-password"
            element={
              <ComingSoon
                title="Forgot Password"
                missingEndpoint="POST /api/auth/forgot-password (or equivalent Supabase password-reset flow)"
              />
            }
          />

          <Route
            path="/change-initial-password"
            element={
              <ProtectedRoute allowPasswordChange>
                <ChangeInitialPassword />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/faculty"
            element={
              <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
                <FacultyDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/registrar"
            element={
              <ProtectedRoute allowedRoles={[ROLES.REGISTRAR]}>
                <RegistrarDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/program-office"
            element={
              <ProtectedRoute allowedRoles={[ROLES.PROGRAM_OFFICE]}>
                <ProgramOfficeDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;