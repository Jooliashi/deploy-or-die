import { Suspense } from 'react';
import { Lobby } from '@/components/lobby';

export default function HomePage() {
  return (
    <main className="shell">
      <Suspense>
        <Lobby />
      </Suspense>
    </main>
  );
}
