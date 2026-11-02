import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AttemptDrawer } from '@/components/student/AttemptDrawer';
import {
  LayoutDashboard,
  BrainCircuit,
  AlertTriangle,
  GitBranch,
  Route,
  Network,
  TrendingUp,
  Users,
  Bell,
  SlidersHorizontal,
  Info,
  LogOut,
  Menu,
  X,
  PlusCircle,
  Clock,
  Sparkles,
  Award,
  Video,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const studentNavItems: NavItem[] = [
  { name: 'Overview', href: '/student', icon: LayoutDashboard },
  { name: 'Subject Marks & Videos', href: '/student/marks', icon: Award },
  { name: 'Mastery', href: '/student/mastery', icon: BrainCircuit },
  { name: 'Risks & Reasons', href: '/student/risks', icon: AlertTriangle },
  { name: 'Root Gaps', href: '/student/root-gaps', icon: GitBranch },
  { name: 'Learning Path', href: '/student/path', icon: Route },
  { name: 'Knowledge Graph', href: '/student/graph', icon: Network },
  { name: 'Progress & Twin', href: '/student/progress', icon: TrendingUp },
];

const facultyNavItems: NavItem[] = [
  { name: 'Overview', href: '/faculty', icon: LayoutDashboard },
  { name: 'Students', href: '/faculty/students', icon: Users },
  { name: 'Subject Videos & Curricula', href: '/faculty/resources', icon: Video },
  { name: 'Alerts', href: '/faculty/alerts', icon: Bell },
  { name: 'Common Gaps', href: '/faculty/gaps', icon: GitBranch },
  { name: 'Cohort Mastery', href: '/faculty/mastery', icon: BrainCircuit },
  { name: 'About the Model', href: '/faculty/model', icon: Info },
];

interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
  stale?: boolean;
  selectedCohort?: string;
  onCohortChange?: (cohortId: string) => void;
  availableCohorts?: { id: string; name: string }[];
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  children,
  title,
  stale = false,
  selectedCohort,
  onCohortChange,
  availableCohorts = [],
}) => {
  const { user, logout, notice, setNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [attemptDrawerOpen, setAttemptDrawerOpen] = useState(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState<'log' | 'marks' | 'history'>('log');

  const isStudent = user?.role === 'student';
  const navItems = isStudent ? studentNavItems : facultyNavItems;

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'NL';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex">
      {/* Attempt Drawer (Student action) */}
      {isStudent && (
        <AttemptDrawer
          isOpen={attemptDrawerOpen}
          initialTab={drawerInitialTab}
          onClose={() => setAttemptDrawerOpen(false)}
        />
      )}

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar (240px, paper-2, 1px right rule) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-paper-2 border-r border-line flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-line">
            <NavLink to="/" className="flex items-center gap-2 group">
              <span className="h-7 w-7 rounded-full bg-lagoon flex items-center justify-center text-paper font-semibold text-xs shadow-sm">
                N
              </span>
              <span className="font-display text-2xl tracking-tight text-ink group-hover:text-lagoon transition-colors">
                NeuroLearn
              </span>
            </NavLink>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-muted hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="p-3">
            <div className="px-3 py-2 text-[11px] font-mono-numbers uppercase tracking-wider text-muted">
              {isStudent ? 'Student Workspace' : 'Faculty Cohorts'}
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/student' || item.href === '/faculty'
                    ? location.pathname === item.href
                    : location.pathname.startsWith(item.href);

                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-ink text-paper shadow-sm'
                        : 'text-ink/80 hover:bg-paper hover:text-ink'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        isActive ? 'text-paper' : 'text-muted group-hover:text-ink'
                      }`}
                    />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Footer Block */}
        <div className="p-4 border-t border-line bg-paper-2/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-paper border border-line flex items-center justify-center font-mono-numbers text-xs font-semibold text-lagoon shrink-0">
                {getInitials(user?.name)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-ink truncate">
                  {user?.name || 'User'}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-lagoon" />
                  <span className="text-[10px] font-mono-numbers uppercase tracking-wider text-muted capitalize">
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 rounded-full text-muted hover:text-terracotta hover:bg-paper transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-60 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="h-16 border-b border-line bg-paper/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted hover:text-ink hover:bg-paper-2"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display text-2xl text-ink leading-tight">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Faculty Cohort Switcher */}
            {!isStudent && availableCohorts.length > 0 && (
              <div className="flex items-center gap-2 text-xs font-mono-numbers">
                <span className="text-muted hidden sm:inline">Cohort:</span>
                <select
                  value={selectedCohort || availableCohorts[0]?.id}
                  onChange={(e) => onCohortChange && onCohortChange(e.target.value)}
                  className="rounded-full border border-line bg-surface py-1.5 px-3 text-xs text-ink outline-none focus:ring-1 focus:ring-lagoon"
                >
                  {availableCohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Student Action Buttons */}
            {isStudent && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="header-add-marks-btn"
                  onClick={() => {
                    setDrawerInitialTab('marks');
                    setAttemptDrawerOpen(true);
                  }}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm border-lagoon/40 text-lagoon hover:bg-lagoon-subtle"
                >
                  <Award className="h-3.5 w-3.5 text-lagoon" />
                  <span>Add Subject Marks</span>
                </button>

                <button
                  type="button"
                  id="header-log-attempt-btn"
                  onClick={() => {
                    setDrawerInitialTab('log');
                    setAttemptDrawerOpen(true);
                  }}
                  className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 shadow-sm"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Log Attempt</span>
                </button>
              </div>
            )}

            {/* Last updated indicator */}
            <div className="hidden md:flex items-center gap-1.5 text-xs font-mono-numbers text-muted">
              <Clock className="h-3.5 w-3.5" />
              <span>Synced</span>
            </div>
          </div>
        </header>

        {/* Stale Prediction Notice (thin rule plus text when stale is true) */}
        {stale && (
          <div className="border-b border-amber/30 bg-amber-subtle px-6 py-2 flex items-center justify-between text-xs text-amber font-mono-numbers">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber animate-pulse" />
              <span>Predictions reflect prior model checkpoint. New exercise attempts pending background recalculation.</span>
            </div>
            <span>Stale Mode</span>
          </div>
        )}

        {/* Notice Banner (e.g. redirected from forbidden role) */}
        {notice && (
          <div className="border-b border-line bg-paper-2 px-6 py-2.5 flex items-center justify-between text-xs text-ink">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-muted hover:text-ink font-semibold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-10 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
