'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOBILE_NAV, isActivePath } from '@/lib/navigation';
import { cn } from '@/lib/utils';

/** Native-feeling tab bar. Hidden from `lg` upwards where the sidebar takes over. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-lg pb-safe lg:hidden"
    >
      <ul className="flex items-stretch">
        {MOBILE_NAV.map((item) => {
          const active = isActivePath(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'tap flex h-16 flex-col items-center justify-center gap-1 transition-colors',
                  active ? 'text-brand' : 'text-subtle',
                )}
              >
                <Icon className={cn('h-5 w-5 transition-transform', active && 'scale-110')} />
                <span className="text-[11px] font-medium leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
