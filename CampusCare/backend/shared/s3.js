// S3 helpers: presigned POST (size-limited upload), presigned GET (short-lived view), HeadObject.
import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './constants.js';

export const s3 = new S3Client({});

/**
 * A presigned POST (unlike a presigned PUT) lets S3 itself enforce the
 * content-length-range and exact Content-Type, so oversized or non-image
 * uploads are rejected by S3 before they are stored.
 */
export function presignUpload({ key, contentType, maxBytes }) {
  return createPresignedPost(s3, {
    Bucket: env.bucketName,
    Key: key,
    Conditions: [
      ['content-length-range', 1, maxBytes],
      ['eq', '$Content-Type', contentType],
    ],
    Fields: { 'Content-Type': contentType },
    Expires: env.uploadTtl,
  });
}

export function presignDownload(key) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.bucketName, Key: key, ResponseContentDisposition: 'inline' }),
    { expiresIn: env.downloadTtl },
  );
}

/** Returns object metadata, or null if the object does not exist. */
export async function headObject(key) {
  try {
    return await s3.send(new HeadObjectCommand({ Bucket: env.bucketName, Key: key }));
  } catch (err) {
    if (err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}
