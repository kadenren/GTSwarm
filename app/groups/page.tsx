import { redirect } from 'next/navigation';

/** Groups now live in Communities; old links keep working. */
export default function GroupsRedirect() { redirect('/communities'); }
