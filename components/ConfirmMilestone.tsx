'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ConfirmMilestone({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className="rounded-md border border-gold px-2 py-0.5 text-xs font-semibold text-gold-dark hover:bg-gold/10" disabled={busy}
      onClick={async () => { setBusy(true); await fetch(`/api/milestones/${encodeURIComponent(id)}`, { method: 'POST' }); router.refresh(); }}>
      {busy ? 'Confirming…' : 'Confirm as advisor'}
    </button>
  );
}
