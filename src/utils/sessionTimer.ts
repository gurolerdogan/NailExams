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

export function useSessionTimer(durationSeconds: number): SessionTimerState {
  const [phase, setPhase]         = useState<TimerPhase>('idle');
  const [remaining, setRemaining] = useState(durationSeconds);
  const tickRef                   = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef                  = useRef<TimerPhase>('idle');
  const bgTimeRef                 = useRef<number | null>(null);

  // Keep phaseRef in sync for use inside AppState handler (avoids stale closure).
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  function stopTick() {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  function startTick() {
    stopTick();
    tickRef.current = setInterval(() => {
      // Pure updater — no side effects. The useEffect below detects reaching 0.
      setRemaining(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
  }

  // Transition to 'done' once remaining hits 0 while running.
  useEffect(() => {
    if (remaining === 0 && phase === 'running') {
      stopTick();
      phaseRef.current = 'done';
      setPhase('done');
    }
  }, [remaining, phase]);

  // Decrement by 1 immediately on start so display opens at e.g. 24:59.
  const start = useCallback(() => {
    setRemaining(prev => Math.max(0, prev - 1));
    phaseRef.current = 'running';
    setPhase('running');
    startTick();
  // startTick / stopTick only read tickRef — stale closure is safe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pause = useCallback(() => {
    stopTick();
    phaseRef.current = 'paused';
    setPhase('paused');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resume = useCallback(() => {
    phaseRef.current = 'running';
    setPhase('running');
    startTick();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = useCallback(() => {
    stopTick();
    phaseRef.current = 'idle';
    setPhase('idle');
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  // Compensate for time spent in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        if (phaseRef.current === 'running') bgTimeRef.current = Date.now();
      } else {
        if (phaseRef.current === 'running' && bgTimeRef.current !== null) {
          const elapsed = Math.floor((Date.now() - bgTimeRef.current) / 1000);
          bgTimeRef.current = null;
          if (elapsed > 0) setRemaining(prev => Math.max(0, prev - elapsed));
        }
      }
    });
    return () => sub.remove();
  }, []);

  // Clear interval on unmount.
  useEffect(() => stopTick, []);

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
