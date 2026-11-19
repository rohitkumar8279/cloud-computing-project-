#!/usr/bin/env bash
# Creates a CampusCare administrator securely (macOS / Linux / Git Bash).
# Usage: ./scripts/create-admin.sh admin@college.edu "Campus Admin" [stack] [region] [profile]
# The password is read silently and never written to disk.
set -euo pipefail

EMAIL="${1:?email required}"
NAME="${2:?name required}"
STACK="${3:-campuscare-dev}"
REGION="${4:-ap-south-1}"
PROFILE="${5:-campuscare}"

POOL_ID=$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" --profile "$PROFILE" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
[ -n "$POOL_ID" ] && [ "$POOL_ID" != "None" ] || { echo "Could not read UserPoolId from $STACK" >&2; exit 1; }
echo "User Pool: $POOL_ID"

read -r -s -p "Admin password (min 8 chars, upper, lower, number, symbol): " PASSWORD
echo

aws cognito-idp admin-create-user --user-pool-id "$POOL_ID" --region "$REGION" --profile "$PROFILE" \
  --username "$EMAIL" \
  --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true Name=name,Value="$NAME" \
  --message-action SUPPRESS > /dev/null

aws cognito-idp admin-set-user-password --user-pool-id "$POOL_ID" --region "$REGION" --profile "$PROFILE" \
  --username "$EMAIL" --password "$PASSWORD" --permanent
unset PASSWORD

aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL_ID" --region "$REGION" --profile "$PROFILE" \
  --username "$EMAIL" --group-name Admins

echo "Administrator $EMAIL created and added to the Admins group."
