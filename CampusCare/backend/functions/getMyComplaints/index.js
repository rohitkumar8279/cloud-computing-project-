// GET /complaints/mine?status=&limit=&nextToken= - the caller's own complaints, newest first.
// Uses StudentIndex (studentId + createdAt) - a Query, never a Scan.
import { INDEXES, queryPage } from '../../shared/db.js';
import { withHandler, json } from '../../shared/http.js';
import { getIdentity } from '../../shared/auth.js';
import { parseLimit, parseOptionalEnum } from '../../shared/validation.js';
import { encodeToken, decodeToken } from '../../shared/pagination.js';
import { toListItem } from '../../shared/complaints.js';
import { STATUSES, env } from '../../shared/constants.js';

export const handler = withHandler('getMyComplaints', async (event) => {
  const user = getIdentity(event);
  const qs = event.queryStringParameters || {};
  const limit = parseLimit(qs.limit);
  const status = parseOptionalEnum(qs.status, STATUSES, 'status');
  const startKey = decodeToken(qs.nextToken, ['complaintId', 'studentId', 'createdAt'], {
    studentId: user.userId,
  });

  const params = {
    TableName: env.tableName,
    IndexName: INDEXES.byStudent,
    KeyConditionExpression: 'studentId = :sid',
    ExpressionAttributeValues: { ':sid': user.userId },
    ScanIndexForward: false,
    ExclusiveStartKey: startKey,
  };
  if (status) {
    params.FilterExpression = '#status = :status';
    params.ExpressionAttributeNames = { '#status': 'status' };
    params.ExpressionAttributeValues[':status'] = status;
  }

  const page = await queryPage(params, limit);
  return json(200, {
    items: page.items.map(toListItem),
    nextToken: encodeToken(page.lastEvaluatedKey),
  });
});
