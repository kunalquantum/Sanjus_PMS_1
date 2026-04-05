import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/auth/LoginPage';
import { DashboardHome } from '../pages/dashboards/DashboardPages';
import {
  AcademicRecordsPage,
  AdminSettingsPage,
  AlertsPage,
  AttendancePage,
  AuditLogsPage,
  ExpenseUploadPage,
  ExpenseVerificationPage,
  FundDisbursementPage,
  FundUtilizationPage,
  MyScholarshipPage,
  NotificationsPage,
  ProgramsPage,
  ReportsPage,
  StudentManagementPage,
  StudentProfilePage,
  StudentsImpactPage,
  UserManagementPage,
} from '../pages/modules/ModulePages';

const accessMap = {
  '/users': ['ADMIN'],
  '/students': ['ADMIN', 'PROJECT_MANAGER', 'TEACHER', 'FUNDER'],
  '/students/:studentId': ['ADMIN', 'PROJECT_MANAGER', 'TEACHER'],
  '/attendance': ['PROJECT_MANAGER', 'TEACHER', 'STUDENT'],
  '/academics': ['PROJECT_MANAGER', 'TEACHER', 'STUDENT'],
  '/programs': ['ADMIN', 'FUNDER'],
  '/funds': ['ADMIN', 'PROJECT_MANAGER'],
  '/expenses': ['STUDENT'],
  '/expense-verification': ['ADMIN', 'PROJECT_MANAGER'],
  '/alerts': ['ADMIN', 'PROJECT_MANAGER', 'TEACHER'],
  '/reports': ['ADMIN', 'PROJECT_MANAGER', 'FUNDER'],
  '/audit-logs': ['ADMIN'],
  '/notifications': ['STUDENT'],
  '/my-scholarship': ['STUDENT'],
  '/students-impact': ['FUNDER'],
  '/fund-utilization': ['FUNDER'],
  '/settings': ['ADMIN'],
};

const RoleRoute = ({ allowedRoles, children }) => {
  const { role } = useAuth();
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const ShellRoutes = () => (
  <AppShell>
    <Routes>
      <Route path="/" element={<DashboardHome />} />
      <Route path="/users" element={<RoleRoute allowedRoles={accessMap['/users']}><UserManagementPage /></RoleRoute>} />
      <Route path="/students" element={<RoleRoute allowedRoles={accessMap['/students']}><StudentManagementPage /></RoleRoute>} />
      <Route path="/students/:studentId" element={<RoleRoute allowedRoles={accessMap['/students/:studentId']}><StudentProfilePage /></RoleRoute>} />
      <Route path="/attendance" element={<RoleRoute allowedRoles={accessMap['/attendance']}><AttendancePage /></RoleRoute>} />
      <Route path="/academics" element={<RoleRoute allowedRoles={accessMap['/academics']}><AcademicRecordsPage /></RoleRoute>} />
      <Route path="/programs" element={<RoleRoute allowedRoles={accessMap['/programs']}><ProgramsPage /></RoleRoute>} />
      <Route path="/funds" element={<RoleRoute allowedRoles={accessMap['/funds']}><FundDisbursementPage /></RoleRoute>} />
      <Route path="/expenses" element={<RoleRoute allowedRoles={accessMap['/expenses']}><ExpenseUploadPage /></RoleRoute>} />
      <Route path="/expense-verification" element={<RoleRoute allowedRoles={accessMap['/expense-verification']}><ExpenseVerificationPage /></RoleRoute>} />
      <Route path="/alerts" element={<RoleRoute allowedRoles={accessMap['/alerts']}><AlertsPage /></RoleRoute>} />
      <Route path="/reports" element={<RoleRoute allowedRoles={accessMap['/reports']}><ReportsPage /></RoleRoute>} />
      <Route path="/audit-logs" element={<RoleRoute allowedRoles={accessMap['/audit-logs']}><AuditLogsPage /></RoleRoute>} />
      <Route path="/notifications" element={<RoleRoute allowedRoles={accessMap['/notifications']}><NotificationsPage /></RoleRoute>} />
      <Route path="/my-scholarship" element={<RoleRoute allowedRoles={accessMap['/my-scholarship']}><MyScholarshipPage /></RoleRoute>} />
      <Route path="/students-impact" element={<RoleRoute allowedRoles={accessMap['/students-impact']}><StudentsImpactPage /></RoleRoute>} />
      <Route path="/fund-utilization" element={<RoleRoute allowedRoles={accessMap['/fund-utilization']}><FundUtilizationPage /></RoleRoute>} />
      <Route path="/settings" element={<RoleRoute allowedRoles={accessMap['/settings']}><AdminSettingsPage /></RoleRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AppShell>
);

const App = () => {
  const location = useLocation();
  const { authenticated } = useAuth();

  if (!authenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  if (authenticated && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ShellRoutes />} />
    </Routes>
  );
};

export default App;
