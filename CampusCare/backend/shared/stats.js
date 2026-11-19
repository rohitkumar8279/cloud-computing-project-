// Atomic statistics counters kept in one item (complaintId = "__STATS__").
// Updated in the same DynamoDB transaction as each complaint write, so the
// analytics endpoint reads one item instead of scanning the table.
import { env, STATS_KEY } from './constants.js';

function counterUpdate(deltas, now) {
  const names = {};
  const values = { ':now': now };
  const parts = [];
  Object.entries(deltas).forEach(([attr, delta], i) => {
    if (!delta) return;
    names[`#a${i}`] = attr;
    values[`:d${i}`] = delta;
    parts.push(`#a${i} :d${i}`);
  });
  if (parts.length === 0) return null;
  return {
    Update: {
      TableName: env.tableName,
      Key: { complaintId: STATS_KEY },
      UpdateExpression: `ADD ${parts.join(', ')} SET updatedAt = :now`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    },
  };
}

export function statsForCreate(item) {
  return counterUpdate(
    {
      total: 1,
      [`status_${item.status}`]: 1,
      [`category_${item.category}`]: 1,
      [`department_${item.department}`]: 1,
    },
    item.createdAt,
  );
}

/** Returns a transact item, or null if no counter changes. */
export function statsForUpdate(before, after, now) {
  const deltas = {};
  if (before.status !== after.status) {
    deltas[`status_${before.status}`] = -1;
    deltas[`status_${after.status}`] = 1;
  }
  if (before.department !== after.department) {
    deltas[`department_${before.department}`] = -1;
    deltas[`department_${after.department}`] = 1;
  }
  return counterUpdate(deltas, now);
}

/** Turns the raw stats item into grouped maps. */
export function readStats(item = {}) {
  const byStatus = {};
  const byCategory = {};
  const byDepartment = {};
  for (const [k, v] of Object.entries(item)) {
    if (typeof v !== 'number') continue;
    if (k.startsWith('status_')) byStatus[k.slice(7)] = v;
    else if (k.startsWith('category_')) byCategory[k.slice(9)] = v;
    else if (k.startsWith('department_')) byDepartment[k.slice(11)] = v;
  }
  return { total: item.total || 0, byStatus, byCategory, byDepartment };
}
