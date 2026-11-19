<#
.SYNOPSIS
  Writes frontend/.env.local from the deployed stack's outputs (read-only AWS call).
.EXAMPLE
  .\scripts\write-frontend-env.ps1
#>
param(
  [string] $StackName = "campuscare-dev",
  [string] $Region = "ap-south-1",
  [string] $Profile = "campuscare"
)
$ErrorActionPreference = "Stop"

$json = aws cloudformation describe-stacks --stack-name $StackName --region $Region --profile $Profile `
  --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
$out = @{}
foreach ($o in $json) { $out[$o.OutputKey] = $o.OutputValue }

$content = @"
VITE_AWS_REGION=$($out.Region)
VITE_COGNITO_USER_POOL_ID=$($out.UserPoolId)
VITE_COGNITO_USER_POOL_CLIENT_ID=$($out.UserPoolClientId)
VITE_API_BASE_URL=$($out.ApiUrl)
VITE_MAX_UPLOAD_MB=2
"@

$target = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\frontend\.env.local"))
# UTF-8 *without* BOM - a BOM would corrupt the first variable name for Vite.
[IO.File]::WriteAllText($target, $content, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Wrote $target" -ForegroundColor Green
Write-Host $content
