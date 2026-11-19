import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MailCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authErrorMessage } from '../../services/authService';
import { Spinner } from '../../components/Feedback';
import { EMAIL_RE } from '../../utils/validators';

export default function VerifyEmail() {
  const { confirmRegistration, resendCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email)) return setError('Enter the email you registered with.');
    if (!/^\d{6}$/.test(code.trim())) return setError('Enter the 6-digit code from your email.');
    setBusy(true);
    try {
      await confirmRegistration(email, code);
      toast.success('Email verified - you can sign in now');
      navigate('/login', { state: { email } });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    if (!EMAIL_RE.test(email)) return setError('Enter the email you registered with.');
    try {
      await resendCode(email);
      toast.success('A new code has been sent');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <span className="inline-flex rounded-full bg-blue-50 p-3">
          <MailCheck className="h-6 w-6 text-blue-600" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Verify your email</h1>
        <p className="mt-1 text-sm text-gray-500">Enter the 6-digit code we sent to your inbox (check spam too).</p>
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
        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="code">
          Verification code
        </label>
        <input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="input tracking-[0.4em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy && <Spinner className="h-4 w-4 text-white" />} Verify email
      </button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onResend} className="font-medium text-blue-600 hover:text-blue-700">
          Resend code
        </button>
        <Link to="/login" className="text-gray-500 hover:text-gray-700">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
