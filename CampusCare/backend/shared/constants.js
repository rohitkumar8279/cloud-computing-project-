// Domain constants shared by every Lambda function.
// Keep in sync with frontend/src/utils/constants.js.

export const ENTITY_TYPE = 'COMPLAINT';
export const STATS_KEY = '__STATS__'; // single counter item (not a UUID, so never reachable via the API)

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

// Each category suggests a default department; students may pick another,
// and administrators can reassign later.
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

// Allowed status transitions (PENDING -> IN_PROGRESS -> RESOLVED, plus REJECTED,
// reopening a resolved complaint and reconsidering a rejected one).
export const TRANSITIONS = {
  PENDING: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'REJECTED', 'PENDING'],
  RESOLVED: ['IN_PROGRESS'],
  REJECTED: ['PENDING'],
};

export const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const LIMITS = {
  titleMin: 5,
  titleMax: 120,
  descriptionMin: 10,
  descriptionMax: 2000,
  locationMax: 120,
  remarksMax: 1000,
  assignedToMax: 100,
  pageSizeDefault: 25,
  pageSizeMax: 100,
};

export const env = {
  tableName: process.env.TABLE_NAME,
  bucketName: process.env.BUCKET_NAME,
  topicArn: process.env.TOPIC_ARN,
  adminGroup: process.env.ADMIN_GROUP || 'Admins',
  studentGroup: process.env.STUDENT_GROUP || 'Students',
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 2 * 1024 * 1024),
  uploadTtl: Number(process.env.UPLOAD_URL_TTL_SECONDS || 300),
  downloadTtl: Number(process.env.DOWNLOAD_URL_TTL_SECONDS || 300),
  notificationsEnabled: (process.env.NOTIFICATIONS_ENABLED || 'true') === 'true',
  stage: process.env.STAGE || 'dev',
};
