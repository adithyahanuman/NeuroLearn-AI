import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-center">
      <div className="max-w-md card-standard p-10 bg-surface shadow-card">
        <span className="font-mono-numbers text-xs uppercase tracking-wider text-muted">
          Error 404
        </span>
        <h1 className="font-display text-4xl text-ink mt-2">
          Page Not Found
        </h1>
        <p className="mt-3 text-sm text-muted">
          The requested route does not exist or has been moved to another location.
        </p>
        <Link to="/" className="mt-6 btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Return to Homepage
        </Link>
      </div>
    </div>
  );
};
