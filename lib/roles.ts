/** Display names for the stored role values (safe to import from client components). */
export const ROLE_LABEL: Record<string, string> = { Cofounder: 'Cofounder', 'Early engineer': 'Engineer', Advisor: 'Advisor', Helper: 'Collaborator', 'First customer': 'First customer' };
export const roleLabel = (r: string) => ROLE_LABEL[r] ?? r;
/** The roles offered in Find Matches, in display order. */
export const MATCH_ROLES = ['Cofounder', 'Early engineer', 'Advisor', 'Helper'] as const;
