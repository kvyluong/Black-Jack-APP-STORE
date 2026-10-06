// Desktop keyboard shortcuts for the web build. Does nothing on phones.
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/** Calls `handlers[key]` (lowercase key name, e.g. "h" or "enter") on key presses, on web only. */
export function useKeyboardShortcuts(handlers: Record<string, (() => void) | undefined>) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      const fn = ref.current[e.key.toLowerCase()];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
