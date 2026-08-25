'use client';

import { useEffect, useState } from 'react';

/**
 * False during server render and the first client render, true afterwards.
 * Portals must wait for this: `document` only exists on the client, so
 * rendering one during hydration produces markup the server never sent.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
