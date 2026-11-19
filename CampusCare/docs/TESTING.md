# Testing

## 1. Automated unit tests (no AWS needed)

```powershell
cd backend
npm install
npm test
```
These cover JWT group parsing, role checks, input validation (including ignoring forged `studentId`/`status`), the upload type and size rules, pagination-token pinning, the status workflow and the counter maths.

## 2. Test accounts

| Account | How |
|---|---|
| Student A | Register in the app |
| Student B | Register in the app with a second email |
| Admin | `scripts/create-admin.*` ([DEPLOYMENT.md §6](DEPLOYMENT.md#6-create-the-first-administrator)) |

### Getting an ID token for API tests
Sign in to the app, open DevTools → **Application → Local Storage** and copy the value of the key ending in `.idToken` (`CognitoIdentityServiceProvider.<clientId>.<user>.idToken`).

```powershell
$API = "https://<api-id>.execute-api.ap-south-1.amazonaws.com/dev"
$A   = "<student A id token>"
$B   = "<student B id token>"
$ADM = "<admin id token>"
```
In the PowerShell examples, use `curl.exe` and not `curl`, which is an alias for `Invoke-WebRequest` in PowerShell 5.1.

## 3. End-to-end functional tests

| # | Test | Steps | Expected result |
|---|---|---|---|
| F1 | Student registration | Register with name, email, strong password | Toast "Account created"; verification code email arrives; redirected to Verify |
| F2 | Weak password rejected | Register with `password` | Inline rules show unmet items; submit blocked |
| F3 | Email verification | Enter the 6-digit code | "Email verified"; Cognito → Users shows *Confirmed*; user is in group **Students** |
| F4 | Login / logout | Sign in, then Sign out | Student dashboard loads; after sign-out, `/student/dashboard` redirects to `/login` |
| F5 | Submit complaint without image | Title, category, description → Submit | 201; redirected to details; status **Pending**; timeline "Complaint submitted" |
| F6 | Submit complaint with image | Attach a 300 KB JPG → Submit | Progress bar → details page shows image; object at `uploads/<sub>/<uuid>.jpg` in S3 |
| F7 | Record in DynamoDB | DynamoDB → Explore items | Item with `complaintId`, `studentId` = student's Cognito `sub`, `status=PENDING`, ISO timestamps, `attachmentKey`; `__STATS__` item `total` incremented |
| F8 | Admin email on create | Check admin inbox | "[CampusCare] New complaint: …" with details |
| F9 | Client-side validation | Title "abc", no category | Field errors shown; no request sent |
| F10 | Admin login | Sign in as admin | Lands on `/admin/dashboard`; badge "Administrator" |
| F11 | Admin views complaint | Manage complaints → open F6 complaint | Details, student name/email, image displayed |
| F12 | Filters | Filter status=Pending, category=Wi-Fi | Only matching complaints listed; URL has `?status=PENDING&category=WIFI` |
| F13 | Change status | Status → In progress, Assigned to "Network team", remark → Save | Toast "Complaint updated"; timeline shows In progress with remark |
| F14 | Student sees update | As student A, open/refresh dashboard (or wait ≤ 60 s) | Toast "1 complaint has a status update"; "Status updates" panel; **Updated** badge; details show remark & assignee |
| F15 | Admin email on update | Check inbox | "[CampusCare] <title> - IN_PROGRESS" |
| F16 | Resolve | Admin sets Resolved | Dashboard: Resolved +1, In progress -1, resolution rate updates |
| F17 | Invalid transition hidden | Open a Pending complaint | Status dropdown offers only Pending / In progress / Rejected |
| F18 | Analytics | Admin dashboard | Totals match DynamoDB; category & department charts; 14-day trend; chart/table toggle works |
| F19 | Password reset | Forgot password → code → new password | Can sign in with new password |
| F20 | Responsive UI | Narrow the browser to phone width | Sidebar collapses to menu; tables become cards |

## 4. Security tests

| # | Test | Command / action | Expected |
|---|---|---|---|
| S1 | No token | `curl.exe -i "$API/complaints/mine"` | **401** `{"message":"Unauthorized"}` from API Gateway |
| S2 | Garbage token | `curl.exe -i -H "Authorization: Bearer abc" "$API/complaints/mine"` | **401** |
| S3 | Student → admin list | `curl.exe -i -H "Authorization: Bearer $A" "$API/admin/complaints"` | **403** "Administrator access required" |
| S4 | Student → admin update | `curl.exe -i -X PATCH -H "Authorization: Bearer $A" -H "Content-Type: application/json" -d '{\"status\":\"RESOLVED\"}' "$API/admin/complaints/<id>"` | **403**; item unchanged |
| S5 | Student → analytics | `curl.exe -i -H "Authorization: Bearer $A" "$API/admin/analytics"` | **403** |
| S6 | Student B reads A's complaint | `curl.exe -i -H "Authorization: Bearer $B" "$API/complaints/<A's id>"` | **404** "Complaint not found" |
| S7 | B's list excludes A's | `curl.exe -H "Authorization: Bearer $B" "$API/complaints/mine"` | Only B's complaints |
| S8 | Forged identity in body | POST /complaints as B with `"studentId":"<A's sub>","status":"RESOLVED"` | 201; stored `studentId` = **B's** sub, `status=PENDING` |
| S9 | Use another user's upload | POST /complaints as B with `attachmentKey` from A | **403** "Attachment does not belong to you" |
| S10 | Disallowed file type | `curl.exe -i -X POST -H "Authorization: Bearer $A" -H "Content-Type: application/json" -d '{\"contentType\":\"application/pdf\",\"fileSize\":1000}' "$API/uploads/presign"` | **400** "Only JPEG, PNG or WebP…" |
| S11 | Oversized declared size | same with `"contentType":"image/png","fileSize":10485760` | **400** |
| S12 | Oversized actual upload | Get presign for 1 KB PNG, then POST a 5 MB file with those fields | S3 **400 EntityTooLarge** |
| S13 | Type mismatch at S3 | Upload with `Content-Type` field changed to `text/html` | S3 **403** (policy condition failed) |
| S14 | Expired upload link | Wait > 5 min after presign, then upload | S3 **403** "Policy expired" |
| S15 | Bucket is private | Open `https://<bucket>.s3.ap-south-1.amazonaws.com/<key>` directly | **403 AccessDenied** |
| S16 | Image link expiry | Copy `attachmentUrl`, open after > 5 min | **403** Request has expired |
| S17 | Invalid ID / stats probe | `GET $API/complaints/__STATS__` | **400** "Invalid complaint ID" |
| S18 | Invalid transition via API | Admin PATCH `{"status":"RESOLVED"}` on a **Pending** complaint | **409** with `details.allowed = ["IN_PROGRESS","REJECTED"]` |
| S19 | Crafted pagination token | `GET $API/complaints/mine?nextToken=<token containing A's studentId>` as B | **400** "Invalid nextToken" |
| S20 | Admin route in UI as student | Visit `/admin/dashboard` as student | Redirected to `/student/dashboard` (and the API would return 403 anyway) |
| S21 | Admin self-registration impossible | Register normally, inspect groups | User is only in **Students**; no UI/API path adds Admins |
| S22 | Throttling | Fire 100 parallel requests | Some **429 Too Many Requests** |
| S23 | No secrets in bundle | `npm run build` then search `frontend/dist` for `AKIA` / `aws_secret` | No matches |

PowerShell tip for S8/S9: put the JSON body in a file and send it with `-d "@body.json"` to avoid quoting problems.

## 5. Monitoring checks

| # | Check | Expected |
|---|---|---|
| M1 | CloudWatch → Log groups → `/aws/lambda/...CreateComplaint...` | JSON lines `{"level":"info","msg":"createComplaint completed","statusCode":201,...}` |
| M2 | Logs Insights on all `/aws/lambda/campuscare-*` groups: `filter level="warn"` | Entries for the 403/404 tests above |
| M3 | `/campuscare/dev/api-access` | One line per request with status and latency |
| M4 | Log group retention | 14 days |
| M5 | Alarm `campuscare-dev-api-5xx` | State OK (or ALARM + email if a 5xx occurred) |

## 6. Test-result template

| Test | Date | Result (Pass/Fail) | Evidence (screenshot / response) | Notes |
|---|---|---|---|---|
| F1 | | | | |
| … | | | | |
