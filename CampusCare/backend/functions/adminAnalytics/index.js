// GET /admin/analytics?days=14  (Admins only)
// Totals come from one counter item (O(1)); the trend uses a bounded
// date-range Query on CreatedAtIndex; recent complaints use Limit 5.
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, INDEXES } from '../../shared/db.js';
import { withHandler, json, HttpError } from '../../shared/http.js';
import { getIdentity, requireAdmin } from '../../shared/auth.js';
import { readStats } from '../../shared/stats.js';
import { toListItem } from '../../shared/complaints.js';
import { CATEGORIES, DEPARTMENTS, ENTITY_TYPE, STATS_KEY, STATUSES, env } from '../../shared/constants.js';

const MAX_TREND_ITEMS = 2000; // safety cap on the trend query

export const handler = withHandler('adminAnalytics', async (event) => {
  requireAdmin(getIdentity(event));

  const days = Number(event.queryStringParameters?.days ?? 14);
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new HttpError(400, 'days must be an integer between 1 and 90');
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const since = new Date(today.getTime() - (days - 1) * 86400000);

  const [statsRes, recentRes, trendItems] = await Promise.all([
    ddb.send(new GetCommand({ TableName: env.tableName, Key: { complaintId: STATS_KEY }, ConsistentRead: true })),
    ddb.send(
      new QueryCommand({
        TableName: env.tableName,
        IndexName: INDEXES.byCreatedAt,
        KeyConditionExpression: 'entityType = :type',
        ExpressionAttributeValues: { ':type': ENTITY_TYPE },
        ScanIndexForward: false,
        Limit: 5,
      }),
    ),
    queryTrend(since.toISOString()),
  ]);

  const stats = readStats(statsRes.Item);

  // Build a zero-filled day series (UTC dates).
  const perDay = new Map();
  for (let i = 0; i < days; i++) {
    perDay.set(new Date(since.getTime() + i * 86400000).toISOString().slice(0, 10), 0);
  }
  for (const it of trendItems) {
    const d = it.createdAt.slice(0, 10);
    if (perDay.has(d)) perDay.set(d, perDay.get(d) + 1);
  }

  const resolved = stats.byStatus.RESOLVED || 0;
  return json(200, {
    generatedAt: new Date().toISOString(),
    totals: {
      total: stats.total,
      ...Object.fromEntries(STATUSES.map((s) => [s, Math.max(0, stats.byStatus[s] || 0)])),
    },
    resolutionRate: stats.total ? Math.round((resolved / stats.total) * 1000) / 10 : 0,
    byCategory: Object.keys(CATEGORIES).map((c) => ({
      category: c,
      label: CATEGORIES[c].label,
      count: Math.max(0, stats.byCategory[c] || 0),
    })),
    byDepartment: Object.keys(DEPARTMENTS).map((d) => ({
      department: d,
      label: DEPARTMENTS[d],
      count: Math.max(0, stats.byDepartment[d] || 0),
    })),
    trend: [...perDay.entries()].map(([date, count]) => ({ date, count })),
    trendDays: days,
    recent: (recentRes.Items || []).map(toListItem),
  });
});

async function queryTrend(sinceIso) {
  const items = [];
  let startKey;
  do {
    const res = await ddb.send(
      new QueryCommand({
        TableName: env.tableName,
        IndexName: INDEXES.byCreatedAt,
        KeyConditionExpression: 'entityType = :type AND createdAt >= :since',
        ExpressionAttributeValues: { ':type': ENTITY_TYPE, ':since': sinceIso },
        ProjectionExpression: 'createdAt',
        ExclusiveStartKey: startKey,
      }),
    );
    items.push(...(res.Items || []));
    startKey = res.LastEvaluatedKey;
  } while (startKey && items.length < MAX_TREND_ITEMS);
  return items;
}
