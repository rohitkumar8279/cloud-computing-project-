import { Link } from 'react-router-dom';
import { ChevronRight, Paperclip } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { categoryLabel, departmentLabel } from '../utils/constants';
import { formatDate, shortId } from '../utils/format';

/**
 * Responsive complaint list: a table on desktop, stacked cards on mobile.
 * `variant="admin"` adds the student and department columns.
 */
export default function ComplaintTable({ items, linkTo, variant = 'student', hasUpdate }) {
  const admin = variant === 'admin';
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-th">ID</th>
              <th className="table-th">Title</th>
              {admin && <th className="table-th">Student</th>}
              <th className="table-th">Category</th>
              {admin && <th className="table-th">Department</th>}
              <th className="table-th">Submitted</th>
              <th className="table-th">Status</th>
              <th className="table-th">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.map((c) => (
              <tr key={c.complaintId} className="hover:bg-gray-50">
                <td className="table-td font-mono text-xs text-gray-500">{shortId(c.complaintId)}</td>
                <td className="table-td max-w-xs">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-gray-900" title={c.title}>
                      {c.title}
                    </span>
                    {c.hasAttachment && <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-label="Has image" />}
                    {hasUpdate?.(c) && (
                      <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                        Updated
                      </span>
                    )}
                  </div>
                </td>
                {admin && (
                  <td className="table-td">
                    <div className="text-gray-900">{c.studentName}</div>
                    <div className="text-xs text-gray-500">{c.studentEmail}</div>
                  </td>
                )}
                <td className="table-td">{categoryLabel(c.category)}</td>
                {admin && <td className="table-td">{departmentLabel(c.department)}</td>}
                <td className="table-td">{formatDate(c.createdAt)}</td>
                <td className="table-td">
                  <StatusBadge status={c.status} />
                </td>
                <td className="table-td text-right">
                  <Link to={linkTo(c)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                    {admin ? 'Manage' : 'View'} <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-gray-100 md:hidden">
        {items.map((c) => (
          <li key={c.complaintId}>
            <Link to={linkTo(c)} className="flex items-start gap-3 px-4 py-4 hover:bg-gray-50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-gray-900">{c.title}</p>
                  {hasUpdate?.(c) && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Updated" />}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {shortId(c.complaintId)} &middot; {categoryLabel(c.category)} &middot; {formatDate(c.createdAt)}
                </p>
                {admin && <p className="mt-0.5 text-xs text-gray-500">{c.studentName}</p>}
                <StatusBadge status={c.status} className="mt-2" />
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
