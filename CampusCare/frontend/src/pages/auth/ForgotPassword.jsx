import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { authErrorMessage } from '../../services/authService';
import { Spinner } from '../../components/Feedback';
import PasswordRules from '../../components/PasswordRules';
import { EMAIL_RE, isStrongPassword } from '../../utils/validators';

export default function ForgotPassword() {
  const { forgotPassword, confirmForgotPassword } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onRequest = (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) return setError('Enter a valid email address.');
    run(async () => {
      await forgotPassword(email);
      toast.success('If the account exists, a reset code has been emailed');
      setStep('confirm');
    });
  };

  const onConfirm = (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code.');
    if (!isStrongPassword(password)) return setError('Password does not meet the requirements.');
    run(async () => {
      await confirmForgotPassword(email, code, password);
      toast.success('Password updated - sign in with your new password');
      navigate('/login', { state: { email } });
    });
  };

  return (
    <form onSubmit={step === 'request' ? onRequest : onConfirm} className="space-y-5" noValidate>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reset your password</h1>
        <p className="mt-1 text-sm text-gray-500">
          {step === 'request' ? 'We will email you a reset code.' : 'Enter the code and choose a new password.'}
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="input"
          value={email}
          disabled={step === 'confirm'}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {step === 'confirm' && (
        <>
          <div>
            <label className="label" htmlFor="code">
              Reset code
            </label>
            <input
              id="code"
              inputMode="numeric"
              maxLength={6}
              className="input tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordRules password={password} />
          </div>
        </>
      )}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy && <Spinner className="h-4 w-4 text-white" />}
        {step === 'request' ? 'Send reset code' : 'Update password'}
      </button>
      <p className="text-center text-sm">
        <Link to="/login" className="text-gray-500 hover:text-gray-700">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
