/**
 * The implementation story shared by the home page and the SGA pilot plan page, kept in one place so both say the same thing.
 * Everything here is a proposal: GT Swarm has no existing partnership with SGA or any Georgia Tech program.
 */

export const PROPOSED_NOTE = 'Proposed. GT Swarm is an independent student project with no existing partnership with SGA or any Georgia Tech program.';

/** Who does what in an SGA-run pilot. */
export const OPERATING_MODEL = [
  { who: 'Student Government Association', role: 'Runs the program',
    does: ['Sponsors a one-semester pilot', 'Owns the program, its data policy and its accounts', 'Promotes it through student organization channels', 'Appoints a student program lead'] },
  { who: 'Student developer team', role: 'Builds and maintains it',
    does: ['Keeps the app, hosting and support running', 'Ships fixes from pilot feedback', 'Documents everything for the next team each year'] },
  { who: 'Existing GT programs', role: 'Bring the people (proposed)',
    does: ['Share the invite link with their communities', 'Point teams to post open roles', 'No data is exchanged with GT Swarm'] },
] as const;

/** How GT Swarm would sit alongside programs Georgia Tech already has. It complements them; it does not replace them. */
export const PROGRAMS = [
  { name: 'CREATE-X', today: 'Teams form around Idea to Prototype and Startup Launch.',
    adds: 'Teams post open roles, and students find a team or cofounder before and between cohorts.' },
  { name: 'Startup Exchange', today: 'Events and meetups bring founders and builders together.',
    adds: 'Attendees keep a profile, so a good conversation at an event turns into a match afterward.' },
  { name: 'Alumni Association', today: 'Alumni volunteer through mentoring programs.',
    adds: 'Alumni choose the roles and hours they can give; founders send specific 15-minute asks.' },
  { name: 'Capstone, VIP and Invention Studio', today: 'Project know-how leaves when each team graduates.',
    adds: 'Teams log the problems they solved, so the next team can find who solved them.' },
] as const;

/** The three phases, with SGA as the owner from day one. */
export const PHASES = [
  { n: 1, title: 'SGA-run voluntary pilot', when: 'One semester', items: [
    'SGA sponsors a pilot with a small cohort of student- and alumni-founded startups',
    'Students and alumni opt in with a verified gatech.edu email',
    'Only opt-in profiles and founder-submitted needs are used',
    'No access to protected Georgia Tech databases',
  ] },
  { n: 2, title: 'Validate meaningful connections', when: 'During the pilot', items: [
    'Accepted introductions',
    'Startup roles filled through the platform',
    'Collaborations that come from matches',
    'Feedback on match quality',
  ] },
  { n: 3, title: 'Explore program partnerships', when: 'Only if the pilot shows value', items: [
    'Approach CREATE-X, Startup Exchange, the Alumni Association and other GT organizations',
    'Investigate approved Georgia Tech sign-in',
    'Expand only after data governance review',
  ] },
] as const;

export const PRIVACY = [
  'Opt-in participation only',
  'People control what their profile shows',
  'Every invitation and request can be declined',
  'No assumed access to private student or alumni records',
  'Founders choose what to share about their startup and its IP',
] as const;

export const REAL = [
  'Two-way matching engine with an explanation for every match',
  'Hybrid matching: keyword relevance plus Gemini semantic embeddings, with keyword fallback',
  'Knowledge graph of people, projects, skills and solved problems',
  'Resume and document reading that drafts profiles and startups',
  'Consent-based invites, requests and inbox',
  'Get Unstuck search over solved problems',
  'A private demo session for every visitor',
] as const;

export const SIMULATED = [
  'Every person, startup and outcome is fictional',
  'The “Viewing as” switcher stands in for gatech.edu sign-in',
  'Requests appear in the in-app inbox; no email is sent',
] as const;
