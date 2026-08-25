import {
  Apple,
  BarChart3,
  CalendarDays,
  Dumbbell,
  Flame,
  Home,
  LineChart,
  ListChecks,
  Play,
  Settings,
  Target,
  User,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  /** Also treat these prefixes as "this section is active". */
  match?: string[];
}

/** Bottom tab bar on phones - five destinations, one thumb. */
export const MOBILE_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/workout', label: 'Workout', icon: Play, match: ['/plans', '/exercises', '/history'] },
  { href: '/nutrition', label: 'Ernährung', icon: Apple },
  { href: '/progress', label: 'Fortschritt', icon: LineChart, match: ['/stats', '/records'] },
  { href: '/profile', label: 'Profil', icon: User, match: ['/settings', '/goals'] },
];

/** Full sidebar on tablet and desktop. */
export const DESKTOP_NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Training',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: Home },
      { href: '/plans', label: 'Trainingspläne', icon: ListChecks },
      { href: '/workout', label: 'Workout starten', icon: Play },
      { href: '/exercises', label: 'Übungen', icon: Dumbbell },
      { href: '/history', label: 'Trainingshistorie', icon: CalendarDays },
    ],
  },
  {
    section: 'Fortschritt',
    items: [
      { href: '/nutrition', label: 'Ernährung', icon: Apple },
      { href: '/progress', label: 'Körper & Fortschritt', icon: LineChart },
      { href: '/records', label: 'Rekorde', icon: Flame },
      { href: '/goals', label: 'Ziele', icon: Target },
      { href: '/stats', label: 'Statistiken', icon: BarChart3 },
    ],
  },
  {
    section: 'Konto',
    items: [
      { href: '/profile', label: 'Profil', icon: User },
      { href: '/settings', label: 'Einstellungen', icon: Settings },
    ],
  },
];

export function isActivePath(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  if (pathname.startsWith(`${item.href}/`)) return true;
  return (item.match ?? []).some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
