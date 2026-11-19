// POST /uploads/presign  { contentType, fileSize } -> presigned S3 POST for one image.
// The browser uploads straight to the private bucket; no AWS keys in React.
import { randomUUID } from 'node:crypto';
import { withHandler, parseBody, json } from '../../shared/http.js';
import { getIdentity } from '../../shared/auth.js';
import { validatePresignRequest } from '../../shared/validation.js';
import { presignUpload } from '../../shared/s3.js';
import { env } from '../../shared/constants.js';

export const handler = withHandler('createUploadUrl', async (event) => {
  const user = getIdentity(event);
  const { contentType, extension } = validatePresignRequest(parseBody(event));

  // Unique key under the caller's own prefix; createComplaint checks the prefix.
  const key = `uploads/${user.userId}/${randomUUID()}.${extension}`;
  const { url, fields } = await presignUpload({ key, contentType, maxBytes: env.maxUploadBytes });

  return json(200, {
    url,
    fields,
    key,
    expiresIn: env.uploadTtl,
    maxBytes: env.maxUploadBytes,
  });
});
