import { ALLOWED_IMAGE_TYPES, CATEGORIES, LIMITS, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from './constants';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the Cognito password policy in template.yaml.
export const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p) => /[a-z]/.test(p), label: 'A lowercase letter' },
  { test: (p) => /[A-Z]/.test(p), label: 'An uppercase letter' },
  { test: (p) => /\d/.test(p), label: 'A number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'A symbol' },
];

export const isStrongPassword = (p) => PASSWORD_RULES.every((r) => r.test(p));

export function validateRegistration({ name, email, password, confirmPassword }) {
  const e = {};
  if (!name.trim() || name.trim().length < 2) e.name = 'Enter your full name';
  if (!EMAIL_RE.test(email)) e.email = 'Enter a valid email address';
  if (!isStrongPassword(password)) e.password = 'Password does not meet the requirements';
  if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
  return e;
}

export function validateComplaint({ title, description, category, location }) {
  const e = {};
  const t = title.trim();
  if (t.length < LIMITS.titleMin) e.title = `Title must be at least ${LIMITS.titleMin} characters`;
  else if (t.length > LIMITS.titleMax) e.title = `Title must be at most ${LIMITS.titleMax} characters`;
  if (!CATEGORIES[category]) e.category = 'Select a category';
  const d = description.trim();
  if (d.length < LIMITS.descriptionMin) e.description = `Describe the problem in at least ${LIMITS.descriptionMin} characters`;
  else if (d.length > LIMITS.descriptionMax) e.description = `Description must be at most ${LIMITS.descriptionMax} characters`;
  if (location && location.length > LIMITS.locationMax) e.location = `Location must be at most ${LIMITS.locationMax} characters`;
  return e;
}

export function validateImage(file) {
  if (!file) return null;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Only JPEG, PNG or WebP images are allowed';
  if (file.size > MAX_UPLOAD_BYTES) return `Image must be ${MAX_UPLOAD_MB} MB or smaller`;
  if (file.size === 0) return 'The selected file is empty';
  return null;
}
