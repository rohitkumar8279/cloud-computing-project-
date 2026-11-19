// Structured JSON logs - searchable with CloudWatch Logs Insights, e.g.
//   fields @timestamp, level, msg, statusCode | filter level = "error"
export function log(level, msg, data = {}) {
  const line = JSON.stringify({ level, msg, ...data });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}
