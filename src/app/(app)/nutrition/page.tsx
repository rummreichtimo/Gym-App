import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { NutritionView } from '@/components/nutrition/NutritionView';

export const metadata: Metadata = { title: 'Ernährung' };

export default function NutritionPage() {
  return (
    <>
      <TopBar title="Ernährung" />
      <Suspense fallback={null}>
        <NutritionView />
      </Suspense>
    </>
  );
}
