import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Loader2, UserPlus, CheckCircle2 } from 'lucide-react';
import InkBackground from '@/components/kokonutui/ink-background';
import { useAuth } from '@/context/AuthContext';
import { ClientError } from '@/api/client';

export const RegisterPage: React.FC = () => {
  const { register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cohortId, setCohortId] = useState('cohort-a');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = user.role === 'student' ? '/student' : '/faculty';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (name.trim().length === 0) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await register(name.trim(), email.trim(), password, cohortId || undefined);
      // New user is automatically a student -> navigate directly to student dashboard
      const destination = res.user.role === 'student' ? '/student' : '/faculty';
      navigate(destination, { replace: true });
    } catch (err) {
      if (err instanceof ClientError) {
        if (err.status === 409 || err.code === 'EMAIL_ALREADY_EXISTS') {
          setErrorMessage('An account with this email already exists. Please sign in instead.');
        } else {
          setErrorMessage(err.message || 'Registration failed. Please check your details.');
        }
      } else {
        setErrorMessage('Unable to complete registration. Please check your network connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col lg:flex-row">
      {/* Left Column: Ink Background & Serif Statement */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-paper-2 flex-col justify-between p-12 border-r border-line overflow-hidden">
        <Link
          to="/login"
          className="relative z-20 inline-flex items-center gap-2 text-xs font-mono-numbers uppercase tracking-wider text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Sign In
        </Link>

        {/* Ambient WebGL Ink canvas */}
        <div className="absolute inset-0 z-10 opacity-70">
          <InkBackground
            text="Trace the true root gap."
            textCenterRatio={0.22}
            accent="#2B7A78"
            className="h-full min-h-full bg-paper-2"
          />
        </div>

        {/* Positioned comfortably below the background text */}
        <div className="relative z-20 max-w-md mt-auto pt-20 pb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1 text-xs font-mono-numbers text-muted backdrop-blur-md mb-4 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
            <span>Autonomous Calibration Engine</span>
          </div>
          <h2 className="font-display text-4xl leading-tight text-ink">
            “Your personal twin learns how you think.”
          </h2>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            Create an account to calibrate your prerequisite knowledge graph and receive real-time, adaptive exercise and video recommendations.
          </p>

          <div className="mt-6 flex flex-col gap-2 text-xs font-mono-numbers text-muted">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-lagoon" />
              <span>Instant knowledge baseline initialization</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-lagoon" />
              <span>Automated prerequisite root-cause detection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-lagoon" />
              <span>Adaptive walkthroughs tailored to test scores</span>
            </div>
          </div>
        </div>

        <div className="relative z-20 text-xs font-mono-numbers text-muted pt-2">
          v1.0-synthetic · NeuroLearn OS
        </div>
      </div>

      {/* Right Column: Register Card */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-20">
        <div className="w-full max-w-md">
          {/* Mobile Back Link */}
          <Link
            to="/login"
            className="lg:hidden inline-flex items-center gap-2 text-xs font-mono-numbers text-muted hover:text-ink mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </Link>

          {/* Registration Card */}
          <div className="card-standard p-8 sm:p-10 bg-surface shadow-card">
            <div className="mb-6">
              <span className="text-xs uppercase tracking-wider text-muted font-mono-numbers">
                Student Enrollment
              </span>
              <h2 className="font-display text-3xl text-ink mt-1">
                Create your account
              </h2>
              <p className="text-xs text-muted mt-1.5">
                Register as a student to initialize your personalized digital learning twin and targeted practice path.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-terracotta/30 bg-terracotta/10 p-3 text-xs text-terracotta"
              >
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="register-name"
                  className="block text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="register-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya Chen"
                  className="input-standard font-sans text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="register-email"
                  className="block text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="input-standard font-sans text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="register-password"
                  className="block text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers mb-1.5"
                >
                  Password (min. 6 characters)
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-standard font-sans text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-ink"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="register-cohort"
                  className="block text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers mb-1.5"
                >
                  Assigned Cohort
                </label>
                <select
                  id="register-cohort"
                  value={cohortId}
                  onChange={(e) => setCohortId(e.target.value)}
                  className="input-standard font-sans text-sm bg-surface cursor-pointer"
                >
                  <option value="cohort-a">Cohort A (CS101 Fall)</option>
                  <option value="cohort-b">Cohort B (Data Structures Spring)</option>
                  <option value="cohort-c">Cohort C (Algorithms Lab)</option>
                </select>
              </div>

              <button
                id="register-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary py-3 text-sm font-medium mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Digital Twin...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create Account & Launch Twin
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-xs text-muted">Already have an account? </span>
              <Link
                id="go-to-login-link"
                to="/login"
                className="text-xs font-medium text-lagoon hover:underline"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

