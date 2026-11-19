// Keep in sync with backend/shared/constants.js
export const DEPARTMENTS = {
  IT_SERVICES: 'IT Services',
  ELECTRICAL: 'Electrical Maintenance',
  PLUMBING: 'Plumbing & Water Supply',
  CIVIL: 'Civil & Infrastructure',
  HOUSEKEEPING: 'Housekeeping',
  LAB_ADMIN: 'Computer Lab Administration',
  HOSTEL_OFFICE: 'Hostel Office',
  ADMINISTRATION: 'General Administration',
};

export const CATEGORIES = {
  WIFI: { label: 'Wi-Fi / Internet', department: 'IT_SERVICES' },
  ELECTRICITY: { label: 'Electricity', department: 'ELECTRICAL' },
  WATER: { label: 'Water Supply', department: 'PLUMBING' },
  CLASSROOM: { label: 'Classroom Maintenance', department: 'CIVIL' },
  HOSTEL_CLEANLINESS: { label: 'Hostel Cleanliness', department: 'HOUSEKEEPING' },
  COMPUTER_LAB: { label: 'Computer Laboratory', department: 'LAB_ADMIN' },
  HOSTEL_FACILITIES: { label: 'Hostel Facilities', department: 'HOSTEL_OFFICE' },
  OTHER: { label: 'Other', department: 'ADMINISTRATION' },
};

export const STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

export const STATUS_META = {
  PENDING: { label: 'Pending', badge: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  IN_PROGRESS: { label: 'In progress', badge: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  RESOLVED: { label: 'Resolved', badge: 'bg-green-50 text-green-700 ring-green-600/20' },
  REJECTED: { label: 'Rejected', badge: 'bg-red-50 text-red-700 ring-red-600/20' },
};

export const TRANSITIONS = {
  PENDING: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'REJECTED', 'PENDING'],
  RESOLVED: ['IN_PROGRESS'],
  REJECTED: ['PENDING'],
};

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB || 2);
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const LIMITS = {
  titleMin: 5,
  titleMax: 120,
  descriptionMin: 10,
  descriptionMax: 2000,
  locationMax: 120,
  remarksMax: 1000,
  assignedToMax: 100,
};

export const categoryLabel = (c) => CATEGORIES[c]?.label ?? c ?? '-';
export const departmentLabel = (d) => DEPARTMENTS[d] ?? d ?? '-';
export const statusLabel = (s) => STATUS_META[s]?.label ?? s;
