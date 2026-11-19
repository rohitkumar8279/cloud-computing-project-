<#
.SYNOPSIS
  Creates a CampusCare administrator securely (Windows PowerShell).

.DESCRIPTION
  - Reads the User Pool ID from the CloudFormation stack outputs.
  - Creates the user with a verified email and NO invitation email.
  - Prompts for the password without echoing it, sets it as permanent.
  - Adds the user to the "Admins" Cognito group.
  The password is never written to disk or shown on screen.

.EXAMPLE
  .\scripts\create-admin.ps1 -Email admin@college.edu -Name "Campus Admin"
#>
param(
  [Parameter(Mandatory = $true)] [string] $Email,
  [Parameter(Mandatory = $true)] [string] $Name,
  [string] $StackName = "campuscare-dev",
  [string] $Region = "ap-south-1",
  [string] $Profile = "campuscare"
)

$ErrorActionPreference = "Stop"

$poolId = aws cloudformation describe-stacks --stack-name $StackName --region $Region --profile $Profile `
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text
if (-not $poolId -or $poolId -eq "None") { throw "Could not read UserPoolId from stack $StackName" }
Write-Host "User Pool: $poolId"

$secure = Read-Host "Admin password (min 8 chars, upper, lower, number, symbol)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)

  aws cognito-idp admin-create-user --user-pool-id $poolId --region $Region --profile $Profile `
    --username $Email `
    --user-attributes Name=email,Value=$Email Name=email_verified,Value=true "Name=name,Value=$Name" `
    --message-action SUPPRESS | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "admin-create-user failed" }

  aws cognito-idp admin-set-user-password --user-pool-id $poolId --region $Region --profile $Profile `
    --username $Email --password $plain --permanent
  if ($LASTEXITCODE -ne 0) { throw "admin-set-user-password failed (check the password policy)" }
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  $plain = $null
}

aws cognito-idp admin-add-user-to-group --user-pool-id $poolId --region $Region --profile $Profile `
  --username $Email --group-name Admins
if ($LASTEXITCODE -ne 0) { throw "admin-add-user-to-group failed" }

Write-Host "Administrator $Email created and added to the Admins group." -ForegroundColor Green
