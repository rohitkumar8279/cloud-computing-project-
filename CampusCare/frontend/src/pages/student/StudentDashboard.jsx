import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BellRing, CheckCircle2, ClipboardList, Clock, FilePlus2, Loader } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ComplaintTable from '../../components/ComplaintTable';
import { EmptyState, ErrorState, PageLoader } from '../../components/Feedback';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { useSeenUpdates } from '../../hooks/useSeenUpdates';
import { getAllMyComplaints } from '../../services/complaintService';
import { timeAgo } from '../../utils/format';

export default function StudentDashboard() {
  const { user } = useAuth();
  // Re-fetches every 60 s while the tab is visible, so admin status changes show up.
  const { data, loading, error, reload } = useFetch(() => getAllMyComplaints(), [], { refreshMs: 60000 });
  const { hasUpdate } = useSeenUpdates(user.userId);
  const items = useMemo(() => data || [], [data]);

  const counts = useMemo(() => {
    const c = { total: items.length, PENDING: 0, IN_PROGRESS: 0, RESOLVED: 0, REJECTED: 0 };
    items.forEach((i) => (c[i.status] = (c[i.status] || 0) + 1));
    return c;
  }, [items]);

  const updates = useMemo(() => items.filter(hasUpdate), [items, hasUpdate]);
  const toasted = useRef(false);
  useEffect(() => {
    if (!toasted.current && updates.length) {
      toasted.current = true;
      toast(`${updates.length} complaint${updates.length > 1 ? 's have' : ' has'} a status update`, { icon: '🔔' });
    }
  }, [updates.length]);

  if (loading) return <PageLoader label="Loading your dashboard..." />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]}`}
        description="Here is an overview of the complaints you have raised."
        actions={
          <Link to="/student/complaints/new" className="btn-primary">
            <FilePlus2 className="h-4 w-4" /> Submit complaint
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total complaints" value={counts.total} icon={ClipboardList} tone="blue" />
        <StatCard label="Pending" value={counts.PENDING} icon={Clock} tone="amber" />
        <StatCard label="In progress" value={counts.IN_PROGRESS} icon={Loader} tone="indigo" />
        <StatCard
          label="Resolved"
          value={counts.RESOLVED}
          icon={CheckCircle2}
          tone="green"
          hint={counts.REJECTED ? `${counts.REJECTED} rejected` : undefined}
        />
      </div>

      {updates.length > 0 && (
        <div className="card mt-6 border-blue-200 bg-blue-50/50 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
            <BellRing className="h-4 w-4" /> Status updates
          </div>
          <ul className="mt-3 divide-y divide-blue-100">
            {updates.slice(0, 5).map((c) => (
              <li key={c.complaintId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link to={`/student/complaints/${c.complaintId}`} className="text-sm font-medium text-gray-900 hover:text-blue-700">
                  {c.title}
                </Link>
                <span className="flex items-center gap-2 text-xs text-gray-500">
                  <StatusBadge status={c.status} /> {timeAgo(c.lastStatusChangeAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Recent complaints</h2>
          {items.length > 0 && (
            <Link to="/student/complaints" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          )}
        </div>
        {items.length === 0 ? (
          <EmptyState
            title="No complaints yet"
            message="Facing an issue with Wi-Fi, electricity, water or hostel facilities? Let the administration know."
            action={
              <Link to="/student/complaints/new" className="btn-primary">
                <FilePlus2 className="h-4 w-4" /> Submit your first complaint
              </Link>
            }
          />
        ) : (
          <ComplaintTable
            items={items.slice(0, 5)}
            hasUpdate={hasUpdate}
            linkTo={(c) => `/student/complaints/${c.complaintId}`}
          />
        )}
      </section>
    </>
  );
}
