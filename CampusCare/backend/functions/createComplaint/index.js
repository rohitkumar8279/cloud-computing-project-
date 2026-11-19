// POST /complaints - a signed-in student files a complaint.
import { randomUUID } from 'node:crypto';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../../shared/db.js';
import { withHandler, parseBody, json, HttpError } from '../../shared/http.js';
import { getIdentity } from '../../shared/auth.js';
import { validateCreateComplaint } from '../../shared/validation.js';
import { headObject } from '../../shared/s3.js';
import { notify } from '../../shared/notify.js';
import { statsForCreate } from '../../shared/stats.js';
import { toApi } from '../../shared/complaints.js';
import { ALLOWED_IMAGE_TYPES, CATEGORIES, DEPARTMENTS, ENTITY_TYPE, env } from '../../shared/constants.js';

export const handler = withHandler('createComplaint', async (event) => {
  const user = getIdentity(event);
  const input = validateCreateComplaint(parseBody(event));

  // The attachment must be in the caller's own upload prefix and must really
  // exist in S3 with an allowed type and size.
  if (input.attachmentKey) {
    if (!input.attachmentKey.startsWith(`uploads/${user.userId}/`)) {
      throw new HttpError(403, 'Attachment does not belong to you');
    }
    const head = await headObject(input.attachmentKey);
    if (!head) throw new HttpError(400, 'Attachment not found - please upload the image again');
    if (!Object.hasOwn(ALLOWED_IMAGE_TYPES, head.ContentType) || head.ContentLength > env.maxUploadBytes) {
      throw new HttpError(400, 'Attachment is not an allowed image');
    }
  }

  const now = new Date().toISOString();
  const item = {
    complaintId: randomUUID(),
    entityType: ENTITY_TYPE,
    studentId: user.userId, // from the validated JWT, never from the body
    studentName: user.name,
    studentEmail: user.email,
    title: input.title,
    description: input.description,
    location: input.location,
    category: input.category,
    department: input.department,
    status: 'PENDING',
    attachmentKey: input.attachmentKey,
    adminRemarks: '',
    assignedTo: '',
    createdAt: now,
    updatedAt: now,
    lastStatusChangeAt: now,
    statusHistory: [{ status: 'PENDING', at: now, by: 'Student', note: 'Complaint submitted' }],
  };

  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: env.tableName,
            Item: item,
            ConditionExpression: 'attribute_not_exists(complaintId)',
          },
        },
        statsForCreate(item),
      ],
    }),
  );

  await notify(
    `[CampusCare] New complaint: ${item.title}`,
    [
      'A new complaint has been submitted.',
      '',
      `Complaint ID : ${item.complaintId}`,
      `Title        : ${item.title}`,
      `Category     : ${CATEGORIES[item.category].label}`,
      `Department   : ${DEPARTMENTS[item.department]}`,
      item.location ? `Location     : ${item.location}` : '',
      `Student      : ${item.studentName} <${item.studentEmail}>`,
      `Submitted at : ${item.createdAt}`,
      `Attachment   : ${item.attachmentKey ? 'yes' : 'no'}`,
      '',
      'Description:',
      item.description,
    ],
    { eventType: 'COMPLAINT_CREATED', category: item.category },
  );

  return json(201, { complaint: toApi(item) });
});
