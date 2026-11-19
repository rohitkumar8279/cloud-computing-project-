#!/usr/bin/env bash
# Writes frontend/.env.local from the deployed stack's outputs (read-only AWS call).
# Usage: ./scripts/write-frontend-env.sh [stack] [region] [profile]
set -euo pipefail
STACK="${1:-campuscare-dev}"
REGION="${2:-ap-south-1}"
PROFILE="${3:-campuscare}"

get() {
  aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" --profile "$PROFILE" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

TARGET="$(dirname "$0")/../frontend/.env.local"
cat > "$TARGET" <<EOF
VITE_AWS_REGION=$(get Region)
VITE_COGNITO_USER_POOL_ID=$(get UserPoolId)
VITE_COGNITO_USER_POOL_CLIENT_ID=$(get UserPoolClientId)
VITE_API_BASE_URL=$(get ApiUrl)
VITE_MAX_UPLOAD_MB=2
EOF
echo "Wrote $TARGET"
cat "$TARGET"
