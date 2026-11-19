// Opaque pagination tokens wrapping DynamoDB's LastEvaluatedKey.
import { HttpError } from './http.js';

export function encodeToken(lastEvaluatedKey) {
  if (!lastEvaluatedKey) return null;
  return Buffer.from(JSON.stringify(lastEvaluatedKey), 'utf8').toString('base64url');
}

/**
 * Decodes a token and checks that it only contains the expected string keys.
 * `expect` can pin key values (e.g. studentId must equal the caller's id), so a
 * crafted token cannot steer a query outside the caller's partition.
 */
export function decodeToken(token, allowedKeys, expect = {}) {
  if (!token) return undefined;
  let key;
  try {
    key = JSON.parse(Buffer.from(String(token), 'base64url').toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid nextToken');
  }
  if (!key || typeof key !== 'object' || Array.isArray(key)) throw new HttpError(400, 'Invalid nextToken');
  for (const [k, v] of Object.entries(key)) {
    if (!allowedKeys.includes(k) || typeof v !== 'string' || v.length > 200) {
      throw new HttpError(400, 'Invalid nextToken');
    }
  }
  for (const [k, v] of Object.entries(expect)) {
    if (key[k] !== v) throw new HttpError(400, 'Invalid nextToken');
  }
  return key;
}
