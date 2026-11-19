import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute, { HomeRedirect } from './components/ProtectedRoute';
import { PageLoader } from './components/Feedback';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import NotFound from './pages/NotFound';

// Route-level code splitting keeps the first load small.
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const NewComplaint = lazy(() => import('./pages/student/NewComplaint'));
const MyComplaints = lazy(() => import('./pages/student/MyComplaints'));
const ComplaintDetail = lazy(() => import('./pages/student/ComplaintDetail'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminComplaints = lazy(() => import('./pages/admin/AdminComplaints'));
const AdminComplaintDetail = lazy(() => import('./pages/admin/AdminComplaintDetail'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: '14px' } }} />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />

            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>

            <Route element={<ProtectedRoute role="student" />}>
              <Route path="/student" element={<DashboardLayout role="student" />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="complaints" element={<MyComplaints />} />
                <Route path="complaints/new" element={<NewComplaint />} />
                <Route path="complaints/:complaintId" element={<ComplaintDetail />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute role="admin" />}>
              <Route path="/admin" element={<DashboardLayout role="admin" />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="complaints" element={<AdminComplaints />} />
                <Route path="complaints/:complaintId" element={<AdminComplaintDetail />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
