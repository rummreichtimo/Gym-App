import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyForm } from './verify-form';

export const metadata: Metadata = { title: 'E-Mail bestätigen' };

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
