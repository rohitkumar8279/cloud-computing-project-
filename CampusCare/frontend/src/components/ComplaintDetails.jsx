import { useState } from 'react';
import { ExternalLink, ImageOff } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { categoryLabel, departmentLabel } from '../utils/constants';
import { formatDateTime, shortId } from '../utils/format';

/** Read-only complaint information shared by the student and admin views. */
export function ComplaintSummary({ complaint, showStudent }) {
  const rows = [
    ['Complaint ID', <span className="font-mono text-xs" title={complaint.complaintId}>{shortId(complaint.complaintId)}</span>],
    ['Status', <StatusBadge status={complaint.status} />],
    ['Category', categoryLabel(complaint.category)],
    ['Department', departmentLabel(complaint.department)],
    ['Location', complaint.location || '-'],
    ['Assigned to', complaint.assignedTo || 'Not assigned yet'],
    ['Submitted', formatDateTime(complaint.createdAt)],
    ['Last updated', formatDateTime(complaint.updatedAt)],
  ];
  if (showStudent) rows.splice(1, 0, ['Student', `${complaint.studentName} (${complaint.studentEmail})`]);
  return (
    <dl className="divide-y divide-gray-100">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-3 gap-4 py-3">
          <dt className="text-sm text-gray-500">{k}</dt>
          <dd className="col-span-2 break-words text-sm text-gray-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Attachment({ complaint, onRefresh }) {
  // If the short-lived URL has expired, fetch a fresh one - but only once.
  const [retried, setRetried] = useState(false);
  const handleError = () => {
    if (!retried && onRefresh) {
      setRetried(true);
      onRefresh();
    }
  };

  if (!complaint.attachmentKey) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500">
        <ImageOff className="h-4 w-4" /> No image attached
      </div>
    );
  }
  return (
    <div>
      <a href={complaint.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={complaint.attachmentUrl}
          alt="Complaint attachment"
          className="max-h-96 w-full rounded-lg border border-gray-200 bg-gray-50 object-contain"
          onError={handleError}
        />
      </a>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Private image &middot; secure link expires in {Math.round((complaint.attachmentUrlExpiresIn || 300) / 60)} min</span>
        <a
          href={complaint.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
        >
          Open <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
