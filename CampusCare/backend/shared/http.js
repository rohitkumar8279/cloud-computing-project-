// HTTP helpers for API Gateway HTTP API (payload format 2.0).
// CORS headers are added by API Gateway's CorsConfiguration, not here.
import { log } from './logger.js';

export class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
  body: JSON.stringify(body),
});

const MAX_BODY_BYTES = 16 * 1024;

export function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    throw new HttpError(413, 'Request body is too large');
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    return parsed;
  } catch {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
}

/**
 * Wraps a handler with uniform error handling and structured logging.
 * Unexpected errors are logged with detail but return a generic 500.
 */
export const withHandler = (name, fn) => async (event, context) => {
  const started = Date.now();
  const requestId = event?.requestContext?.requestId;
  try {
    const result = await fn(event, context);
    log('info', `${name} completed`, { requestId, statusCode: result.statusCode, ms: Date.now() - started });
    return result;
  } catch (err) {
    if (err instanceof HttpError) {
      log('warn', `${name} rejected request`, { requestId, statusCode: err.statusCode, message: err.message });
      return json(err.statusCode, { message: err.message, ...(err.details ? { details: err.details } : {}) });
    }
    log('error', `${name} failed`, { requestId, error: err?.name, message: err?.message, stack: err?.stack });
    return json(500, { message: 'Internal server error' });
  }
};
