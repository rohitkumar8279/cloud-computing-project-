# CampusCare – Serverless Campus Complaint Management System

CampusCare lets students report campus problems (hostel Wi-Fi, electricity, water supply, classrooms, hostel cleanliness, computer labs) with a photo. Students track each complaint to resolution, and administrators assign, update and analyse them. The backend is fully serverless on AWS: no servers, no VPC, no NAT gateway.

```
React (Amplify Hosting) ──► Amazon Cognito (sign-up / sign-in, JWT)
        │
        │  Authorization: Bearer <ID token>
        ▼
API Gateway HTTP API ── JWT authorizer (Cognito) ──► AWS Lambda (Node.js 22, arm64)
                                                     ├─► DynamoDB  (complaints + counters)
                                                     ├─► S3        (private images, presigned URLs)
                                                     └─► SNS       (admin email notifications)
        Browser ──presigned POST──► S3 (direct upload, size/type enforced by S3)
        CloudWatch: Lambda logs, API access logs, 5xx alarm ──► SNS
```

## Features

| Student | Administrator |
|---|---|
| Register, verify email, sign in/out, reset password | Secure login (accounts created by CLI only, no public sign-up) |
| Submit a complaint with category, department, location, description, image | View all complaints, filter by status / category / department |
| Dashboard: totals, pending, in progress, resolved, status-update alerts | Analytics dashboard: totals, resolution rate, per-category, per-department, daily trend |
| Complaint history with search and status filter | Change status (workflow enforced), assign department / staff, add remarks |
| Complaint details: timeline, admin remarks, secure image view | View attachments through 5-minute presigned links |

Status workflow: `PENDING → IN_PROGRESS → RESOLVED`, plus `REJECTED`. Resolved complaints can be reopened and rejected ones reconsidered.

## Repository layout

```
CampusCare/
├── template.yaml              # AWS SAM / CloudFormation – all backend infrastructure
├── samconfig.toml.example     # deploy settings template (copy to samconfig.toml, git-ignored)
├── amplify.yml                # Amplify Hosting build spec (monorepo → frontend/)
├── backend/
│   ├── functions/             # one folder per Lambda (7 API handlers + Cognito trigger)
│   ├── shared/                # auth, validation, DynamoDB/S3/SNS helpers, counters
│   ├── tests/                 # node:test unit tests (no AWS needed)
│   ├── events/                # sample API Gateway event for `sam local invoke`
│   └── package.json
├── frontend/
│   ├── src/{components,pages,layouts,services,hooks,context,utils}
│   ├── .env.example
│   └── package.json
├── scripts/                   # create-admin.(ps1|sh), write-frontend-env.(ps1|sh)
└── docs/                      # architecture, API, deployment, testing, cost, demo guide
```

## Quick start

> **Cost note:** deploying creates real AWS resources. Read [docs/COST.md](docs/COST.md) first. `sam deploy` shows a change set and waits for your confirmation before it creates anything.

Prerequisites: Node.js 22+, AWS CLI v2, AWS SAM CLI, and an AWS account with an IAM user/SSO profile (not root).

```powershell
# 1. Backend
Copy-Item samconfig.toml.example samconfig.toml     # edit AdminNotificationEmail
cd backend; npm install; npm test; cd ..
sam validate --lint
sam build
sam deploy                                          # review the change set, then answer y

# 2. First administrator (prompts for the password silently)
.\scripts\create-admin.ps1 -Email admin@college.edu -Name "Campus Admin"

# 3. Frontend (local)
.\scripts\write-frontend-env.ps1                    # creates frontend/.env.local from stack outputs
cd frontend; npm install; npm run dev               # http://localhost:5173
```

Then deploy the frontend with Amplify Hosting and lock CORS down to its domain. The full step-by-step guide, including macOS/Linux commands, is [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

| Document | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture, data flows, DynamoDB design, security model, why serverless |
| [docs/API.md](docs/API.md) | Endpoint reference with request/response examples |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | AWS CLI/SAM setup, deploy, admin creation, Amplify Hosting, teardown |
| [docs/TESTING.md](docs/TESTING.md) | End-to-end and security test cases with expected results |
| [docs/COST.md](docs/COST.md) | Pre-deployment cost checklist and resource-by-resource cost notes |
| [docs/DEMO-GUIDE.md](docs/DEMO-GUIDE.md) | 10-minute demo script and likely viva questions |

## Security highlights

- Identity and role come **only** from Cognito JWT claims validated by API Gateway. Request bodies are never trusted for `studentId` or role.
- Admin endpoints check the `Admins` Cognito group inside Lambda (403 otherwise). Students who request another student's complaint get a 404.
- The S3 bucket is private, with Block Public Access, SSE-S3 encryption and a TLS-only policy. Uploads use a **presigned POST**, so S3 itself enforces type and size (2 MB default). Keys are random UUIDs under the uploader's own prefix, and the backend re-checks the object before saving.
- Each Lambda has its own least-privilege IAM policy (for example, `getMyComplaints` can only `Query` one index).
- No AWS keys in the frontend. `VITE_*` values are public identifiers only. `samconfig.toml` and `.env*` are git-ignored.

## License

Academic project – free to use for learning.
