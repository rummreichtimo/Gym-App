import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Wird geladen">
      <Loader2 className="h-7 w-7 animate-spin text-brand" />
    </div>
  );
}
