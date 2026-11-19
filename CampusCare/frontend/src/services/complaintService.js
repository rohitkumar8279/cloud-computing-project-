import axios from 'axios';
import { api } from './api';

const clean = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== 'ALL'));

// ---- Student ---------------------------------------------------------------
export const createComplaint = (data) => api.post('/complaints', data).then((r) => r.data.complaint);

export const getMyComplaints = (params = {}) =>
  api.get('/complaints/mine', { params: clean(params) }).then((r) => r.data);

export const getComplaint = (id) => api.get(`/complaints/${encodeURIComponent(id)}`).then((r) => r.data.complaint);

/** Fetches every page of the student's complaints (bounded). */
export async function getAllMyComplaints(max = 200) {
  const items = [];
  let nextToken;
  do {
    const page = await getMyComplaints({ limit: 100, nextToken });
    items.push(...page.items);
    nextToken = page.nextToken;
  } while (nextToken && items.length < max);
  return items;
}

// ---- Uploads ---------------------------------------------------------------
export const requestUploadUrl = (file) =>
  api.post('/uploads/presign', { contentType: file.type, fileSize: file.size }).then((r) => r.data);

/**
 * Uploads straight to S3 with the presigned POST. Uses plain axios (no
 * Authorization header) - the signature in `fields` authorises the upload.
 */
export async function uploadToS3(presign, file, onProgress) {
  const form = new FormData();
  Object.entries(presign.fields).forEach(([k, v]) => form.append(k, v));
  form.append('file', file); // must be the last field
  try {
    await axios.post(presign.url, form, {
      timeout: 60000,
      onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
    });
  } catch (err) {
    const body = typeof err.response?.data === 'string' ? err.response.data : '';
    if (body.includes('EntityTooLarge')) throw new Error('Image is larger than the allowed size');
    if (body.includes('AccessDenied') || body.includes('expired')) throw new Error('Upload link expired - please try again');
    throw new Error('Image upload failed - please try again');
  }
  return presign.key;
}

// ---- Admin -----------------------------------------------------------------
export const adminListComplaints = (params = {}) =>
  api.get('/admin/complaints', { params: clean(params) }).then((r) => r.data);

export const adminUpdateComplaint = (id, changes) =>
  api.patch(`/admin/complaints/${encodeURIComponent(id)}`, changes).then((r) => r.data.complaint);

export const adminAnalytics = (days = 14) => api.get('/admin/analytics', { params: { days } }).then((r) => r.data);
