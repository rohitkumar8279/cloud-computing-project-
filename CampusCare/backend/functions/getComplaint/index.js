// GET /complaints/{complaintId} - full details for the owner or an administrator.
// Non-owners get 404 (not 403) so complaint IDs cannot be probed.
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../../shared/db.js';
import { withHandler, json, HttpError } from '../../shared/http.js';
import { getIdentity } from '../../shared/auth.js';
import { requireUuid } from '../../shared/validation.js';
import { presignDownload } from '../../shared/s3.js';
import { toApi } from '../../shared/complaints.js';
import { env } from '../../shared/constants.js';

export const handler = withHandler('getComplaint', async (event) => {
  const user = getIdentity(event);
  const complaintId = requireUuid(event.pathParameters?.complaintId, 'complaint ID');

  const { Item } = await ddb.send(new GetCommand({ TableName: env.tableName, Key: { complaintId } }));
  if (!Item || (!user.isAdmin && Item.studentId !== user.userId)) {
    throw new HttpError(404, 'Complaint not found');
  }

  const complaint = toApi(Item);
  if (Item.attachmentKey) {
    complaint.attachmentUrl = await presignDownload(Item.attachmentKey);
    complaint.attachmentUrlExpiresIn = env.downloadTtl;
  }
  return json(200, { complaint });
});
