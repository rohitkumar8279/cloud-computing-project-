// Identity comes ONLY from claims that API Gateway's JWT authorizer has already
// validated (signature, issuer, audience, expiry). Nothing in the request body
// or query string is ever trusted for identity or role.
import { HttpError } from './http.js';
import { env } from './constants.js';

/**
 * HTTP API flattens array claims into a string such as "[Admins Students]".
 * Accept that, a JSON array string, a real array, or a comma list.
 */
export function parseGroups(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  const s = String(raw).trim();
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      /* not JSON - fall through to bracket stripping */
    }
    return s.slice(1, -1).split(/[\s,]+/).filter(Boolean);
  }
  return s.split(/[\s,]+/).filter(Boolean);
}

export function getIdentity(event) {
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  if (!claims || !claims.sub) {
    throw new HttpError(401, 'Unauthorized');
  }
  // We need email/name, which only the ID token carries.
  if (claims.token_use && claims.token_use !== 'id') {
    throw new HttpError(401, 'An ID token is required');
  }
  const groups = parseGroups(claims['cognito:groups']);
  return {
    userId: claims.sub,
    email: claims.email || '',
    name: claims.name || claims.email || 'Student',
    groups,
    isAdmin: groups.includes(env.adminGroup),
  };
}

export function requireAdmin(identity) {
  if (!identity.isAdmin) {
    throw new HttpError(403, 'Administrator access required');
  }
  return identity;
}
