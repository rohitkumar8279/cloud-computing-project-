import { Outlet } from 'react-router-dom';
import { Cloud, Lock, Zap } from 'lucide-react';
import Logo from '../components/Logo';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[44%] flex-col justify-between bg-blue-600 p-12 text-white lg:flex">
        <span className="inline-flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">CC</span>
          CampusCare
        </span>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">
            Report campus issues.
            <br />
            Track them to resolution.
          </h2>
          <p className="mt-4 max-w-md text-blue-100">
            Wi-Fi, electricity, water, classrooms, hostels and labs - one place for students to raise complaints and
            for administrators to resolve them.
          </p>
          <ul className="mt-10 space-y-4 text-sm text-blue-50">
            <li className="flex items-center gap-3">
              <Zap className="h-5 w-5" /> Serverless backend on AWS Lambda
            </li>
            <li className="flex items-center gap-3">
              <Lock className="h-5 w-5" /> Secured with Amazon Cognito
            </li>
            <li className="flex items-center gap-3">
              <Cloud className="h-5 w-5" /> Private image storage on Amazon S3
            </li>
          </ul>
        </div>
        <p className="text-xs text-blue-200">&copy; {new Date().getFullYear()} CampusCare</p>
      </aside>
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Logo className="mb-8 lg:hidden" />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
