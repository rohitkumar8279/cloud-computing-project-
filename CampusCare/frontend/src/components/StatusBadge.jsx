import { CheckCircle2, Clock, Loader, XCircle } from 'lucide-react';
import { STATUS_META } from '../utils/constants';
import { cn } from '../utils/format';

const ICONS = { PENDING: Clock, IN_PROGRESS: Loader, RESOLVED: CheckCircle2, REJECTED: XCircle };

// Status is always shown as icon + text, never color alone.
export default function StatusBadge({ status, className }) {
  const meta = STATUS_META[status] || { label: status, badge: 'bg-gray-50 text-gray-700 ring-gray-500/20' };
  const Icon = ICONS[status] || Clock;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        meta.badge,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
