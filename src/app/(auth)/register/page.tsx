import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Registrieren' };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return <RegisterForm />;
}
