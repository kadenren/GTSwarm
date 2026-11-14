'use client';
import Link from 'next/link';
import { useState } from 'react';
import RelevanceWeb, { type WebNode, type WebEdge } from './RelevanceWeb';
import AskToConnect from './AskToConnect';

export interface WebPerson {
  id: string; name: string; affiliation: string; reason: string; path: string | null; available: boolean; blockedReason: string | null;
  purposes: { id: string; label: string; ok: boolean; reason: string | null }[]; note: string;
}

/** "See connections": the people from this search on a map, with the confirmed ties between them and you. Click someone to see why and how. */
export default function PeopleWeb({ nodes, edges, query, purposeLabel, people, defaultPurpose }: {
  nodes: WebNode[]; edges: WebEdge[]; query: string; purposeLabel: string; people: WebPerson[]; defaultPurpose: string;
}) {
  const [selected, setSelected] = useState<string | null>(people[0]?.id ?? null);
  const sel = people.find((p) => p.id === selected) ?? null;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_340px]" data-testid="people-web">
      <div className="card min-w-0 p-3">
        <RelevanceWeb nodes={nodes} edges={edges} query={query} roleLabel={purposeLabel} selectedId={selected} onSelect={(id) => people.some((p) => p.id === id) && setSelected(id)} />
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-ink/70" aria-label="Legend">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-teal" />Alumni</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-plum" />Students</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-navy" />Projects</span>
          <span className="flex items-center gap-1.5"><svg width="26" height="6" aria-hidden="true"><line x1="0" y1="3" x2="26" y2="3" stroke="#5B6B7C" strokeWidth="1.6" /></svg>Confirmed tie: built a project together or accepted a connection</span>
          <span className="font-medium text-navy">Closer to the center = more relevant</span>
        </div>
        <p className="mt-1 text-center text-[11px] text-ink/50">Shared interests never draw a line. Only people who welcome requests appear.</p>
      </div>
      {sel ? (
        <aside className="card self-start p-4 lg:sticky lg:top-20" data-testid="web-panel" aria-live="polite">
          <p className="font-display text-lg font-bold text-navy">{sel.name}</p>
          <p className="text-xs text-ink/60">{sel.affiliation}</p>
          <p className="mt-2 text-sm text-navy"><span className="font-semibold">Why this person? </span>{sel.reason}</p>
          <h3 className="label mt-3">How you&apos;re connected</h3>
          <p className="text-sm text-ink/80" data-testid="web-path">{sel.path ?? 'No confirmed connection path found. You can still ask to connect directly.'}</p>
          <div className="mt-3 flex flex-wrap items-start gap-3">
            <Link href={`/people/${encodeURIComponent(sel.id)}`} className="pt-1.5 text-sm font-semibold text-navy underline decoration-gold underline-offset-4">View profile</Link>
            {sel.available ? <AskToConnect key={sel.id} personId={sel.id} firstName={sel.name.split(' ')[0]} purposes={sel.purposes} defaultPurpose={defaultPurpose} compact suggestedNote={sel.note} />
              : <p className="text-xs text-ink/60">{sel.blockedReason}</p>}
          </div>
        </aside>
      ) : <p className="card p-4 text-sm text-ink/60">Click a person to see why they fit and how you&apos;re connected.</p>}
    </div>
  );
}
