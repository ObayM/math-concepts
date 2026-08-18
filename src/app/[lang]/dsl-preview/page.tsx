import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import DslPreview from './DslPreview';

export default function Page() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <Suspense>
      <DslPreview />
    </Suspense>
  );
}
