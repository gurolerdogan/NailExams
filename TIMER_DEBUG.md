# Session Timer — Countdown Debug Log

## Problem

The session timer in `SessionScreen.tsx` does not visually tick down while the app is
in the foreground. Interval callbacks fire and values compute correctly (proven by the
correct catch-up when the app returns from background), but the screen never re-renders
from inside the `setInterval`.

## Root Cause Hypothesis

React 18 concurrent mode batches all state updates that originate from `setInterval` /
`setTimeout` / RAF callbacks on the JS thread. In React Native, these batched updates
may not flush until triggered by a higher-priority event (e.g. `AppState` change, user
interaction). This matches the symptom exactly: background→foreground fires `AppState`,
which forces a flush, and the timer display catches up.

---

## Approaches Tried

### 1. `useState` string + `setInterval`
`setTimeDisplay(formatTime(remaining))` called in interval every 500 ms.  
**Result: ❌** React 18 batches and defers; no visible re-render between foreground events.

### 2. `requestAnimationFrame` loop
Replaced `setInterval` with a RAF loop calling `setRemaining`.  
**Result: ❌** RAF callbacks are still JS-thread, still subject to React 18 scheduler deferral.

### 3. `Animated.Value.setValue()` + `Animated.Text` with string `interpolate`
Called `animDigits[i].setValue(digit)` in interval; displayed via `Animated.Text`.  
**Why it was expected to work:** `setValue()` was supposed to call `setNativeProps`
on the native view directly, bypassing React's reconciler.  
**Why it failed:** `Animated.Text` with a string `outputRange` in `interpolate` cannot
use `useNativeDriver: true` — string values are not supported by the native driver.
The update therefore routes through React's JS renderer and is subject to the same
batching as approach 1.

### 4. `useState` string — second attempt (most recent)
Same as approach 1 but revisited after the Animated dead-end.  
Colon-blink interval (`setColonVisible`) does cause re-renders every second, but
they do not reliably flush the timer state updates that are pending in a different
batch.  
**Result: ❌** Same outcome as approach 1.

### 5. `setNativeProps({ text })` on `TextInput` refs
Two `useRef<TextInput>` refs (`timerMinRef`, `timerSecRef`). `updateTimerDisplay` calls
`ref.current?.setNativeProps({ text: '...' })` directly — completely bypasses React.  
**Why it was expected to work:** `setNativeProps` calls through JSI to the native view
directly, skipping React's reconciler and scheduler.  
**Why it failed:** `setNativeProps` is deprecated in the new Fabric architecture
(React Native 0.76+ / Expo SDK 54+). In Fabric, it is a no-op or unreliable.
Additionally, React may reset `defaultValue` on every reconciliation pass, overwriting
the native update.  
**Result: ❌**

---

## Root cause (revised)

The app runs React 19.1 + React Native 0.81 + Fabric (new architecture enabled by
default in Expo SDK 54). In this environment:

- `setState` from `setInterval` → batched, deferred, never flushes while screen is idle
- `requestAnimationFrame` → same JS-thread deferral
- `Animated.Value.setValue` + `Animated.Text` → JS driver required for strings → same deferral
- `setNativeProps` → deprecated no-op in Fabric

All JS-side mechanisms fail because Fabric's rendering pipeline does not flush JS-driven
updates unless triggered by a high-priority event (touch, AppState, etc.).

---

## Next Approach — `useSyncExternalStore`

`useSyncExternalStore` (React 18+) is specifically designed to subscribe to external
state stores and **bypass React's normal batching**. From the React docs:
> "React will not batch updates triggered by store changes."

When the timer store calls its listeners, React performs a **synchronous, unbatched
re-render** immediately — not deferred to a future flush.

**Plan:**
- Create a tiny timer store object (closure, not React state) with `subscribe`,
  `getSnapshot`, and `setTime` methods.
- `updateTimerDisplay` calls `store.setTime(formatted)`, which notifies all listeners.
- `useSyncExternalStore(store.subscribe, store.getSnapshot)` returns the current time
  string and re-renders synchronously on every store notification.
- Display with plain `Text` components (no TextInput, no Animated).

This stays entirely within React's public API, requires no new dependencies, and is
explicitly designed to prevent the batching issue we're fighting.

### 6. `useSyncExternalStore`
Timer store notifies listeners; React docs say this bypasses batching.
**Result: ❌** In React Native 0.81 + Fabric, the notification still doesn't cause a
visible pixel update while the screen is idle — the Fabric commit pipeline appears to
only flush to CoreAnimation when a native event (touch, AppState) arrives regardless
of React's sync/async distinction.

---

## Next Approach — `Animated.timing` + `useNativeDriver: true` (digit columns)

The only mechanism confirmed to update pixels on screen independent of the JS/React
scheduler: **native-driver animations**. With `useNativeDriver: true`, React Native
serialises the animation to the UI thread and CoreAnimation drives it at 60 fps without
ever calling back to JS.

`transform: [{ translateY }]` IS supported by the native driver (text string values are
not, which is why Approach 3 failed). The plan:

- Each of the 4 digit positions is a clipped `View` (`overflow: hidden`) with 10
  `Text` children (digits 0–9) stacked vertically.
- An `Animated.Value` per column stores the `translateY` directly.
- `updateTimerDisplay` calls `Animated.timing(anim, { toValue: -digit * DIGIT_H,
  duration: 0, useNativeDriver: true }).start()` — zero-duration = instant snap,
  processed on the UI thread, no React state involved.
- Colon blink replaced with `Animated.loop` on an opacity `Animated.Value`, also
  native driver — so both digits and colon animate without touching JS state.


