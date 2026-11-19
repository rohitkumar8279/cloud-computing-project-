import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../utils/format';

export function Spinner({ className }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-blue-600', className)} aria-label="Loading" />;
}

export function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-gray-500">
      <Spinner className="h-7 w-7" />
      {label}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="rounded-full bg-gray-100 p-3">
        <Icon className="h-6 w-6 text-gray-500" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-gray-900">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-gray-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="rounded-full bg-red-50 p-3">
        <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-gray-900">Could not load data</h3>
      <p className="mt-1 max-w-md text-sm text-gray-500">{error?.message || 'Unexpected error'}</p>
      {onRetry && (
        <button type="button" className="btn-secondary mt-5" onClick={() => onRetry()}>
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      )}
    </div>
  );
}
