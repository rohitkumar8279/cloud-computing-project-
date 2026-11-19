# Demo guide (about 10 minutes)

## Before the demo
- Backend deployed, admin created, SNS subscription **confirmed**.
- Two browser windows: a normal window (student) and a private window (admin).
- Tabs open in the AWS console: DynamoDB *Explore items*, S3 bucket `uploads/`, CloudWatch log groups, the CloudFormation stack's *Resources* tab.
- A small JPG of a "broken router" or "leaking tap" on the desktop.

## Script

| Time | Show | Say |
|---|---|---|
| 0:00 | Architecture diagram ([ARCHITECTURE.md](ARCHITECTURE.md)) | "Everything is serverless: Cognito, API Gateway, Lambda, DynamoDB, S3, SNS, all defined in one SAM template." |
| 1:00 | CloudFormation → Resources | "One `sam deploy` created these, and the IAM roles have least-privilege policies." |
| 1:30 | Student: register → email code → verify → sign in | "Cognito handles verification and password policy. A Lambda trigger adds new users to the Students group." |
| 3:00 | Submit complaint "Hostel Wi-Fi not working" + image | "The browser gets a 5-minute presigned POST from Lambda and uploads directly to the private bucket. S3 itself enforces the 2 MB limit." |
| 4:00 | DynamoDB item + S3 object; open the raw S3 URL → AccessDenied | "The record stores only the object key. The bucket is private, so images are visible only through short-lived signed links." |
| 4:45 | Admin email in inbox | "SNS notifies the administrators." |
| 5:00 | Admin: dashboard → filter Pending → open complaint → image → set In progress + remark | "Admin routes check the Admins group inside Lambda, and the workflow blocks invalid transitions." |
| 6:30 | Student window: dashboard toast, Updated badge, timeline, remark | "Status is visible in-app without depending on email." |
| 7:15 | Security: `curl` with the student token to `/admin/complaints` → 403; student B → A's complaint → 404 | "Identity comes from the signed JWT, never from the request body." |
| 8:30 | CloudWatch logs + 5xx alarm | "Structured logs, 14-day retention and an alarm that emails on server errors." |
| 9:15 | [COST.md](COST.md) table | "There's no EC2, NAT or RDS. DynamoDB capacity sits within the always-free 25 RCU/WCU. Idle cost is about zero." |

## Likely viva questions

1. **Why serverless rather than EC2?** Traffic is spiky and mostly idle. Lambda scales per request and costs nothing while idle, and there's no patching or capacity planning. Each function scales and fails independently.
2. **How does API Gateway know who the user is?** The JWT authorizer validates the Cognito ID token's signature (JWKS), issuer, audience and expiry. Lambda then reads `sub`, `email` and `cognito:groups` from `event.requestContext.authorizer.jwt.claims`.
3. **Why check the admin role in Lambda and not only in React?** The frontend can be bypassed with `curl`. The React route guards are only for user experience.
4. **Why a presigned POST instead of uploading through Lambda?** API Gateway and Lambda have payload limits, and streaming files through them costs more. A presigned POST lets S3 enforce size and type and keeps AWS keys out of the browser.
5. **Presigned POST vs PUT?** A PUT URL can't enforce a maximum size. A POST policy supports `content-length-range`.
6. **How do you avoid DynamoDB scans?** Three GSIs (by student, by status, by date) plus a counter item for statistics. Every read is a `GetItem` or a `Query`.
7. **What happens if two admins update the same complaint?** The update is conditional on the previous status. The second admin gets 409 and reloads.
8. **How are statistics kept accurate?** Counters are updated in the same `TransactWriteItems` as the complaint, so both happen or neither does.
9. **What does a cold start mean here?** The first request after idle loads the function (roughly a few hundred ms on Node 22 arm64). Later requests reuse the warm container and its SDK clients.
10. **How would you scale to many colleges?** Add a `campusId` claim and key prefix, shard `CreatedAtIndex` by month, move email to SES, and add WAF and CloudFront in front.
11. **What does it cost?** For a demo, about $0. Lambda, DynamoDB (provisioned ≤ 25), SNS email, Cognito (≤ 10k MAU) and CloudWatch basics are always free. API Gateway, S3 and Amplify cost cents or are covered by credits or the legacy 12-month tier.
12. **Where are the secrets?** There are none in the code. The Cognito client is public (no secret), AWS credentials stay in the local CLI profile, and `samconfig.toml` and `.env.local` are git-ignored.
