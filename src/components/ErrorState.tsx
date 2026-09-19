import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
        <AlertCircle size={26} className="text-red-500" />
      </div>
      <p className="font-semibold text-[--color-text]">Something went wrong</p>
      <p className="text-sm text-[--color-text-secondary] mt-1 max-w-xs">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary btn-sm mt-4">
          <RotateCcw size={14} />
          Try Again
        </button>
      )}
    </div>
  );
}
