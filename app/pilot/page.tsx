import { redirect } from 'next/navigation';

/** The pilot plan page was retired; old links go to the homepage. */
export default function PilotPage() { redirect('/'); }
