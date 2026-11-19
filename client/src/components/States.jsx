// Loading, error and empty states used across pages.
import { AlertTriangle, Inbox, Loader2, RotateCw } from "lucide-react";

export function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Loader2 className="animate-spin text-brand-600" size={32} aria-label="Loading" />
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <AlertTriangle className="text-red-500" size={28} />
      <p className="max-w-md text-sm text-red-800">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100">
          <RotateCw size={15} /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-navy-500">
      <Inbox size={22} className="text-navy-300" />
      {children}
    </div>
  );
}

// Grey placeholder blocks shown while data loads
export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-navy-100 ${className}`} />;
}
