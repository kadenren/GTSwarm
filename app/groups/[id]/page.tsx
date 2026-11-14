import { redirect } from 'next/navigation';

export default async function GroupRedirect({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/communities/${(await params).id}`);
}
