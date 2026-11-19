import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Filter, RefreshCw, SearchX } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import ComplaintTable from '../../components/ComplaintTable';
import { EmptyState, ErrorState, PageLoader, Spinner } from '../../components/Feedback';
import { adminListComplaints } from '../../services/complaintService';
import { CATEGORIES, DEPARTMENTS, STATUSES, STATUS_META } from '../../utils/constants';

const PAGE_SIZE = 25;

export default function AdminComplaints() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'ALL';
  const category = params.get('category') || 'ALL';
  const department = params.get('department') || 'ALL';

  const [items, setItems] = useState([]);
  const [nextToken, setNextToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListComplaints({ status, category, department, limit: PAGE_SIZE });
      setItems(res.items);
      setNextToken(res.nextToken);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [status, category, department]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await adminListComplaints({ status, category, department, limit: PAGE_SIZE, nextToken });
      setItems((prev) => [...prev, ...res.items]);
      setNextToken(res.nextToken);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const setFilter = (key) => (e) => {
    const next = new URLSearchParams(params);
    if (e.target.value === 'ALL') next.delete(key);
    else next.set(key, e.target.value);
    setParams(next, { replace: true });
  };

  const filtersActive = status !== 'ALL' || category !== 'ALL' || department !== 'ALL';

  return (
    <>
      <PageHeader
        title="Manage complaints"
        description="Review, assign and resolve complaints from students."
        actions={
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="grid gap-3 border-b border-gray-200 p-4 sm:grid-cols-[auto_1fr_1fr_1fr_auto] sm:items-center">
          <span className="hidden items-center gap-2 text-sm font-medium text-gray-700 sm:flex">
            <Filter className="h-4 w-4" /> Filters
          </span>
          <select className="input" value={status} onChange={setFilter('status')} aria-label="Status">
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <select className="input" value={category} onChange={setFilter('category')} aria-label="Category">
            <option value="ALL">All categories</option>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <select className="input" value={department} onChange={setFilter('department')} aria-label="Department">
            <option value="ALL">All departments</option>
            {Object.entries(DEPARTMENTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-ghost"
            disabled={!filtersActive}
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
          >
            Clear
          </button>
        </div>

        {loading ? (
          <PageLoader label="Loading complaints..." />
        ) : error ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={load} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={filtersActive ? 'No complaints match these filters' : 'No complaints yet'}
            message={filtersActive ? 'Try a different status, category or department.' : 'Student complaints will appear here.'}
          />
        ) : (
          <>
            <ComplaintTable items={items} variant="admin" linkTo={(c) => `/admin/complaints/${c.complaintId}`} />
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
              <span>
                Showing {items.length} complaint{items.length === 1 ? '' : 's'}
              </span>
              {nextToken && (
                <button type="button" className="btn-secondary" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore && <Spinner className="h-4 w-4" />} Load more
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
