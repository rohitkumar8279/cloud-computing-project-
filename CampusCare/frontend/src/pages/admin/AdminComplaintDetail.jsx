import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatusTimeline from '../../components/StatusTimeline';
import StatusBadge from '../../components/StatusBadge';
import { Attachment, ComplaintSummary } from '../../components/ComplaintDetails';
import { ErrorState, PageLoader, Spinner } from '../../components/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { adminUpdateComplaint, getComplaint } from '../../services/complaintService';
import { DEPARTMENTS, LIMITS, STATUS_META, TRANSITIONS } from '../../utils/constants';

export default function AdminComplaintDetail() {
  const { complaintId } = useParams();
  const { data: c, setData, loading, error, reload } = useFetch(() => getComplaint(complaintId), [complaintId]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Reset the form whenever fresh data arrives.
  useEffect(() => {
    if (c) {
      setForm({
        status: c.status,
        department: c.department,
        assignedTo: c.assignedTo || '',
        adminRemarks: c.adminRemarks || '',
      });
    }
  }, [c]);

  if (loading) return <PageLoader label="Loading complaint..." />;
  if (error)
    return (
      <>
        <BackLink />
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </>
    );
  if (!form) return null;

  const statusOptions = [c.status, ...(TRANSITIONS[c.status] || [])];
  const changes = Object.fromEntries(
    Object.entries(form).filter(([k, v]) => (k === 'assignedTo' || k === 'adminRemarks' ? v.trim() : v) !== (c[k] || '')),
  );
  const dirty = Object.keys(changes).length > 0;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    try {
      const updated = await adminUpdateComplaint(c.complaintId, changes);
      // PATCH response has no signed image URL - keep the current one.
      setData({ ...updated, attachmentUrl: c.attachmentUrl, attachmentUrlExpiresIn: c.attachmentUrlExpiresIn });
      toast.success('Complaint updated');
    } catch (err) {
      toast.error(err.message);
      if (err.status === 409) reload({ silent: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BackLink />
      <PageHeader title={c.title} description={<span className="inline-flex items-center gap-2">Current status <StatusBadge status={c.status} /></span>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="text-base font-semibold text-gray-900">Description</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">{c.description}</p>
          </section>
          <section className="card p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Attachment</h2>
            <Attachment complaint={c} onRefresh={() => reload({ silent: true })} />
          </section>
          <section className="card p-6">
            <h2 className="text-base font-semibold text-gray-900">Details</h2>
            <ComplaintSummary complaint={c} showStudent />
          </section>
        </div>

        <div className="space-y-6">
          <form onSubmit={onSave} className="card space-y-5 p-6 lg:sticky lg:top-24">
            <h2 className="text-base font-semibold text-gray-900">Manage complaint</h2>

            <div>
              <label className="label" htmlFor="status">
                Status
              </label>
              <select id="status" className="input" value={form.status} onChange={set('status')} disabled={saving}>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                    {s === c.status ? ' (current)' : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Workflow: Pending → In progress → Resolved (or Rejected).</p>
            </div>

            <div>
              <label className="label" htmlFor="department">
                Department
              </label>
              <select id="department" className="input" value={form.department} onChange={set('department')} disabled={saving}>
                {Object.entries(DEPARTMENTS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="assignedTo">
                Assigned to
              </label>
              <input
                id="assignedTo"
                className="input"
                placeholder="e.g. Ravi (Electrician)"
                maxLength={LIMITS.assignedToMax}
                value={form.assignedTo}
                onChange={set('assignedTo')}
                disabled={saving}
              />
            </div>

            <div>
              <label className="label" htmlFor="adminRemarks">
                Remarks for the student
              </label>
              <textarea
                id="adminRemarks"
                rows={5}
                className="input resize-y"
                placeholder="What has been done or what happens next?"
                maxLength={LIMITS.remarksMax}
                value={form.adminRemarks}
                onChange={set('adminRemarks')}
                disabled={saving}
              />
              <p className="mt-1 text-right text-xs text-gray-400">
                {form.adminRemarks.length}/{LIMITS.remarksMax}
              </p>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={!dirty || saving}>
              {saving ? <Spinner className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />} Save changes
            </button>
          </form>

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
    <Link to="/admin/complaints" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
      <ArrowLeft className="h-4 w-4" /> All complaints
    </Link>
  );
}
