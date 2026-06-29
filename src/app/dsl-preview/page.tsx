import { Suspense } from 'react';
import DslPreview from './DslPreview';

export default function Page() {
  return (
    <Suspense>
      <DslPreview />
    </Suspense>
  );
}
