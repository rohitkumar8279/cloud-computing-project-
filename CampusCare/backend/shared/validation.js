// Input validation. Unknown fields are ignored - in particular studentId,
// studentEmail, status etc. supplied by a student are never read.
import { HttpError } from './http.js';
import {
  ALLOWED_IMAGE_TYPES,
  CATEGORIES,
  DEPARTMENTS,
  LIMITS,
  STATUSES,
  env,
} from './constants.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ATTACHMENT_KEY_RE = /^uploads\/[A-Za-z0-9-]{1,64}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
// Strip control characters (keep tab/newline) to keep stored text clean.
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export function requireUuid(value, name = 'id') {
  if (!isUuid(value)) throw new HttpError(400, `Invalid ${name}`);
  return value.toLowerCase();
}

function cleanText(value, field, { min = 0, max, required = false, multiline = false }) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new HttpError(400, `${field} is required`);
    return undefined;
  }
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text`);
  let text = value.replace(CONTROL_CHARS_RE, '');
  text = multiline ? text.replace(/\r\n/g, '\n').trim() : text.replace(/\s+/g, ' ').trim();
  if (required && text.length === 0) throw new HttpError(400, `${field} is required`);
  if (text.length < min) throw new HttpError(400, `${field} must be at least ${min} characters`);
  if (text.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`);
  return text;
}

export function validateCreateComplaint(body) {
  const title = cleanText(body.title, 'Title', { min: LIMITS.titleMin, max: LIMITS.titleMax, required: true });
  const description = cleanText(body.description, 'Description', {
    min: LIMITS.descriptionMin,
    max: LIMITS.descriptionMax,
    required: true,
    multiline: true,
  });
  const location = cleanText(body.location, 'Location', { max: LIMITS.locationMax });

  if (!Object.hasOwn(CATEGORIES, body.category)) {
    throw new HttpError(400, 'Category is invalid');
  }
  const category = body.category;

  let department = CATEGORIES[category].department;
  if (body.department !== undefined && body.department !== '') {
    if (!Object.hasOwn(DEPARTMENTS, body.department)) throw new HttpError(400, 'Department is invalid');
    department = body.department;
  }

  let attachmentKey;
  if (body.attachmentKey !== undefined && body.attachmentKey !== null && body.attachmentKey !== '') {
    if (typeof body.attachmentKey !== 'string' || !ATTACHMENT_KEY_RE.test(body.attachmentKey)) {
      throw new HttpError(400, 'Attachment key is invalid');
    }
    attachmentKey = body.attachmentKey;
  }

  return { title, description, location, category, department, attachmentKey };
}

export function validateAdminUpdate(body) {
  const update = {};

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw new HttpError(400, 'Status is invalid');
    update.status = body.status;
  }
  if (body.department !== undefined) {
    if (!Object.hasOwn(DEPARTMENTS, body.department)) throw new HttpError(400, 'Department is invalid');
    update.department = body.department;
  }
  if (body.adminRemarks !== undefined) {
    update.adminRemarks =
      cleanText(body.adminRemarks, 'Remarks', { max: LIMITS.remarksMax, multiline: true }) ?? '';
  }
  if (body.assignedTo !== undefined) {
    update.assignedTo = cleanText(body.assignedTo, 'Assigned to', { max: LIMITS.assignedToMax }) ?? '';
  }

  if (Object.keys(update).length === 0) {
    throw new HttpError(400, 'Nothing to update - provide status, department, adminRemarks or assignedTo');
  }
  return update;
}

export function validatePresignRequest(body) {
  const { contentType, fileSize } = body;
  if (!Object.hasOwn(ALLOWED_IMAGE_TYPES, contentType)) {
    throw new HttpError(400, 'Only JPEG, PNG or WebP images are allowed');
  }
  const size = Number(fileSize);
  if (!Number.isInteger(size) || size <= 0) {
    throw new HttpError(400, 'fileSize must be a positive integer (bytes)');
  }
  if (size > env.maxUploadBytes) {
    throw new HttpError(400, `Image must be ${Math.floor(env.maxUploadBytes / 1024 / 1024)} MB or smaller`);
  }
  return { contentType, fileSize: size, extension: ALLOWED_IMAGE_TYPES[contentType] };
}

export function parseLimit(raw) {
  if (raw === undefined) return LIMITS.pageSizeDefault;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'limit must be a positive integer');
  return Math.min(n, LIMITS.pageSizeMax);
}

export function parseOptionalEnum(raw, allowed, name) {
  if (raw === undefined || raw === '' || raw === 'ALL') return undefined;
  if (!allowed.includes(raw)) throw new HttpError(400, `${name} is invalid`);
  return raw;
}
