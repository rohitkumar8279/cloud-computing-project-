import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authErrorMessage } from '../../services/authService';
import { Spinner } from '../../components/Feedback';
import PasswordRules from '../../components/PasswordRules';
import { EMAIL_RE, isStrongPassword } from '../../utils/validators';

export default function Login() {
  const { login, completeNewPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newPasswordStep, setNewPasswordStep] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const finish = (user) => {
    toast.success(`Welcome, ${user.name}`);
    const from = location.state?.from;
    const home = user.isAdmin ? '/admin/dashboard' : '/student/dashboard';
    const allowed = from && from.startsWith(user.isAdmin ? '/admin' : '/student');
    navigate(allowed ? from : home, { replace: true });
  };

  const handleResult = (res) => {
    if (res.done) return finish(res.user);
    if (res.step === 'CONFIRM_SIGN_UP') {
      toast('Please verify your email first');
      return navigate('/verify', { state: { email } });
    }
    if (res.step === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') return setNewPasswordStep(true);
    setError(`Additional sign-in step required: ${res.step}`);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email) || !password) return setError('Enter your email and password.');
    setBusy(true);
    try {
      handleResult(await login(email, password));
    } catch (err) {
      if (err?.name === 'UserNotConfirmedException') {
        toast('Please verify your email first');
        return navigate('/verify', { state: { email } });
      }
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onNewPassword = async (e) => {
    e.preventDefault();
    if (!isStrongPassword(newPassword)) return setError('Password does not meet the requirements.');
    setBusy(true);
    setError('');
    try {
      handleResult(await completeNewPassword(newPassword));
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (newPasswordStep) {
    return (
      <form onSubmit={onNewPassword} className="space-y-5" noValidate>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Set a new password</h1>
          <p className="mt-1 text-sm text-gray-500">Your account requires a new password before continuing.</p>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className="label" htmlFor="newPassword">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <PasswordRules password={newPassword} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner className="h-4 w-4 text-white" />} Save and sign in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
        <p className="mt-1 text-sm text-gray-500">Students and administrators sign in here.</p>
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
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@college.edu"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="password">
            Password
          </label>
          <Link to="/forgot-password" className="mb-1.5 text-xs font-medium text-blue-600 hover:text-blue-700">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            type={show ? 'text' : 'password'}
            className="input pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? <Spinner className="h-4 w-4 text-white" /> : <LogIn className="h-4 w-4" />} Sign in
      </button>

      <p className="text-center text-sm text-gray-500">
        New student?{' '}
        <Link to="/register" className="font-medium text-blue-600 hover:text-blue-700">
          Create an account
        </Link>
      </p>
    </form>
  );
}
