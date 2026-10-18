"use client";

import { useSyncExternalStore } from "react";

type Timing = { position: number; duration: number };

let timing: Timing = { position: 0, duration: 0 };
let audio: HTMLAudioElement | null = null;
const listeners = new Set<() => void>();

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const registerAudio = (el: HTMLAudioElement | null) => {
  audio = el;
};

export const publishTiming = (position: number, duration: number) => {
  const d = Number.isFinite(duration) ? duration : 0;
  if (timing.position === position && timing.duration === d) return;
  timing = { position, duration: d };
  listeners.forEach((fn) => fn());
};

// Lets any component seek the single global audio element
export const seekTo = (seconds: number) => {
  if (audio) audio.currentTime = seconds;
  publishTiming(seconds, timing.duration);
};

// Playback position lives outside Redux so 4Hz time updates don't re-render the whole app
export function usePlayerTiming() {
  return useSyncExternalStore(subscribe, () => timing, () => timing);
}
