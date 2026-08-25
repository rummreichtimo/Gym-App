'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface RestTimerState {
  /** Seconds remaining. 0 when idle or finished. */
  remaining: number;
  /** The duration the current countdown was started with. */
  duration: number;
  running: boolean;
  active: boolean;
  start: (seconds: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  stop: () => void;
  addSeconds: (seconds: number) => void;
}

/**
 * Rest timer driven by wall-clock deadlines rather than an interval counter, so
 * it stays accurate when the tab is backgrounded and does not drift.
 *
 * The hook lives at the workout page level and is passed down, so switching
 * between exercises never tears the running timer down.
 */
export function useRestTimer(onComplete?: () => void): RestTimerState {
  const [duration, setDuration] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const deadlineRef = useRef<number | null>(null);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!running) return;

    const tick = () => {
      if (deadlineRef.current === null) return;
      const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        deadlineRef.current = null;
        completeRef.current?.();
      }
    };

    tick();
    const timer = setInterval(tick, 250);

    // Re-sync immediately when the tab becomes visible again.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [running]);

  const start = useCallback((seconds: number) => {
    const safe = Math.max(1, Math.round(seconds));
    setDuration(safe);
    setRemaining(safe);
    deadlineRef.current = Date.now() + safe * 1000;
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    if (deadlineRef.current === null) return;
    setRemaining(Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000)));
    deadlineRef.current = null;
    setRunning(false);
  }, []);

  const resume = useCallback(() => {
    setRemaining((current) => {
      if (current <= 0) return current;
      deadlineRef.current = Date.now() + current * 1000;
      setRunning(true);
      return current;
    });
  }, []);

  const reset = useCallback(() => {
    setDuration((currentDuration) => {
      if (currentDuration <= 0) return currentDuration;
      setRemaining(currentDuration);
      deadlineRef.current = Date.now() + currentDuration * 1000;
      setRunning(true);
      return currentDuration;
    });
  }, []);

  const stop = useCallback(() => {
    deadlineRef.current = null;
    setRunning(false);
    setRemaining(0);
    setDuration(0);
  }, []);

  const addSeconds = useCallback((seconds: number) => {
    setRemaining((current) => {
      const next = Math.max(0, current + seconds);
      if (deadlineRef.current !== null) deadlineRef.current = Date.now() + next * 1000;
      return next;
    });
    setDuration((current) => Math.max(0, current + seconds));
  }, []);

  return {
    remaining,
    duration,
    running,
    active: remaining > 0 || running,
    start,
    pause,
    resume,
    reset,
    stop,
    addSeconds,
  };
}
