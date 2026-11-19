// SNS email notifications. Failures are logged but never fail the API call:
// the complaint is already saved, and students see status changes in the app.
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { env } from './constants.js';
import { log } from './logger.js';

const sns = new SNSClient({});

// SNS email subjects: ASCII printable, no newlines, < 100 chars.
const safeSubject = (s) => s.replace(/[^\x20-\x7E]/g, '').slice(0, 99);

export async function notify(subject, lines, attributes = {}) {
  if (!env.notificationsEnabled || !env.topicArn) return false;
  try {
    await sns.send(
      new PublishCommand({
        TopicArn: env.topicArn,
        Subject: safeSubject(subject),
        Message: lines.filter(Boolean).join('\n'),
        MessageAttributes: Object.fromEntries(
          Object.entries(attributes).map(([k, v]) => [k, { DataType: 'String', StringValue: String(v) }]),
        ),
      }),
    );
    return true;
  } catch (err) {
    log('error', 'SNS publish failed', { error: err?.name, message: err?.message });
    return false;
  }
}
