import { ShieldCheck } from 'lucide-react';

export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
        <ShieldCheck className="h-5 w-5 text-white" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-gray-900">CampusCare</span>
    </span>
  );
}
