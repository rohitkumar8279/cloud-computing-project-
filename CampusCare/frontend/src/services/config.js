import { Amplify } from 'aws-amplify';

export const appConfig = {
  region: import.meta.env.VITE_AWS_REGION,
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, ''),
};

export const missingConfig = Object.entries({
  VITE_AWS_REGION: appConfig.region,
  VITE_COGNITO_USER_POOL_ID: appConfig.userPoolId,
  VITE_COGNITO_USER_POOL_CLIENT_ID: appConfig.userPoolClientId,
  VITE_API_BASE_URL: appConfig.apiBaseUrl,
})
  .filter(([, v]) => !v || v.includes('XXXX') || v.includes('xxxx'))
  .map(([k]) => k);

export function configureAmplify() {
  if (missingConfig.length) return false;
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: appConfig.userPoolId,
        userPoolClientId: appConfig.userPoolClientId,
        loginWith: { email: true },
        signUpVerificationMethod: 'code',
        userAttributes: { email: { required: true }, name: { required: true } },
      },
    },
  });
  return true;
}
