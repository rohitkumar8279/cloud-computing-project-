# Deployment guide

Commands are shown for **Windows PowerShell** first, followed by macOS/Linux where they differ. Run everything from the `CampusCare/` folder unless stated otherwise.

> Before step 5, complete the [cost checklist](COST.md#before-you-deploy). Nothing in steps 1–4 creates AWS resources.

## 1. Install the tools

| Tool | Version | Install (Windows) | Check |
|---|---|---|---|
| Node.js | 22 LTS or newer | `winget install OpenJS.NodeJS.LTS` | `node -v` |
| Git | any | `winget install Git.Git` | `git --version` |
| AWS CLI | v2 | `winget install Amazon.AWSCLI` | `aws --version` |
| AWS SAM CLI | latest | `winget install Amazon.SAM-CLI` | `sam --version` |

On macOS, use `brew install node awscli aws-sam-cli`. On Linux, follow the AWS docs for the CLI and SAM installers. Restart the terminal after installing.

## 2. Configure AWS credentials safely

1. In the AWS console, **don't use the root user**. Create an IAM Identity Center user (recommended), or an IAM user with MFA. For a personal project, `AdministratorAccess` on that user is acceptable. Deployment creates IAM roles, so it needs broad rights.
2. Configure a named profile:
   - **IAM Identity Center (recommended, no long-lived keys):**
     ```powershell
     aws configure sso --profile campuscare     # region: ap-south-1
     aws sso login --profile campuscare
     ```
   - **IAM user access key (if SSO isn't available):**
     ```powershell
     aws configure --profile campuscare         # region ap-south-1, output json
     ```
     Keys are stored in `%UserProfile%\.aws\credentials`, outside the repository. Never paste them into project files.
3. Verify:
   ```powershell
   aws sts get-caller-identity --profile campuscare
   ```

## 3. Prepare configuration

```powershell
Copy-Item samconfig.toml.example samconfig.toml    # macOS/Linux: cp samconfig.toml.example samconfig.toml
```
Edit `samconfig.toml`:
- `profile`: your profile name.
- `AdminNotificationEmail`: the address that receives complaint emails. Leave it empty to skip.
- `AllowedOrigins`: keep `*` for the first deployment. You'll restrict it in step 8.

`samconfig.toml` is git-ignored.

## 4. Build and test locally (no AWS resources)

```powershell
cd backend
npm install
npm test            # unit tests for auth, validation, pagination, counters
cd ..
sam validate --lint
sam build
```
`sam build` installs production dependencies and stages each function in `.aws-sam/`.

## 5. Deploy the backend  ⚠ creates AWS resources

```powershell
sam deploy
```
SAM prints a **change set** listing every resource it will create (see [COST.md](COST.md#what-sam-deploy-creates)) and waits for `Deploy this changeset? [y/N]`. Review it, then type `y`. The first deployment takes about 3–5 minutes.

When it finishes, SAM prints the **Outputs**. You can show them again at any time:
```powershell
aws cloudformation describe-stacks --stack-name campuscare-dev --profile campuscare --query "Stacks[0].Outputs" --output table
```

If you set `AdminNotificationEmail`, **open the "AWS Notification – Subscription Confirmation" email and click Confirm subscription**. SNS doesn't deliver anything until you do.

## 6. Create the first administrator

Admin accounts can't be created from the website. Run the script, which prompts for the password without displaying it:

```powershell
.\scripts\create-admin.ps1 -Email admin@college.edu -Name "Campus Admin"
# If script execution is blocked:  powershell -ExecutionPolicy Bypass -File .\scripts\create-admin.ps1 -Email ... -Name ...
```
```bash
chmod +x scripts/*.sh
./scripts/create-admin.sh admin@college.edu "Campus Admin"
```

Manual equivalent (AWS CLI):
```powershell
$POOL = aws cloudformation describe-stacks --stack-name campuscare-dev --profile campuscare --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text
aws cognito-idp admin-create-user --user-pool-id $POOL --username admin@college.edu --user-attributes Name=email,Value=admin@college.edu Name=email_verified,Value=true "Name=name,Value=Campus Admin" --message-action SUPPRESS --profile campuscare
aws cognito-idp admin-set-user-password --user-pool-id $POOL --username admin@college.edu --password '<StrongPassword!1>' --permanent --profile campuscare
aws cognito-idp admin-add-user-to-group --user-pool-id $POOL --username admin@college.edu --group-name Admins --profile campuscare
```
Typing a password on the command line can leave it in shell history. Prefer the script.

Console alternative: **Cognito → User pools → campuscare-users-dev → Users → Create user**. Choose "Don't send an invitation", mark the email as verified and set a password. Then open **Groups → Admins → Add user to group**. If you set a temporary password, the app asks the admin to choose a new one at first login.

To promote an existing user, add them to `Admins`. The change takes effect the next time they sign in, when a new token is issued.

## 7. Run the frontend locally

```powershell
.\scripts\write-frontend-env.ps1          # writes frontend/.env.local from stack outputs
cd frontend
npm install
npm run dev                                # http://localhost:5173
```
Commit the generated `frontend/package-lock.json`, so Amplify builds use `npm ci`.

## 8. Deploy the frontend with AWS Amplify Hosting  ⚠ creates an Amplify app

1. Push the repository to GitHub. Check `git status` first: `samconfig.toml` and `.env.local` must **not** appear.
   ```powershell
   git init; git add .; git status
   git commit -m "CampusCare initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/campuscare.git
   git push -u origin main
   ```
2. Open the AWS console in **ap-south-1**, go to **AWS Amplify → Create new app → GitHub**, authorise, and pick the repository and the `main` branch.
3. Tick **"My app is a monorepo"** and enter `frontend` as the root directory. Amplify detects `amplify.yml` at the repo root.
4. Under **Advanced settings → Environment variables**, add the values from the stack outputs:
   | Variable | Value |
   |---|---|
   | `VITE_AWS_REGION` | `ap-south-1` |
   | `VITE_COGNITO_USER_POOL_ID` | `UserPoolId` output |
   | `VITE_COGNITO_USER_POOL_CLIENT_ID` | `UserPoolClientId` output |
   | `VITE_API_BASE_URL` | `ApiUrl` output |
   | `VITE_MAX_UPLOAD_MB` | `2` |
   | `AMPLIFY_MONOREPO_APP_ROOT` | `frontend` (Amplify sets this automatically for monorepos) |
5. **Save and deploy.** Wait for Provision → Build → Deploy to turn green.
6. **SPA routing:** go to **Hosting → Rewrites and redirects → Manage → Add rule**:
   - Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>`
   - Target: `/index.html`
   - Type: `200 (Rewrite)`

   Without this rule, refreshing `/student/dashboard` returns a 404.
7. *(Optional, recommended)* **Hosting → Custom headers → Edit**, then add security headers:
   ```yaml
   customHeaders:
     - pattern: '**/*'
       headers:
         - key: Strict-Transport-Security
           value: max-age=31536000; includeSubDomains
         - key: X-Content-Type-Options
           value: nosniff
         - key: X-Frame-Options
           value: DENY
         - key: Referrer-Policy
           value: strict-origin-when-cross-origin
   ```
8. Note your app URL, e.g. `https://main.d1a2b3c4.amplifyapp.com`.

### Lock down CORS
Edit `samconfig.toml`:
```
"AllowedOrigins=http://localhost:5173,https://main.d1a2b3c4.amplifyapp.com",
```
Then redeploy the backend: `sam build; sam deploy`. This updates both the API Gateway and S3 CORS rules.

## 9. Verify

1. Open the Amplify URL, register a student, enter the emailed code and sign in.
2. Submit a complaint with an image. The admin email arrives.
3. Sign in as the admin, set the complaint to *In progress* with a remark, and confirm the student dashboard shows it.
4. Work through [TESTING.md](TESTING.md).

Useful places in the console:
- **DynamoDB → Tables → campuscare-complaints-dev → Explore items**: the complaint records and the `__STATS__` counter item.
- **S3 → campuscare-dev-attachmentsbucket-… → uploads/**: the images. Opening an object URL directly gives *AccessDenied*, which proves the bucket is private.
- **CloudWatch → Log groups → /aws/lambda/campuscare-dev-CreateComplaintFunction-…**
- **CloudWatch → Alarms → campuscare-dev-api-5xx**

### Updating
- Backend: `sam build; sam deploy`
- Frontend: `git push` (Amplify rebuilds automatically).

## 10. Teardown

1. Empty the image bucket. CloudFormation can't delete a bucket that still has objects in it:
   ```powershell
   $B = aws cloudformation describe-stacks --stack-name campuscare-dev --profile campuscare --query "Stacks[0].Outputs[?OutputKey=='AttachmentsBucketName'].OutputValue" --output text
   aws s3 rm "s3://$B" --recursive --profile campuscare
   ```
2. `sam delete --stack-name campuscare-dev --profile campuscare`. This removes all backend resources, including the DynamoDB data.
3. Amplify console → the app → **App settings → General → Delete app**.
4. Optional: empty and delete the `aws-sam-cli-managed-default-samclisourcebucket-…` bucket and its `aws-sam-cli-managed-default` stack.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "CampusCare is not configured yet" page | `VITE_*` variables are missing. Rerun `write-frontend-env`, restart `npm run dev`, or set them in Amplify and redeploy |
| `Network error … CORS` in the browser | `AllowedOrigins` doesn't include your exact origin (scheme, host and port). Update it and run `sam deploy` |
| 401 on every API call | Wrong `VITE_COGNITO_USER_POOL_CLIENT_ID` or `VITE_API_BASE_URL`, or the token expired. Sign out and in again |
| Admin sees the student dashboard | The user isn't in the `Admins` group, or signed in before being added. Sign out and in again |
| No verification email | Check spam. The Cognito default sender is limited to about 50 emails a day. Resend the code from the Verify page |
| No SNS email | The subscription wasn't confirmed. Check SNS → Subscriptions (status must be *Confirmed*) |
| Image upload fails with 403 | The upload link expired (5 min) or the file type changed. Retry. Check the S3 CORS origins |
| `sam deploy` fails on `UserPoolTier` | Update the SAM CLI (`winget upgrade Amazon.SAM-CLI`), or remove that line to use the default tier |
| Stack stuck in `ROLLBACK_COMPLETE` | `sam delete`, fix the cause, then deploy again |
