// PATCH /admin/complaints/{complaintId}  { status?, department?, adminRemarks?, assignedTo? }  (Admins only)
// Enforces the status workflow and uses an optimistic-concurrency condition so
// two admins cannot silently overwrite each other's status change.
import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, isConditionFailure } from '../../shared/db.js';
import { withHandler, parseBody, json, HttpError } from '../../shared/http.js';
import { getIdentity, requireAdmin } from '../../shared/auth.js';
import { requireUuid, validateAdminUpdate } from '../../shared/validation.js';
import { notify } from '../../shared/notify.js';
import { statsForUpdate } from '../../shared/stats.js';
import { toApi } from '../../shared/complaints.js';
import { DEPARTMENTS, TRANSITIONS, env } from '../../shared/constants.js';

export const handler = withHandler('adminUpdateComplaint', async (event) => {
  const admin = requireAdmin(getIdentity(event));
  const complaintId = requireUuid(event.pathParameters?.complaintId, 'complaint ID');
  const changes = validateAdminUpdate(parseBody(event));

  const { Item: current } = await ddb.send(
    new GetCommand({ TableName: env.tableName, Key: { complaintId }, ConsistentRead: true }),
  );
  if (!current) throw new HttpError(404, 'Complaint not found');

  const statusChanged = changes.status !== undefined && changes.status !== current.status;
  if (statusChanged && !TRANSITIONS[current.status]?.includes(changes.status)) {
    throw new HttpError(
      409,
      `Cannot change status from ${current.status} to ${changes.status}`,
      { allowed: TRANSITIONS[current.status] || [] },
    );
  }

  const now = new Date().toISOString();
  const after = {
    status: changes.status ?? current.status,
    department: changes.department ?? current.department,
  };

  const sets = ['updatedAt = :now', 'lastUpdatedBy = :by'];
  const names = { '#status': 'status' };
  const values = { ':now': now, ':by': admin.email || admin.userId, ':prevStatus': current.status };

  if (statusChanged) {
    sets.push('#status = :status', 'lastStatusChangeAt = :now');
    values[':status'] = changes.status;
    if (changes.status === 'RESOLVED') sets.push('resolvedAt = :now');
  }
  if (changes.department !== undefined) {
    sets.push('department = :department');
    values[':department'] = changes.department;
  }
  if (changes.adminRemarks !== undefined) {
    sets.push('adminRemarks = :remarks');
    values[':remarks'] = changes.adminRemarks;
  }
  if (changes.assignedTo !== undefined) {
    sets.push('assignedTo = :assignedTo');
    values[':assignedTo'] = changes.assignedTo;
  }

  // Timeline entry for status changes (and department reassignment).
  const deptChanged = changes.department !== undefined && changes.department !== current.department;
  if (statusChanged || deptChanged) {
    sets.push('statusHistory = list_append(if_not_exists(statusHistory, :empty), :entry)');
    values[':empty'] = [];
    values[':entry'] = [
      {
        status: after.status,
        at: now,
        by: 'Administrator',
        note:
          changes.adminRemarks ||
          (deptChanged && !statusChanged ? `Reassigned to ${DEPARTMENTS[after.department]}` : ''),
        ...(deptChanged ? { department: after.department } : {}),
      },
    ];
  }

  const transactItems = [
    {
      Update: {
        TableName: env.tableName,
        Key: { complaintId },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ConditionExpression: 'attribute_exists(complaintId) AND #status = :prevStatus',
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      },
    },
  ];
  const statsUpdate = statsForUpdate(current, after, now);
  if (statsUpdate) transactItems.push(statsUpdate);

  try {
    await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
  } catch (err) {
    if (isConditionFailure(err)) {
      throw new HttpError(409, 'This complaint was changed by someone else. Reload and try again.');
    }
    throw err;
  }

  const { Item: updated } = await ddb.send(
    new GetCommand({ TableName: env.tableName, Key: { complaintId }, ConsistentRead: true }),
  );

  if (statusChanged || deptChanged) {
    await notify(
      `[CampusCare] ${current.title} - ${after.status}`,
      [
        'A complaint was updated by an administrator.',
        '',
        `Complaint ID : ${complaintId}`,
        `Title        : ${current.title}`,
        `Student      : ${current.studentName} <${current.studentEmail}>`,
        `Status       : ${current.status} -> ${after.status}`,
        `Department   : ${DEPARTMENTS[after.department]}`,
        updated?.assignedTo ? `Assigned to  : ${updated.assignedTo}` : '',
        `Updated by   : ${admin.email}`,
        `Updated at   : ${now}`,
        updated?.adminRemarks ? `\nRemarks:\n${updated.adminRemarks}` : '',
      ],
      { eventType: 'COMPLAINT_UPDATED', status: after.status },
    );
  }

  return json(200, { complaint: toApi(updated) });
});
