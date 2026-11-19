import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2, Search, SearchX } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import ComplaintTable from '../../components/ComplaintTable';
import { EmptyState, ErrorState, PageLoader } from '../../components/Feedback';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { useSeenUpdates } from '../../hooks/useSeenUpdates';
import { getAllMyComplaints } from '../../services/complaintService';
import { STATUSES, STATUS_META } from '../../utils/constants';
import { cn } from '../../utils/format';

export default function MyComplaints() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(() => getAllMyComplaints(), [], { refreshMs: 60000 });
  const { hasUpdate } = useSeenUpdates(user.userId);
  const [status, setStatus] = useState('ALL');
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data || []).filter(
      (c) =>
        (status === 'ALL' || c.status === status) &&
        (!q || c.title.toLowerCase().includes(q) || c.complaintId.startsWith(q.replace('#', ''))),
    );
  }, [data, status, query]);

  if (loading) return <PageLoader label="Loading your complaints..." />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="My complaints"
        description="Track the status of every complaint you have submitted."
        actions={
          <Link to="/student/complaints/new" className="btn-primary">
            <FilePlus2 className="h-4 w-4" /> New complaint
          </Link>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter by status">
            {['ALL', ...STATUSES].map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={status === s}
                onClick={() => setStatus(s)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium',
                  status === s ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {s === 'ALL' ? 'All' : STATUS_META[s].label}
              </button>
            ))}
          </div>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search title or ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search complaints"
            />
          </div>
        </div>

        {(data || []).length === 0 ? (
          <EmptyState
            title="You have not submitted any complaints"
            action={
              <Link to="/student/complaints/new" className="btn-primary">
                Submit a complaint
              </Link>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState icon={SearchX} title="No matching complaints" message="Try another status or search term." />
        ) : (
          <ComplaintTable items={items} hasUpdate={hasUpdate} linkTo={(c) => `/student/complaints/${c.complaintId}`} />
        )}
      </div>
    </>
  );
}
