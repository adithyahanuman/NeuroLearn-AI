import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RoleGuard } from '@/components/RoleGuard';

// Code-split route groups so bundles remain strictly separated
const LandingPage = lazy(() =>
  import('@/pages/landing/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

// Student Route Group
const StudentOverview = lazy(() =>
  import('@/pages/student/StudentOverview').then((m) => ({ default: m.StudentOverview }))
);
const StudentMastery = lazy(() =>
  import('@/pages/student/StudentMastery').then((m) => ({ default: m.StudentMastery }))
);
const StudentRisks = lazy(() =>
  import('@/pages/student/StudentRisks').then((m) => ({ default: m.StudentRisks }))
);
const StudentRootGaps = lazy(() =>
  import('@/pages/student/StudentRootGaps').then((m) => ({ default: m.StudentRootGaps }))
);
const StudentPath = lazy(() =>
  import('@/pages/student/StudentPath').then((m) => ({ default: m.StudentPath }))
);
const StudentGraph = lazy(() =>
  import('@/pages/student/StudentGraph').then((m) => ({ default: m.StudentGraph }))
);
const StudentProgress = lazy(() =>
  import('@/pages/student/StudentProgress').then((m) => ({ default: m.StudentProgress }))
);
const StudentConceptDetail = lazy(() =>
  import('@/pages/student/StudentConceptDetail').then((m) => ({ default: m.StudentConceptDetail }))
);

// Faculty Route Group
const FacultyOverview = lazy(() =>
  import('@/pages/faculty/FacultyOverview').then((m) => ({ default: m.FacultyOverview }))
);
const FacultyStudents = lazy(() =>
  import('@/pages/faculty/FacultyStudents').then((m) => ({ default: m.FacultyStudents }))
);
const FacultyStudentDetail = lazy(() =>
  import('@/pages/faculty/FacultyStudentDetail').then((m) => ({ default: m.FacultyStudentDetail }))
);
const FacultyAlerts = lazy(() =>
  import('@/pages/faculty/FacultyAlerts').then((m) => ({ default: m.FacultyAlerts }))
);
const FacultyCommonGaps = lazy(() =>
  import('@/pages/faculty/FacultyCommonGaps').then((m) => ({ default: m.FacultyCommonGaps }))
);
const FacultyMastery = lazy(() =>
  import('@/pages/faculty/FacultyMastery').then((m) => ({ default: m.FacultyMastery }))
);
const FacultyModel = lazy(() =>
  import('@/pages/faculty/FacultyModel').then((m) => ({ default: m.FacultyModel }))
);
const FacultyResources = lazy(() =>
  import('@/pages/faculty/FacultyResources').then((m) => ({ default: m.FacultyResources }))
);

const PageFallback = () => (
  <div className="min-h-screen bg-paper flex items-center justify-center p-6">
    <div className="flex items-center gap-3 text-muted text-sm font-mono-numbers">
      <span className="h-2 w-2 rounded-full bg-lagoon animate-ping" />
      <span>Loading experience...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Student Route Group */}
        <Route
          path="/student"
          element={
            <RoleGuard allowedRole="student">
              <StudentOverview />
            </RoleGuard>
          }
        />
        <Route
          path="/student/mastery"
          element={
            <RoleGuard allowedRole="student">
              <StudentMastery />
            </RoleGuard>
          }
        />
        <Route
          path="/student/risks"
          element={
            <RoleGuard allowedRole="student">
              <StudentRisks />
            </RoleGuard>
          }
        />
        <Route
          path="/student/root-gaps"
          element={
            <RoleGuard allowedRole="student">
              <StudentRootGaps />
            </RoleGuard>
          }
        />
        <Route
          path="/student/path"
          element={
            <RoleGuard allowedRole="student">
              <StudentPath />
            </RoleGuard>
          }
        />
        <Route
          path="/student/graph"
          element={
            <RoleGuard allowedRole="student">
              <StudentGraph />
            </RoleGuard>
          }
        />
        <Route
          path="/student/progress"
          element={
            <RoleGuard allowedRole="student">
              <StudentProgress />
            </RoleGuard>
          }
        />
        <Route
          path="/student/marks"
          element={
            <RoleGuard allowedRole="student">
              <StudentProgress />
            </RoleGuard>
          }
        />
        <Route
          path="/student/concept/:id"
          element={
            <RoleGuard allowedRole="student">
              <StudentConceptDetail />
            </RoleGuard>
          }
        />
        <Route
          path="/student/concepts/:id"
          element={
            <RoleGuard allowedRole="student">
              <StudentConceptDetail />
            </RoleGuard>
          }
        />

        {/* Faculty Route Group */}
        <Route
          path="/faculty"
          element={
            <RoleGuard allowedRole="faculty">
              <FacultyOverview />
            </RoleGuard>
          }
        />
        <Route
          path="/faculty/students"
          element={
            <RoleGuard allowedRole="faculty">
              <FacultyStudents />
            </RoleGuard>
          }
        />
        <Route
          path="/faculty/students/:id"
          element={
            <RoleGuard allowedRole="faculty">
              <FacultyStudentDetail />
            </RoleGuard>
          }
        />
        <Route
          path="/faculty/alerts"
          element={
            <RoleGuard allowedRole="faculty">
              <FacultyAlerts />
            </RoleGuard>
          }
        />
        <Route
          path="/faculty/gaps"
          element={
            <RoleGuard allowedRole="faculty">
              <FacultyCommonGaps />
            </RoleGuard>
          }
        />
        <Route
          path="/faculty/mastery"
          element={
            <RoleGuard allowedRole="faculty">
              <FacultyMastery />
            </RoleGuard>
          }
        />
        <Route
          path="/faculty/model"
          element={
            <RoleGuard allowedRole="faculty">
              <FacultyModel />
            </RoleGuard>
          }
        />
        <Route
          path="/faculty/resources"
          element={
            <RoleGuard allowedRole="faculty">
              <FacultyResources />
            </RoleGuard>
          }
        />

        {/* Fallback & Not Found */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};
