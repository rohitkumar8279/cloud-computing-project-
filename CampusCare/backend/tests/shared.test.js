// Unit tests for pure logic (no AWS calls). Run: cd backend && npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGroups, getIdentity, requireAdmin } from '../shared/auth.js';
import {
  validateCreateComplaint,
  validateAdminUpdate,
  validatePresignRequest,
  requireUuid,
} from '../shared/validation.js';
import { encodeToken, decodeToken } from '../shared/pagination.js';
import { statsForCreate, statsForUpdate, readStats } from '../shared/stats.js';
import { TRANSITIONS } from '../shared/constants.js';
import { queryPage } from '../shared/db.js';

const eventWith = (claims) => ({ requestContext: { authorizer: { jwt: { claims } } } });

test('parseGroups handles HTTP API flattened claim formats', () => {
  assert.deepEqual(parseGroups('[Admins Students]'), ['Admins', 'Students']);
  assert.deepEqual(parseGroups('["Admins"]'), ['Admins']);
  assert.deepEqual(parseGroups(['Students']), ['Students']);
  assert.deepEqual(parseGroups('Admins,Students'), ['Admins', 'Students']);
  assert.deepEqual(parseGroups(undefined), []);
});

test('getIdentity reads role from JWT claims only', () => {
  const student = getIdentity(eventWith({ sub: 'abc', email: 's@x.edu', token_use: 'id', 'cognito:groups': '[Students]' }));
  assert.equal(student.isAdmin, false);
  assert.throws(() => requireAdmin(student), { statusCode: 403 });

  const admin = getIdentity(eventWith({ sub: 'def', token_use: 'id', 'cognito:groups': '[Admins]' }));
  assert.equal(admin.isAdmin, true);
});

test('getIdentity rejects missing claims and access tokens', () => {
  assert.throws(() => getIdentity({}), { statusCode: 401 });
  assert.throws(() => getIdentity(eventWith({ sub: 'x', token_use: 'access' })), { statusCode: 401 });
});

test('validateCreateComplaint ignores identity fields and applies default department', () => {
  const out = validateCreateComplaint({
    title: '  Hostel   Wi-Fi down ',
    description: 'No internet in block B since morning.',
    category: 'WIFI',
    studentId: 'attacker-supplied',
    status: 'RESOLVED',
  });
  assert.equal(out.title, 'Hostel Wi-Fi down');
  assert.equal(out.department, 'IT_SERVICES');
  assert.equal('studentId' in out, false);
  assert.equal('status' in out, false);
});

test('validateCreateComplaint rejects bad input', () => {
  const base = { title: 'Valid title', description: 'A long enough description', category: 'WATER' };
  assert.throws(() => validateCreateComplaint({ ...base, title: 'abc' }), { statusCode: 400 });
  assert.throws(() => validateCreateComplaint({ ...base, category: 'NOPE' }), { statusCode: 400 });
  assert.throws(() => validateCreateComplaint({ ...base, department: 'NOPE' }), { statusCode: 400 });
  assert.throws(() => validateCreateComplaint({ ...base, attachmentKey: '../../etc/passwd' }), { statusCode: 400 });
  assert.throws(() => validateCreateComplaint({ ...base, category: '__proto__' }), { statusCode: 400 });
});

test('validatePresignRequest enforces type and size', () => {
  assert.equal(validatePresignRequest({ contentType: 'image/png', fileSize: 1000 }).extension, 'png');
  assert.throws(() => validatePresignRequest({ contentType: 'application/pdf', fileSize: 1000 }), { statusCode: 400 });
  assert.throws(() => validatePresignRequest({ contentType: 'image/png', fileSize: 50 * 1024 * 1024 }), { statusCode: 400 });
  assert.throws(() => validatePresignRequest({ contentType: 'image/png', fileSize: -1 }), { statusCode: 400 });
});

test('validateAdminUpdate requires at least one known field', () => {
  assert.throws(() => validateAdminUpdate({}), { statusCode: 400 });
  assert.throws(() => validateAdminUpdate({ status: 'DONE' }), { statusCode: 400 });
  assert.deepEqual(validateAdminUpdate({ status: 'IN_PROGRESS', adminRemarks: ' On it ' }), {
    status: 'IN_PROGRESS',
    adminRemarks: 'On it',
  });
});

test('requireUuid', () => {
  assert.equal(requireUuid('3F2504E0-4F89-41D3-9A0C-0305E82C3301'), '3f2504e0-4f89-41d3-9a0c-0305e82c3301');
  assert.throws(() => requireUuid('__STATS__'), { statusCode: 400 });
});

test('pagination token round-trip and partition pinning', () => {
  const key = { complaintId: 'c1', studentId: 's1', createdAt: '2026-01-01T00:00:00.000Z' };
  const token = encodeToken(key);
  assert.deepEqual(decodeToken(token, Object.keys(key), { studentId: 's1' }), key);
  assert.throws(() => decodeToken(token, Object.keys(key), { studentId: 'other' }), { statusCode: 400 });
  assert.throws(() => decodeToken('not-a-token', Object.keys(key)), { statusCode: 400 });
});

test('status workflow', () => {
  assert.ok(TRANSITIONS.PENDING.includes('IN_PROGRESS'));
  assert.ok(TRANSITIONS.IN_PROGRESS.includes('RESOLVED'));
  assert.ok(!TRANSITIONS.PENDING.includes('RESOLVED'));
});

test('stats counters', () => {
  const create = statsForCreate({ status: 'PENDING', category: 'WIFI', department: 'IT_SERVICES', createdAt: 'now' });
  assert.match(create.Update.UpdateExpression, /^ADD /);
  assert.equal(statsForUpdate({ status: 'PENDING', department: 'X' }, { status: 'PENDING', department: 'X' }, 'now'), null);
  const upd = statsForUpdate({ status: 'PENDING', department: 'X' }, { status: 'IN_PROGRESS', department: 'X' }, 'now');
  assert.deepEqual(Object.values(upd.Update.ExpressionAttributeNames).sort(), ['status_IN_PROGRESS', 'status_PENDING']);
  const read = readStats({ total: 3, status_PENDING: 2, category_WIFI: 3, department_IT_SERVICES: 3, updatedAt: 'x' });
  assert.deepEqual(read, { total: 3, byStatus: { PENDING: 2 }, byCategory: { WIFI: 3 }, byDepartment: { IT_SERVICES: 3 } });
});

test('queryPage keeps reading past empty filtered pages without skipping items', async () => {
  // Fake DynamoDB: 7 items, every third one matches the filter.
  const all = Array.from({ length: 7 }, (_, i) => ({ id: i, match: i % 3 === 0 }));
  const calls = [];
  const send = async (cmd) => {
    const { ExclusiveStartKey, Limit } = cmd.input;
    calls.push(Limit);
    const start = ExclusiveStartKey ? ExclusiveStartKey.id + 1 : 0;
    const evaluated = all.slice(start, start + Limit);
    const last = evaluated.at(-1);
    return {
      Items: evaluated.filter((x) => x.match),
      LastEvaluatedKey: last && last.id < all.length - 1 ? { id: last.id } : undefined,
    };
  };

  const page = await queryPage({ FilterExpression: 'match = :t' }, 2, { send });
  assert.deepEqual(page.items.map((x) => x.id), [0, 3]);
  assert.deepEqual(page.lastEvaluatedKey, { id: 3 }); // resumes right after the last returned item
  assert.ok(calls.every((l) => l >= 1 && l <= 2));

  const next = await queryPage({ FilterExpression: 'match = :t', ExclusiveStartKey: page.lastEvaluatedKey }, 2, { send });
  assert.deepEqual(next.items.map((x) => x.id), [6]);
  assert.equal(next.lastEvaluatedKey, undefined);
});

test('queryPage does a single read when there is no filter, and respects maxRounds', async () => {
  let n = 0;
  const send = async () => {
    n += 1;
    return { Items: [], LastEvaluatedKey: { id: n } };
  };
  await queryPage({}, 5, { send });
  assert.equal(n, 1);
  n = 0;
  const page = await queryPage({ FilterExpression: 'x' }, 5, { send, maxRounds: 3 });
  assert.equal(n, 3);
  assert.deepEqual(page.lastEvaluatedKey, { id: 3 });
});
