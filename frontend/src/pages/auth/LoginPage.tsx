import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import InkBackground from '@/components/kokonutui/ink-background';
import { useAuth } from '@/context/AuthContext';
import { ClientError } from '@/api/client';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    setIsLoading(true);

    try {
      const res = await login(email, password);
      const destination =
        (location.state as { from?: { pathname: string } })?.from?.pathname ||
        (res.user.role === 'student' ? '/student' : '/faculty');
      navigate(destination, { replace: true });
    } catch (err) {
      if (err instanceof ClientError) {
        if (err.status === 429) {
          setErrorMessage('Too many login attempts. Please wait 60 seconds before trying again.');
        } else {
          // Section 6.2 rule: same error message for wrong email or wrong password
          setErrorMessage('Invalid email or password.');
        }
      } else {
        setErrorMessage('Unable to connect to service. Please check your network.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col lg:flex-row">
      {/* Left Column: Ink Background & Serif Statement */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-paper-2 flex-col justify-between p-12 border-r border-line overflow-hidden">
        <Link
          to="/"
          className="relative z-20 inline-flex items-center gap-2 text-xs font-mono-numbers uppercase tracking-wider text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Overview
        </Link>

        {/* Ambient WebGL Ink canvas positioned high */}
        <div className="absolute inset-0 z-10 opacity-70">
          <InkBackground
            text="Anticipate the struggle."
            textCenterRatio={0.22}
            accent="#E2674A"
            className="h-full min-h-full bg-paper-2"
          />
        </div>

        {/* Positioned down comfortably below the background text */}
        <div className="relative z-20 max-w-md mt-auto pt-20 pb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1 text-xs font-mono-numbers text-muted backdrop-blur-md mb-4 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-lagoon" />
            <span>Digital Learning Twin Engine</span>
          </div>
          <h2 className="font-display text-4xl leading-tight text-ink">
            “The weak spot is rarely where it hurts.”
          </h2>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            NeuroLearn traces concept struggle past symptoms to find the true missing prerequisite in your knowledge graph.
          </p>
        </div>

        <div className="relative z-20 text-xs font-mono-numbers text-muted pt-2">
          v1.0-synthetic · NeuroLearn OS
        </div>
      </div>

      {/* Right Column: Login Card & Demo Chips */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-20">
        <div className="w-full max-w-md">
          {/* Mobile Back Link */}
          <Link
            to="/"
            className="lg:hidden inline-flex items-center gap-2 text-xs font-mono-numbers text-muted hover:text-ink mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Overview
          </Link>

          {/* Allowed Card for Login */}
          <div className="card-standard p-8 sm:p-10 bg-surface shadow-card">
            <div className="mb-6">
              <span className="text-xs uppercase tracking-wider text-muted font-mono-numbers">
                Role-Aware Sign In
              </span>
              <h2 className="font-display text-3xl text-ink mt-1">
                Enter your workspace
              </h2>
              <p className="text-xs text-muted mt-1.5">
                Sign in with your student or faculty credentials to access your calibrated digital twin.
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
                  htmlFor="login-email"
                  className="block text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@neurolearn.ai"
                  className="input-standard font-sans text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium uppercase tracking-wider text-muted font-mono-numbers mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary py-3 text-sm font-medium mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <span className="text-xs text-muted">Don't have an account? </span>
              <Link
                id="go-to-register-link"
                to="/register"
                className="text-xs font-medium text-lagoon hover:underline"
              >
                Create one now
              </Link>
            </div>

            {/* Demo Quick-Fill Chips */}
            <div className="mt-8 pt-6 rule-line">
              <div className="flex items-center gap-1.5 text-xs uppercase font-mono-numbers text-muted mb-3">
                <Sparkles className="h-3.5 w-3.5 text-amber" />
                <span>Quick-fill Demo Accounts</span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="text-[11px] text-muted font-mono-numbers">Student Personas:</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    id="demo1-chip"
                    type="button"
                    onClick={() => handleQuickFill('demo1@neurolearn.ai')}
                    className="rounded-full border border-line bg-paper-2/50 px-2.5 py-1 text-xs text-ink hover:border-ink transition-colors"
                  >
                    Demo 1 · Asha (Arrays Root Gap)
                  </button>
                  <button
                    id="demo2-chip"
                    type="button"
                    onClick={() => handleQuickFill('demo2@neurolearn.ai')}
                    className="rounded-full border border-line bg-paper-2/50 px-2.5 py-1 text-xs text-ink hover:border-ink transition-colors"
                  >
                    Demo 2 · Rahul (High Mastery)
                  </button>
                  <button
                    id="demo3-chip"
                    type="button"
                    onClick={() => handleQuickFill('demo3@neurolearn.ai')}
                    className="rounded-full border border-line bg-paper-2/50 px-2.5 py-1 text-xs text-ink hover:border-ink transition-colors"
                  >
                    Demo 3 · Kiran (Rising Risk)
                  </button>
                  <button
                    id="demo4-chip"
                    type="button"
                    onClick={() => handleQuickFill('demo4@neurolearn.ai')}
                    className="rounded-full border border-line bg-paper-2/50 px-2.5 py-1 text-xs text-ink hover:border-ink transition-colors"
                  >
                    Demo 4 · Dev (Irregular Bursts)
                  </button>
                  <button
                    id="demo5-chip"
                    type="button"
                    onClick={() => handleQuickFill('demo5@neurolearn.ai')}
                    className="rounded-full border border-line bg-paper-2/50 px-2.5 py-1 text-xs text-ink hover:border-ink transition-colors"
                  >
                    Demo 5 · Priya (Low Confidence)
                  </button>
                </div>

                <div className="text-[11px] text-muted font-mono-numbers mt-2">Faculty Account:</div>
                <div>
                  <button
                    id="faculty-chip"
                    type="button"
                    onClick={() => handleQuickFill('faculty@neurolearn.ai')}
                    className="rounded-full border border-lagoon/40 bg-lagoon/10 px-3 py-1 text-xs font-medium text-lagoon hover:bg-lagoon/20 transition-colors"
                  >
                    faculty@neurolearn.ai (Prof. Subramaniam)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
