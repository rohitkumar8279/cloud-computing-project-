// Cognito Post Confirmation trigger: puts each newly self-registered user in
// the Students group. Admins are never created this way (see scripts/create-admin.*).
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { env } from '../../shared/constants.js';
import { log } from '../../shared/logger.js';

const cognito = new CognitoIdentityProviderClient({});

export const handler = async (event) => {
  // Also fires for PostConfirmation_ConfirmForgotPassword - ignore that.
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') return event;

  try {
    await cognito.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        GroupName: env.studentGroup,
      }),
    );
    log('info', 'Added user to Students group', { sub: event.request?.userAttributes?.sub });
  } catch (err) {
    // Never block sign-up: a user without the Admins group is treated as a student anyway.
    log('error', 'Failed to add user to Students group', { error: err?.name, message: err?.message });
  }
  return event;
};
