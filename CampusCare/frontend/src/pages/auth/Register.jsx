import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authErrorMessage } from '../../services/authService';
import { Spinner } from '../../components/Feedback';
import PasswordRules from '../../components/PasswordRules';
import { validateRegistration } from '../../utils/validators';
import { cn } from '../../utils/format';

// Public sign-up creates STUDENT accounts only. Administrators are created
// with the AWS CLI (scripts/create-admin.*) and added to the Admins group.
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const v = validateRegistration(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await register(form);
      toast.success('Account created - check your email for a code');
      navigate('/verify', { state: { email: form.email } });
    } catch (err) {
      setServerError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const field = (key, label, props = {}) => (
    <div>
      <label className="label" htmlFor={key}>
        {label}
      </label>
      <input
        id={key}
        className={cn('input', errors[key] && 'input-error')}
        value={form[key]}
        onChange={set(key)}
        aria-invalid={Boolean(errors[key])}
        {...props}
      />
      {errors[key] && <p className="field-error">{errors[key]}</p>}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Create a student account</h1>
        <p className="mt-1 text-sm text-gray-500">Use your college email. We will send a verification code.</p>
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      {field('name', 'Full name', { autoComplete: 'name', placeholder: 'Priya Sharma' })}
      {field('email', 'Email', { type: 'email', autoComplete: 'email', placeholder: 'you@college.edu' })}
      <div>
        {field('password', 'Password', { type: 'password', autoComplete: 'new-password' })}
        <PasswordRules password={form.password} />
      </div>
      {field('confirmPassword', 'Confirm password', { type: 'password', autoComplete: 'new-password' })}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? <Spinner className="h-4 w-4 text-white" /> : <UserPlus className="h-4 w-4" />} Create account
      </button>

      <p className="text-center text-sm text-gray-500">
        Already registered?{' '}
        <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
          Sign in
        </Link>
      </p>
    </form>
  );
}
