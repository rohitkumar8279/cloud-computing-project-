// Thin wrapper over Amplify v6 Auth (Cognito User Pool, SRP sign-in).
import {
  signUp,
  confirmSignUp,
  resendSignUpCode,
  signIn,
  confirmSignIn,
  signOut,
  fetchAuthSession,
  resetPassword,
  confirmResetPassword,
} from 'aws-amplify/auth';

export const ADMIN_GROUP = 'Admins';

/** Builds the app user from the ID token (groups come from Cognito, not the UI). */
export async function getCurrentUser({ forceRefresh = false } = {}) {
  try {
    const session = await fetchAuthSession({ forceRefresh });
    const payload = session.tokens?.idToken?.payload;
    if (!payload) return null;
    const groups = payload['cognito:groups'] || [];
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
      groups,
      isAdmin: groups.includes(ADMIN_GROUP),
    };
  } catch {
    return null;
  }
}

/** Returns a fresh ID token (Amplify refreshes it automatically when expired). */
export async function getIdToken() {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error('Not signed in');
  return token;
}

export const register = ({ name, email, password }) =>
  signUp({
    username: email.trim().toLowerCase(),
    password,
    options: { userAttributes: { email: email.trim().toLowerCase(), name: name.trim() } },
  });

export const confirmRegistration = (email, code) =>
  confirmSignUp({ username: email.trim().toLowerCase(), confirmationCode: code.trim() });

export const resendCode = (email) => resendSignUpCode({ username: email.trim().toLowerCase() });

export async function login(email, password) {
  try {
    return await signIn({ username: email.trim().toLowerCase(), password });
  } catch (err) {
    if (err?.name === 'UserAlreadyAuthenticatedException') {
      await signOut();
      return signIn({ username: email.trim().toLowerCase(), password });
    }
    throw err;
  }
}

export const completeNewPassword = (newPassword) => confirmSignIn({ challengeResponse: newPassword });

export const logout = () => signOut();

export const forgotPassword = (email) => resetPassword({ username: email.trim().toLowerCase() });

export const confirmForgotPassword = (email, code, newPassword) =>
  confirmResetPassword({ username: email.trim().toLowerCase(), confirmationCode: code.trim(), newPassword });

/** Converts Cognito error names into friendly messages. */
export function authErrorMessage(err) {
  switch (err?.name) {
    case 'NotAuthorizedException':
      return 'Incorrect email or password.';
    case 'UserNotConfirmedException':
      return 'Please verify your email before signing in.';
    case 'UsernameExistsException':
      return 'An account with this email already exists.';
    case 'CodeMismatchException':
      return 'The verification code is incorrect.';
    case 'ExpiredCodeException':
      return 'The code has expired. Request a new one.';
    case 'InvalidPasswordException':
      return 'Password does not meet the requirements.';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'UserNotFoundException':
      return 'Incorrect email or password.';
    default:
      return err?.message || 'Something went wrong. Please try again.';
  }
}
