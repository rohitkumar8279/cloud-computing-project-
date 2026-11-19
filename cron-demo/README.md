# Cron Demo (Cloudflare Workers)

## Setup (ek baar)
1. https://dash.cloudflare.com/sign-up par free account banao (card nahi chahiye).
2. `npm install`
3. `npx wrangler login`  (browser khulega, Allow dabao)

## Local test
`npm run dev` phir browser mein http://localhost:8787 kholo.
Cron test: http://localhost:8787/__scheduled?cron=30+2+*+*+*

## Deploy
`npm run deploy`  -> URL milega: https://cron-demo.<naam>.workers.dev

## Live logs dekhna
`npm run logs`

## Time badalna
wrangler.toml mein `crons` change karo (UTC me). IST = UTC + 5:30.
- Har minute: `* * * * *`
- Roz 8 AM IST: `30 2 * * *`

## Discord par message (optional)
`npx wrangler secret put DISCORD_WEBHOOK_URL`
