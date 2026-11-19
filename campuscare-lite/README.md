# CampusCare Lite

A serverless campus complaint system built on Cloudflare Workers, the D1 database and a cron trigger.
Students submit complaints (with an optional photo or PDF), an admin resolves them, and a scheduled
job writes a daily summary report. No server is created, patched or managed anywhere in this project.

**Live demo:** `https://campuscare-lite.<your-subdomain>.workers.dev` (replace after deploying)

---

## 1. Why this project (cloud computing view)

The goal is to show cloud computing fundamentals in a working application, not only a web page.

| Cloud concept | Where it appears in this project |
|---|---|
| Serverless / FaaS (Function as a Service) | The Worker in `src/index.js` is a function. The provider runs it, I never manage a server |
| Event-driven architecture | The code runs only on an event: an HTTP request or a cron schedule |
| Scheduled trigger | A cron trigger runs the report job every day at 8:00 AM IST (`scheduled()` handler) |
| Managed database (DBaaS) | Cloudflare D1. No installation, patching or manual scaling |
| Auto-scaling | The platform starts more instances when traffic grows and stops them when it falls |
| Pay-per-use / scale to zero | Nothing runs while idle, so nothing is consumed or billed |
| Global edge network | Code runs in Cloudflare data centres close to the user |
| Infrastructure as Code | `wrangler.toml` describes the cron schedule, database binding and static files as text |
| Secrets management | The admin key is stored with `wrangler secret put`, not in the code |
| Public cloud model | Cloudflare is a public cloud shared by many customers |
| Shared responsibility | The provider secures and runs the platform. I secure the application code and the admin key |

## 2. Regular cloud server vs serverless

| | Regular cloud server (VM / IaaS) | This project (serverless) |
|---|---|---|
| Setup | Create a VM, install the OS, Node and a database | Write a function and a config file |
| Runs | 24x7, even with no users | Only when a request or the cron fires |
| Cost | Billed for the whole time it is running | Free tier / pay for actual use |
| Scaling | Configure load balancers and extra VMs | Automatic |
| Maintenance | OS patches, security updates, monitoring | Handled by the provider |
| Cron job | `crontab` on the server. If the server is off, the job does not run | Managed trigger, no server needed |
| Better for | Long-running apps, full control, special software | Small APIs, scheduled jobs, unpredictable traffic |

The daily report is a good example. On a VM, a job that takes one second would still need a server running all day.

## 3. Architecture

```
Browser (static UI from /public)
        |
        |  HTTP  /api/*
        v
Cloudflare Worker  (src/index.js)  -----> D1 database (complaints, attachments, reports)
        ^
        |  scheduled event
Cron trigger (daily, 8:00 AM IST = 02:30 UTC)
```

**AWS equivalent (for comparison):**

| This project | AWS service |
|---|---|
| Worker | Lambda |
| API routes | API Gateway |
| D1 | DynamoDB |
| Cron trigger | EventBridge schedule |

The original CampusCare design targets AWS (Lambda, API Gateway, DynamoDB, Cognito, S3, SNS).
This version uses the same serverless idea on Cloudflare because it is free and needs no card.

## 4. Features

- Submit a complaint: title, category, optional location, description (max 500 characters) and optional JPG, PNG or PDF evidence
- Dashboard with total, open, resolved and resolution-rate cards
- My Complaints (this browser only), All Complaints with search and filters
- Admin Panel: mark complaints resolved or reopen them, run the report job manually
- Reports page: history of reports written by the cron job and a complaints-by-category chart
- Notification bell: red dot when one of your complaints has been resolved

## 5. Project structure

```
campuscare-lite/
  public/index.html   The UI (single static page)
  src/index.js        Worker: HTTP API + scheduled cron handler
  schema.sql          D1 tables: complaints, attachments, reports
  wrangler.toml       Infrastructure config: cron, database, static assets
  package.json        Scripts and the wrangler dependency
```

## 6. API

| Method and path | Who | What it does |
|---|---|---|
| `POST /api/complaints` | Public | Validate and save a complaint (and attachment) |
| `GET /api/complaints` | Public | List complaints. `?client_id=` returns only that browser's complaints |
| `GET /api/complaints/:id/attachment` | Public | Download the attachment |
| `PATCH /api/complaints/:id` | Admin | Set status to `open` or `resolved` |
| `GET /api/stats` | Public | Totals, resolution rate and counts by category |
| `GET /api/reports` | Public | Report history |
| `POST /api/run-report` | Admin | Run the report job now (same function as the cron) |

Admin routes need the header `x-admin-key`. A wrong or missing key returns `401`.

## 7. Run locally

Requirements: Node.js 22 or newer and npm.

```powershell
cd campuscare-lite
npm install
echo ADMIN_KEY=admin123 > .dev.vars     # local admin key (this file is git-ignored)
npm run db:local                        # create local tables
npm run dev                             # open http://localhost:8787
```

To test the cron locally, open `http://localhost:8787/__scheduled?cron=30+2+*+*+*` while `npm run dev` is running.

## 8. Deploy to Cloudflare (free, no card)

```powershell
npx wrangler login                           # one time, allow in the browser
npx wrangler d1 create campuscare-db         # prints a database_id
```

Paste the `database_id` into `wrangler.toml`, then:

```powershell
npm run db:remote                            # create tables in the cloud database
npx wrangler secret put ADMIN_KEY            # type your admin password
npm run deploy                               # prints the live URL
npm run logs                                 # watch live logs
```

For a live cron demo, change `crons` in `wrangler.toml` to `["* * * * *"]` (every minute),
deploy, and watch `npm run logs`. Change it back to `["30 2 * * *"]` afterwards.
Cron times are in UTC, and IST is UTC + 5:30.

## 9. Demo flow

1. Open the live URL and submit a complaint. The stats update.
2. Show it in All Complaints (it is read back from the database).
3. In Admin Panel, enter a wrong key (error), then the correct key and mark it resolved.
4. Click Run report now, then open Reports to see the new row.
5. Open the Cloudflare dashboard: Workers & Pages, then the project, to show the cron trigger and logs.

## 10. Security measures

- Admin endpoints require a secret key stored as a platform secret, not in the code
- All input is validated on the server (lengths, category list, status values)
- Attachments are limited to 250 KB, and the real file type is detected from the file's first bytes, so a renamed file is rejected
- Attachments are served with `nosniff` and a restrictive Content-Security-Policy
- Database queries use bound parameters (no SQL injection)
- User text is rendered with `textContent` in the UI (no XSS)

## 11. Limitations

- Admin login is a single shared key, not real user authentication
- "My Complaints" is tied to a random ID stored in the browser, not to an account
- Attachments are stored as base64 text in D1. A production system would use object storage (S3 or R2)
- No email notifications
- Serverless functions are stateless and have execution time limits, so they are not suited to long-running work
- Tied to one provider (vendor lock-in)
