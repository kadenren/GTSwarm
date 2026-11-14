import AddProject from '@/components/AddProject';
import PageHero from '@/components/PageHero';
import { geminiEnabled } from '@/lib/gemini';
import { ready } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AddPage() {
  await ready();
  return (
    <>
      <PageHero eyebrow="Grow the swarm" title="Add a project you built"
        subtitle="Drop in your capstone report, poster, slides, README or a few sentences. GT Swarm reads them, fills in the project, and links it to the people, skills and problems already in the graph." />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AddProject aiEnabled={geminiEnabled()} />
      </div>
    </>
  );
}
