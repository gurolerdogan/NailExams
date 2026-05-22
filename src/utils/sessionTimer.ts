import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export type TimerPhase = 'idle' | 'running' | 'paused' | 'done';

export type SessionTimerState = {
  phase: TimerPhase;
  remainingSeconds: number;
  totalSeconds: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

/**
 * Foreground-only Pomodoro-style timer.
 * Pauses automatically when the app goes to background.
 */
export function useSessionTimer(durationSeconds: number): SessionTimerState {
  const [phase, setPhase]               = useState<TimerPhase>('idle');
  const [remaining, setRemaining]       = useState(durationSeconds);
  const intervalRef                     = useRef<ReturnType<typeof setInterval> | null>(null);
  const backgroundRef                   = useRef<TimerPhase>('idle');
  const pausedByAppRef                  = useRef(false);

  const clearTick = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startTick = useCallback(() => {
    clearTick();
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTick();
          setPhase('done');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const start = useCallback(() => {
    setPhase('running');
    startTick();
  }, [startTick]);

  const pause = useCallback(() => {
    clearTick();
    setPhase('paused');
  }, []);

  const resume = useCallback(() => {
    setPhase('running');
    startTick();
  }, [startTick]);

  const reset = useCallback(() => {
    clearTick();
    setPhase('idle');
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  // Pause when app goes to background, resume when it comes back
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        // Going to background
        if (backgroundRef.current === 'running') {
          clearTick();
          pausedByAppRef.current = true;
        }
      } else {
        // Coming back to foreground
        if (pausedByAppRef.current) {
          pausedByAppRef.current = false;
          startTick();
        }
      }
    });
    return () => sub.remove();
  }, [startTick]);

  // Keep background ref in sync with phase
  useEffect(() => {
    backgroundRef.current = phase;
  }, [phase]);

  useEffect(() => () => clearTick(), []);

  return {
    phase,
    remainingSeconds: remaining,
    totalSeconds: durationSeconds,
    start,
    pause,
    resume,
    reset,
  };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
