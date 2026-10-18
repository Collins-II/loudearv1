"use client";

import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store/index";
import { addToQueue, pause, play, playNext, playQueue, type QueueTrack } from "@/lib/store/audioSlice";

// Entry point for any page/component that wants to drive the persistent global player.
export function useGlobalPlayer() {
  const dispatch = useDispatch<AppDispatch>();
  const audio = useSelector((s: RootState) => s.audio);
  const current = audio.queue[audio.queueIndex];

  const playTracks = useCallback(
    (tracks: QueueTrack[], startIndex = 0) => dispatch(playQueue({ tracks, startIndex })),
    [dispatch]
  );

  // Toggles if the track is already current, otherwise starts it.
  const toggleTrack = useCallback(
    (track: QueueTrack) => {
      if (current?.id === track.id) return dispatch(audio.isPlaying ? pause() : play());
      dispatch(playQueue({ tracks: [track] }));
    },
    [dispatch, current?.id, audio.isPlaying]
  );

  return {
    current,
    isPlaying: audio.isPlaying,
    isCurrent: (id: string) => current?.id === id,
    playTracks,
    toggleTrack,
    enqueue: (t: QueueTrack | QueueTrack[]) => dispatch(addToQueue(t)),
    playNext: (t: QueueTrack) => dispatch(playNext(t)),
  };
}
