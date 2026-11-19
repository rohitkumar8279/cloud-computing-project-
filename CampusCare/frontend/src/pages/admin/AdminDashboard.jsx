import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Clock, Loader, RefreshCw, XCircle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import ComplaintTable from '../../components/ComplaintTable';
import { ChartCard, HorizontalBarChart, TrendChart } from '../../components/charts';
import { EmptyState, ErrorState, PageLoader, Spinner } from '../../components/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { adminAnalytics } from '../../services/complaintService';
import { formatDateTime } from '../../utils/format';
import { STATUSES, STATUS_META } from '../../utils/constants';

export default function AdminDashboard() {
  const [days, setDays] = useState(14);
  const { data, loading, error, reload } = useFetch(() => adminAnalytics(days), [days], { refreshMs: 60000 });
  const [refreshing, setRefreshing] = useState(false);

  if (loading && !data) return <PageLoader label="Loading analytics..." />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const t = data.totals;
  const byCategory = [...data.byCategory].sort((a, b) => b.count - a.count);
  const byDepartment = [...data.byDepartment].filter((d) => d.count > 0).sort((a, b) => b.count - a.count);
  const trendTotal = data.trend.reduce((s, d) => s + d.count, 0);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload({ silent: true });
    setRefreshing(false);
  };

  return (
    <>
      <PageHeader
        title="Admin dashboard"
        description={`Campus-wide complaint overview · updated ${formatDateTime(data.generatedAt)}`}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />} Refresh
            </button>
            <Link to="/admin/complaints?status=PENDING" className="btn-primary">
              Review pending ({t.PENDING})
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total complaints" value={t.total} icon={ClipboardList} tone="blue" />
        <StatCard label="Pending" value={t.PENDING} icon={Clock} tone="amber" />
        <StatCard label="In progress" value={t.IN_PROGRESS} icon={Loader} tone="indigo" />
        <StatCard label="Resolved" value={t.RESOLVED} icon={CheckCircle2} tone="green" hint={`${data.resolutionRate}% resolution rate`} />
        <StatCard label="Rejected" value={t.REJECTED} icon={XCircle} tone="red" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2" aria-label="Quick status filters">
        {STATUSES.map((s) => (
          <Link
            key={s}
            to={`/admin/complaints?status=${s}`}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700"
          >
            {STATUS_META[s].label}: {t[s]}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Complaints by category"
          subtitle="All time"
          rows={byCategory}
          columns={[
            { key: 'label', label: 'Category' },
            { key: 'count', label: 'Complaints', numeric: true },
          ]}
          empty={t.total === 0 ? 'No complaints yet' : null}
        >
          <HorizontalBarChart data={byCategory} />
        </ChartCard>

        <ChartCard
          title="New complaints per day"
          subtitle={`${trendTotal} in the last ${data.trendDays} days (UTC)`}
          rows={data.trend}
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'count', label: 'Complaints', numeric: true },
          ]}
        >
          <div className="mb-2 flex justify-end">
            <select
              className="input w-auto py-1 text-xs"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-label="Trend range"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
          <TrendChart data={data.trend} />
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <ChartCard
            title="Workload by department"
            subtitle="All time"
            rows={byDepartment}
            columns={[
              { key: 'label', label: 'Department' },
              { key: 'count', label: 'Complaints', numeric: true },
            ]}
            empty={byDepartment.length === 0 ? 'No complaints yet' : null}
          >
            <HorizontalBarChart data={byDepartment} />
          </ChartCard>
        </div>

        <section className="card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Recent complaints</h2>
            <Link to="/admin/complaints" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <EmptyState title="No complaints yet" message="New complaints from students will appear here." />
          ) : (
            <ComplaintTable items={data.recent} variant="admin" linkTo={(c) => `/admin/complaints/${c.complaintId}`} />
          )}
        </section>
      </div>
    </>
  );
}
