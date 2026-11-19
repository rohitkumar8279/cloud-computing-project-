// DynamoDB DocumentClient (created once per container and reused across invocations).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const INDEXES = {
  byStudent: 'StudentIndex',
  byStatus: 'StatusIndex',
  byCreatedAt: 'CreatedAtIndex',
};

/**
 * Runs a Query and returns up to `limit` items plus the key to resume from.
 *
 * DynamoDB applies Limit *before* FilterExpression, so a filtered query can
 * return an empty page even though later items match. When a filter is
 * present we keep reading (asking only for the remaining count each round, so
 * no matched item is ever skipped by the resume key) until the page is full,
 * the index is exhausted, or `maxRounds` is reached (a bound on cost/latency).
 */
export async function queryPage(params, limit, { maxRounds = 10, send = (cmd) => ddb.send(cmd) } = {}) {
  const items = [];
  let startKey = params.ExclusiveStartKey;
  let rounds = 0;
  do {
    const res = await send(new QueryCommand({ ...params, ExclusiveStartKey: startKey, Limit: limit - items.length }));
    items.push(...(res.Items || []));
    startKey = res.LastEvaluatedKey;
    rounds += 1;
  } while (params.FilterExpression && startKey && items.length < limit && rounds < maxRounds);
  return { items, lastEvaluatedKey: startKey };
}

/** True when a TransactWrite was cancelled because a condition failed. */
export function isConditionFailure(err) {
  if (err?.name === 'ConditionalCheckFailedException') return true;
  if (err?.name === 'TransactionCanceledException') {
    return (err.CancellationReasons || []).some((r) => r?.Code === 'ConditionalCheckFailed');
  }
  return false;
}
