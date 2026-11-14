import AddProject from '@/components/AddProject';

export const dynamic = 'force-dynamic';

export default function AddPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy">Add a project</h1>
      <p className="mb-6 mt-1 max-w-3xl text-sm text-ink/70">Map something you built. Paste its abstract, confirm the extracted details, and it joins the graph as a project you built, with its technologies and solved problems.</p>
      <AddProject aiEnabled={!!process.env.ANTHROPIC_API_KEY} />
    </div>
  );
}
