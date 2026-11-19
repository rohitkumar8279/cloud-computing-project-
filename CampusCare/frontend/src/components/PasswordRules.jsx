import { Check, Circle } from 'lucide-react';
import { PASSWORD_RULES } from '../utils/validators';

export default function PasswordRules({ password }) {
  return (
    <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-700' : 'text-gray-500'}`}>
            {ok ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}
