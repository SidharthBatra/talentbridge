import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { NotificationsProvider } from './components/NotificationsProvider';
import { Toaster } from './components/Toaster';
import { ProtectedRoute, roleHome } from './routes/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import { Role } from './types';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

import { CandidateLayout } from './pages/candidate/CandidateLayout';
import { FindJobsPage } from './pages/candidate/FindJobsPage';
import { JobDetailsPage } from './pages/candidate/JobDetailsPage';
import { MyApplicationsPage } from './pages/candidate/MyApplicationsPage';

import { RecruiterLayout } from './pages/recruiter/RecruiterLayout';
import { PostingsListPage } from './pages/recruiter/PostingsListPage';
import { JobFormPage } from './pages/recruiter/JobFormPage';
import { ApplicationsForJobPage } from './pages/recruiter/ApplicationsForJobPage';
import { OfferResponsesPage } from './pages/recruiter/OfferResponsesPage';

import { HiringManagerLayout } from './pages/hiring-manager/HiringManagerLayout';
import { ShortlistPage } from './pages/hiring-manager/ShortlistPage';

import { AdminLayout } from './pages/admin/AdminLayout';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';

function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={user ? roleHome(user.role) : '/login'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <NotificationsProvider />
      <Toaster />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/candidate"
          element={
            <ProtectedRoute allow={[Role.CANDIDATE]}>
              <CandidateLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="jobs" replace />} />
          <Route path="jobs" element={<FindJobsPage />} />
          <Route path="jobs/:id" element={<JobDetailsPage />} />
          <Route path="applications" element={<MyApplicationsPage />} />
        </Route>

        <Route
          path="/recruiter"
          element={
            <ProtectedRoute allow={[Role.RECRUITER, Role.ADMIN]}>
              <RecruiterLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="jobs" replace />} />
          <Route path="jobs" element={<PostingsListPage />} />
          <Route path="jobs/new" element={<JobFormPage />} />
          <Route path="jobs/:id/edit" element={<JobFormPage />} />
          <Route path="jobs/:id/applications" element={<ApplicationsForJobPage />} />
          <Route path="offers" element={<OfferResponsesPage />} />
        </Route>

        <Route
          path="/hiring-manager"
          element={
            <ProtectedRoute allow={[Role.HIRING_MANAGER, Role.ADMIN]}>
              <HiringManagerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="shortlist" replace />} />
          <Route path="shortlist" element={<ShortlistPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={[Role.ADMIN]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
