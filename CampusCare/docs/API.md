# API reference

Base URL is the `ApiUrl` stack output, e.g. `https://abc123.execute-api.ap-south-1.amazonaws.com/dev`.

Every endpoint requires `Authorization: Bearer <Cognito ID token>`. Requests without a token or with an invalid or expired one get `401 {"message":"Unauthorized"}` from API Gateway before any Lambda runs.

Errors always look like `{"message": "...", "details"?: {...}}`.

| Status | Meaning |
|---|---|
| 400 | Validation error (bad field, bad ID, bad `nextToken`) |
| 401 | Missing, invalid or expired token |
| 403 | Authenticated but not allowed (not an admin, or the attachment isn't yours) |
| 404 | Not found, or not yours |
| 409 | Invalid status transition, or concurrent modification |
| 413 | Body larger than 16 KB |
| 429 | Throttled by API Gateway |
| 500 | Unexpected error (details in CloudWatch) |

## Enumerations

- **category:** `WIFI`, `ELECTRICITY`, `WATER`, `CLASSROOM`, `HOSTEL_CLEANLINESS`, `COMPUTER_LAB`, `HOSTEL_FACILITIES`, `OTHER`
- **department:** `IT_SERVICES`, `ELECTRICAL`, `PLUMBING`, `CIVIL`, `HOUSEKEEPING`, `LAB_ADMIN`, `HOSTEL_OFFICE`, `ADMINISTRATION`
- **status:** `PENDING`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`
- **Allowed transitions:** PENDING→IN_PROGRESS/REJECTED · IN_PROGRESS→RESOLVED/REJECTED/PENDING · RESOLVED→IN_PROGRESS · REJECTED→PENDING

---

## POST /uploads/presign
Any signed-in user. Returns a presigned **POST** valid for 5 minutes.

Request:
```json
{ "contentType": "image/jpeg", "fileSize": 348211 }
```
Response `200`:
```json
{
  "url": "https://campuscare-dev-attachmentsbucket-xxxx.s3.ap-south-1.amazonaws.com/",
  "fields": { "key": "uploads/<sub>/<uuid>.jpg", "Content-Type": "image/jpeg", "Policy": "…", "X-Amz-Signature": "…", "…": "…" },
  "key": "uploads/<sub>/<uuid>.jpg",
  "expiresIn": 300,
  "maxBytes": 2097152
}
```
Upload it as `multipart/form-data`: append every entry of `fields`, then the file as the **last** field, named `file`. S3 returns `204`. A file that is too large is rejected with `400 EntityTooLarge`, and a mismatched type with `403 AccessDenied`.

## POST /complaints
Any signed-in user.

Request:
```json
{
  "title": "Hostel Wi-Fi not working",
  "category": "WIFI",
  "department": "IT_SERVICES",
  "location": "Hostel Block B, 2nd floor",
  "description": "No connectivity since 8 AM in all rooms.",
  "attachmentKey": "uploads/<sub>/<uuid>.jpg"
}
```
- `title`: 5–120 characters. `description`: 10–2000. `location`: up to 120, optional. `department`: optional, defaulting from the category. `attachmentKey`: optional and must be the caller's own uploaded object.
- Fields such as `studentId`, `status` or `studentEmail` are **ignored**.

Response `201`: `{ "complaint": { …full complaint… } }`. This also publishes an SNS email.

## GET /complaints/mine
Query parameters: `status` (optional), `limit` (1–100, default 25), `nextToken`.

Response `200`:
```json
{
  "items": [
    { "complaintId": "…", "title": "…", "category": "WIFI", "department": "IT_SERVICES", "status": "PENDING",
      "hasAttachment": true, "createdAt": "2026-11-18T05:12:44.120Z", "updatedAt": "…", "lastStatusChangeAt": "…" }
  ],
  "nextToken": null
}
```

## GET /complaints/{complaintId}
The owner or an administrator. Other students get `404`.

Response `200`:
```json
{
  "complaint": {
    "complaintId": "…", "studentId": "…", "studentName": "Priya Sharma", "studentEmail": "priya@college.edu",
    "title": "…", "description": "…", "location": "…", "category": "WIFI", "department": "IT_SERVICES",
    "status": "IN_PROGRESS", "assignedTo": "Network team", "adminRemarks": "Router replaced, monitoring.",
    "attachmentKey": "uploads/…/….jpg",
    "attachmentUrl": "https://…X-Amz-Expires=300…", "attachmentUrlExpiresIn": 300,
    "statusHistory": [
      { "status": "PENDING", "at": "…", "by": "Student", "note": "Complaint submitted" },
      { "status": "IN_PROGRESS", "at": "…", "by": "Administrator", "note": "Router replaced, monitoring." }
    ],
    "createdAt": "…", "updatedAt": "…", "lastStatusChangeAt": "…"
  }
}
```

## GET /admin/complaints  (Admins)
Query parameters: `status`, `category`, `department`, `limit`, `nextToken`. Same list shape as `/complaints/mine`, plus `studentName`, `studentEmail` and `assignedTo`. A non-admin caller gets `403`.

## PATCH /admin/complaints/{complaintId}  (Admins)
Request (any subset, at least one field):
```json
{ "status": "RESOLVED", "department": "IT_SERVICES", "assignedTo": "Network team", "adminRemarks": "Fixed." }
```
- `409` with `details.allowed` if the transition is not allowed.
- `409` if another admin changed the status in the meantime.

Response `200`: `{ "complaint": { …updated complaint… } }`. A status or department change also publishes an SNS email.

## GET /admin/analytics  (Admins)
Query parameter: `days` (1–90, default 14).

Response `200`:
```json
{
  "generatedAt": "…",
  "totals": { "total": 42, "PENDING": 10, "IN_PROGRESS": 8, "RESOLVED": 21, "REJECTED": 3 },
  "resolutionRate": 50,
  "byCategory": [{ "category": "WIFI", "label": "Wi-Fi / Internet", "count": 15 }],
  "byDepartment": [{ "department": "IT_SERVICES", "label": "IT Services", "count": 18 }],
  "trend": [{ "date": "2026-11-05", "count": 3 }],
  "trendDays": 14,
  "recent": [ { "…list item…": "" } ]
}
```
