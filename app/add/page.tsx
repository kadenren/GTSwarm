import AddProject from '@/components/AddProject';
import PageHero from '@/components/PageHero';
import { geminiEnabled } from '@/lib/gemini';
import { ready } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AddPage() {
  await ready();
  return (
    <>
      <PageHero eyebrow="Post a startup or project" title="Tell GT what you're building and who you need"
        subtitle="Paste a few sentences or drop in a pitch deck, report or README. GT Swarm fills in the details, you confirm them, and students and alumni with matching skills see what you need." />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AddProject aiEnabled={geminiEnabled()} />
      </div>
    </>
  );
}
