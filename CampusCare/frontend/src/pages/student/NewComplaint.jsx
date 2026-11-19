import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import ImageUpload from '../../components/ImageUpload';
import { Spinner } from '../../components/Feedback';
import { CATEGORIES, DEPARTMENTS, LIMITS } from '../../utils/constants';
import { validateComplaint } from '../../utils/validators';
import { cn } from '../../utils/format';
import { createComplaint, requestUploadUrl, uploadToS3 } from '../../services/complaintService';

const EMPTY = { title: '', category: '', department: '', location: '', description: '' };

export default function NewComplaint() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState(null); // null | 'uploading' | 'saving'
  const [progress, setProgress] = useState(undefined);

  const busy = phase !== null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onCategory = (e) => {
    const category = e.target.value;
    // Suggest the matching department; the student can still change it.
    setForm((f) => ({ ...f, category, department: CATEGORIES[category]?.department || '' }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validateComplaint(form);
    setErrors(v);
    if (Object.keys(v).length) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    try {
      let attachmentKey;
      if (file) {
        setPhase('uploading');
        setProgress(0);
        const presign = await requestUploadUrl(file); // 1. ask Lambda for a presigned POST
        attachmentKey = await uploadToS3(presign, file, setProgress); // 2. upload straight to S3
      }
      setPhase('saving');
      const complaint = await createComplaint({
        // 3. save the complaint with the S3 key
        title: form.title.trim(),
        category: form.category,
        department: form.department || undefined,
        location: form.location.trim() || undefined,
        description: form.description.trim(),
        attachmentKey,
      });
      toast.success('Complaint submitted');
      navigate(`/student/complaints/${complaint.complaintId}`, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not submit complaint');
      setPhase(null);
      setProgress(undefined);
    }
  };

  const err = (k) => errors[k] && <p className="field-error">{errors[k]}</p>;

  return (
    <>
      <PageHeader title="Submit a complaint" description="Describe the problem clearly so the right team can fix it quickly." />

      <form onSubmit={onSubmit} className="card space-y-6 p-6 lg:max-w-3xl" noValidate>
        <div>
          <label className="label" htmlFor="title">
            Complaint title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            className={cn('input', errors.title && 'input-error')}
            placeholder="e.g. Hostel Wi-Fi not working in Block B"
            maxLength={LIMITS.titleMax}
            value={form.title}
            onChange={set('title')}
            disabled={busy}
          />
          {err('title')}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="category">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              className={cn('input', errors.category && 'input-error')}
              value={form.category}
              onChange={onCategory}
              disabled={busy}
            >
              <option value="">Select a category</option>
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            {err('category')}
          </div>
          <div>
            <label className="label" htmlFor="department">
              Department
            </label>
            <select id="department" className="input" value={form.department} onChange={set('department')} disabled={busy}>
              <option value="">Auto-select from category</option>
              {Object.entries(DEPARTMENTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Administrators may reassign it.</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="location">
            Location
          </label>
          <input
            id="location"
            className={cn('input', errors.location && 'input-error')}
            placeholder="e.g. Hostel Block B, Room 214"
            maxLength={LIMITS.locationMax}
            value={form.location}
            onChange={set('location')}
            disabled={busy}
          />
          {err('location')}
        </div>

        <div>
          <label className="label" htmlFor="description">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            rows={6}
            className={cn('input resize-y', errors.description && 'input-error')}
            placeholder="What is the problem, since when, and how is it affecting you?"
            maxLength={LIMITS.descriptionMax}
            value={form.description}
            onChange={set('description')}
            disabled={busy}
          />
          <div className="mt-1 flex justify-between">
            {err('description') || <span />}
            <span className="text-xs text-gray-400">
              {form.description.length}/{LIMITS.descriptionMax}
            </span>
          </div>
        </div>

        <div>
          <span className="label">Supporting image</span>
          <ImageUpload file={file} onChange={setFile} disabled={busy} progress={phase === 'uploading' ? progress : undefined} />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Spinner className="h-4 w-4 text-white" /> : <Send className="h-4 w-4" />}
            {phase === 'uploading' ? `Uploading image ${progress ?? 0}%` : phase === 'saving' ? 'Submitting...' : 'Submit complaint'}
          </button>
        </div>
      </form>
    </>
  );
}
