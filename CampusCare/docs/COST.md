# Cost checklist and resource cost notes

> **Do not assume anything is permanently free.** AWS changed its Free Tier on **15 July 2025**. Accounts created on or after that date choose a **Free plan** (up to US$200 in credits, valid for 6 months; when it ends you must upgrade to a paid plan or the account is closed) or a **Paid plan**. Older accounts keep the legacy 12-month free tier. "Always free" allowances (Lambda, DynamoDB, SNS, Cognito, CloudWatch) still apply on both. **Check https://aws.amazon.com/free and the Billing console for your account before deploying.** Figures below are approximate list prices for `ap-south-1` and may change.

## Before you deploy

- [ ] Signed in as an **IAM user or IAM Identity Center user**, not root. MFA is enabled on root.
- [ ] Region is **ap-south-1** everywhere (`samconfig.toml`, the CLI profile, the console region selector).
- [ ] An **AWS Budget** exists: Billing → Budgets → *Zero spend budget* or a US$1 monthly budget with email alerts (the first two budgets are free).
- [ ] *Free Tier usage alerts* are enabled under Billing preferences.
- [ ] `DynamoDBBillingMode=PROVISIONED` (20 RCU / 20 WCU in total, within the always-free 25/25) – or you have consciously chosen `PAY_PER_REQUEST`.
- [ ] `LogRetentionDays` is 14 or less.
- [ ] `MaxUploadBytes` is 2 MB.
- [ ] `AdminNotificationEmail` is an email address. **No SMS subscriptions** are created by this template.
- [ ] You have read the resource list below and accept the potential charges.
- [ ] You will run `sam delete` and empty the S3 bucket when the project is finished (see [DEPLOYMENT.md § Teardown](DEPLOYMENT.md#10-teardown)).

## What `sam deploy` creates

| Resource | Qty | Free allowance | Beyond free / notes | Expected cost for a class demo |
|---|---|---|---|---|
| Lambda functions (Node 22, arm64, 256 MB) | 8 | Always free: 1M requests + 400,000 GB-s per month | ~US$0.20 per 1M requests + duration | US$0 |
| API Gateway HTTP API | 1 | Legacy: 1M calls/month for 12 months. Free plan: billed against credits | ~US$1 per 1M requests | ≈ US$0 (a few thousand calls) |
| DynamoDB table + 3 GSIs (provisioned 5/5 each) | 1 | Always free: 25 GB, 25 RCU, 25 WCU | Extra capacity is billed per hour. **Raising capacity above 25 total costs money even with no traffic** | US$0 |
| S3 bucket (images) | 1 | Legacy: 5 GB for 12 months. Free plan: credits | ~US$0.025/GB-month + requests | < US$0.01 |
| S3 bucket created by `resolve_s3` (deploy artifacts) | 1 | as above | a few MB of zip files | < US$0.01 |
| Cognito User Pool (Lite tier) | 1 | 10,000 monthly active users (direct sign-in) | ~US$0.0055 per MAU above that | US$0 |
| Cognito default email sender | – | Free, **limited to ~50 emails/day** | Configure SES for more (out of scope) | US$0 |
| SNS topic + email subscription | 1 | Always free: 1M publishes, 1,000 email deliveries per month | ~US$2 per 100,000 emails | US$0 |
| CloudWatch log groups (14-day retention) | 9 | 5 GB ingestion + storage per month | ~US$0.50–0.70/GB ingested | US$0 |
| CloudWatch alarm (5xx) | 1 | 10 alarms per month | ~US$0.10 per alarm-month | US$0 |
| IAM roles, CloudFormation stack | 9 / 1 | Free | – | US$0 |

**Amplify Hosting** (created from the console, not by SAM): legacy free tier gives 1,000 build minutes, 5 GB storage and 15 GB served per month for 12 months. After that, roughly US$0.01 per build minute, US$0.023/GB stored and US$0.15/GB served. Each build takes about 2 minutes. To save build minutes, turn off auto-build on branches you don't need.

## What is deliberately not used

EC2, NAT Gateway, VPC endpoints, RDS, ElastiCache, SMS, paid third-party APIs, scheduled invocations, X-Ray, customer-managed KMS keys and point-in-time recovery. None of the resources has an hourly charge outside the provisioned DynamoDB capacity, and that capacity sits inside the always-free allowance.

## Things that can cost money if changed

- Raising DynamoDB capacity above **25 RCU / 25 WCU in total** (table plus all GSIs), or adding a 4th GSI with provisioned capacity.
- Switching to `PAY_PER_REQUEST`: very cheap at demo scale (cents) but not in the always-free tier.
- Raising `LogRetentionDays` or adding verbose logging under heavy traffic.
- Adding SMS subscriptions to the SNS topic (paid per message, and often needs extra registration in India).
- Leaving the stack running after the account's Free plan credits or 12-month period expire. The cost is still tiny, but not zero.
- Load-testing the API: throttling caps it at 10 requests/second, which bounds the cost.

## Monitoring your spend

- Billing → **Free Tier** page: usage against each allowance.
- Billing → **Bills** / **Cost Explorer**: filter by service; this project's resources are named `campuscare-*`.
- CloudFormation → stack → **Resources**: the complete list of what exists.
