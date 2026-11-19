import { departmentLabel } from '../utils/constants';
import { formatDateTime } from '../utils/format';
import StatusBadge from './StatusBadge';

export default function StatusTimeline({ history = [] }) {
  if (!history.length) return <p className="text-sm text-gray-500">No history yet.</p>;
  const items = [...history].reverse(); // newest first
  return (
    <ol className="relative space-y-5 border-l border-gray-200 pl-5">
      {items.map((h, i) => (
        <li key={`${h.at}-${i}`} className="relative">
          <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-600 ring-1 ring-blue-200" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={h.status} />
            <span className="text-xs text-gray-500">
              {formatDateTime(h.at)} &middot; {h.by}
            </span>
          </div>
          {h.department && (
            <p className="mt-1 text-xs text-gray-500">Department: {departmentLabel(h.department)}</p>
          )}
          {h.note && <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}
