import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/api/types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRole: UserRole;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRole }) => {
  const { user, isAuthenticated, setNotice } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user && user.role !== allowedRole) {
      if (user.role === 'student') {
        setNotice('Faculty pages are not available to your student account.');
      } else if (user.role === 'faculty') {
        setNotice('Student individual dashboard routes are not directly available to faculty. Please use the Cohort view.');
      }
    }
  }, [isAuthenticated, user, allowedRole, setNotice]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== allowedRole) {
    // Redirect student trying faculty to /student, faculty trying student to /faculty
    const fallbackPath = user.role === 'student' ? '/student' : '/faculty';
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
