// Ye function schedule par apne aap chalta hai (cron), koi server nahi chahiye.

async function runJob(env) {
  const time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  // Demo kaam: ek random advice fetch karo
  const res = await fetch("https://api.adviceslip.com/advice", { cf: { cacheTtl: 0 } });
  const advice = (await res.json()).slip.advice;

  const message = `Good morning! (${time} IST)\nToday's advice: ${advice}`;
  console.log(message);

  // Optional: Discord webhook set ho to message wahan bhi jayega
  if (env.DISCORD_WEBHOOK_URL) {
    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  }
  return message;
}

export default {
  // Cron trigger yahan aata hai
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runJob(env));
  },

  // Browser mein URL kholo to job turant chal ke result dikhega (demo ke liye)
  async fetch(request, env) {
    const message = await runJob(env);
    return new Response(message, { headers: { "content-type": "text/plain; charset=utf-8" } });
  },
};
