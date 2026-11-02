import React from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';

interface QueryBoundaryProps {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  children: React.ReactNode;
  skeletonType?: 'card' | 'table' | 'stats' | 'heatmap';
}

export const QueryBoundary: React.FC<QueryBoundaryProps> = ({
  isLoading,
  isError,
  error,
  onRetry,
  isEmpty,
  emptyTitle = 'No data available',
  emptyMessage = 'There are currently no records to display. Complete practice exercises to generate your learning profile.',
  emptyAction,
  children,
  skeletonType = 'card',
}) => {
  if (isLoading) {
    if (skeletonType === 'stats') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-standard p-5 h-28 bg-surface/60">
              <div className="h-3 w-20 bg-line/80 rounded mb-4" />
              <div className="h-8 w-28 bg-line rounded" />
            </div>
          ))}
        </div>
      );
    }

    if (skeletonType === 'table') {
      return (
        <div className="card-standard p-6 animate-pulse space-y-4">
          <div className="h-5 w-40 bg-line rounded mb-6" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-full bg-paper-2/60 rounded flex items-center px-4 gap-4">
              <div className="h-3 w-16 bg-line rounded" />
              <div className="h-3 w-48 bg-line rounded flex-1" />
              <div className="h-3 w-20 bg-line rounded" />
            </div>
          ))}
        </div>
      );
    }

    // Default card skeleton shaped like dashboard layout
    return (
      <div className="card-standard p-8 animate-pulse space-y-6">
        <div className="h-6 w-1/3 bg-line rounded" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-paper-2 rounded" />
          <div className="h-4 w-5/6 bg-paper-2 rounded" />
          <div className="h-4 w-2/3 bg-paper-2 rounded" />
        </div>
        <div className="h-48 w-full bg-line/40 rounded-card" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card-standard p-8 border-terracotta/30 bg-terracotta/5 flex flex-col items-center text-center">
        <div className="h-12 w-12 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="font-display text-xl text-ink">Unable to load data</h3>
        <p className="mt-2 text-sm text-muted max-w-md">
          {error?.message || 'An unexpected error occurred while communicating with the server.'}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper hover:opacity-90"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Request
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="card-standard p-12 text-center flex flex-col items-center">
        <div className="h-12 w-12 rounded-full bg-paper-2 text-muted flex items-center justify-center mb-4">
          <Inbox className="h-6 w-6" />
        </div>
        <h3 className="font-display text-xl text-ink">{emptyTitle}</h3>
        <p className="mt-2 text-sm text-muted max-w-md">{emptyMessage}</p>
        {emptyAction && (
          <button
            type="button"
            onClick={emptyAction.onClick}
            className="mt-6 btn-primary"
          >
            {emptyAction.label}
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
