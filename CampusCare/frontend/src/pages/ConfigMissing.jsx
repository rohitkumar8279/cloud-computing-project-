import { Settings } from 'lucide-react';
import { missingConfig } from '../services/config';

// Shown when the Vite environment variables have not been set.
export default function ConfigMissing() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-lg p-8">
        <span className="inline-flex rounded-full bg-amber-50 p-3">
          <Settings className="h-6 w-6 text-amber-600" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">CampusCare is not configured yet</h1>
        <p className="mt-2 text-sm text-gray-600">
          Set these environment variables from your SAM stack outputs (see <code>frontend/.env.example</code>), then
          restart the dev server or redeploy on Amplify:
        </p>
        <ul className="mt-4 space-y-1 rounded-lg bg-gray-50 p-4 font-mono text-xs text-gray-800">
          {missingConfig.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
