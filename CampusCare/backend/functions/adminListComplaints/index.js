// GET /admin/complaints?status=&category=&department=&limit=&nextToken=  (Admins only)
// status given  -> Query StatusIndex     (status + createdAt)
// no status     -> Query CreatedAtIndex  (entityType + createdAt)
// category/department are applied as filters on that query. No table scans.
import { INDEXES, queryPage } from '../../shared/db.js';
import { withHandler, json } from '../../shared/http.js';
import { getIdentity, requireAdmin } from '../../shared/auth.js';
import { parseLimit, parseOptionalEnum } from '../../shared/validation.js';
import { encodeToken, decodeToken } from '../../shared/pagination.js';
import { toListItem } from '../../shared/complaints.js';
import { CATEGORIES, DEPARTMENTS, ENTITY_TYPE, STATUSES, env } from '../../shared/constants.js';

export const handler = withHandler('adminListComplaints', async (event) => {
  requireAdmin(getIdentity(event));

  const qs = event.queryStringParameters || {};
  const limit = parseLimit(qs.limit);
  const status = parseOptionalEnum(qs.status, STATUSES, 'status');
  const category = parseOptionalEnum(qs.category, Object.keys(CATEGORIES), 'category');
  const department = parseOptionalEnum(qs.department, Object.keys(DEPARTMENTS), 'department');

  const names = {};
  const values = {};
  let params;

  if (status) {
    names['#status'] = 'status';
    values[':status'] = status;
    params = {
      IndexName: INDEXES.byStatus,
      KeyConditionExpression: '#status = :status',
      ExclusiveStartKey: decodeToken(qs.nextToken, ['complaintId', 'status', 'createdAt'], { status }),
    };
  } else {
    values[':type'] = ENTITY_TYPE;
    params = {
      IndexName: INDEXES.byCreatedAt,
      KeyConditionExpression: 'entityType = :type',
      ExclusiveStartKey: decodeToken(qs.nextToken, ['complaintId', 'entityType', 'createdAt'], {
        entityType: ENTITY_TYPE,
      }),
    };
  }

  const filters = [];
  if (category) {
    filters.push('category = :category');
    values[':category'] = category;
  }
  if (department) {
    filters.push('department = :department');
    values[':department'] = department;
  }

  const page = await queryPage(
    {
      TableName: env.tableName,
      ...params,
      ...(filters.length ? { FilterExpression: filters.join(' AND ') } : {}),
      ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
      ExpressionAttributeValues: values,
      ScanIndexForward: false,
    },
    limit,
  );

  return json(200, {
    items: page.items.map(toListItem),
    nextToken: encodeToken(page.lastEvaluatedKey),
  });
});
