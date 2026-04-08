export interface NavLinkData {
  href: string;
  label: string;
  description: string;
  shortLabel: string;
  eyebrow: string;
  status: 'active' | 'beta' | 'offline' | 'locked';
  meta: string;
  priority: number;
}

export const homeNavLinks: NavLinkData[] = [
  {
    href: '/chargen',
    label: 'Character Gen',
    description: 'Create character records',
    shortLabel: 'OPS',
    eyebrow: 'SYSTEM',
    status: 'active',
    meta: 'v2.1.4',
    priority: 1,
  },
  {
    href: '/graph',
    label: 'Campaign Graph',
    description: 'Visualize entities & relationships',
    shortLabel: 'MAP',
    eyebrow: 'NETWORK',
    status: 'active',
    meta: 'LIVE',
    priority: 2,
  },
  {
    href: '/reputation',
    label: 'Reputation',
    description: 'Track faction standings',
    shortLabel: 'REP',
    eyebrow: 'POLITICS',
    status: 'active',
    meta: 'SYNCED',
    priority: 3,
  },
  {
    href: '/resources',
    label: 'Resources',
    description: 'Reference materials',
    shortLabel: 'LIB',
    eyebrow: 'ARCHIVE',
    status: 'active',
    meta: 'LOCAL',
    priority: 4,
  },
  {
    href: '/chat',
    label: 'Ask Computer',
    description: 'AI-powered campaign assistant',
    shortLabel: 'AI',
    eyebrow: 'MAINFRAME',
    status: 'beta',
    meta: 'ONLINE',
    priority: 5,
  },
];
