import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquareText, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatusTimeline from '../../components/StatusTimeline';
import { Attachment, ComplaintSummary } from '../../components/ComplaintDetails';
import { ErrorState, PageLoader } from '../../components/Feedback';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { useSeenUpdates } from '../../hooks/useSeenUpdates';
import { getComplaint } from '../../services/complaintService';

export default function ComplaintDetail() {
  const { complaintId } = useParams();
  const { user } = useAuth();
  const { markSeen } = useSeenUpdates(user.userId);
  const { data: c, loading, error, reload } = useFetch(() => getComplaint(complaintId), [complaintId], {
    refreshMs: 60000,
  });

  useEffect(() => {
    if (c) markSeen(c.complaintId, c.lastStatusChangeAt || c.createdAt);
  }, [c, markSeen]);

  if (loading) return <PageLoader label="Loading complaint..." />;
  if (error)
    return (
      <>
        <BackLink />
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </>
    );

  return (
    <>
      <BackLink />
      <PageHeader
        title={c.title}
        actions={
          <button type="button" className="btn-secondary" onClick={() => reload()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="text-base font-semibold text-gray-900">Description</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">{c.description}</p>
          </section>

          <section className="card p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <MessageSquareText className="h-4 w-4 text-blue-600" /> Administrator remarks
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm text-gray-700">
              {c.adminRemarks || <span className="text-gray-500">No remarks yet. You will see updates here.</span>}
            </p>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Attachment</h2>
            <Attachment complaint={c} onRefresh={() => reload({ silent: true })} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-base font-semibold text-gray-900">Details</h2>
            <ComplaintSummary complaint={c} />
          </section>
          <section className="card p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Status history</h2>
            <StatusTimeline history={c.statusHistory} />
          </section>
        </div>
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Link to="/student/complaints" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
      <ArrowLeft className="h-4 w-4" /> My complaints
    </Link>
  );
}
