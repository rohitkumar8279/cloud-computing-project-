import { cn } from '../utils/format';

const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  gray: 'bg-gray-100 text-gray-600',
};

export default function StatCard({ label, value, icon: Icon, tone = 'blue', hint, loading }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-100" />
          ) : (
            <p className="mt-1 text-3xl font-semibold tabular-nums text-gray-900">{value}</p>
          )}
          {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn('rounded-lg p-2.5', TONES[tone])}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}
